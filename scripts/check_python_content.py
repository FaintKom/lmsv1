"""Validate the authored Python-course content before seeding it.

Three checks, all of which have caught real mistakes while writing this course:

1. Every file parses, and every ``exercise`` block points at an exercise
   defined in the same lesson (and vice versa).
2. Each ``code_challenge``'s own ``solution_code`` is executed against its
   ``test_cases``. An exercise whose reference solution fails its own tests is
   unsolvable by the student, and nothing else in the pipeline would notice.
3. Prose length per lesson, with HTML tags and code samples stripped, so the
   number reflects what a reader actually reads.

Solutions run in a subprocess with a timeout — a reference solution with an
accidental infinite loop should fail this check, not hang it.

    python scripts/check_python_content.py
    python scripts/check_python_content.py --min-words 800

Exit code is non-zero if any exercise fails, so this is safe to put in CI later.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

CONTENT_DIR = Path(__file__).resolve().parent / "content" / "python"


def prose_words(html: str) -> int:
    """Word count of the readable text: no tags, no code samples, no entities."""
    text = re.sub(r"<pre><code>.*?</code></pre>", " ", html, flags=re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&[a-z]+;", " ", text)
    return len(text.split())


def run_solution(code: str, stdin: str, timeout: int) -> tuple[bool, str]:
    try:
        proc = subprocess.run(
            [sys.executable, "-c", code],
            input=stdin + "\n",
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        return False, f"timed out after {timeout}s"
    if proc.returncode != 0:
        return False, (proc.stderr.strip().splitlines() or ["non-zero exit"])[-1]
    return True, proc.stdout


def check_lesson(module_slug: str, lesson: dict, min_words: int) -> list[str]:
    problems: list[str] = []
    key = f"{module_slug}/{lesson['slug']}"

    refs = {ex["ref"] for ex in lesson.get("exercises", [])}
    used = {b["ref"] for b in lesson["blocks"] if b["type"] == "exercise"}
    for missing in sorted(used - refs):
        problems.append(f"{key}: block points at undefined exercise {missing!r}")
    for orphan in sorted(refs - used):
        problems.append(f"{key}: exercise {orphan!r} is never placed in a block")

    words = sum(prose_words(b["body"]) for b in lesson["blocks"] if b["type"] == "text")
    flag = "" if words >= min_words else f"  << under {min_words}"
    print(f"  {key:48} {words:5} words{flag}")

    for ex in lesson.get("exercises", []):
        if ex["type"] != "code_challenge":
            continue
        code = ex["config"]["solution_code"]
        timeout = ex["config"].get("time_limit_seconds", 5)
        for tc in ex["test_cases"]:
            ok, out = run_solution(code, tc.get("input", ""), timeout)
            if not ok:
                problems.append(
                    f"{key}/{ex['ref']}: input {tc.get('input','')!r} -> {out}"
                )
                continue
            got, want = out.strip(), tc["expected_output"].strip()
            if got != want:
                problems.append(
                    f"{key}/{ex['ref']}: input {tc.get('input','')!r} "
                    f"expected {want!r} but the reference solution printed {got!r}"
                )
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--content-dir", default=str(CONTENT_DIR))
    parser.add_argument(
        "--min-words",
        type=int,
        default=800,
        help="Flag lessons with less prose than this (reported, not fatal)",
    )
    args = parser.parse_args()

    files = sorted(Path(args.content_dir).glob("*.json"))
    if not files:
        print(f"No content files in {args.content_dir}")
        return 1

    problems: list[str] = []
    lessons = exercises = 0
    for path in files:
        data = json.loads(path.read_text(encoding="utf-8"))
        print(f"\n{path.name}  ({data['title']})")
        for lesson in data["lessons"]:
            lessons += 1
            exercises += len(lesson.get("exercises", []))
            problems += check_lesson(data["slug"], lesson, args.min_words)

    print(f"\n{lessons} lessons, {exercises} exercises")
    if problems:
        print(f"\n{len(problems)} PROBLEM(S):")
        for p in problems:
            print(f"  - {p}")
        return 1
    print("All checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
