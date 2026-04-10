"""Shared HTML helpers for SAT Math lesson rewrites.

Each lesson body is one big HTML string broken into sections by these
helpers so the content stays consistent across the 6 Heart of Algebra
lessons (and the rest of the rewrite later).

The output is plain HTML — KaTeX inline math via $...$ and $$...$$ is
processed by the frontend ContentRenderer; lists are styled by the
.lms-lesson-content scoped CSS added in commit 3289b7f.

Interactive widgets must be wrapped between the explicit
`<!-- interactive -->` ... `<!-- /interactive -->` markers so the
renderer's splitInteractive() finds them and embeds them in a
sandboxed iframe with autosize.
"""
from __future__ import annotations


def hero(title: str, subtitle: str, gradient: str = "from-indigo-600 to-violet-600") -> str:
    grad_map = {
        "from-indigo-600 to-violet-600": "#6366f1, #8b5cf6",
        "from-emerald-600 to-teal-600": "#10b981, #14b8a6",
        "from-rose-500 to-pink-600": "#f43f5e, #db2777",
        "from-amber-500 to-orange-600": "#f59e0b, #ea580c",
        "from-sky-500 to-blue-600": "#0ea5e9, #2563eb",
        "from-fuchsia-500 to-purple-600": "#d946ef, #9333ea",
    }
    grad = grad_map.get(gradient, grad_map["from-indigo-600 to-violet-600"])
    return f'''<div style="background:linear-gradient(135deg,{grad});border-radius:16px;padding:32px;margin-bottom:24px;color:white">
<h2 style="margin:0 0 8px;font-size:1.75rem;font-weight:800">{title}</h2>
<p style="margin:0;opacity:0.92;font-size:1.05rem">{subtitle}</p>
</div>'''


def callout(title: str, body: str, kind: str = "info") -> str:
    """Theme-aware callout. Colors live in globals.css under
    .lms-callout / .lms-callout--{kind} so they adapt to dark mode.

    kind ∈ {info, concept, example, pitfall, tactic, recap}
    """
    icons = {
        "info":    "&#x1F4A1;",
        "concept": "&#x1F511;",
        "example": "&#x1F4DD;",
        "pitfall": "&#x26A0;&#xFE0F;",
        "tactic":  "&#x1F3AF;",
        "recap":   "&#x1F4DA;",
    }
    icon = icons.get(kind, icons["info"])
    return f'''<div class="lms-callout lms-callout--{kind}">
<h3 class="lms-callout__title">{icon} {title}</h3>
<div class="lms-callout__body">{body}</div>
</div>'''


def section(title: str, body: str) -> str:
    """Section header bar — color comes from .lms-section-h CSS."""
    return f'<h3 class="lms-section-h">{title}</h3>\n{body}'


def worked_example(label: str, problem: str, steps: list[str], answer: str) -> str:
    """Worked example card. Theme-aware via .lms-example CSS class."""
    steps_html = "".join(f"<li>{s}</li>" for s in steps)
    return f'''<div class="lms-example">
<div class="lms-example__label">{label}</div>
<p class="lms-example__problem"><strong>{problem}</strong></p>
<ol class="lms-example__steps">{steps_html}</ol>
<p class="lms-example__answer">&#x2705; {answer}</p>
</div>'''


def pitfall_list(items: list[tuple[str, str]]) -> str:
    """Numbered list of pitfalls. Each item is (mistake, why_wrong)."""
    li = "".join(
        f'<li><strong class="lms-pitfall-name">{m}</strong> &mdash; {w}</li>'
        for m, w in items
    )
    return f'<ol class="lms-pitfall-list">{li}</ol>'


def tactic_list(items: list[str]) -> str:
    """Bullet list of SAT tactics. Inherits styling from .lms-lesson-content ul."""
    li = "".join(f"<li>{t}</li>" for t in items)
    return f"<ul>{li}</ul>"


def recap_list(items: list[str]) -> str:
    """Bullet list for the quick recap callout."""
    li = "".join(f"<li>{i}</li>" for i in items)
    return f"<ul>{li}</ul>"


def widget(title: str, html_body: str, css: str = "", js: str = "") -> str:
    """Wrap a custom interactive widget so the renderer finds it.

    `html_body` is the visible markup. `css` and `js` are optional.
    The whole thing is wrapped in <!-- interactive --> markers so the
    ContentRenderer routes it to a sandboxed iframe.
    """
    style_block = f"<style>{css}</style>" if css else ""
    script_block = f"<script>{js}</script>" if js else ""
    return f'''<!-- interactive -->
<div class="lms-widget">
<div class="lms-widget-title">&#x1F3AE; {title}</div>
{style_block}
{html_body}
{script_block}
</div>
<!-- /interactive -->'''


# Common widget CSS — reused across lessons. Keeps each widget visually
# consistent. Authors can append more rules in the `css` arg.
BASE_WIDGET_CSS = """
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#1e293b;padding:16px}
@media(prefers-color-scheme:dark){body{background:#1e1e1e;color:#e2e8f0}}
.lms-widget-title{font-size:1.05rem;font-weight:700;color:#4f46e5;margin-bottom:8px}
.lms-row{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:10px 0}
.lms-row label{font-size:0.85rem;font-weight:600;color:#475569;min-width:60px}
.lms-row input[type=range]{flex:1;min-width:140px;accent-color:#6366f1}
.lms-val{display:inline-block;min-width:42px;text-align:center;font-weight:700;color:#6366f1;font-size:0.95rem;background:#eef2ff;border-radius:6px;padding:3px 10px}
.lms-display{text-align:center;font-size:1.35rem;font-weight:700;padding:14px;background:white;border-radius:12px;border:1px solid #e2e8f0;margin:10px 0}
.lms-info{background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:12px 16px;margin:12px 0;font-size:0.9rem;line-height:1.55;color:#312e81}
.lms-info b{color:#4338ca}
.lms-btn{background:#6366f1;color:white;border:none;border-radius:8px;padding:8px 16px;font-size:0.85rem;font-weight:600;cursor:pointer;transition:background .15s}
.lms-btn:hover{background:#4f46e5}
.lms-btn.ghost{background:transparent;color:#6366f1;border:1px solid #c7d2fe}
.lms-btn.ghost:hover{background:#eef2ff}
canvas{display:block;max-width:100%;background:white;border-radius:10px;border:1px solid #e2e8f0}
@media(prefers-color-scheme:dark){
  .lms-display,canvas{background:#0f172a;border-color:#334155;color:#e2e8f0}
  .lms-val{background:#312e81;color:#c7d2fe}
  .lms-info{background:#1e1b4b;border-color:#3730a3;color:#c7d2fe}
  .lms-info b{color:#a5b4fc}
}
@media(max-width:480px){
  body{padding:10px}
  canvas{width:100%!important;height:auto!important}
  input[type=range]{min-height:44px}
  .lms-btn{min-height:44px;padding:10px 14px;font-size:0.9rem}
  .lms-widget-title{font-size:0.95rem}
  .lms-row{flex-direction:column;align-items:stretch}
  .lms-row label{min-width:auto}
}
"""


def assemble_lesson(parts: list[str]) -> str:
    """Glue the per-lesson parts into one HTML string."""
    return "\n".join(parts)


def widget_standalone_html(title: str, html_body: str, css: str, js: str) -> str:
    """Wrap a widget's CSS/HTML/JS into a complete standalone HTML page.

    This is the format used both by the runtime SandboxedIframe in
    content-renderer.tsx AND by the static fixtures under
    `frontend/widget-tests/fixtures/` that Playwright loads to test
    widget logic without the rest of the LMS.

    Keep this in sync with SandboxedIframe's srcdoc template.
    """
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<style>
html, body {{ margin: 0; padding: 0; }}
body {{
  font-family: system-ui, -apple-system, sans-serif;
  color: #1e293b;
  line-height: 1.6;
  padding: 12px;
}}
* {{ box-sizing: border-box; }}
@media (prefers-color-scheme: dark) {{
  body {{ color: #e2e8f0; background: #1e1e1e; }}
}}
{css}
</style>
</head>
<body>
<div class="lms-widget">
<div class="lms-widget-title">&#x1F3AE; {title}</div>
{html_body}
</div>
<script>{js}</script>
</body>
</html>
"""
