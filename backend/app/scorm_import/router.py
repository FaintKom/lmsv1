"""SCORM/xAPI import + internal LRS routes.

Endpoints:
    POST /upload                          — upload a SCORM 1.2/2004 or xAPI .zip
    GET  /packages/{id}                   — read package metadata
    GET  /packages/{id}/files/{path:path} — serve an extracted file
    POST /packages/{id}/statements        — accept xAPI statement (legacy SCORM bridge calls this too)
    GET  /packages/{id}/statements        — list statements (admin/teacher only)
    POST /xapi/statements                 — generic xAPI inbox (mathlive, future emitters)
"""
from __future__ import annotations

import io
import logging
import re
import uuid
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User, UserRole
from app.config import settings
from app.db.session import get_db
from app.scorm_import.models import (
    ImportedSCORMFormat,
    ImportedSCORMPackage,
    ImportedSCORMStatus,
    XAPIStatement,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Helpers ────────────────────────────────────────────────────────────


def _scorm_root() -> Path:
    """Disk root for extracted SCORM imports."""
    root = Path(settings.upload_dir) / "scorm-import"
    root.mkdir(parents=True, exist_ok=True)
    return root


_MAX_UNCOMPRESSED = 500 * 1024 * 1024  # 500 MB
_MAX_ZIP_ENTRIES = 5000


def _safe_join(base: Path, rel: str) -> Path:
    """Resolve `rel` against `base` and refuse any path that escapes."""
    target = (base / rel).resolve()
    if not target.is_relative_to(base.resolve()):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid path")
    return target


def _detect_format(extracted: Path) -> tuple[ImportedSCORMFormat, str | None, dict | None, str | None]:
    """Inspect the extracted package directory. Returns (format, launch_url, manifest_dict, title)."""
    manifest = extracted / "imsmanifest.xml"
    if manifest.exists():
        try:
            tree = ET.parse(manifest)
            root = tree.getroot()
            href = None
            title = None
            fmt = ImportedSCORMFormat.scorm12
            for el in root.iter():
                tag = el.tag.split("}", 1)[-1] if "}" in el.tag else el.tag
                if tag == "resource" and el.get("href") and href is None:
                    href = el.get("href")
                if tag == "title" and el.text and title is None:
                    title = el.text.strip()
                if tag == "schemaversion" and el.text and "2004" in el.text:
                    fmt = ImportedSCORMFormat.scorm2004
            return fmt, href, {"manifest": "imsmanifest.xml"}, title
        except ET.ParseError as e:
            logger.warning("imsmanifest.xml parse failed: %s", e)
    tincan = extracted / "tincan.xml"
    if tincan.exists():
        try:
            tree = ET.parse(tincan)
            root = tree.getroot()
            href = None
            title = None
            for el in root.iter():
                tag = el.tag.split("}", 1)[-1] if "}" in el.tag else el.tag
                if tag == "launch" and el.text:
                    href = el.text.strip()
                if tag == "name" and el.text and not title:
                    title = el.text.strip()
            return ImportedSCORMFormat.xapi, href, {"manifest": "tincan.xml"}, title
        except ET.ParseError:
            pass
    for candidate in ("index_lms.html", "index.html", "story.html"):
        if (extracted / candidate).exists():
            return ImportedSCORMFormat.scorm12, candidate, None, None
    return ImportedSCORMFormat.scorm12, None, None, None


# ─── Schemas ────────────────────────────────────────────────────────────


class ImportedSCORMResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    exercise_id: uuid.UUID | None
    title: str | None
    format: str
    launch_url: str | None
    status: str
    error: str | None
    original_filename: str | None

    model_config = {"from_attributes": True}


class XAPIStatementIn(BaseModel):
    statement: dict
    exercise_id: uuid.UUID | None = None


class XAPIStatementResponse(BaseModel):
    id: uuid.UUID
    verb_id: str
    object_id: str
    stored_at: datetime
    result: dict | None
    context: dict | None

    model_config = {"from_attributes": True}


# ─── Endpoints ──────────────────────────────────────────────────────────


_MAX_ZIP_BYTES = 100 * 1024 * 1024  # 100 MB


@router.post("/upload", response_model=ImportedSCORMResponse, status_code=status.HTTP_201_CREATED)
async def upload_package(
    file: UploadFile = File(...),
    exercise_id: uuid.UUID | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ImportedSCORMPackage:
    """Upload + extract a SCORM/xAPI package zip. Returns the package row."""
    if user.role not in (UserRole.teacher, UserRole.admin, UserRole.super_admin):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Teachers/admins only")

    raw = await file.read()
    if len(raw) > _MAX_ZIP_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Package > 100 MB")
    if not zipfile.is_zipfile(io.BytesIO(raw)):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Not a valid zip file")

    pkg = ImportedSCORMPackage(
        org_id=user.org_id,
        exercise_id=exercise_id,
        uploaded_by=user.id,
        original_filename=(file.filename or "")[:255],
        status=ImportedSCORMStatus.pending,
    )
    db.add(pkg)
    await db.flush()

    extract_dir = _scorm_root() / str(pkg.id)
    extract_dir.mkdir(parents=True, exist_ok=True)
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as zf:
            names = zf.namelist()
            if len(names) > _MAX_ZIP_ENTRIES:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    f"Too many zip entries ({len(names)} > {_MAX_ZIP_ENTRIES})",
                )
            total_uncompressed = sum(info.file_size for info in zf.infolist())
            if total_uncompressed > _MAX_UNCOMPRESSED:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    f"Uncompressed size {total_uncompressed} exceeds {_MAX_UNCOMPRESSED} bytes",
                )
            for member in names:
                normalized = member.replace("\\", "/")
                if normalized.startswith("/") or ".." in Path(normalized).parts:
                    raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unsafe zip entry: {member}")
            zf.extractall(extract_dir)
        fmt, launch, manifest, title = _detect_format(extract_dir)
        pkg.format = fmt
        pkg.launch_url = launch
        pkg.manifest = manifest
        pkg.title = title or (file.filename or "Imported package").rsplit(".", 1)[0]
        pkg.status = ImportedSCORMStatus.extracted
    except HTTPException:
        pkg.status = ImportedSCORMStatus.failed
        pkg.error = "Unsafe zip layout"
        raise
    except Exception as e:  # noqa: BLE001
        logger.exception("SCORM extract failed")
        pkg.status = ImportedSCORMStatus.failed
        pkg.error = str(e)[:1000]
    await db.flush()
    return pkg


@router.get("/packages/{pkg_id}", response_model=ImportedSCORMResponse)
async def get_package(
    pkg_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ImportedSCORMPackage:
    pkg = await db.get(ImportedSCORMPackage, pkg_id)
    if not pkg or pkg.org_id != user.org_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Package not found")
    return pkg


@router.get("/packages/{pkg_id}/files/{path:path}")
async def serve_package_file(
    pkg_id: uuid.UUID,
    path: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    """Serve a single file from an extracted package. Used by the iframe."""
    pkg = await db.get(ImportedSCORMPackage, pkg_id)
    if not pkg or pkg.org_id != user.org_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Package not found")
    if pkg.status != ImportedSCORMStatus.extracted:
        raise HTTPException(status.HTTP_409_CONFLICT, "Package not extracted yet")
    target = _safe_join(_scorm_root() / str(pkg.id), path)
    if not target.exists() or not target.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not in package")
    return FileResponse(target)


def _extract_verb_object(stmt: dict) -> tuple[str, str, str | None]:
    """Pull the verb URI, object id, and object objectType out of an xAPI stmt."""
    verb = stmt.get("verb") or {}
    verb_id = verb.get("id") or ""
    obj = stmt.get("object") or {}
    obj_id = obj.get("id") or ""
    obj_type = (obj.get("objectType") if isinstance(obj, dict) else None)
    return verb_id, obj_id, obj_type


@router.post("/packages/{pkg_id}/statements", response_model=XAPIStatementResponse)
async def record_package_statement(
    pkg_id: uuid.UUID,
    body: XAPIStatementIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> XAPIStatement:
    """Inbox for xAPI statements emitted by a specific SCORM/xAPI package."""
    pkg = await db.get(ImportedSCORMPackage, pkg_id)
    if not pkg or pkg.org_id != user.org_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Package not found")
    verb_id, obj_id, obj_type = _extract_verb_object(body.statement)
    if not verb_id or not obj_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Statement missing verb.id or object.id")
    stmt = XAPIStatement(
        org_id=user.org_id,
        actor_id=user.id,
        verb_id=verb_id,
        object_id=obj_id,
        object_type=obj_type,
        statement=body.statement,
        result=body.statement.get("result"),
        context=body.statement.get("context"),
        stored_at=datetime.now(tz=timezone.utc),
        exercise_id=body.exercise_id or pkg.exercise_id,
        imported_package_id=pkg.id,
    )
    db.add(stmt)
    await db.flush()
    return stmt


@router.get("/packages/{pkg_id}/statements", response_model=list[XAPIStatementResponse])
async def list_package_statements(
    pkg_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pkg = await db.get(ImportedSCORMPackage, pkg_id)
    if not pkg or pkg.org_id != user.org_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Package not found")
    q = (
        select(XAPIStatement)
        .where(XAPIStatement.imported_package_id == pkg.id)
        .order_by(XAPIStatement.stored_at.desc())
        .limit(500)
    )
    if user.role == UserRole.student:
        q = q.where(XAPIStatement.actor_id == user.id)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/xapi/statements", response_model=XAPIStatementResponse)
async def record_generic_statement(
    body: XAPIStatementIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> XAPIStatement:
    """Inbox for xAPI statements not tied to a specific imported package.

    Used by mathlive math_stepwise exercises and any future native xAPI
    emitter. The shape of `statement` must follow xAPI 1.0.3.
    """
    verb_id, obj_id, obj_type = _extract_verb_object(body.statement)
    if not verb_id or not obj_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Statement missing verb.id or object.id")
    stmt = XAPIStatement(
        org_id=user.org_id,
        actor_id=user.id,
        verb_id=verb_id,
        object_id=obj_id,
        object_type=obj_type,
        statement=body.statement,
        result=body.statement.get("result"),
        context=body.statement.get("context"),
        stored_at=datetime.now(tz=timezone.utc),
        exercise_id=body.exercise_id,
    )
    db.add(stmt)
    await db.flush()
    return stmt
