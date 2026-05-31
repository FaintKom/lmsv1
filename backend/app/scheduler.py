"""In-process background job scheduler (APScheduler AsyncIOScheduler).

P1-2 pragmatic choice: we do NOT run a separate task queue (Celery / RQ / arq)
because the app is a single uvicorn worker on a single Hetzner VPS. A full
queue with Redis would add infrastructure complexity without proportional
benefit at current scale. If we ever scale horizontally (multiple worker
instances behind a load balancer) we need to either:
- move the scheduler to a dedicated container so jobs only fire once, or
- switch to a real distributed queue (arq is the modern async choice).

Until then, AsyncIOScheduler runs jobs inside the FastAPI event loop and is
started/stopped from the lifespan context manager in main.py.

Jobs are registered here. Each should be idempotent (safe if re-run on the
same data), log what it did, and swallow its own errors so a failing job
does not bring down the scheduler.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import delete, func, select

from app.auth.models import ParentConsentToken, RefreshToken, User, UserRole
from app.config import settings
from app.db.session import async_session_factory

logger = logging.getLogger(__name__)

_scheduler: Optional[AsyncIOScheduler] = None


async def cleanup_expired_refresh_tokens() -> None:
    """Delete refresh_tokens rows that are either revoked over 7 days ago or
    whose natural expiry has passed. Prevents the table from growing forever
    as sessions rotate. Idempotent — safe to run repeatedly.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    async with async_session_factory() as session:
        try:
            result = await session.execute(
                delete(RefreshToken).where(
                    (RefreshToken.expires_at < datetime.now(timezone.utc))
                    | (
                        (RefreshToken.revoked_at.is_not(None))
                        & (RefreshToken.revoked_at < cutoff)
                    )
                )
            )
            await session.commit()
            deleted = result.rowcount or 0
            if deleted:
                logger.info(f"cleanup_expired_refresh_tokens: pruned {deleted} rows")
        except Exception as e:
            logger.warning(f"cleanup_expired_refresh_tokens failed: {e}")
            await session.rollback()


async def send_deadline_reminders() -> None:
    """Placeholder for the assignment deadline reminder job (Phase 1 A8).

    Intended behaviour: find assignments with due_date in the next 24 hours,
    enumerate still-unsubmitted students, send each a reminder email. Needs a
    `reminder_sent_at` column on AssignmentSubmission (or a separate table)
    to avoid duplicate reminders on subsequent hourly runs.

    Stubbed for now so the scheduler has at least one hourly job and we can
    flip this on later without touching the wiring.
    """
    logger.debug("send_deadline_reminders: not implemented yet (stub)")


async def purge_inactive_students() -> None:
    """GDPR storage-limitation / child-safety retention purge.

    Hard-deletes student accounts dormant longer than
    ``settings.data_retention_months`` (0 disables). Dormancy is measured by
    ``last_active_at``, falling back to ``created_at`` for legacy rows that
    predate activity tracking. Reuses the same FK-clearing path as admin and
    self-service erasure so deletion semantics never diverge. Idempotent.
    """
    months = settings.data_retention_months
    if months <= 0:
        return
    cutoff = datetime.now(timezone.utc) - timedelta(days=months * 30)
    async with async_session_factory() as session:
        try:
            from app.auth.erasure import cascade_delete_user_refs

            stmt = select(User).where(
                User.role == UserRole.student,
                func.coalesce(User.last_active_at, User.created_at) < cutoff,
            )
            students = (await session.execute(stmt)).scalars().all()
            purged = 0
            for student in students:
                await cascade_delete_user_refs(session, student.id)
                await session.delete(student)
                await session.flush()
                purged += 1
            await session.commit()
            if purged:
                logger.info(
                    f"purge_inactive_students: purged {purged} student account(s) "
                    f"dormant >{months} months"
                )
        except Exception as e:
            logger.warning(f"purge_inactive_students failed: {e}")
            await session.rollback()


async def _purge_unconfirmed_consent_accounts(session) -> int:
    """Core purge logic, parametrised on the session so it is unit-testable.

    Hard-deletes consent-pending minor accounts whose verifiable-consent window
    has lapsed: ``is_active=False`` AND ``parental_consent_at IS NULL`` AND there
    exists at least one ``ParentConsentToken`` for the user that is past its
    expiry by more than ``settings.unconfirmed_consent_grace_days`` and was never
    used/confirmed. Reuses the shared FK-clearing erasure path. Returns the count
    purged. Caller owns commit/rollback.
    """
    from app.auth.erasure import cascade_delete_user_refs

    now = datetime.now(timezone.utc)
    grace_cutoff = now - timedelta(days=settings.unconfirmed_consent_grace_days)

    # Users awaiting consent that have a never-confirmed token expired past the
    # grace cutoff. The EXISTS keeps it a per-user decision even if a user
    # somehow has multiple tokens.
    pending_token = select(ParentConsentToken.id).where(
        ParentConsentToken.user_id == User.id,
        ParentConsentToken.used.is_(False),
        ParentConsentToken.confirmed_at.is_(None),
        ParentConsentToken.expires_at < grace_cutoff,
    )
    stmt = select(User).where(
        User.is_active.is_(False),
        User.parental_consent_at.is_(None),
        pending_token.exists(),
    )
    users = (await session.execute(stmt)).scalars().all()
    purged = 0
    for user in users:
        await cascade_delete_user_refs(session, user.id)
        await session.delete(user)
        await session.flush()
        purged += 1
    return purged


async def purge_unconfirmed_consent_accounts() -> None:
    """GDPR storage-limitation purge of never-onboarded minor signups.

    The age gate (verifiable parental consent, GDPR Art. 8) creates an INACTIVE
    student account plus a ``ParentConsentToken`` when a minor registers. If the
    parent never confirms, the account lingers as ``is_active=False`` /
    ``parental_consent_at IS NULL`` forever. This job hard-deletes such accounts
    once their token has been expired for more than
    ``settings.unconfirmed_consent_grace_days``. GDPR-positive: we don't retain
    data for minors who were never onboarded. Idempotent — safe to re-run.
    """
    async with async_session_factory() as session:
        try:
            purged = await _purge_unconfirmed_consent_accounts(session)
            await session.commit()
            if purged:
                logger.info(
                    f"purge_unconfirmed_consent_accounts: purged {purged} "
                    f"never-confirmed consent-pending minor account(s)"
                )
        except Exception as e:
            logger.warning(f"purge_unconfirmed_consent_accounts failed: {e}")
            await session.rollback()


def start_scheduler() -> AsyncIOScheduler:
    """Create the scheduler, register jobs, start it. Idempotent."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        return _scheduler

    scheduler = AsyncIOScheduler(timezone="UTC")

    # Daily at 03:10 UTC — comfortably before the 04:00 backup job so a
    # freshly pruned table is what ends up in the backup.
    scheduler.add_job(
        cleanup_expired_refresh_tokens,
        CronTrigger(hour=3, minute=10),
        id="cleanup_expired_refresh_tokens",
        max_instances=1,
        coalesce=True,
        misfire_grace_time=600,
    )

    # Hourly at :15 — stub. Once deadline reminders are implemented this
    # will find assignments due in the next 24 hours.
    scheduler.add_job(
        send_deadline_reminders,
        CronTrigger(minute=15),
        id="send_deadline_reminders",
        max_instances=1,
        coalesce=True,
        misfire_grace_time=600,
    )

    # Daily at 03:30 UTC — retention purge of dormant student accounts. Runs
    # after token cleanup (03:10) and before the 04:00 backup.
    scheduler.add_job(
        purge_inactive_students,
        CronTrigger(hour=3, minute=30),
        id="purge_inactive_students",
        max_instances=1,
        coalesce=True,
        misfire_grace_time=600,
    )

    # Daily at 03:40 UTC — purge never-confirmed consent-pending minor signups
    # whose consent token has been expired past the grace period. Runs after the
    # dormant-student purge (03:30) and before the 04:00 backup.
    scheduler.add_job(
        purge_unconfirmed_consent_accounts,
        CronTrigger(hour=3, minute=40),
        id="purge_unconfirmed_consent_accounts",
        max_instances=1,
        coalesce=True,
        misfire_grace_time=600,
    )

    scheduler.start()
    _scheduler = scheduler
    logger.info(
        f"Scheduler started with {len(scheduler.get_jobs())} jobs "
        f"(timezone=UTC)"
    )
    return scheduler


def stop_scheduler() -> None:
    """Shut the scheduler down cleanly. Called from lifespan on shutdown."""
    global _scheduler
    if _scheduler is None or not _scheduler.running:
        return
    try:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
    except Exception as e:
        logger.warning(f"Scheduler shutdown failed: {e}")
    finally:
        _scheduler = None
