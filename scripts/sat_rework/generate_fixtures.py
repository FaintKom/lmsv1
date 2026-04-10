"""Generate standalone HTML fixtures for each lesson's widget.

These files are used by Playwright tests under
`frontend/widget-tests/widgets.spec.ts` to test widget logic without
the rest of the LMS (no login, no auth, no iframe sandbox borders).

They're also useful for manual debugging — open one in a browser to
poke at the widget directly.

Output: frontend/widget-tests/fixtures/lesson-{NN}-{slug}.html
"""
from __future__ import annotations

from pathlib import Path

from .template import widget_standalone_html
from . import (
    lesson_01_solving_linear,
    lesson_02_inequalities,
    lesson_03_systems,
    lesson_04_slope,
    lesson_05_graphing,
    lesson_06_interpreting,
)


# Each entry: (filename, title, module)
LESSONS = [
    ("lesson-01-solving-linear", "Equation Solver Workbench", lesson_01_solving_linear),
    ("lesson-02-inequalities", "Inequality Flipper", lesson_02_inequalities),
    ("lesson-03-systems", "Two-Line Intersection Explorer", lesson_03_systems),
    ("lesson-04-slope", "Slope from Two Points", lesson_04_slope),
    ("lesson-05-graphing", "y = mx + b Explorer", lesson_05_graphing),
    ("lesson-06-interpreting", "Real-World Linear Model Translator", lesson_06_interpreting),
]


def main() -> None:
    out_dir = Path(__file__).resolve().parents[2] / "frontend" / "widget-tests" / "fixtures"
    out_dir.mkdir(parents=True, exist_ok=True)

    for slug, title, mod in LESSONS:
        html = widget_standalone_html(
            title=title,
            html_body=mod.WIDGET_HTML,
            css=mod.WIDGET_CSS,
            js=mod.WIDGET_JS,
        )
        path = out_dir / f"{slug}.html"
        path.write_text(html, encoding="utf-8")
        print(f"  wrote {path.relative_to(out_dir.parents[2])}  ({len(html)} bytes)")

    print(f"\nDone. {len(LESSONS)} fixtures in {out_dir}")


if __name__ == "__main__":
    main()
