"""HTML helpers for Python course lessons — academic style.

Inspired by Yandex Handbook: clean typography, minimal callouts,
code blocks with line numbers and copy hint, key questions at top,
"What's next" section at bottom. No flashy hero banners.
"""
from __future__ import annotations


def lesson_header(number: str, title: str, intro: str) -> str:
    """Clean lesson header: section number + title + intro paragraph."""
    return f'''<div style="margin-bottom:2rem">
<p style="margin:0 0 4px;font-size:0.85rem;color:#64748b">&lsaquo; Python Programming</p>
<h1 style="margin:0 0 16px;font-size:1.75rem;font-weight:700;color:inherit">{number} {title}</h1>
<p style="margin:0;font-size:1rem;line-height:1.7;color:#64748b">{intro}</p>
</div>'''


def key_questions(items: list[str]) -> str:
    """Numbered list of key questions covered in this lesson."""
    li = "".join(f"<li>{q}</li>" for q in items)
    return f'''<div style="margin:1.5rem 0;padding:1.25rem 1.5rem;background:#f8fafc;border-radius:12px">
<h3 style="margin:0 0 10px;font-size:1rem;font-weight:700">Key questions</h3>
<ol style="margin:0;padding-left:1.4rem;line-height:1.8">{li}</ol>
</div>'''


def section(title: str) -> str:
    """Section header — bold, no color, no decoration."""
    return f'<h2 style="margin:2rem 0 0.75rem;font-size:1.3rem;font-weight:700">{title}</h2>'


def subsection(title: str) -> str:
    """Subsection header."""
    return f'<h3 style="margin:1.5rem 0 0.5rem;font-size:1.1rem;font-weight:700">{title}</h3>'


def text(body: str) -> str:
    """Plain paragraph text. The main building block."""
    return f'<p style="margin:0.75rem 0;line-height:1.8">{body}</p>'


def code(source: str, output: str = "") -> str:
    """Code block with optional output. Clean light-gray style with copy hint."""
    lines = source.split("\n")
    numbered = "\n".join(
        f'<span style="display:inline-block;width:2.5em;color:#94a3b8;user-select:none;text-align:right;padding-right:1em">{i+1}</span>{line}'
        for i, line in enumerate(lines)
    )
    out_html = ""
    if output:
        out_html = f'''<div style="padding:10px 14px;background:#f1f5f9;border-top:1px solid #e2e8f0;font-family:ui-monospace,monospace;font-size:0.85rem;color:#334155;white-space:pre-wrap;border-radius:0 0 10px 10px">{output}</div>'''
    return f'''<div style="margin:1rem 0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
<pre style="margin:0;padding:14px 14px 14px 0;background:#f8fafc;font-family:ui-monospace,Menlo,monospace;font-size:0.87rem;line-height:1.7;overflow-x:auto;border-radius:{('10px' if not output else '10px 10px 0 0')}">{numbered}</pre>
{out_html}
</div>'''


def note(body: str) -> str:
    """A subtle note/callout — used sparingly, not for every concept."""
    return f'''<div style="margin:1rem 0;padding:1rem 1.25rem;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 8px 8px 0;font-size:0.92rem;line-height:1.7">
{body}
</div>'''


def important(body: str) -> str:
    """Important note — for things students MUST remember."""
    return f'''<div style="margin:1rem 0;padding:1rem 1.25rem;background:#fef2f2;border-left:3px solid #ef4444;border-radius:0 8px 8px 0;font-size:0.92rem;line-height:1.7">
<strong>Important:</strong> {body}
</div>'''


def try_it(instruction: str = "Open the Python sandbox and try this yourself.") -> str:
    """Subtle inline prompt to practice."""
    return f'<p style="margin:1rem 0;padding:0.75rem 1rem;background:#ecfdf5;border-radius:8px;font-size:0.9rem;color:#065f46">&#x25B6; {instruction}</p>'


def exercise(level: str, title: str, description: str, hint: str = "") -> str:
    """Exercise card — cleaner, no flashy colors."""
    level_labels = {"starter": "Easy", "medium": "Medium", "real-world": "Challenge"}
    label = level_labels.get(level, level.title())
    hint_html = ""
    if hint:
        hint_html = f'<details style="margin-top:8px"><summary style="cursor:pointer;font-size:0.85rem;color:#64748b">Show hint</summary><p style="margin:6px 0 0;font-size:0.85rem;color:#64748b">{hint}</p></details>'
    return f'''<div style="margin:1rem 0;padding:1rem 1.25rem;border:1px solid #e2e8f0;border-radius:10px">
<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
  <span style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;padding:2px 8px;border-radius:4px;background:#f1f5f9;color:#64748b">{label}</span>
</div>
<p style="margin:0 0 6px;font-weight:600">{title}</p>
<div style="font-size:0.92rem;line-height:1.7">{description}</div>
{hint_html}
</div>'''


def mistakes(items: list[tuple[str, str]]) -> str:
    """Common mistakes — clean list, no red callout."""
    li = "".join(
        f'<li style="margin:0.5rem 0"><strong>{m}</strong> — {w}</li>'
        for m, w in items
    )
    return f'''<div style="margin:1.5rem 0">
<h3 style="margin:0 0 10px;font-size:1rem;font-weight:700">Common mistakes</h3>
<ol style="margin:0;padding-left:1.4rem;line-height:1.7">{li}</ol>
</div>'''


def pro_tips(items: list[str]) -> str:
    """Pro tips — subtle, no callout box."""
    li = "".join(f"<li style='margin:0.4rem 0'>{t}</li>" for t in items)
    return f'''<div style="margin:1.5rem 0">
<h3 style="margin:0 0 10px;font-size:1rem;font-weight:700">Pro tips</h3>
<ul style="margin:0;padding-left:1.4rem;line-height:1.7">{li}</ul>
</div>'''


def recap(items: list[str]) -> str:
    """Key takeaways — clean bullet list at end."""
    li = "".join(f"<li style='margin:0.3rem 0'>{i}</li>" for i in items)
    return f'''<div style="margin:2rem 0 1rem;padding:1.25rem 1.5rem;background:#f8fafc;border-radius:12px">
<h3 style="margin:0 0 10px;font-size:1rem;font-weight:700">Key takeaways</h3>
<ul style="margin:0;padding-left:1.4rem;line-height:1.7">{li}</ul>
</div>'''


def whats_next(title: str, preview: str) -> str:
    """What's next section — preview of next lesson."""
    return f'''<div style="margin:2rem 0;padding:1.25rem 1.5rem;border:1px solid #e2e8f0;border-radius:12px">
<h3 style="margin:0 0 8px;font-size:1rem;font-weight:700">What&rsquo;s next</h3>
<p style="margin:0;line-height:1.7">In the next lesson — <strong>{title}</strong> — {preview}</p>
</div>'''


# Keep old names as aliases so existing lessons don't break during transition
def hero(title: str, subtitle: str) -> str:
    return lesson_header("", title, subtitle)

def why_it_matters(body: str) -> str:
    return text(body)

def concept(title: str, body: str) -> str:
    return f'{subsection(title)}\n{body}'

def code_example(title: str, source: str, output: str = "", explanation: str = "") -> str:
    result = code(source, output)
    if explanation:
        result += f'\n<p style="margin:8px 0;font-size:0.9rem;color:#64748b;line-height:1.7">{explanation}</p>'
    return result


def assemble(parts: list[str]) -> str:
    return "\n".join(parts)
