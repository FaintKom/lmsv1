# Support Button + Open Collective Donations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a "Support GrassLMS" donation flow for teachers and admins, routed through an Open Collective collective hosted by OCE Foundation (USD). Includes an in-LMS `/support` page, backend donations module talking to OC GraphQL, sidebar entry, removal of the legacy `/pricing` page, and a secondary direct-crypto fallback.

**Architecture:** Frontend `/support` (Next.js, dashboard layout, react-hook-form + zod) calls a public FastAPI endpoint `POST /api/v1/donations/initiate` which uses OC's GraphQL `createOrder` mutation, returning a checkout URL that the browser opens in a popup. OC posts back to `POST /api/v1/donations/webhook` (HMAC-verified) to confirm; the frontend polls until status is `confirmed` and routes to `/support/thanks`. Payouts flow off-platform via SWIFT from the fiscal host to the owner's VakıfBank USD account.

**Tech Stack:**
- Backend: FastAPI async, SQLAlchemy 2 async, Alembic, Pydantic v2, httpx.AsyncClient, slowapi, pytest.
- Frontend: Next.js 16 App Router, React 19, TypeScript strict, Tailwind 4, TanStack Query, react-hook-form, zod, Sonner, Vitest.
- External: Open Collective GraphQL API v2, OCE Foundation (USD) fiscal host.

**Conventions (loaded from existing CLAUDE.md):**
- Every module has `models.py / schemas.py / service.py / router.py` (plus `config.py` for env knobs).
- All endpoints/services are `async def`. DB session injected via `Depends(get_db)`.
- Models inherit `IDMixin` + `TimestampMixin` from `app.db.base`. Imported in `main.py` lifespan and `tests/conftest.py`.
- Pydantic schemas use `Request` / `Response` suffix and `model_config = {"from_attributes": True}` on response.
- Rate-limited routes use `@limiter.limit(...)` and require `request: Request` parameter.
- Frontend imports via `@/` alias. API wrappers in `src/lib/api/<domain>.ts`. Translation keys added to all six locale sections (`en, es, ru, tr, de, uk`) — Vitest parity test (`src/lib/i18n/translations.test.ts`) catches missing keys.

---

## File Structure

### Backend (new)
- `backend/app/donations/__init__.py` — empty package marker.
- `backend/app/donations/config.py` — `DonationsSettings` (OC env vars).
- `backend/app/donations/models.py` — `Donation` SQLAlchemy model + `Recurrence` and `DonationStatus` enums.
- `backend/app/donations/schemas.py` — `DonationInitiateRequest`, `DonationInitiateResponse`, `DonationStatusResponse`, `DonationStatsResponse`.
- `backend/app/donations/service.py` — OC GraphQL client wrapper, `create_oc_order`, `verify_webhook_signature`, `apply_webhook_update`, `aggregate_stats`.
- `backend/app/donations/router.py` — `POST /initiate`, `POST /webhook`, `GET /{donation_id}`, `GET /stats`.
- `backend/alembic/versions/d0n4t10n5add_add_donations_module.py` — table creation migration.
- `backend/tests/test_donations.py` — six tests from the spec (mocked OC client).

### Backend (modified)
- `backend/app/main.py` — import + register `donations_router`, import model for metadata.
- `backend/app/config.py` — add OC settings.
- `backend/tests/conftest.py` — import `Donation` model so `Base.metadata` knows about it.
- `backend/.env.example` — document new env vars.

### Frontend (new)
- `frontend/src/app/(dashboard)/support/page.tsx` — donation page route (client component).
- `frontend/src/app/(dashboard)/support/thanks/page.tsx` — success screen.
- `frontend/src/lib/api/donations.ts` — typed axios wrappers.
- `frontend/src/components/support/donation-form.tsx` — main form.
- `frontend/src/components/support/where-money-goes.tsx` — static info section.
- `frontend/src/components/support/direct-crypto.tsx` — Bybit USDT alt section.
- `frontend/src/components/support/donation-form.test.tsx` — Vitest tests.

### Frontend (modified)
- `frontend/src/components/layout/sidebar.tsx` — add `Support` entry in `adminNav`.
- `frontend/src/lib/i18n/translations.ts` — add `nav.support` + `support.*` keys in six locales; remove `pricing.*` keys.
- `frontend/next.config.ts` — add `/pricing` → `/` redirect.
- `frontend/.env.local.example` — document `NEXT_PUBLIC_BYBIT_USDT_ADDRESS`.

### Frontend (deleted)
- `frontend/src/app/pricing/page.tsx`

---

## Tasks

### Task 1: Donations config + settings

**Files:**
- Create: `backend/app/donations/__init__.py`
- Create: `backend/app/donations/config.py`
- Modify: `backend/app/config.py`
- Modify: `backend/.env.example`

- [ ] **Step 1: Create empty package marker**

```python
# backend/app/donations/__init__.py
```

(One empty file — just establishes the package.)

- [ ] **Step 2: Add settings keys in `backend/app/config.py`**

After the Lemon Squeezy block (around line 43), insert:

```python
# Open Collective — donations module
oc_api_token: str = ""
oc_webhook_secret: str = ""
oc_collective_slug: str = "grasslms"
oc_graphql_url: str = "https://api.opencollective.com/graphql/v2"
oc_success_url: str = ""  # e.g. https://grasslms.online/support/thanks
```

- [ ] **Step 3: Write `backend/app/donations/config.py`**

```python
"""Donations module configuration accessor.

Reads OC-related env vars from the global Settings. Lives in this file
so the donations module can be reasoned about in isolation and so tests
can monkeypatch a single object.
"""
from dataclasses import dataclass

from app.config import settings


@dataclass(frozen=True)
class DonationsSettings:
    api_token: str
    webhook_secret: str
    collective_slug: str
    graphql_url: str
    success_url: str

    @property
    def enabled(self) -> bool:
        return bool(self.api_token and self.collective_slug)


def get_donations_settings() -> DonationsSettings:
    return DonationsSettings(
        api_token=settings.oc_api_token,
        webhook_secret=settings.oc_webhook_secret,
        collective_slug=settings.oc_collective_slug,
        graphql_url=settings.oc_graphql_url,
        success_url=settings.oc_success_url or f"{settings.app_url}/support/thanks",
    )
```

- [ ] **Step 4: Document env in `backend/.env.example`**

Append:

```bash
# Open Collective donations
OC_API_TOKEN=
OC_WEBHOOK_SECRET=
OC_COLLECTIVE_SLUG=grasslms
OC_SUCCESS_URL=
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/donations/__init__.py backend/app/donations/config.py backend/app/config.py backend/.env.example
git commit -m "feat(donations): scaffold module config + env vars"
```

---

### Task 2: Donation model + enums

**Files:**
- Create: `backend/app/donations/models.py`
- Modify: `backend/app/main.py`, `backend/tests/conftest.py`

- [ ] **Step 1: Write the model**

```python
"""Donation model — stores OC orders initiated from /support.

Donations live outside the multi-tenant org boundary because they are
fiscal-host-level events. Donor data is PII; webhook payloads can
contain card last4 and are treated accordingly (excluded from logs and
from /stats).
"""
import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class Recurrence(str, enum.Enum):
    one_time = "one_time"
    monthly = "monthly"


class DonationStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    failed = "failed"


class Donation(Base, IDMixin, TimestampMixin):
    __tablename__ = "donations"

    oc_order_id: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True, index=True)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    recurrence: Mapped[Recurrence] = mapped_column(
        Enum(Recurrence, name="donation_recurrence"), nullable=False, default=Recurrence.one_time
    )
    donor_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    donor_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    anonymous: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[DonationStatus] = mapped_column(
        Enum(DonationStatus, name="donation_status"), nullable=False, default=DonationStatus.pending, index=True
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    raw_webhook: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
```

- [ ] **Step 2: Register the model in `main.py` lifespan**

Open `backend/app/main.py`. Search for `from app.gamification.models` in the lifespan block that imports models for `Base.metadata`. Add the donations import (alphabetical order):

```python
from app.donations.models import Donation  # noqa: F401
```

- [ ] **Step 3: Register in `tests/conftest.py`**

Open `backend/tests/conftest.py`. Search for `from app.gamification.models`. Add:

```python
from app.donations.models import Donation  # noqa: F401
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/donations/models.py backend/app/main.py backend/tests/conftest.py
git commit -m "feat(donations): Donation model + status/recurrence enums"
```

---

### Task 3: Alembic migration

**Files:**
- Create: `backend/alembic/versions/d0n4t10n5add_add_donations_module.py`

- [ ] **Step 1: Generate the migration**

```bash
cd backend && alembic revision --autogenerate -m "add donations module"
```

Expected: new file under `backend/alembic/versions/`. Rename to `d0n4t10n5add_add_donations_module.py` and set `revision = "d0n4t10n5add"` for consistency.

If the autogenerated migration contains unrelated diffs (drift from other models), trim it down to only `donations` table operations.

- [ ] **Step 2: Make the migration rerun-safe**

Replace the upgrade/downgrade bodies with:

```python
def upgrade() -> None:
    op.execute(
        "DO $$ BEGIN "
        "  CREATE TYPE donation_recurrence AS ENUM ('one_time', 'monthly'); "
        "EXCEPTION WHEN duplicate_object THEN null; "
        "END $$;"
    )
    op.execute(
        "DO $$ BEGIN "
        "  CREATE TYPE donation_status AS ENUM ('pending', 'confirmed', 'failed'); "
        "EXCEPTION WHEN duplicate_object THEN null; "
        "END $$;"
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS donations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            oc_order_id VARCHAR(64) UNIQUE,
            amount_cents INTEGER NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'USD',
            recurrence donation_recurrence NOT NULL DEFAULT 'one_time',
            donor_name VARCHAR(120),
            donor_email VARCHAR(255),
            message TEXT,
            anonymous BOOLEAN NOT NULL DEFAULT FALSE,
            status donation_status NOT NULL DEFAULT 'pending',
            confirmed_at TIMESTAMPTZ,
            raw_webhook JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_donations_status ON donations (status);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_donations_oc_order_id ON donations (oc_order_id);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS donations;")
    op.execute("DROP TYPE IF EXISTS donation_status;")
    op.execute("DROP TYPE IF EXISTS donation_recurrence;")
```

- [ ] **Step 3: Apply the migration**

```bash
cd backend && alembic upgrade head
```

Expected: `INFO ... Running upgrade ... -> d0n4t10n5add, add donations module`.

- [ ] **Step 4: Verify with psql**

```bash
docker compose exec db psql -U lms -d lms -c "\d donations"
```

Expected: column listing matches the model.

- [ ] **Step 5: Commit**

```bash
git add backend/alembic/versions/d0n4t10n5add_add_donations_module.py
git commit -m "feat(donations): alembic migration for donations table"
```

---

### Task 4: Pydantic schemas

**Files:**
- Create: `backend/app/donations/schemas.py`

- [ ] **Step 1: Write the schemas**

```python
"""Donation request/response schemas."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.donations.models import DonationStatus, Recurrence


class DonationInitiateRequest(BaseModel):
    amount_cents: int = Field(ge=100, le=1_000_000, description="USD cents. Min 100 ($1), max 1_000_000 ($10k).")
    recurrence: Recurrence = Recurrence.one_time
    donor_name: str | None = Field(default=None, max_length=120)
    donor_email: EmailStr | None = None
    message: str | None = Field(default=None, max_length=2000)
    anonymous: bool = False


class DonationInitiateResponse(BaseModel):
    donation_id: UUID
    oc_checkout_url: str


class DonationStatusResponse(BaseModel):
    id: UUID
    status: DonationStatus
    amount_cents: int
    currency: str
    recurrence: Recurrence
    donor_name: str | None
    anonymous: bool
    confirmed_at: datetime | None

    model_config = {"from_attributes": True}


class DonationStatsResponse(BaseModel):
    total_confirmed_usd: float
    donor_count: int
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/donations/schemas.py
git commit -m "feat(donations): pydantic request/response schemas"
```

---

### Task 5: OC GraphQL client + webhook signature verification

**Files:**
- Create: `backend/app/donations/service.py`

- [ ] **Step 1: Write the service layer**

```python
"""Service layer for donations.

Wraps the Open Collective GraphQL API and handles webhook validation.
The service is intentionally thin: it builds the createOrder mutation
variables, dispatches it via httpx.AsyncClient, and returns the OC
order URL. Webhook handling verifies HMAC before mutating any row.
"""
import hashlib
import hmac
import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.donations.config import DonationsSettings
from app.donations.models import Donation, DonationStatus, Recurrence

logger = logging.getLogger(__name__)


CREATE_ORDER_MUTATION = """
mutation CreateGuestOrder($order: OrderCreateInput!) {
  createOrder(order: $order) {
    order {
      id
      legacyId
      status
      paymentMethod { service type }
    }
    stripeError { message }
  }
}
"""


class OCClientError(RuntimeError):
    """Raised when the OC API rejects the request or is unreachable."""


def _frequency(recurrence: Recurrence) -> str:
    return "MONTHLY" if recurrence == Recurrence.monthly else "ONETIME"


async def create_oc_order(
    cfg: DonationsSettings,
    *,
    donation: Donation,
    success_url: str,
) -> str:
    """Call OC createOrder and return the checkout URL."""
    if not cfg.enabled:
        raise OCClientError("OC integration is not configured")

    guest_info = None if donation.anonymous or not donation.donor_email else {
        "email": donation.donor_email,
        "name": donation.donor_name,
    }
    variables = {
        "order": {
            "amount": {"valueInCents": donation.amount_cents, "currency": donation.currency},
            "frequency": _frequency(donation.recurrence),
            "toAccount": {"slug": cfg.collective_slug},
            "fromAccount": None,
            "guestInfo": guest_info,
            "isGuestContribution": True,
            "context": {"successUrl": f"{success_url}?d={donation.id}"},
            "customData": {"lmsDonationId": str(donation.id)},
        }
    }

    headers = {"Personal-Token": cfg.api_token, "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
        try:
            resp = await client.post(
                cfg.graphql_url,
                headers=headers,
                json={"query": CREATE_ORDER_MUTATION, "variables": variables},
            )
        except httpx.HTTPError as e:
            logger.warning("OC API unreachable: %s", e)
            raise OCClientError("OC API unreachable") from e

    if resp.status_code >= 500:
        raise OCClientError(f"OC API server error: {resp.status_code}")
    data = resp.json()
    if "errors" in data:
        message = data["errors"][0].get("message", "unknown OC error")
        raise OCClientError(message)

    order = data.get("data", {}).get("createOrder", {}).get("order")
    if not order:
        raise OCClientError("OC createOrder returned no order")

    legacy_id = order.get("legacyId")
    donation.oc_order_id = str(legacy_id) if legacy_id is not None else order["id"]
    return f"https://opencollective.com/{cfg.collective_slug}/orders/{donation.oc_order_id}/checkout"


def verify_webhook_signature(secret: str, raw_body: bytes, signature: str | None) -> bool:
    """HMAC-SHA256 verification with constant-time compare."""
    if not signature or not secret:
        return False
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature.strip())


async def apply_webhook_update(
    session: AsyncSession,
    *,
    payload: dict[str, Any],
) -> Donation | None:
    """Update a donation row from an OC webhook payload.

    Idempotent: if the donation is already confirmed, no-op. If the order
    id is unknown, log and return None (still ack with 200 to OC).
    """
    order = payload.get("data", {}).get("order") or payload.get("order") or {}
    oc_order_id = str(order.get("legacyId") or order.get("id") or "").strip()
    if not oc_order_id:
        logger.info("webhook with no order id: %s", payload.get("activity"))
        return None

    stmt = select(Donation).where(Donation.oc_order_id == oc_order_id)
    donation = (await session.execute(stmt)).scalar_one_or_none()
    if not donation:
        logger.info("webhook for unknown OC order %s — ignored", oc_order_id)
        return None

    if donation.status == DonationStatus.confirmed:
        return donation  # idempotent

    status_str = str(order.get("status", "")).lower()
    if status_str in ("paid", "active", "processed"):
        donation.status = DonationStatus.confirmed
        donation.confirmed_at = datetime.now(timezone.utc)
    elif status_str in ("rejected", "error", "expired"):
        donation.status = DonationStatus.failed
    donation.raw_webhook = payload
    await session.flush()
    return donation


async def aggregate_stats(session: AsyncSession) -> tuple[float, int]:
    """Return (total_confirmed_usd, donor_count)."""
    stmt = select(
        func.coalesce(func.sum(Donation.amount_cents), 0),
        func.count(Donation.id),
    ).where(Donation.status == DonationStatus.confirmed)
    total_cents, count = (await session.execute(stmt)).one()
    return float(total_cents) / 100.0, int(count)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/donations/service.py
git commit -m "feat(donations): OC GraphQL client + webhook verifier"
```

---

### Task 6: Router endpoints

**Files:**
- Create: `backend/app/donations/router.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Write the router**

```python
"""Donations router — public endpoints (/initiate, /webhook) + GET stats."""
import json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.rate_limit import limiter
from app.db.session import get_db
from app.donations.config import get_donations_settings
from app.donations.models import Donation, DonationStatus
from app.donations.schemas import (
    DonationInitiateRequest,
    DonationInitiateResponse,
    DonationStatsResponse,
    DonationStatusResponse,
)
from app.donations.service import (
    OCClientError,
    aggregate_stats,
    apply_webhook_update,
    create_oc_order,
    verify_webhook_signature,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/donations", tags=["donations"])


@router.post("/initiate", response_model=DonationInitiateResponse)
@limiter.limit("10/minute")
async def initiate_donation(
    request: Request,
    body: DonationInitiateRequest,
    db: AsyncSession = Depends(get_db),
) -> DonationInitiateResponse:
    cfg = get_donations_settings()
    if not cfg.enabled:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Donations not configured")

    donation = Donation(
        amount_cents=body.amount_cents,
        currency="USD",
        recurrence=body.recurrence,
        donor_name=None if body.anonymous else body.donor_name,
        donor_email=None if body.anonymous else body.donor_email,
        message=body.message,
        anonymous=body.anonymous,
        status=DonationStatus.pending,
    )
    db.add(donation)
    await db.flush()

    try:
        checkout_url = await create_oc_order(cfg, donation=donation, success_url=cfg.success_url)
    except OCClientError as e:
        logger.warning("createOrder failed: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Donation service unavailable")

    await db.flush()
    return DonationInitiateResponse(donation_id=donation.id, oc_checkout_url=checkout_url)


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def receive_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    cfg = get_donations_settings()
    raw_body = await request.body()
    signature = request.headers.get("x-oc-signature") or request.headers.get("x-hub-signature-256")
    if not verify_webhook_signature(cfg.webhook_secret, raw_body, signature):
        logger.warning("webhook HMAC mismatch from %s", request.client.host if request.client else "unknown")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")

    payload = json.loads(raw_body or b"{}")
    await apply_webhook_update(db, payload=payload)
    return {"ack": "ok"}


@router.get("/stats", response_model=DonationStatsResponse)
async def get_stats(db: AsyncSession = Depends(get_db)) -> DonationStatsResponse:
    total, count = await aggregate_stats(db)
    return DonationStatsResponse(total_confirmed_usd=total, donor_count=count)


@router.get("/{donation_id}", response_model=DonationStatusResponse)
async def get_donation(
    donation_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> DonationStatusResponse:
    stmt = select(Donation).where(Donation.id == donation_id)
    donation = (await db.execute(stmt)).scalar_one_or_none()
    if not donation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return DonationStatusResponse.model_validate(donation)
```

- [ ] **Step 2: Register the router in `backend/app/main.py`**

Add (alphabetical position) to the router-import block:

```python
from app.donations.router import router as donations_router
```

Find `app.include_router(...)` calls and add (alphabetical):

```python
app.include_router(donations_router)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/donations/router.py backend/app/main.py
git commit -m "feat(donations): router endpoints + register in main"
```

---

### Task 7: Backend tests

**Files:**
- Create: `backend/tests/test_donations.py`

- [ ] **Step 1: Write the failing tests**

```python
"""Donations module tests — covers /initiate, /webhook, /stats."""
import hashlib
import hmac
import json
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.donations.models import Donation, DonationStatus


def _sign(secret: str, body: bytes) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


async def test_initiate_happy_path(client: AsyncClient, db, monkeypatch):
    monkeypatch.setattr("app.donations.config.settings.oc_api_token", "fake")
    monkeypatch.setattr("app.donations.config.settings.oc_collective_slug", "grasslms")

    async def fake_create(cfg, donation, success_url):
        donation.oc_order_id = "12345"
        return "https://opencollective.com/grasslms/orders/12345/checkout"

    with patch("app.donations.router.create_oc_order", new=AsyncMock(side_effect=fake_create)):
        resp = await client.post(
            "/api/v1/donations/initiate",
            json={"amount_cents": 500, "recurrence": "one_time", "anonymous": True},
        )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "donation_id" in data
    assert data["oc_checkout_url"].endswith("/checkout")


async def test_initiate_rate_limit_returns_429(client: AsyncClient, monkeypatch):
    monkeypatch.setattr("app.donations.config.settings.oc_api_token", "fake")

    async def fake_create(cfg, donation, success_url):
        donation.oc_order_id = "x"
        return "https://example.com/checkout"

    with patch("app.donations.router.create_oc_order", new=AsyncMock(side_effect=fake_create)):
        for _ in range(10):
            r = await client.post(
                "/api/v1/donations/initiate",
                json={"amount_cents": 500, "recurrence": "one_time", "anonymous": True},
            )
            assert r.status_code == 200

        r = await client.post(
            "/api/v1/donations/initiate",
            json={"amount_cents": 500, "recurrence": "one_time", "anonymous": True},
        )
    assert r.status_code == 429


async def test_webhook_valid_hmac_marks_confirmed(client: AsyncClient, db, monkeypatch):
    monkeypatch.setattr("app.donations.config.settings.oc_webhook_secret", "shh")

    donation = Donation(
        amount_cents=500,
        currency="USD",
        oc_order_id="999",
        status=DonationStatus.pending,
    )
    db.add(donation)
    await db.flush()

    payload = {"data": {"order": {"legacyId": 999, "status": "paid"}}}
    body = json.dumps(payload).encode()
    sig = _sign("shh", body)

    resp = await client.post(
        "/api/v1/donations/webhook",
        content=body,
        headers={"Content-Type": "application/json", "x-oc-signature": sig},
    )
    assert resp.status_code == 200

    await db.refresh(donation)
    assert donation.status == DonationStatus.confirmed
    assert donation.confirmed_at is not None


async def test_webhook_invalid_hmac_rejected(client: AsyncClient, db, monkeypatch):
    monkeypatch.setattr("app.donations.config.settings.oc_webhook_secret", "shh")
    donation = Donation(amount_cents=500, currency="USD", oc_order_id="999", status=DonationStatus.pending)
    db.add(donation)
    await db.flush()

    payload = {"data": {"order": {"legacyId": 999, "status": "paid"}}}
    resp = await client.post(
        "/api/v1/donations/webhook",
        content=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "x-oc-signature": "deadbeef"},
    )
    assert resp.status_code == 401

    await db.refresh(donation)
    assert donation.status == DonationStatus.pending


async def test_webhook_idempotent_on_already_confirmed(client: AsyncClient, db, monkeypatch):
    monkeypatch.setattr("app.donations.config.settings.oc_webhook_secret", "shh")
    from datetime import datetime, timezone

    fixed_time = datetime(2026, 1, 1, tzinfo=timezone.utc)
    donation = Donation(
        amount_cents=500,
        currency="USD",
        oc_order_id="999",
        status=DonationStatus.confirmed,
        confirmed_at=fixed_time,
    )
    db.add(donation)
    await db.flush()

    payload = {"data": {"order": {"legacyId": 999, "status": "paid"}}}
    body = json.dumps(payload).encode()
    sig = _sign("shh", body)

    resp = await client.post(
        "/api/v1/donations/webhook",
        content=body,
        headers={"Content-Type": "application/json", "x-oc-signature": sig},
    )
    assert resp.status_code == 200

    await db.refresh(donation)
    assert donation.status == DonationStatus.confirmed
    assert donation.confirmed_at == fixed_time


async def test_stats_aggregates_confirmed_only(client: AsyncClient, db):
    db.add(Donation(amount_cents=1000, currency="USD", status=DonationStatus.confirmed))
    db.add(Donation(amount_cents=500, currency="USD", status=DonationStatus.confirmed))
    db.add(Donation(amount_cents=2500, currency="USD", status=DonationStatus.pending))
    await db.flush()

    resp = await client.get("/api/v1/donations/stats")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_confirmed_usd"] == 15.0
    assert body["donor_count"] == 2
```

- [ ] **Step 2: Run the tests**

```bash
cd backend && pytest tests/test_donations.py -v
```

Expected: 6/6 passing. Iterate if any fail.

- [ ] **Step 3: Run the full suite**

```bash
cd backend && pytest tests/ -q
```

Expected: no new failures.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/test_donations.py
git commit -m "test(donations): initiate, webhook hmac, stats"
```

---

### Task 8: Frontend API wrapper

**Files:**
- Create: `frontend/src/lib/api/donations.ts`

- [ ] **Step 1: Write the wrapper**

```typescript
import apiClient from "@/lib/api-client";

export type Recurrence = "one_time" | "monthly";
export type DonationStatus = "pending" | "confirmed" | "failed";

export interface DonationInitiateRequest {
  amount_cents: number;
  recurrence: Recurrence;
  donor_name?: string | null;
  donor_email?: string | null;
  message?: string | null;
  anonymous: boolean;
}

export interface DonationInitiateResponse {
  donation_id: string;
  oc_checkout_url: string;
}

export interface DonationStatusResponse {
  id: string;
  status: DonationStatus;
  amount_cents: number;
  currency: string;
  recurrence: Recurrence;
  donor_name: string | null;
  anonymous: boolean;
  confirmed_at: string | null;
}

export interface DonationStatsResponse {
  total_confirmed_usd: number;
  donor_count: number;
}

export async function initiateDonation(
  body: DonationInitiateRequest,
): Promise<DonationInitiateResponse> {
  const { data } = await apiClient.post<DonationInitiateResponse>(
    "/donations/initiate",
    body,
  );
  return data;
}

export async function getDonationStatus(id: string): Promise<DonationStatusResponse> {
  const { data } = await apiClient.get<DonationStatusResponse>(`/donations/${id}`);
  return data;
}

export async function getDonationStats(): Promise<DonationStatsResponse> {
  const { data } = await apiClient.get<DonationStatsResponse>("/donations/stats");
  return data;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/api/donations.ts
git commit -m "feat(donations): typed frontend API wrapper"
```

---

### Task 9: i18n keys in six locales

**Files:**
- Modify: `frontend/src/lib/i18n/translations.ts`

- [ ] **Step 1: Remove every `pricing.*` key**

Search the file for `"pricing.` and delete those lines from all six locale maps (`en`, `es`, `ru`, `tr`, `de`, `uk`).

- [ ] **Step 2: Add `nav.support`**

In each of the six locale maps, near the existing `nav.*` block, add:

| Locale | Value |
|---|---|
| en | `Support` |
| es | `Apoyo` |
| ru | `Поддержать` |
| tr | `Destek` |
| de | `Unterstützen` |
| uk | `Підтримати` |

```typescript
"nav.support": "Support",  // (replace value per locale)
```

- [ ] **Step 3: Add `support.*` block in all six locales**

English block (canonical):

```typescript
"support.heroTitle": "GrassLMS is free. Support its development.",
"support.heroSubtitle": "Built and maintained by one person. No paid plans yet.",
"support.recurrenceOneTime": "One-time",
"support.recurrenceMonthly": "Monthly",
"support.amountLabel": "Amount",
"support.customAmountPlaceholder": "Custom (USD)",
"support.donorNameLabel": "Your name (optional)",
"support.donorEmailLabel": "Email (optional)",
"support.messageLabel": "Message (optional)",
"support.anonymousLabel": "Make this contribution anonymous",
"support.cta": "Continue to payment →",
"support.handledBy": "Payment is securely handled by Open Collective.",
"support.whereTitle": "Where the money goes",
"support.whereBullet1": "Server infrastructure (Hetzner VPS, AI services, domain)",
"support.whereBullet2": "Maintainer time — the person who builds and supports this",
"support.transparencyLink": "Full transparency: see all donations on Open Collective →",
"support.thanksTitle": "Thank you for supporting GrassLMS.",
"support.thanksSubtext": "Your contribution helps keep the platform free for educators.",
"support.thanksBackToDashboard": "Back to dashboard",
"support.thanksViewCollective": "View collective on Open Collective",
"support.cryptoSectionTitle": "Or pay directly with crypto",
"support.cryptoDisclaimer": "Direct crypto payments bypass our fiscal host. They are received as personal income and have different tax implications. For tax-clean donations, use the buttons above.",
"support.cryptoCopyAddress": "Copy address",
"support.cryptoCopied": "Copied",
"support.popupBlocked": "Popup blocked. Open the donation page manually:",
"support.didPaymentGoThrough": "Did your payment go through?",
"support.checkAgain": "Check again",
"support.amountTooSmall": "Minimum is $1.",
"support.amountTooLarge": "Maximum is $10,000.",
"support.donationServiceUnavailable": "Donation service is temporarily unavailable. Please try again later.",
```

Russian block (translate every string; do not leave EN as stub):

```typescript
"support.heroTitle": "GrassLMS бесплатен. Поддержите развитие.",
"support.heroSubtitle": "Создаётся и поддерживается одним разработчиком. Платных планов пока нет.",
"support.recurrenceOneTime": "Разово",
"support.recurrenceMonthly": "Ежемесячно",
"support.amountLabel": "Сумма",
"support.customAmountPlaceholder": "Своя сумма (USD)",
"support.donorNameLabel": "Ваше имя (необязательно)",
"support.donorEmailLabel": "Email (необязательно)",
"support.messageLabel": "Сообщение (необязательно)",
"support.anonymousLabel": "Сделать пожертвование анонимным",
"support.cta": "Перейти к оплате →",
"support.handledBy": "Платёж обрабатывается через Open Collective.",
"support.whereTitle": "На что идут деньги",
"support.whereBullet1": "Серверы (Hetzner VPS, AI-сервисы, домен)",
"support.whereBullet2": "Время мейнтейнера — человека, который это создаёт и поддерживает",
"support.transparencyLink": "Полная прозрачность: все пожертвования на Open Collective →",
"support.thanksTitle": "Спасибо за поддержку GrassLMS.",
"support.thanksSubtext": "Ваш вклад помогает сохранить платформу бесплатной для преподавателей.",
"support.thanksBackToDashboard": "Назад в панель",
"support.thanksViewCollective": "Открыть Open Collective",
"support.cryptoSectionTitle": "Или оплатите напрямую криптовалютой",
"support.cryptoDisclaimer": "Прямые крипто-платежи минуют нашего fiscal host. Они приходят как личный доход и имеют другие налоговые последствия. Для «чистых» с точки зрения налогов донатов используйте кнопки выше.",
"support.cryptoCopyAddress": "Скопировать адрес",
"support.cryptoCopied": "Скопировано",
"support.popupBlocked": "Окно заблокировано. Откройте страницу пожертвования вручную:",
"support.didPaymentGoThrough": "Платёж прошёл?",
"support.checkAgain": "Проверить ещё раз",
"support.amountTooSmall": "Минимум — $1.",
"support.amountTooLarge": "Максимум — $10 000.",
"support.donationServiceUnavailable": "Сервис донатов временно недоступен. Попробуйте позже.",
```

Repeat the same exercise for `es`, `tr`, `de`, `uk` — each gets a real translation, not a stub.

- [ ] **Step 4: Run the i18n parity test**

```bash
cd frontend && npm test -- src/lib/i18n/translations.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/i18n/translations.ts
git commit -m "feat(i18n): support.* keys in 6 locales; remove pricing.*"
```

---

### Task 10: WhereMoneyGoes component

**Files:**
- Create: `frontend/src/components/support/where-money-goes.tsx`

- [ ] **Step 1: Write the component**

```typescript
"use client";

import { Server, Clock } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";

export function WhereMoneyGoes() {
  const { t } = useTranslation();
  return (
    <section className="rounded-lg border border-border bg-paper-2 p-6">
      <h2 className="mb-4 text-lg font-bold text-text">{t("support.whereTitle")}</h2>
      <ul className="space-y-3 text-sm text-ink-700">
        <li className="flex items-start gap-3">
          <Server className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>{t("support.whereBullet1")}</span>
        </li>
        <li className="flex items-start gap-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>{t("support.whereBullet2")}</span>
        </li>
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/support/where-money-goes.tsx
git commit -m "feat(support): WhereMoneyGoes info component"
```

---

### Task 11: DonationForm + Vitest tests

**Files:**
- Create: `frontend/src/components/support/donation-form.tsx`
- Create: `frontend/src/components/support/donation-form.test.tsx`

- [ ] **Step 1: Write the form component**

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";
import {
  initiateDonation,
  getDonationStatus,
  type Recurrence,
} from "@/lib/api/donations";

const AMOUNTS = [5, 10, 15, 50] as const;
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

const schema = z.object({
  amount: z
    .number({ invalid_type_error: "Required" })
    .int()
    .min(1, { message: "min" })
    .max(10000, { message: "max" }),
  recurrence: z.enum(["one_time", "monthly"]),
  donorName: z.string().max(120).optional().or(z.literal("")),
  donorEmail: z.string().email().optional().or(z.literal("")),
  message: z.string().max(2000).optional().or(z.literal("")),
  anonymous: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function DonationForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const [selectedPreset, setSelectedPreset] = useState<number | null>(5);
  const [pollingId, setPollingId] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState<string | null>(null);
  const pollStartRef = useRef<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: 5,
      recurrence: "one_time",
      donorName: "",
      donorEmail: "",
      message: "",
      anonymous: false,
    },
  });

  const anonymous = watch("anonymous");
  const recurrence = watch("recurrence");

  useEffect(() => {
    if (!pollingId) return;
    pollStartRef.current = Date.now();
    const interval = setInterval(async () => {
      try {
        const status = await getDonationStatus(pollingId);
        if (status.status === "confirmed") {
          clearInterval(interval);
          router.push(`/support/thanks?d=${pollingId}`);
          return;
        }
        if (Date.now() - (pollStartRef.current ?? 0) > POLL_TIMEOUT_MS) {
          clearInterval(interval);
          setShowFallback(t("support.didPaymentGoThrough"));
        }
      } catch {
        // keep polling on transient errors
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [pollingId, router, t]);

  const pickPreset = (amount: number) => {
    setSelectedPreset(amount);
    setValue("amount", amount, { shouldValidate: true });
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const resp = await initiateDonation({
        amount_cents: Math.round(values.amount * 100),
        recurrence: values.recurrence as Recurrence,
        donor_name: values.anonymous ? null : values.donorName || null,
        donor_email: values.anonymous ? null : values.donorEmail || null,
        message: values.message || null,
        anonymous: values.anonymous,
      });
      const popup = window.open(
        resp.oc_checkout_url,
        "oc_checkout",
        "width=480,height=720",
      );
      if (!popup) {
        setShowFallback(resp.oc_checkout_url);
        return;
      }
      setPollingId(resp.donation_id);
    } catch {
      toast.error(t("support.donationServiceUnavailable"));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-lg border border-border bg-paper-2 p-6">
      <div role="group" aria-label={t("support.amountLabel")} className="flex gap-2">
        <button
          type="button"
          aria-pressed={recurrence === "one_time"}
          onClick={() => setValue("recurrence", "one_time", { shouldValidate: true })}
          className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold ${
            recurrence === "one_time"
              ? "border-primary bg-success-soft text-success-fg"
              : "border-border text-text-muted"
          }`}
        >
          {t("support.recurrenceOneTime")}
        </button>
        <button
          type="button"
          aria-pressed={recurrence === "monthly"}
          onClick={() => setValue("recurrence", "monthly", { shouldValidate: true })}
          className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold ${
            recurrence === "monthly"
              ? "border-primary bg-success-soft text-success-fg"
              : "border-border text-text-muted"
          }`}
        >
          {t("support.recurrenceMonthly")}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            aria-pressed={selectedPreset === amount}
            onClick={() => pickPreset(amount)}
            className={`rounded-md border px-3 py-3 text-sm font-bold ${
              selectedPreset === amount
                ? "border-primary bg-success-soft text-success-fg"
                : "border-border text-text"
            }`}
          >
            ${amount}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-sm font-semibold text-text-muted">
          {t("support.customAmountPlaceholder")}
        </label>
        <input
          type="number"
          min={1}
          max={10000}
          step={1}
          {...register("amount", { valueAsNumber: true })}
          onChange={(e) => {
            register("amount", { valueAsNumber: true }).onChange(e);
            setSelectedPreset(null);
          }}
          className="mt-1 w-full rounded-md border border-border bg-paper-2 px-3 py-2"
        />
        {errors.amount?.message === "min" && (
          <p className="text-xs text-coral-500">{t("support.amountTooSmall")}</p>
        )}
        {errors.amount?.message === "max" && (
          <p className="text-xs text-coral-500">{t("support.amountTooLarge")}</p>
        )}
      </div>

      {!anonymous && (
        <>
          <div>
            <label className="block text-sm font-semibold text-text-muted">
              {t("support.donorNameLabel")}
            </label>
            <input
              type="text"
              maxLength={120}
              {...register("donorName")}
              className="mt-1 w-full rounded-md border border-border bg-paper-2 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-muted">
              {t("support.donorEmailLabel")}
            </label>
            <input
              type="email"
              {...register("donorEmail")}
              className="mt-1 w-full rounded-md border border-border bg-paper-2 px-3 py-2"
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-semibold text-text-muted">
          {t("support.messageLabel")}
        </label>
        <textarea
          maxLength={2000}
          rows={3}
          {...register("message")}
          className="mt-1 w-full rounded-md border border-border bg-paper-2 px-3 py-2"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" {...register("anonymous")} />
        {t("support.anonymousLabel")}
      </label>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {t("support.cta")}
      </Button>
      <p className="text-center text-xs text-text-subtle">{t("support.handledBy")}</p>

      {showFallback && (
        <div className="rounded-md border border-warning bg-sun-50 p-3 text-sm">
          {showFallback === t("support.didPaymentGoThrough") ? (
            <p className="font-semibold">{t("support.didPaymentGoThrough")}</p>
          ) : (
            <>
              <p className="mb-2 font-semibold">{t("support.popupBlocked")}</p>
              <a href={showFallback} target="_blank" rel="noreferrer noopener" className="text-primary underline">
                {showFallback}
              </a>
            </>
          )}
        </div>
      )}
    </form>
  );
}
```

- [ ] **Step 2: Write the Vitest tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { DonationForm } from "./donation-form";

const initiateMock = vi.fn();
vi.mock("@/lib/api/donations", () => ({
  initiateDonation: (...args: unknown[]) => initiateMock(...args),
  getDonationStatus: vi.fn().mockResolvedValue({ status: "pending" }),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock("@/lib/i18n/context", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

beforeEach(() => {
  initiateMock.mockReset();
  initiateMock.mockResolvedValue({
    donation_id: "00000000-0000-0000-0000-000000000001",
    oc_checkout_url: "https://opencollective.com/grasslms/orders/1/checkout",
  });
  vi.spyOn(window, "open").mockReturnValue({} as unknown as Window);
});

describe("DonationForm", () => {
  it("renders all preset amounts", () => {
    render(<DonationForm />);
    expect(screen.getByRole("button", { name: "$5", pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "$10" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "$15" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "$50" })).toBeInTheDocument();
  });

  it("custom amount below 1 shows error", async () => {
    render(<DonationForm />);
    fireEvent.change(screen.getByLabelText("support.customAmountPlaceholder"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "support.cta" }));
    expect(await screen.findByText("support.amountTooSmall")).toBeInTheDocument();
  });

  it("toggles between one-time and monthly", () => {
    render(<DonationForm />);
    const monthly = screen.getByRole("button", { name: "support.recurrenceMonthly" });
    fireEvent.click(monthly);
    expect(monthly).toHaveAttribute("aria-pressed", "true");
  });

  it("anonymous checkbox hides donor name + email fields", () => {
    render(<DonationForm />);
    expect(screen.getByLabelText("support.donorNameLabel")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("support.anonymousLabel"));
    expect(screen.queryByLabelText("support.donorNameLabel")).toBeNull();
    expect(screen.queryByLabelText("support.donorEmailLabel")).toBeNull();
  });

  it("submit calls initiate with cents + opens popup", async () => {
    render(<DonationForm />);
    fireEvent.click(screen.getByRole("button", { name: "$15" }));
    fireEvent.click(screen.getByRole("button", { name: "support.cta" }));
    await waitFor(() =>
      expect(initiateMock).toHaveBeenCalledWith(
        expect.objectContaining({ amount_cents: 1500, recurrence: "one_time" }),
      ),
    );
    expect(window.open).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the tests**

```bash
cd frontend && npm test -- src/components/support/donation-form.test.tsx
```

Expected: 5/5 passing.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/support/donation-form.tsx frontend/src/components/support/donation-form.test.tsx
git commit -m "feat(support): DonationForm + vitest coverage"
```

---

### Task 12: Direct crypto section (Bybit USDT)

**Files:**
- Create: `frontend/src/components/support/direct-crypto.tsx`
- Modify: `frontend/.env.local.example`

- [ ] **Step 1: Install qrcode.react**

```bash
cd frontend && npm install qrcode.react --legacy-peer-deps
```

- [ ] **Step 2: Document env var in `frontend/.env.local.example`**

Append (create file if missing):

```bash
NEXT_PUBLIC_BYBIT_USDT_ADDRESS=
```

- [ ] **Step 3: Write the component**

```typescript
"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, AlertTriangle } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";

export function DirectCrypto() {
  const { t } = useTranslation();
  const address = process.env.NEXT_PUBLIC_BYBIT_USDT_ADDRESS ?? "";
  const [copied, setCopied] = useState(false);

  if (!address) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="rounded-lg border border-border bg-paper-2 p-6">
      <h2 className="mb-3 text-lg font-bold text-text">{t("support.cryptoSectionTitle")}</h2>
      <div className="mb-4 flex items-start gap-2 rounded-md border border-warning bg-sun-50 p-3 text-xs text-ink-700">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-fg" aria-hidden />
        <p>{t("support.cryptoDisclaimer")}</p>
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="rounded-md bg-white p-3">
          <QRCodeSVG value={address} size={140} />
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-xs text-text-muted">USDT TRC-20</p>
          <p className="break-all rounded-md border border-border bg-paper-1 p-2 font-mono text-xs">
            {address}
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-paper-2 px-3 py-1.5 text-xs font-semibold"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? t("support.cryptoCopied") : t("support.cryptoCopyAddress")}
          </button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/support/direct-crypto.tsx frontend/.env.local.example frontend/package.json frontend/package-lock.json
git commit -m "feat(support): direct crypto section (Bybit USDT QR)"
```

---

### Task 13: `/support` page

**Files:**
- Create: `frontend/src/app/(dashboard)/support/page.tsx`

- [ ] **Step 1: Write the page**

```typescript
"use client";

import Link from "next/link";

import { DonationForm } from "@/components/support/donation-form";
import { WhereMoneyGoes } from "@/components/support/where-money-goes";
import { DirectCrypto } from "@/components/support/direct-crypto";
import { useTranslation } from "@/lib/i18n/context";

export default function SupportPage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <header className="text-center">
        <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-text md:text-4xl">
          {t("support.heroTitle")}
        </h1>
        <p className="text-text-muted">{t("support.heroSubtitle")}</p>
      </header>

      <DonationForm />
      <WhereMoneyGoes />
      <DirectCrypto />

      <p className="text-center text-sm">
        <Link
          href="https://opencollective.com/grasslms"
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary underline"
        >
          {t("support.transparencyLink")}
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/(dashboard)/support/page.tsx
git commit -m "feat(support): /support route with form + info + crypto"
```

---

### Task 14: `/support/thanks` page

**Files:**
- Create: `frontend/src/app/(dashboard)/support/thanks/page.tsx`

- [ ] **Step 1: Write the page**

```typescript
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";
import { getDonationStatus, type DonationStatusResponse } from "@/lib/api/donations";

export default function ThanksPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const donationId = searchParams.get("d");
  const [donation, setDonation] = useState<DonationStatusResponse | null>(null);

  useEffect(() => {
    if (!donationId) return;
    getDonationStatus(donationId)
      .then(setDonation)
      .catch(() => setDonation(null));
  }, [donationId]);

  const displayName = donation && !donation.anonymous ? donation.donor_name : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight text-text md:text-4xl">
        {t("support.thanksTitle")}
      </h1>
      <p className="text-text-muted">
        {displayName ? `${displayName} — ` : ""}
        {t("support.thanksSubtext")}
      </p>
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/dashboard">
          <Button>{t("support.thanksBackToDashboard")}</Button>
        </Link>
        <Link href="https://opencollective.com/grasslms" target="_blank" rel="noreferrer noopener">
          <Button variant="outline">{t("support.thanksViewCollective")}</Button>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/(dashboard)/support/thanks/page.tsx
git commit -m "feat(support): /support/thanks success page"
```

---

### Task 15: Sidebar entry for teachers + admins

**Files:**
- Modify: `frontend/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Inspect existing `isMenuVisible` behaviour**

Open `frontend/src/components/layout/sidebar.tsx`. Find the `isMenuVisible` function (above the `adminNav` array, around line 60-85). Confirm whether unknown keys return `true` by default. If yes, you can use `isMenuVisible("support")` directly. If no, add `support` as a recognized key returning `true`.

- [ ] **Step 2: Import the icon**

Add `Heart` to the lucide-react import block at the top of the file:

```typescript
import { Heart } from "lucide-react";
```

- [ ] **Step 3: Add the nav entry**

In the `adminNav` array (around line 89), insert just before the `/admin/settings` entry:

```typescript
...(isMenuVisible("support") ? [{ href: "/support", label: t("nav.support"), icon: Heart }] : []),
```

Also add the tour anchor mapping in the existing block (search for `"/admin/billing": "sidebar-billing"`):

```typescript
"/support": "sidebar-support",
```

- [ ] **Step 4: Verify the build**

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/sidebar.tsx
git commit -m "feat(support): Support entry in admin sidebar"
```

---

### Task 16: Remove `/pricing` route + redirect

**Files:**
- Delete: `frontend/src/app/pricing/page.tsx`
- Modify: `frontend/next.config.ts`

- [ ] **Step 1: Delete the legacy pricing page**

```bash
git rm frontend/src/app/pricing/page.tsx
```

- [ ] **Step 2: Add the redirect to `next.config.ts`**

Replace `frontend/next.config.ts` with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      { source: "/pricing", destination: "/", permanent: false },
    ];
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) return [];
    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      { source: "/health", destination: `${backendUrl}/health` },
      { source: "/docs", destination: `${backendUrl}/docs` },
      { source: "/openapi.json", destination: `${backendUrl}/openapi.json` },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 3: Run the build**

```bash
cd frontend && npm run build
```

Expected: build succeeds, no references to `pricing.*` translation keys remain.

- [ ] **Step 4: Re-run the i18n parity test**

```bash
cd frontend && npm test -- src/lib/i18n/translations.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/next.config.ts
git commit -m "chore(pricing): delete page + 302 redirect /pricing → /"
```

---

### Task 17: Full-stack smoke check

- [ ] **Step 1: Start backend and frontend locally**

```bash
# terminal 1
docker compose up -d db redis
cd backend && alembic upgrade head
OC_API_TOKEN=dummy OC_COLLECTIVE_SLUG=grasslms uvicorn app.main:app --reload

# terminal 2
cd frontend && npm run dev
```

- [ ] **Step 2: Hit `/api/v1/donations/stats`**

```bash
curl -s http://localhost:8000/api/v1/donations/stats
```

Expected:

```json
{"total_confirmed_usd":0.0,"donor_count":0}
```

- [ ] **Step 3: Verify `/support` renders for a teacher/admin**

Log in as `teacher@grasslms.online`. Visit `http://localhost:3000/support`. Confirm:
- Sidebar has the "Support" item with heart icon.
- Hero, donation form, "Where the money goes" all render.
- Toggling recurrence, picking presets, and the anonymous checkbox behave as expected.
- With `NEXT_PUBLIC_BYBIT_USDT_ADDRESS` unset, the crypto section is hidden.

- [ ] **Step 4: Verify `/pricing` redirects**

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/pricing
```

Expected: `307 http://localhost:3000/`.

- [ ] **Step 5: Run all tests**

```bash
cd backend && pytest tests/ -q
cd frontend && npm test
```

Expected: green on both sides.

- [ ] **Step 6: Commit smoke-fix patches if any**

```bash
git commit -am "chore(support): smoke-fix integration glue"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task(s) |
|---|---|
| Donation model + enums | 2, 3 |
| OC GraphQL integration | 5 |
| `/initiate`, `/webhook`, `/stats`, `/{id}` endpoints | 6 |
| Rate limiting + HMAC verification | 5, 6, 7 |
| Pydantic schemas | 4 |
| Frontend API wrapper | 8 |
| i18n keys in 6 locales | 9 |
| `WhereMoneyGoes` | 10 |
| `DonationForm` with grid + toggle + popup + polling | 11 |
| `/support` page | 13 |
| `/support/thanks` page | 14 |
| Sidebar item (admin/teacher only) | 15 |
| `/pricing` removal + redirect | 16 |
| Direct crypto / Bybit USDT | 12 |
| Backend tests (six listed in spec) | 7 |
| Frontend Vitest tests (five listed in spec) | 11 |
| Smoke / verification | 17 |

No spec section missing a task.

**Placeholder scan:** No `TBD`, `TODO`, or "implement later" placeholders. Every code step shows actual code.

**Type consistency:** `Recurrence`, `DonationStatus`, `Donation`, the four schemas, and the three API wrapper functions are defined in early tasks and referenced consistently in later tasks. `oc_order_id` is string everywhere.

**Deferred / out-of-scope (called out for the implementer):**
- VakıfBank SWIFT details — collected during fiscal-host onboarding, not required by code.
- `/api/v1/billing/plans` endpoint — left in place per spec ("Default: keep, mark with TODO"); not part of this plan.
- E2E Playwright flow for donations — deferred per spec.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-27-support-button-donations.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
