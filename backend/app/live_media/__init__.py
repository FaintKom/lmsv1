"""Audio and video inside a live lesson.

The lesson itself lives in :mod:`app.live_lessons` — roster, scene, board,
polls, signals, presence, attendance. This module adds the one thing that was
missing, which is the media, and the authority to run it.

The two meet at a lesson id and at the Redis pub/sub bus `live_lessons` already
owns. Nothing here keeps a second roster.
"""
