"""Axis A of the exercise-type corner-case run: what the server does with a bad answer.

Walks every exercise seeded by ``scripts/seed_corner_cases.py`` and sends, per
exercise:

1. the answer the fixture says is correct   <- positive control
2. an empty answer of the right shape
3. an answer of the wrong shape
4. against the V2 copy only, four submissions into a two-attempt limit

The correct answer goes first on purpose. An empty-answer probe on its own
passes just as happily against a server that grades nothing at all, so without
the control a page of 200s would mean nothing (constitution, principle II).

Answers are derived from ``qa/exercise-fixtures.json`` rather than written out
here, so a fixture whose keys the grader does not read shows up as a control
that cannot score. That is exactly how the crossword managed to be unsolvable
and score full marks at the same time.

Run it against a live QA stack:

    docker compose -f docker-compose.qa.yml exec -T backend python scripts/qa_axis_probe.py

Optional argument: a wave number (1-5) to probe one lesson's worth of types.
"""

from __future__ import annotations

import json
import pathlib
import sys
import uuid

import httpx

API = "http://localhost:8000/api/v1"
NAMESPACE_QA = uuid.UUID("12345678-1234-5678-1234-567812345678")
STUDENT_EMAIL = "qa-student@qa.example.com"
STUDENT_PASSWORD = "qa-test-not-for-prod"  # seeded into an ephemeral DB, not a secret

_FIXTURES = pathlib.Path(__file__).resolve().parent.parent / "qa" / "exercise-fixtures.json"

# Same grouping as seed_corner_cases.WAVES. Duplicated rather than imported
# because importing that module drags in the whole ORM for no gain here.
WAVES: list[tuple[str, list[str]]] = [
    ("1. Drag and drop, canvas",
     ["matching", "ordering", "categorize", "crossword", "word_search", "map_pin_drop"]),
    ("2. 3D and game levels",
     ["robot_2d", "world_3d", "stereometry", "math_interactive"]),
    ("3. Code and maths",
     ["code_challenge", "web_editor", "math_stepwise", "math_system"]),
    ("4. Languages",
     ["translation", "sentence_builder", "dialogue", "conjugation", "reading"]),
    ("5. Plain and special",
     ["quiz", "true_false", "fill_blanks", "srs_flashcard", "bubble_sheet",
      "file_upload", "scorm_package"]),
]

# Types this probe cannot answer over /submit, and why. Recorded rather than
# left blank: a missing row reads as coverage nobody has.
NOT_PROBEABLE = {
    "file_upload": "graded by the teacher; the student path is POST /upload with multipart",
    "scorm_package": "reports through CMI from the package, not through /submit",
}


def qa_uuid(slug: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE_QA, slug)


def load_fixtures() -> dict[str, dict]:
    data = json.loads(_FIXTURES.read_text(encoding="utf-8"))
    return {f["type"]: f for f in data["fixtures"]}


# ─── Correct answers, derived from the fixture ────────────────────────────


def correct_answer(ex_type: str, fixture: dict, variant: str) -> dict | None:
    """The body a student who knows the answer would send, or None if undecidable."""
    cfg = fixture.get("config") or {}

    if ex_type == "matching":
        return {"interactive_answers": {"pairs": cfg["pairs"]}}
    if ex_type == "ordering":
        return {"interactive_answers": {"order": cfg["correct_order"]}}
    if ex_type == "fill_blanks":
        return {"interactive_answers": {"blanks": cfg["blanks"]}}
    if ex_type == "true_false":
        return {"interactive_answers": {"answer": cfg["correct_answer"]}}
    if ex_type == "categorize":
        return {"interactive_answers": {
            "categories": {c["name"]: c["items"] for c in cfg["categories"]}
        }}
    if ex_type == "crossword":
        return {"interactive_answers": {
            "words": {str(i): w["word"] for i, w in enumerate(cfg["words"])}
        }}
    if ex_type == "word_search":
        return {"interactive_answers": {"found_words": cfg["words"]}}
    if ex_type == "map_pin_drop":
        return {"interactive_answers": {
            "pins": [{"x": p["x"], "y": p["y"]} for p in cfg["pins"]]
        }}
    if ex_type == "translation":
        return {"interactive_answers": {"translation": cfg["accepted_answers"][0]}}
    if ex_type == "sentence_builder":
        return {"interactive_answers": {"word_order": cfg["correct_order"]}}
    if ex_type == "conjugation":
        return {"interactive_answers": {
            "conjugations": {row["pronoun"]: row["correct"] for row in cfg["table"]}
        }}
    if ex_type == "dialogue":
        picks = {}
        for i, msg in enumerate(cfg.get("messages") or []):
            options = msg.get("options") or []
            if not options:
                continue
            first = options[0]
            picks[str(i)] = first if isinstance(first, str) else first.get("id")
        return {"interactive_answers": {"selections": picks}}
    if ex_type == "reading":
        return {"interactive_answers": {
            "answers": {str(i): q.get("correct_answer")
                        for i, q in enumerate(cfg.get("questions") or [])}
        }}
    if ex_type == "srs_flashcard":
        return {"interactive_answers": {
            "ratings": {str(i): "good" for i in range(len(cfg["cards"]))}
        }}
    if ex_type == "bubble_sheet":
        return {"interactive_answers": {
            "answers": {str(i): a for i, a in enumerate(cfg["correct_answers"])}
        }}
    if ex_type == "quiz":
        picks = []
        for j, q in enumerate(fixture.get("questions") or []):
            qid = str(qa_uuid(f"cc-question-quiz-{variant}-{j}"))
            if q["question_type"] == "multiple_choice":
                right = next(o["text"] for o in q["options"] if o.get("is_correct"))
                picks.append({"question_id": qid, "selected_option": right})
            else:
                picks.append({"question_id": qid, "text": q.get("correct_answer") or ""})
        return {"answers": picks}
    if ex_type == "code_challenge":
        return {"source_code": cfg["solution_code"], "language": cfg["language"]}
    if ex_type == "web_editor":
        return {"web_code": {
            "html": cfg.get("starter_html", ""),
            "css": cfg.get("starter_css", ""),
            "js": cfg.get("starter_js", ""),
        }}
    if ex_type in ("robot_2d", "world_3d", "math_interactive"):
        # The browser decides these and posts its verdict. Sending the verdict
        # without opening the exercise is the measurement, not a shortcut.
        return {"game_result": {"completed": True, "score": 1.0}}
    if ex_type == "math_stepwise":
        return {"interactive_answers": {"final_answer": cfg["final_answer"]}}
    if ex_type == "math_system":
        # x + y = 5, x - y = 1. Solved by hand, so the control does not lean on
        # the same solver that marks it.
        return {"interactive_answers": {"kind": "unique", "values": {"x": 3, "y": 2}}}
    if ex_type == "stereometry":
        # Cone, r=3, h=4: V = pi*r^2*h/3 = 12*pi = 37.699..., asked to 2 places.
        return {"interactive_answers": {"value": 37.70}}
    return None


def empty_answer(ex_type: str) -> dict:
    """An answer the student cleared: right shape, nothing in it."""
    if ex_type == "quiz":
        return {"answers": []}
    if ex_type == "code_challenge":
        return {"source_code": "", "language": "python"}
    if ex_type == "web_editor":
        return {"web_code": {}}
    if ex_type in ("robot_2d", "world_3d", "math_interactive"):
        return {"game_result": {}}
    return {"interactive_answers": {}}


def wrong_shape(ex_type: str) -> dict:
    """The right field holding the wrong type. A 422 is fine, a 500 is not."""
    if ex_type == "quiz":
        return {"answers": [{"question_id": "not-a-uuid"}]}
    if ex_type == "code_challenge":
        return {"source_code": 12345}
    if ex_type == "web_editor":
        return {"web_code": {"html": []}}
    if ex_type in ("robot_2d", "world_3d", "math_interactive"):
        return {"game_result": {"completed": "yes", "score": "lots"}}
    return {"interactive_answers": {"pairs": "not-a-list", "order": "not-a-list",
                                    "blanks": "not-a-list", "words": "not-a-dict",
                                    "pins": "not-a-list", "value": "not-a-number"}}


def wrong_answer(ex_type: str) -> dict:
    """A plausible but wrong answer, for burning through the attempt limit."""
    if ex_type == "quiz":
        return {"answers": [{"question_id": "00000000-0000-0000-0000-000000000000",
                             "selected_option": "3"}]}
    if ex_type == "code_challenge":
        return {"source_code": "def add(a, b):\n    return 0", "language": "python"}
    if ex_type == "web_editor":
        return {"web_code": {"html": "<p>nope</p>", "css": "", "js": ""}}
    if ex_type in ("robot_2d", "world_3d", "math_interactive"):
        return {"game_result": {"completed": False, "score": 0.0}}
    return {"interactive_answers": {"order": ["three", "two", "one"],
                                    "answer": False,
                                    "translation": "definitely wrong",
                                    "value": 1.0}}


# ─── Driving ──────────────────────────────────────────────────────────────


def sign_in(client: httpx.Client) -> str:
    r = client.post(f"{API}/auth/login",
                    json={"email": STUDENT_EMAIL, "password": STUDENT_PASSWORD})
    r.raise_for_status()
    return r.json()["access_token"]


def submit(client: httpx.Client, ex_id: uuid.UUID, body: dict) -> tuple[int, str]:
    r = client.post(f"{API}/exercises/{ex_id}/submit", json=body)
    if r.status_code != 200:
        return r.status_code, r.text[:160].replace("\n", " ")
    d = r.json()
    return 200, (
        f"score={d.get('score')} passed={d.get('passed')} "
        f"attempt={d.get('attempt_number')} left={d.get('attempts_remaining')} "
        f"reached={d.get('max_attempts_reached')}"
    )


def row(ex_type: str, variant: str, probe: str, status: int | str, note: str) -> None:
    print(f"{ex_type}\t{variant}\t{probe}\t{status}\t{note}", flush=True)


def main() -> int:
    only_wave = int(sys.argv[1]) if len(sys.argv) > 1 else None

    fixtures = load_fixtures()
    print("type\tvariant\tprobe\tstatus\tnote", flush=True)

    with httpx.Client(timeout=60.0) as client:
        token = sign_in(client)
        client.headers["Authorization"] = f"Bearer {token}"

        for wave_no, (wave_name, types) in enumerate(WAVES, start=1):
            if only_wave and wave_no != only_wave:
                continue
            print(f"\n# {wave_name}", flush=True)
            for ex_type in types:
                if ex_type in NOT_PROBEABLE:
                    row(ex_type, "-", "skipped", "-", NOT_PROBEABLE[ex_type])
                    continue
                fixture = fixtures.get(ex_type)
                if fixture is None:
                    row(ex_type, "-", "skipped", "-", "no fixture for this type")
                    continue

                for variant in ("V1", "V2"):
                    ex_id = qa_uuid(f"cc-exercise-{ex_type}-{variant}")
                    seen = client.get(f"{API}/exercises/{ex_id}")
                    if seen.status_code != 200:
                        row(ex_type, variant, "read", seen.status_code,
                            "student cannot read this exercise")
                        continue

                    if variant == "V1":
                        good = correct_answer(ex_type, fixture, variant)
                        if good is None:
                            row(ex_type, variant, "control", "-",
                                "no answer derivable from the fixture")
                        else:
                            row(ex_type, variant, "control", *submit(client, ex_id, good))
                        row(ex_type, variant, "empty",
                            *submit(client, ex_id, empty_answer(ex_type)))
                        row(ex_type, variant, "wrong-shape",
                            *submit(client, ex_id, wrong_shape(ex_type)))
                    else:
                        # Two attempts allowed. Four presses, all wrong, so the
                        # limit is what stops it rather than a correct answer.
                        for n in range(1, 5):
                            row(ex_type, variant, f"attempt-{n}",
                                *submit(client, ex_id, wrong_answer(ex_type)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
