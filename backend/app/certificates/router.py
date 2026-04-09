import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.certificates.service import (
    generate_certificate_html,
    get_certificate_for_download,
    get_my_certificates,
    verify_certificate,
)
from app.db.session import get_db

router = APIRouter()


@router.get("/my-certificates")
async def my_certificates_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_my_certificates(db, user.id)


@router.get("/{cert_id}/download")
async def download_certificate_endpoint(
    cert_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await get_certificate_for_download(db, cert_id, user.id)
    html = generate_certificate_html(
        data["student_name"],
        data["course_title"],
        data["certificate_number"],
        data["issued_at"],
    )
    return HTMLResponse(content=html)


@router.get("/verify/{number}")
async def verify_certificate_endpoint(
    number: str,
    db: AsyncSession = Depends(get_db),
):
    result = await verify_certificate(db, number)
    if not result:
        return {"valid": False, "message": "Certificate not found"}
    return result
