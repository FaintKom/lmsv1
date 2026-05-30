"""Shared time-on-task helpers for submission analytics.

Phase 1 introduced per-attempt time capture on ExerciseSubmission; Phase 2
extends it to QuizSubmission and AssignmentSubmission. The clamp rule is shared
here so all three submit paths treat client-reported ``elapsed_seconds``
identically: ignore garbage, floor at 0, cap at 24h (clock skew / tab left open
overnight).
"""
from __future__ import annotations

# Cap time-on-task at 24h to drop garbage (clock skew, tab left open overnight).
MAX_ELAPSED_SECONDS = 24 * 60 * 60


def normalize_elapsed(raw: object) -> int | None:
    """Validate/clamp client-reported elapsed_seconds to [0, 24h].

    Returns None when the value is absent or unparseable so callers can leave
    the timing columns NULL (backward-compatible with older clients).
    """
    if raw is None:
        return None
    try:
        secs = int(raw)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if secs < 0:
        return 0
    return min(secs, MAX_ELAPSED_SECONDS)
