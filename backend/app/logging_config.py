"""Structured logging setup via structlog + stdlib logging.

Goals:
- JSON output in production so Sentry / Loki / log aggregators can parse fields.
- Pretty, coloured console output in development for local readability.
- A single level (LOG_LEVEL env var) applied to both stdlib and structlog.
- Request IDs propagated via a contextvar so any log line inside a request
  automatically carries the request's id for correlation.

Called once from main.py before the router imports. After this runs, both
`logging.getLogger(__name__).info(...)` and `structlog.get_logger().info(...)`
route through the same pipeline.
"""
from __future__ import annotations

import contextvars
import logging
import sys
from typing import Any

import structlog

from app.config import settings

# Contextvar carries the current request id across async boundaries. The
# request-id middleware in main.py sets it per request.
request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar(
    "request_id", default=""
)


def _add_request_id(
    logger: Any, method_name: str, event_dict: dict[str, Any]
) -> dict[str, Any]:
    """structlog processor that injects the current request id into every log."""
    rid = request_id_var.get()
    if rid:
        event_dict["request_id"] = rid
    return event_dict


def configure_logging() -> None:
    """Install logging handlers and processors. Idempotent."""
    level_name = (settings.log_level or "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    # Shared structlog processors — run in order
    shared_processors: list[Any] = [
        structlog.contextvars.merge_contextvars,
        _add_request_id,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
    ]

    shared_processors.append(structlog.processors.format_exc_info)

    if settings.log_json:
        # Production: JSON lines for log aggregators
        renderer: Any = structlog.processors.JSONRenderer()
    else:
        # Dev: coloured, human-readable
        renderer = structlog.dev.ConsoleRenderer(colors=True)

    # structlog-originated logs: pipeline ends with wrap_for_formatter so
    # the stdlib ProcessorFormatter below knows not to re-render them.
    structlog.configure(
        processors=shared_processors + [
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter
        ],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # stdlib-originated logs (uvicorn, sqlalchemy, etc.) run through
    # `foreign_pre_chain` so they end up in the same structured format.
    # structlog-originated entries skip foreign_pre_chain and go straight
    # to the renderer via wrap_for_formatter.
    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared_processors,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    # Remove any pre-existing handlers so we don't duplicate output when
    # uvicorn reloads or the module is imported twice.
    root.handlers = [handler]
    root.setLevel(level)

    # Tame noisy third-party loggers
    for noisy in ("sqlalchemy.engine", "httpx", "httpcore", "asyncio"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    # Uvicorn has its own access log handler; route it through ours
    logging.getLogger("uvicorn.access").setLevel(level)
    logging.getLogger("uvicorn.error").setLevel(level)


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Shortcut for `structlog.get_logger(name)`."""
    return structlog.get_logger(name)
