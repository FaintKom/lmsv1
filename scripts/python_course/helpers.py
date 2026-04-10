"""HTML helpers for Python course lessons.

Similar to SAT rework template but adapted for code-centric lessons:
- Code blocks with syntax highlighting hints
- "Try it" sections that point students to the sandbox
- Real-world exercise cards with difficulty badges
"""
from __future__ import annotations


def hero(title: str, subtitle: str) -> str:
    return f'''<div style="background:linear-gradient(135deg,#16a34a,#059669);border-radius:16px;padding:32px;margin-bottom:24px;color:white">
<h2 style="margin:0 0 8px;font-size:1.75rem;font-weight:800">{title}</h2>
<p style="margin:0;opacity:0.92;font-size:1.05rem">{subtitle}</p>
</div>'''


def why_it_matters(body: str) -> str:
    return f'''<div class="lms-callout lms-callout--info">
<h3 class="lms-callout__title">&#x1F4A1; Why this matters in real work</h3>
<div class="lms-callout__body">{body}</div>
</div>'''


def concept(title: str, body: str) -> str:
    return f'''<div class="lms-callout lms-callout--concept">
<h3 class="lms-callout__title">&#x1F511; {title}</h3>
<div class="lms-callout__body">{body}</div>
</div>'''


def code_example(title: str, code: str, output: str = "", explanation: str = "") -> str:
    """A code block with optional output and explanation."""
    out_html = ""
    if output:
        out_html = f'''<div style="background:#0f172a;color:#4ade80;padding:10px 14px;border-radius:0 0 8px 8px;font-family:ui-monospace,monospace;font-size:0.85rem;border-top:1px dashed #334155;white-space:pre-wrap">&#x25B6; {output}</div>'''
    expl_html = ""
    if explanation:
        expl_html = f'<p style="margin:10px 0 0;font-size:0.9rem;color:#64748b">{explanation}</p>'
    return f'''<div style="margin:16px 0">
<div style="background:#1e293b;color:#cbd5e1;padding:4px 14px;border-radius:8px 8px 0 0;font-size:0.75rem;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">{title}</div>
<pre style="margin:0;background:#0f172a;color:#e2e8f0;padding:14px;font-family:ui-monospace,Menlo,monospace;font-size:0.88rem;line-height:1.6;overflow-x:auto;border-radius:0 0 {('0 0' if output else '8px 8px')}">{code}</pre>
{out_html}
{expl_html}
</div>'''


def try_it(instruction: str = "Open the Python sandbox and try it yourself!") -> str:
    return f'''<div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:10px;padding:12px 16px;margin:16px 0;display:flex;align-items:center;gap:10px">
<span style="font-size:1.3rem">&#x1F3AE;</span>
<span style="font-size:0.9rem;color:#065f46;font-weight:600">{instruction}</span>
</div>'''


def exercise(level: str, title: str, description: str, hint: str = "") -> str:
    """Exercise card. level: starter / medium / real-world"""
    colors = {
        "starter": ("#ecfdf5", "#059669", "#065f46", "&#x1F331;"),
        "medium": ("#fffbeb", "#d97706", "#92400e", "&#x1F525;"),
        "real-world": ("#fef2f2", "#dc2626", "#991b1b", "&#x1F3AF;"),
    }
    bg, badge_bg, text_color, icon = colors.get(level, colors["starter"])
    hint_html = ""
    if hint:
        hint_html = f'<details style="margin-top:8px"><summary style="cursor:pointer;font-size:0.82rem;color:#64748b;font-weight:600">&#x1F4A1; Hint</summary><p style="margin:6px 0 0;font-size:0.85rem;color:#64748b">{hint}</p></details>'
    return f'''<div class="lms-example">
<div class="lms-example__label">{icon} {level.upper()}</div>
<p class="lms-example__problem"><strong>{title}</strong></p>
<p style="margin:0 0 8px;font-size:0.92rem">{description}</p>
{hint_html}
</div>'''


def mistakes(items: list[tuple[str, str]]) -> str:
    """Common mistakes section."""
    li = "".join(
        f'<li><strong class="lms-pitfall-name">{m}</strong> &mdash; {w}</li>'
        for m, w in items
    )
    return f'''<div class="lms-callout lms-callout--pitfall">
<h3 class="lms-callout__title">&#x26A0;&#xFE0F; Common mistakes</h3>
<div class="lms-callout__body"><ol class="lms-pitfall-list">{li}</ol></div>
</div>'''


def pro_tips(items: list[str]) -> str:
    li = "".join(f"<li>{t}</li>" for t in items)
    return f'''<div class="lms-callout lms-callout--tactic">
<h3 class="lms-callout__title">&#x1F3AF; Pro tips</h3>
<div class="lms-callout__body"><ul>{li}</ul></div>
</div>'''


def recap(items: list[str]) -> str:
    li = "".join(f"<li>{i}</li>" for i in items)
    return f'''<div class="lms-callout lms-callout--recap">
<h3 class="lms-callout__title">&#x1F4DA; Quick recap</h3>
<div class="lms-callout__body"><ul>{li}</ul></div>
</div>'''


def section(title: str) -> str:
    return f'<h3 class="lms-section-h">{title}</h3>'


def assemble(parts: list[str]) -> str:
    return "\n".join(parts)
