"""One-shot: take the 32 math_interactive lessons in the "Math Templates"
module of "Exercise Types Demo" and consolidate them into a single
lesson "All Math Templates" whose v2 content carries 32 exercise blocks.

After consolidation the 32 old per-template lessons are deleted.
Exercises are cloned (POST /exercises) into the kept lesson rather than
reparented, because the public exercises API exposes
title/config/sort_order updates only — not lesson_id.
"""

from __future__ import annotations

import json
import os
import ssl
import sys
import urllib.error
import urllib.request

BASE = os.environ.get("BASE_URL", "https://grasslms.online/api/v1").rstrip("/")
EMAIL = os.environ.get("LMS_ADMIN_EMAIL", "")
PASSWORD = os.environ.get("LMS_ADMIN_PASSWORD", "")
COURSE_TITLE = os.environ.get("COURSE_TITLE", "Exercise Types Demo")
MODULE_TITLE = os.environ.get("MODULE_TITLE", "Math Templates")
NEW_LESSON_TITLE = os.environ.get("NEW_LESSON_TITLE", "All Math Templates")

CTX = ssl.create_default_context()


def api(method: str, path: str, token: str | None = None, data: dict | None = None) -> dict | list:
    url = BASE + path
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        resp = urllib.request.urlopen(req, context=CTX, timeout=30)
        text = resp.read().decode()
        return json.loads(text) if text else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        print(f"ERROR {e.code} on {method} {path}: {err_body[:400]}", file=sys.stderr)
        raise


def main() -> int:
    if not EMAIL or not PASSWORD:
        print("Set LMS_ADMIN_EMAIL and LMS_ADMIN_PASSWORD", file=sys.stderr)
        return 1
    auth = api("POST", "/auth/login", data={"email": EMAIL, "password": PASSWORD})
    token = auth["access_token"]
    print(f"Logged in as {EMAIL}")

    courses = api("GET", "/courses", token=token)
    if isinstance(courses, dict):
        courses = courses.get("items") or courses.get("results") or []
    demo = next(
        (c for c in courses if c.get("title", "").lower() == COURSE_TITLE.lower()),
        None,
    )
    if not demo:
        print(f"Course '{COURSE_TITLE}' not found", file=sys.stderr)
        return 2
    course_id = demo["id"]
    print(f"Course: {course_id}")

    full = api("GET", f"/courses/{course_id}", token=token)
    module = next(
        (m for m in full.get("modules") or [] if (m.get("title") or "").lower() == MODULE_TITLE.lower()),
        None,
    )
    if not module:
        print(f"Module '{MODULE_TITLE}' not found", file=sys.stderr)
        return 3
    module_id = module["id"]
    print(f"Module: {module_id}")

    old_lessons = module.get("lessons") or []
    if not old_lessons:
        print("Module has no lessons; nothing to consolidate.")
        return 0

    # Collect (lesson_id, exercise_dict) pairs.
    pairs: list[tuple[str, dict]] = []
    for lesson in old_lessons:
        lesson_id = lesson["id"]
        exs = api("GET", f"/exercises/by-lesson/{lesson_id}", token=token)
        for e in exs or []:
            if e.get("exercise_type") == "math_interactive":
                pairs.append((lesson_id, e))
    print(f"Collected {len(pairs)} math_interactive exercises from {len(old_lessons)} lessons")
    if not pairs:
        print("Nothing to clone, aborting.")
        return 0

    # Create the consolidated lesson.
    new_lesson = api(
        "POST",
        f"/courses/{course_id}/modules/{module_id}/lessons",
        token=token,
        data={
            "title": NEW_LESSON_TITLE,
            "content_type": "text",
            "content": {"version": 2, "blocks": []},
            "duration_minutes": 60,
        },
    )
    new_lesson_id = new_lesson["id"]
    print(f"Created consolidated lesson: {new_lesson_id}")

    # Clone exercises into the new lesson.
    blocks: list[dict] = []
    cloned = 0
    for i, (_old_lesson_id, ex) in enumerate(pairs):
        try:
            new_ex = api(
                "POST",
                "/exercises",
                token=token,
                data={
                    "lesson_id": new_lesson_id,
                    "exercise_type": "math_interactive",
                    "title": ex.get("title", "Math Exercise"),
                    "config": ex.get("config") or {},
                },
            )
        except Exception as err:
            print(f"  ! failed to clone {ex.get('title')}: {err}", file=sys.stderr)
            continue
        blocks.append(
            {
                "id": f"block_math_{new_ex['id'][:8]}",
                "type": "exercise",
                "sort_order": i,
                "page": 1,
                "exercise_id": new_ex["id"],
            }
        )
        cloned += 1
        print(f"  + cloned {ex.get('title')} -> {new_ex['id']}")

    # PUT consolidated lesson with all blocks.
    api(
        "PUT",
        f"/courses/{course_id}/modules/{module_id}/lessons/{new_lesson_id}/",
        token=token,
        data={
            "title": NEW_LESSON_TITLE,
            "content": {"version": 2, "blocks": blocks},
            "duration_minutes": 60,
        },
    )
    print(f"Attached {cloned} blocks to consolidated lesson")

    # Delete old lessons.
    deleted = 0
    for lesson in old_lessons:
        if lesson["id"] == new_lesson_id:
            continue
        try:
            api(
                "DELETE",
                f"/courses/{course_id}/modules/{module_id}/lessons/{lesson['id']}",
                token=token,
            )
            deleted += 1
        except Exception as err:
            print(f"  ! failed to delete old lesson {lesson['id']}: {err}", file=sys.stderr)
    print(f"Deleted {deleted} old lessons")

    print(f"\nDone. Cloned {cloned} exercises, removed {deleted} old lessons.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
