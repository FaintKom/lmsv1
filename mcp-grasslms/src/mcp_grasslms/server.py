"""MCP server: typed tools for seeding GrassLMS content.

Run:
    LMS_BASE_URL=https://staging.grasslms.online \
    LMS_TOKEN=<jwt> \
    python -m mcp_grasslms.server

Speaks MCP over stdio. Wire into Claude Desktop or any MCP client. Each
tool maps 1:1 to an LMS API call, with config args matching
`app.exercises.schemas.CONFIG_SCHEMAS`.
"""

from __future__ import annotations

import json

from mcp.server.fastmcp import FastMCP

from .client import LmsClient

mcp = FastMCP("grasslms")
_client: LmsClient | None = None


def _get_client() -> LmsClient:
    global _client
    if _client is None:
        _client = LmsClient()
    return _client


# Schema discovery

@mcp.tool()
async def get_exercise_config_schemas() -> str:
    """JSON Schemas for every exercise type's `config` field. Call this BEFORE
    creating exercises to know which keys belong in `config` per type."""
    return json.dumps(await _get_client().config_schemas(), indent=2)


@mcp.tool()
async def whoami() -> str:
    """Return the authenticated user (sanity-check for LMS_TOKEN)."""
    return json.dumps(await _get_client().me(), indent=2)


# Course / Module / Lesson scaffolding

@mcp.tool()
async def list_courses() -> str:
    return json.dumps(await _get_client().list_courses(), indent=2)


@mcp.tool()
async def get_course(course_id: str) -> str:
    return json.dumps(await _get_client().get_course(course_id), indent=2)


@mcp.tool()
async def create_course(
    title: str,
    description: str = "",
    category: str = "",
    status: str = "draft",
) -> str:
    """Create a course. Status: draft | published | archived."""
    return json.dumps(await _get_client().create_course({
        "title": title,
        "description": description,
        "category": category or None,
        "status": status,
    }), indent=2)


@mcp.tool()
async def add_module(course_id: str, title: str, sort_order: int = 0) -> str:
    return json.dumps(await _get_client().add_module(course_id, {
        "title": title, "sort_order": sort_order,
    }), indent=2)


@mcp.tool()
async def add_lesson(
    module_id: str,
    title: str,
    content_html: str = "",
    content_type: str = "text",
    sort_order: int = 0,
    duration_minutes: int | None = None,
) -> str:
    """`content_type`: text | video | quiz | code_challenge | file_upload |
    interactive | robot_2d | math_interactive | world_3d. Pass HTML for text."""
    return json.dumps(await _get_client().add_lesson(module_id, {
        "title": title,
        "content_type": content_type,
        "content": {"html": content_html, "body": content_html},
        "sort_order": sort_order,
        "duration_minutes": duration_minutes,
    }), indent=2)


# Exercise creation: one typed tool per ExerciseType

async def _create(exercise_type: str, lesson_id: str, title: str, config: dict) -> str:
    out = await _get_client().create_exercise({
        "lesson_id": lesson_id,
        "exercise_type": exercise_type,
        "title": title,
        "config": config,
    })
    return json.dumps(out, indent=2)


@mcp.tool()
async def create_true_false(lesson_id: str, title: str, statement: str, correct_answer: bool) -> str:
    return await _create("true_false", lesson_id, title, {
        "statement": statement, "correct_answer": correct_answer,
    })


@mcp.tool()
async def create_matching(lesson_id: str, title: str, pairs: list[dict], shuffle: bool = True) -> str:
    """`pairs`: [{"left": "...", "right": "..."}, ...]"""
    return await _create("matching", lesson_id, title, {"pairs": pairs, "shuffle": shuffle})


@mcp.tool()
async def create_ordering(lesson_id: str, title: str, items: list[str], correct_order: list[str]) -> str:
    return await _create("ordering", lesson_id, title, {
        "items": items, "correct_order": correct_order,
    })


@mcp.tool()
async def create_fill_blanks(lesson_id: str, title: str, text: str, blanks: list[str]) -> str:
    """`text` contains `{{blank}}` markers in order; `blanks` is the answer per marker."""
    return await _create("fill_blanks", lesson_id, title, {"text": text, "blanks": blanks})


@mcp.tool()
async def create_categorize(lesson_id: str, title: str, categories: list[dict]) -> str:
    """`categories`: [{"name": "...", "items": [...]}]"""
    return await _create("categorize", lesson_id, title, {"categories": categories})


@mcp.tool()
async def create_translation(
    lesson_id: str, title: str,
    source_text: str, source_language: str, target_language: str,
    accepted_answers: list[str], case_sensitive: bool = False,
) -> str:
    return await _create("translation", lesson_id, title, {
        "source_text": source_text,
        "source_language": source_language,
        "target_language": target_language,
        "accepted_answers": accepted_answers,
        "case_sensitive": case_sensitive,
    })


@mcp.tool()
async def create_sentence_builder(
    lesson_id: str, title: str,
    words: list[str], correct_order: list[str],
    distractors: list[str] | None = None, instructions: str = "",
) -> str:
    return await _create("sentence_builder", lesson_id, title, {
        "words": words,
        "correct_order": correct_order,
        "distractors": distractors or [],
        "instructions": instructions,
    })


@mcp.tool()
async def create_dialogue(lesson_id: str, title: str, context: str, messages: list[dict]) -> str:
    """`messages`: [{"speaker": "...", "text": "...", "options": [...]?}]"""
    return await _create("dialogue", lesson_id, title, {"context": context, "messages": messages})


@mcp.tool()
async def create_conjugation(
    lesson_id: str, title: str,
    verb: str, tense: str, language: str, table: list[dict],
) -> str:
    """`table`: [{"pronoun": "...", "correct": "..."}]"""
    return await _create("conjugation", lesson_id, title, {
        "verb": verb, "tense": tense, "language": language, "table": table,
    })


@mcp.tool()
async def create_reading(lesson_id: str, title: str, passage: str, questions: list[dict]) -> str:
    """`questions`: [{"question": "...", "type": "multiple_choice"|"open",
                      "options": [...]?, "correct_answer": "..."?}]"""
    return await _create("reading", lesson_id, title, {"passage": passage, "questions": questions})


@mcp.tool()
async def create_code_challenge(
    lesson_id: str, title: str,
    language: str = "python",
    starter_code: str = "", solution_code: str = "",
    time_limit_seconds: int = 10, memory_limit_mb: int = 256,
) -> str:
    return await _create("code_challenge", lesson_id, title, {
        "language": language,
        "starter_code": starter_code,
        "solution_code": solution_code,
        "time_limit_seconds": time_limit_seconds,
        "memory_limit_mb": memory_limit_mb,
    })


@mcp.tool()
async def create_quiz(
    lesson_id: str, title: str,
    passing_score: int = 70, time_limit_minutes: int | None = None,
) -> str:
    """Quiz container. Add questions separately via /exercises/{id}/questions."""
    return await _create("quiz", lesson_id, title, {
        "passing_score": passing_score,
        "time_limit_minutes": time_limit_minutes,
    })


@mcp.tool()
async def create_file_upload(
    lesson_id: str, title: str,
    allowed_types: list[str] | None = None, max_file_mb: int = 50,
) -> str:
    return await _create("file_upload", lesson_id, title, {
        "allowed_types": allowed_types or [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"],
        "max_file_mb": max_file_mb,
    })


@mcp.tool()
async def create_math_interactive(
    lesson_id: str, title: str,
    template_type: str = "coordinate_plane",
    template_config: dict | None = None,
    instructions: str = "", difficulty: str = "beginner",
) -> str:
    """`template_type`: coordinate_plane | number_line | scatter_plot |
    function_graph | inequality_graph | venn_diagram | visual_fractions |
    table_pattern | two_way_table | numeric_input | multiple_choice_math |
    arithmetic_puzzle | equation_solver | equation_balance | graph_transform |
    card_sort"""
    return await _create("math_interactive", lesson_id, title, {
        "template_type": template_type,
        "template_config": template_config or {},
        "instructions": instructions,
        "difficulty": difficulty,
    })


@mcp.tool()
async def create_web_editor(
    lesson_id: str, title: str,
    description: str = "",
    starter_html: str = "", starter_css: str = "", starter_js: str = "",
    requirements: list[str] | None = None,
) -> str:
    return await _create("web_editor", lesson_id, title, {
        "description": description,
        "starter_html": starter_html,
        "starter_css": starter_css,
        "starter_js": starter_js,
        "requirements": requirements or [],
    })


@mcp.tool()
async def create_srs_flashcard(
    lesson_id: str, title: str,
    cards: list[dict],
    instructions: str = "",
    daily_new_cards: int = 10,
    daily_review_cap: int = 100,
    show_audio: bool = True,
) -> str:
    """Create an SRS flashcard deck (spaced repetition).

    `cards`: [{"front": "...", "back": "...", "hint"?: "...",
              "audio_url"?: "...", "image_url"?: "..."}].
    Scheduling (SM-2) runs client-side; backend stores deck only.
    """
    return await _create("srs_flashcard", lesson_id, title, {
        "cards": cards,
        "instructions": instructions,
        "daily_new_cards": daily_new_cards,
        "daily_review_cap": daily_review_cap,
        "show_audio": show_audio,
    })


@mcp.tool()
async def create_crossword(
    lesson_id: str, title: str,
    rows: int, cols: int,
    grid: list[dict],
    clues: list[dict],
    deck_title: str = "",
) -> str:
    """Create a Crossword exercise.

    `grid`: [{"row": int, "col": int, "letter": "A"|"#" (black),
              "number"?: int}].
    `clues`: [{"number": int, "direction": "across"|"down",
               "clue": "...", "answer": "...",
               "start_row": int, "start_col": int}].
    """
    return await _create("crossword", lesson_id, title, {
        "rows": rows, "cols": cols,
        "grid": grid, "clues": clues,
        "title": deck_title,
    })


@mcp.tool()
async def create_word_search(
    lesson_id: str, title: str,
    words: list[str],
    rows: int = 12, cols: int = 12,
    grid: list[str] | None = None,
    diagonals: bool = True,
    backwards: bool = True,
) -> str:
    """Create a Word Search exercise.

    `words` are upper-cased, no spaces. If `grid` is empty/None, the
    frontend auto-generates a layout. Otherwise pass `rows` strings of
    `cols` chars each.
    """
    return await _create("word_search", lesson_id, title, {
        "rows": rows, "cols": cols,
        "words": words,
        "grid": grid or [],
        "diagonals": diagonals,
        "backwards": backwards,
    })


@mcp.tool()
async def create_map_pin_drop(
    lesson_id: str, title: str,
    targets: list[dict],
    initial_center: list[float] | None = None,
    initial_zoom: int = 2,
    show_labels: bool = False,
    time_limit_seconds: int | None = None,
) -> str:
    """Create a Map Pin-Drop exercise (click on Leaflet map to answer).

    `targets`: [{"label": "...", "lat": float, "lng": float,
                 "tolerance_km"?: float (default 50)}].
    `initial_center`: [lat, lng] or None (defaults to [0, 0]).
    """
    return await _create("map_pin_drop", lesson_id, title, {
        "targets": targets,
        "initial_center": initial_center or [0.0, 0.0],
        "initial_zoom": initial_zoom,
        "show_labels": show_labels,
        "time_limit_seconds": time_limit_seconds,
    })


@mcp.tool()
async def create_bubble_sheet(
    lesson_id: str, title: str,
    questions: list[dict],
    deck_title: str = "",
    answer_key_visible_to_students: bool = False,
    randomize_options_per_form: bool = False,
) -> str:
    """Create a printable Bubble-Sheet test (OMR scan grading).

    `questions`: [{"number": int, "options": ["A","B","C","D"],
                   "correct": "B"}].
    Backend generates printable PDF with ArUco fiducials; teacher
    photographs filled sheets, OMR pipeline grades.
    """
    return await _create("bubble_sheet", lesson_id, title, {
        "title": deck_title,
        "questions": questions,
        "answer_key_visible_to_students": answer_key_visible_to_students,
        "randomize_options_per_form": randomize_options_per_form,
    })


@mcp.tool()
async def list_exercises_for_lesson(lesson_id: str) -> str:
    return json.dumps(await _get_client().list_exercises_for_lesson(lesson_id), indent=2)


def main() -> None:
    """Stdio MCP server entry point."""
    mcp.run()


if __name__ == "__main__":
    main()
