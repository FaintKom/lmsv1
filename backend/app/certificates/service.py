import io
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.certificates.models import Certificate
from app.common.exceptions import NotFoundError
from app.courses.models import Course


def _generate_number() -> str:
    """Generate a unique certificate number like LH-2026-XXXX."""
    import secrets
    year = datetime.now().year
    code = secrets.token_hex(4).upper()
    return f"LH-{year}-{code}"


async def issue_certificate(
    db: AsyncSession,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
) -> Certificate:
    """Issue a certificate for a completed course. Idempotent."""
    # Check if already issued
    result = await db.execute(
        select(Certificate).where(
            Certificate.user_id == user_id,
            Certificate.course_id == course_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    cert = Certificate(
        user_id=user_id,
        course_id=course_id,
        certificate_number=_generate_number(),
        issued_at=datetime.now(timezone.utc),
    )
    db.add(cert)
    await db.flush()
    return cert


async def get_my_certificates(
    db: AsyncSession, user_id: uuid.UUID
) -> list[dict]:
    result = await db.execute(
        select(Certificate).where(Certificate.user_id == user_id).order_by(Certificate.issued_at.desc())
    )
    certs = result.scalars().all()

    # Get course names
    course_ids = [c.course_id for c in certs]
    if course_ids:
        courses_result = await db.execute(
            select(Course).where(Course.id.in_(course_ids))
        )
        course_map = {c.id: c.title for c in courses_result.scalars().all()}
    else:
        course_map = {}

    return [
        {
            "id": c.id,
            "course_id": c.course_id,
            "course_title": course_map.get(c.course_id, "Unknown Course"),
            "certificate_number": c.certificate_number,
            "issued_at": c.issued_at,
        }
        for c in certs
    ]


async def get_certificate_for_download(
    db: AsyncSession, cert_id: uuid.UUID, user_id: uuid.UUID
) -> dict:
    result = await db.execute(
        select(Certificate).where(Certificate.id == cert_id, Certificate.user_id == user_id)
    )
    cert = result.scalar_one_or_none()
    if not cert:
        raise NotFoundError("Certificate not found")

    # Get user and course info
    user_result = await db.execute(select(User).where(User.id == cert.user_id))
    user = user_result.scalar_one()
    course_result = await db.execute(select(Course).where(Course.id == cert.course_id))
    course = course_result.scalar_one()

    return {
        "student_name": user.full_name,
        "course_title": course.title,
        "certificate_number": cert.certificate_number,
        "issued_at": cert.issued_at,
    }


async def verify_certificate(
    db: AsyncSession, number: str
) -> dict | None:
    result = await db.execute(
        select(Certificate).where(Certificate.certificate_number == number)
    )
    cert = result.scalar_one_or_none()
    if not cert:
        return None

    user_result = await db.execute(select(User).where(User.id == cert.user_id))
    user = user_result.scalar_one()
    course_result = await db.execute(select(Course).where(Course.id == cert.course_id))
    course = course_result.scalar_one()

    return {
        "student_name": user.full_name,
        "course_title": course.title,
        "certificate_number": cert.certificate_number,
        "issued_at": cert.issued_at,
        "valid": True,
    }


def generate_certificate_html(
    student_name: str,
    course_title: str,
    certificate_number: str,
    issued_at: datetime,
) -> str:
    """Generate an HTML certificate that can be rendered as PDF."""
    date_str = issued_at.strftime("%B %d, %Y")
    return f"""<!DOCTYPE html>
<html>
<head>
<style>
  body {{ margin: 0; font-family: 'Georgia', serif; }}
  .cert {{ width: 800px; height: 560px; margin: 20px auto; border: 8px double #4338ca;
           padding: 60px; text-align: center; position: relative; background: linear-gradient(135deg, #fafafa 0%, #f0f0ff 100%); }}
  .header {{ color: #4338ca; font-size: 14px; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 10px; }}
  .title {{ color: #1e293b; font-size: 36px; margin: 20px 0; font-weight: bold; }}
  .subtitle {{ color: #64748b; font-size: 16px; margin: 15px 0; }}
  .name {{ color: #1e293b; font-size: 28px; font-style: italic; margin: 20px 0; border-bottom: 2px solid #4338ca;
           display: inline-block; padding-bottom: 5px; }}
  .course {{ color: #4338ca; font-size: 20px; margin: 15px 0; font-weight: bold; }}
  .footer {{ position: absolute; bottom: 40px; left: 60px; right: 60px; display: flex;
             justify-content: space-between; color: #94a3b8; font-size: 12px; }}
  .logo {{ color: #4338ca; font-size: 20px; font-weight: bold; }}
</style>
</head>
<body>
<div class="cert">
  <div class="logo">LearnHub</div>
  <div class="header">Certificate of Completion</div>
  <div class="title">Certificate of Achievement</div>
  <div class="subtitle">This is to certify that</div>
  <div class="name">{student_name}</div>
  <div class="subtitle">has successfully completed the course</div>
  <div class="course">{course_title}</div>
  <div class="footer">
    <span>Certificate #{certificate_number}</span>
    <span>Issued: {date_str}</span>
  </div>
</div>
</body>
</html>"""
