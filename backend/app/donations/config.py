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
