import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Callable

from app.config import settings

logger = logging.getLogger(__name__)


def queue_email(func: Callable[..., Any], *args: Any, **kwargs: Any) -> None:
    """Schedule an email send in the background without blocking the caller.

    Safe to call from any async code path. Uses the running asyncio loop's
    default executor to run the blocking `smtplib` call off the event loop,
    so a slow/flaky SMTP server cannot stall HTTP request handling. If no
    loop is running (e.g. called from a sync seed script), falls back to a
    direct sync call.

    Exceptions from the underlying send function are swallowed and logged,
    because email failures must never break the request path that queued
    them — see P0-6 and earlier comments about best-effort welcome emails.
    """
    def _run() -> None:
        try:
            func(*args, **kwargs)
        except Exception as e:
            logger.warning(f"Background email {func.__name__} failed: {e}")

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        _run()
        return
    loop.run_in_executor(None, _run)


def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an email via SMTP. Returns True on success."""
    if not settings.email_enabled:
        logger.info(f"[Email disabled] To: {to_email}, Subject: {subject}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.email_from_name} <{settings.email_from}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            if settings.smtp_user and settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.email_from, to_email, msg.as_string())
        logger.info(f"Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def _base_template(content: str) -> str:
    """Wrap content in a styled email template."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:hidden;">
            <tr><td style="background-color:#4f46e5;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">GrassLMS</h1>
            </td></tr>
            <tr><td style="padding:32px;">
              {content}
            </td></tr>
            <tr><td style="padding:16px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
                &copy; GrassLMS. This is an automated message.
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """


def send_welcome(to_email: str, full_name: str) -> bool:
    """Send welcome email after registration."""
    content = f"""
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;">Welcome to GrassLMS, {full_name}!</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      Your account has been created successfully. You can now start learning!
    </p>
    <a href="{settings.app_url}/dashboard" style="display:inline-block;background-color:#4f46e5;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
      Go to Dashboard
    </a>
    """
    return _send_email(to_email, "Welcome to GrassLMS!", _base_template(content))


def send_email_verification(to_email: str, full_name: str, token: str) -> bool:
    """Send email verification link after registration."""
    verify_url = f"{settings.app_url}/verify-email?token={token}"
    content = f"""
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;">Verify your email, {full_name}</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      Please confirm this is your email address by clicking the button below.
      This link expires in 24 hours.
    </p>
    <a href="{verify_url}" style="display:inline-block;background-color:#4f46e5;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
      Verify Email
    </a>
    <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;">
      If you didn't create this account, you can safely ignore this email.
    </p>
    """
    return _send_email(to_email, "Verify your GrassLMS email", _base_template(content))


def send_password_reset(to_email: str, token: str) -> bool:
    """Send password reset email."""
    reset_url = f"{settings.app_url}/reset-password?token={token}"
    content = f"""
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;">Reset Your Password</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      We received a request to reset your password. Click the button below to create a new one.
      This link expires in 1 hour.
    </p>
    <a href="{reset_url}" style="display:inline-block;background-color:#4f46e5;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
      Reset Password
    </a>
    <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;">
      If you didn't request this, you can safely ignore this email.
    </p>
    """
    return _send_email(to_email, "Reset Your Password", _base_template(content))


def send_assignment_notification(to_email: str, student_name: str, assignment_title: str, due_date: str) -> bool:
    """Notify student about a new assignment."""
    content = f"""
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;">New Assignment</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      Hi {student_name}, a new assignment has been posted:
    </p>
    <div style="background-color:#f1f5f9;border-radius:8px;padding:16px;margin:0 0 16px;">
      <p style="margin:0;color:#1e293b;font-size:16px;font-weight:600;">{assignment_title}</p>
      <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Due: {due_date}</p>
    </div>
    <a href="{settings.app_url}/assignments" style="display:inline-block;background-color:#4f46e5;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
      View Assignment
    </a>
    """
    return _send_email(to_email, f"New Assignment: {assignment_title}", _base_template(content))


def send_grade_notification(to_email: str, student_name: str, assignment_title: str, score: float, max_score: int, feedback: str | None) -> bool:
    """Notify student that their work has been graded."""
    feedback_html = f'<p style="margin:8px 0 0;color:#475569;font-size:13px;">Feedback: {feedback}</p>' if feedback else ""
    content = f"""
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;">Your Work Has Been Graded</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      Hi {student_name}, your submission has been graded:
    </p>
    <div style="background-color:#f1f5f9;border-radius:8px;padding:16px;margin:0 0 16px;">
      <p style="margin:0;color:#1e293b;font-size:16px;font-weight:600;">{assignment_title}</p>
      <p style="margin:8px 0 0;color:#059669;font-size:20px;font-weight:700;">{score}/{max_score}</p>
      {feedback_html}
    </div>
    <a href="{settings.app_url}/assignments" style="display:inline-block;background-color:#4f46e5;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
      View Details
    </a>
    """
    return _send_email(to_email, f"Grade: {assignment_title}", _base_template(content))


def send_deadline_reminder(to_email: str, student_name: str, assignment_title: str, due_date: str) -> bool:
    """Remind student about upcoming deadline."""
    content = f"""
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;">Deadline Reminder</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      Hi {student_name}, your assignment is due soon:
    </p>
    <div style="background-color:#fef3c7;border-radius:8px;padding:16px;margin:0 0 16px;border-left:4px solid #f59e0b;">
      <p style="margin:0;color:#1e293b;font-size:16px;font-weight:600;">{assignment_title}</p>
      <p style="margin:4px 0 0;color:#92400e;font-size:13px;font-weight:600;">Due: {due_date}</p>
    </div>
    <a href="{settings.app_url}/assignments" style="display:inline-block;background-color:#4f46e5;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
      Submit Now
    </a>
    """
    return _send_email(to_email, f"Reminder: {assignment_title} due soon", _base_template(content))
