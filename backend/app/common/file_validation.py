"""Shared upload validation — extension, size, magic-byte sniffing, safe names.

This module is the single source of truth for file-upload security. All upload
endpoints should use `validate_upload()` instead of rolling their own checks.

Why magic-byte sniffing: client-reported Content-Type is trivially spoofed.
A malicious client can upload an `.exe` renamed to `.pdf` with
`Content-Type: application/pdf` and the naive check passes. We read the first
few bytes and compare against known signatures.

We deliberately avoid libmagic / python-magic to keep zero system dependencies.
For the handful of types we actually allow in an LMS, explicit signatures are
both simpler and more auditable than a full libmagic dependency.
"""
from __future__ import annotations

import os
import re
import uuid
from dataclasses import dataclass

# Hard ceiling — overrides any per-exercise / per-lesson config.
# An admin-set "allow 500 MB uploads" is not a safe configuration.
HARD_MAX_SIZE_MB = 50

# Allowed file categories. Endpoints specify which categories they accept.
class FileCategory:
    IMAGE = "image"
    DOCUMENT = "document"
    ARCHIVE = "archive"
    AUDIO = "audio"
    VIDEO = "video"


# Extension -> (category, magic-byte signatures, canonical MIME)
#
# Magic byte tuples: (offset, expected_bytes). Tuple of tuples means any-match.
# None means we accept without magic sniffing (use sparingly — only for formats
# where there's no reliable signature, e.g. plain text, SVG).
_EXT_SPECS: dict[str, tuple[str, tuple | None, str]] = {
    # Images
    ".png":  (FileCategory.IMAGE, ((0, b"\x89PNG\r\n\x1a\n"),), "image/png"),
    ".jpg":  (FileCategory.IMAGE, ((0, b"\xff\xd8\xff"),), "image/jpeg"),
    ".jpeg": (FileCategory.IMAGE, ((0, b"\xff\xd8\xff"),), "image/jpeg"),
    ".gif":  (FileCategory.IMAGE, ((0, b"GIF87a"), (0, b"GIF89a")), "image/gif"),
    ".webp": (FileCategory.IMAGE, ((0, b"RIFF"), (8, b"WEBP")), "image/webp"),
    # SVG is XML text — we validate with a regex at the text level instead.
    ".svg":  (FileCategory.IMAGE, None, "image/svg+xml"),

    # Documents
    ".pdf":  (FileCategory.DOCUMENT, ((0, b"%PDF-"),), "application/pdf"),
    # Office OOXML files (docx/pptx/xlsx) are ZIP containers — signature: PK\x03\x04
    ".docx": (FileCategory.DOCUMENT, ((0, b"PK\x03\x04"),),
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    ".pptx": (FileCategory.DOCUMENT, ((0, b"PK\x03\x04"),),
              "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
    ".xlsx": (FileCategory.DOCUMENT, ((0, b"PK\x03\x04"),),
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    # Legacy binary Office docs
    ".doc":  (FileCategory.DOCUMENT, ((0, b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"),),
              "application/msword"),
    ".ppt":  (FileCategory.DOCUMENT, ((0, b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"),),
              "application/vnd.ms-powerpoint"),

    # Archives
    ".zip":  (FileCategory.ARCHIVE, ((0, b"PK\x03\x04"),), "application/zip"),
}


# SVG is text-based. Reject anything containing script tags, foreignObject,
# event handlers, or external references — a stored SVG is rendered in-browser
# and XSS via SVG is a classic attack path.
_SVG_DANGEROUS = re.compile(
    rb"<script|<foreignObject|onload=|onerror=|onclick=|xlink:href\s*=\s*['\"]?(https?:|javascript:)",
    re.IGNORECASE,
)


@dataclass
class UploadResult:
    safe_name: str          # UUID-based filename safe to write to disk
    data: bytes             # file contents (already read)
    size: int               # size in bytes
    verified_mime: str      # canonical MIME for the detected type
    extension: str          # lowercase, includes leading dot


class UploadValidationError(ValueError):
    """Raised when an upload fails validation. Message is safe to return to user."""


def _sanitize_filename(name: str) -> str:
    """Strip path components and control characters from a client-supplied name."""
    # os.path.basename on both separators
    name = name.replace("\\", "/").split("/")[-1]
    # Drop leading dots to prevent hidden files
    name = name.lstrip(".")
    # Remove control chars and anything not printable ASCII + cyrillic
    name = re.sub(r"[\x00-\x1f\x7f]", "", name)
    # Cap length
    if len(name) > 200:
        root, ext = os.path.splitext(name)
        name = root[: 200 - len(ext)] + ext
    return name or "file"


def _match_magic(data: bytes, signatures: tuple) -> bool:
    for offset, expected in signatures:
        if len(data) >= offset + len(expected) and data[offset : offset + len(expected)] == expected:
            return True
    return False


def validate_upload(
    *,
    filename: str | None,
    data: bytes,
    allowed_extensions: list[str] | set[str],
    max_size_mb: int | None = None,
    category: str | None = None,
) -> UploadResult:
    """Validate an uploaded file and return a safe stored representation.

    Parameters:
        filename: the client-supplied original filename (may be None)
        data: the full file bytes (read from UploadFile.read())
        allowed_extensions: extensions accepted by this endpoint (with leading dot)
        max_size_mb: endpoint-specific cap. Capped at HARD_MAX_SIZE_MB.
        category: if set, also verify the matched extension belongs to this category

    Returns:
        UploadResult with a safe UUID-based filename that can be written to disk.

    Raises:
        UploadValidationError on any failure. Message is user-safe.
    """
    # 1. Enforce hard size ceiling regardless of endpoint config
    effective_max_mb = min(max_size_mb or HARD_MAX_SIZE_MB, HARD_MAX_SIZE_MB)
    if len(data) == 0:
        raise UploadValidationError("Empty file not allowed")
    if len(data) > effective_max_mb * 1024 * 1024:
        raise UploadValidationError(f"File too large. Maximum {effective_max_mb} MB allowed.")

    # 2. Sanitize filename and extract extension
    safe_client_name = _sanitize_filename(filename or "upload")
    ext = os.path.splitext(safe_client_name)[1].lower()
    if not ext:
        raise UploadValidationError("File has no extension")

    # 3. Normalize allowed list (lowercase, leading dot)
    allowed = {e.lower() if e.startswith(".") else "." + e.lower() for e in allowed_extensions}
    if ext not in allowed:
        raise UploadValidationError(
            f"File type {ext} is not allowed. Allowed: {', '.join(sorted(allowed))}"
        )

    # 4. Look up the extension spec
    if ext not in _EXT_SPECS:
        raise UploadValidationError(f"File type {ext} is not recognized")
    spec_category, signatures, canonical_mime = _EXT_SPECS[ext]

    # 5. Optional category enforcement
    if category is not None and spec_category != category:
        raise UploadValidationError(
            f"File type {ext} is not allowed in this context"
        )

    # 6. Magic-byte sniffing (or SVG text check)
    if ext == ".svg":
        if _SVG_DANGEROUS.search(data[:8192]):
            raise UploadValidationError("SVG contains unsafe content and was rejected")
    elif signatures is not None:
        if not _match_magic(data, signatures):
            raise UploadValidationError(
                f"File content does not match declared type {ext}"
            )

    # 7. Generate a safe stored filename — UUID only, never trust client input
    safe_name = f"{uuid.uuid4().hex}{ext}"

    return UploadResult(
        safe_name=safe_name,
        data=data,
        size=len(data),
        verified_mime=canonical_mime,
        extension=ext,
    )


# Convenience allowlists for common endpoints — use these instead of ad-hoc sets.
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}
DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xlsx"}
SUBMISSION_EXTENSIONS = IMAGE_EXTENSIONS | DOCUMENT_EXTENSIONS
