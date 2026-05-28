"""Lightweight profanity / slur screening for user-facing free text.

Used to gate the small set of fields a student can set that other people
see — primarily ``full_name`` (visible to peers in rosters/leaderboards) and
``bio`` (visible to staff). This is a *best-effort* first line of defence, not
a complete moderation system: it blocks obvious matches after normalising
common obfuscation (leetspeak, separators), but cannot catch every variant.
Anything stronger (ML moderation, human review queue) is deliberately out of
scope here.
"""

import re

# Curated set of English profanity / slurs. Lowercase, no separators.
# Intentionally small and obvious — extend as real abuse is observed.
_BANNED: frozenset[str] = frozenset(
    {
        "fuck",
        "shit",
        "bitch",
        "cunt",
        "asshole",
        "bastard",
        "dick",
        "pussy",
        "slut",
        "whore",
        "nigger",
        "nigga",
        "faggot",
        "fag",
        "retard",
        "spic",
        "chink",
        "kike",
        "tranny",
        "rape",
        "rapist",
        "porn",
    }
)

# Common leetspeak / obfuscation substitutions, applied before matching.
_LEET = str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s"})


def _normalize(text: str) -> str:
    lowered = text.lower().translate(_LEET)
    # Collapse anything that isn't a letter so "f.u.c.k" / "f u c k" -> "fuck".
    return re.sub(r"[^a-z]+", "", lowered)


def contains_profanity(text: str | None) -> bool:
    """Return True if ``text`` contains a banned word after normalisation."""
    if not text:
        return False
    collapsed = _normalize(text)
    if not collapsed:
        return False
    return any(word in collapsed for word in _BANNED)
