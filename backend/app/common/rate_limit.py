"""Rate limiting — slowapi with in-memory storage by default.

For production with multiple workers or instances, set RATE_LIMIT_STORAGE_URI
to a Redis URL (e.g. "redis://localhost:6379/0") so limits are shared across
processes. In-memory storage only rate-limits within a single process, which
means an attacker can bypass limits by hitting different workers.
"""
import os

from slowapi import Limiter
from slowapi.util import get_remote_address

# Prefer X-Forwarded-For when behind a proxy (Nginx, Cloudflare).
# slowapi's get_remote_address reads request.client.host — if the app is behind
# a trusted reverse proxy that sets X-Forwarded-For, FastAPI's
# ProxyHeadersMiddleware (enabled via uvicorn --proxy-headers) will have already
# rewritten request.client.host, so this still works.
_storage_uri = os.environ.get("RATE_LIMIT_STORAGE_URI", "memory://")

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=_storage_uri,
    # Default limits apply to every route unless overridden. Leave empty so only
    # explicitly-decorated endpoints are limited.
    default_limits=[],
    headers_enabled=True,  # Adds X-RateLimit-* headers to responses
)
