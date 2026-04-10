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
    """Coloured callout: info / concept / example / pitfall / tactic / recap."""
    styles = {
        "info":    ("#eff6ff", "#3b82f6", "#1d4ed8", "&#x1F4A1;"),
        "concept": ("#eef2ff", "#6366f1", "#4338ca", "&#x1F511;"),
        "example": ("#fffbeb", "#fbbf24", "#92400e", "&#x1F4DD;"),
        "pitfall": ("#fef2f2", "#f87171", "#991b1b", "&#x26A0;&#xFE0F;"),
        "tactic":  ("#ecfdf5", "#10b981", "#065f46", "&#x1F3AF;"),
        "recap":   ("#f5f3ff", "#a78bfa", "#5b21b6", "&#x1F4DA;"),
    }
    bg, border, color, icon = styles.get(kind, styles["info"])
    return f'''<div style="background:{bg};border-left:4px solid {border};border-radius:0 12px 12px 0;padding:16px 20px;margin:18px 0">
<h3 style="color:{color};margin:0 0 10px;font-size:1.05rem;font-weight:700">{icon} {title}</h3>
{body}
</div>'''


def section(title: str, body: str, anchor_color: str = "#4338ca") -> str:
    """Plain section with a coloured header bar."""
    return f'''<h3 style="color:{anchor_color};font-size:1.2rem;font-weight:700;margin:1.5rem 0 0.5rem;border-bottom:2px solid {anchor_color}22;padding-bottom:0.4rem">{title}</h3>
{body}'''


def worked_example(label: str, problem: str, steps: list[str], answer: str) -> str:
    """A worked example card with numbered steps and final answer."""
    steps_html = "".join(
        f'<li style="margin:0.4rem 0">{s}</li>' for s in steps
    )
    return f'''<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:12px;padding:18px 22px;margin:16px 0">
<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
  <span style="background:#fbbf24;color:#78350f;padding:2px 10px;border-radius:999px;font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">{label}</span>
</div>
<p style="margin:0 0 12px;font-size:1.02rem"><strong>{problem}</strong></p>
<ol style="margin:0 0 12px;padding-left:1.4rem">{steps_html}</ol>
<p style="margin:0;padding:10px 14px;background:#fef3c7;border-radius:8px;font-weight:600;color:#78350f">&#x2705; {answer}</p>
</div>'''


def pitfall_list(items: list[tuple[str, str]]) -> str:
    """Numbered list of pitfalls. Each item is (mistake, why_wrong)."""
    li = "".join(
        f'<li style="margin:0.5rem 0"><strong style="color:#991b1b">{m}</strong> &mdash; {w}</li>'
        for m, w in items
    )
    return f'<ol style="margin:0;padding-left:1.4rem">{li}</ol>'


def tactic_list(items: list[str]) -> str:
    """Bullet list of SAT tactics."""
    li = "".join(
        f'<li style="margin:0.4rem 0">{t}</li>' for t in items
    )
    return f'<ul style="margin:0;padding-left:1.4rem">{li}</ul>'


def recap_list(items: list[str]) -> str:
    li = "".join(f'<li style="margin:0.35rem 0">{i}</li>' for i in items)
    return f'<ul style="margin:0;padding-left:1.4rem">{li}</ul>'


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
"""


def assemble_lesson(parts: list[str]) -> str:
    """Glue the per-lesson parts into one HTML string."""
    return "\n".join(parts)
