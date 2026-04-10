"""Replace empty Desmos iframes with SVG illustrations."""
import re

svg_graph = (
    '<svg viewBox="0 0 400 250" style="width:100%;background:#fafbfc;font-family:system-ui">'
    '<line x1="50" y1="210" x2="370" y2="210" stroke="#cbd5e1" stroke-width="1.5"/>'
    '<line x1="50" y1="10" x2="50" y2="210" stroke="#cbd5e1" stroke-width="1.5"/>'
    '<text x="380" y="215" fill="#94a3b8" font-size="12">x</text>'
    '<text x="55" y="10" fill="#94a3b8" font-size="12">y</text>'
    '<line x1="60" y1="190" x2="350" y2="40" stroke="#6366f1" stroke-width="2.5"/>'
    '<circle cx="120" cy="168" r="4" fill="#6366f1"/>'
    '<circle cx="200" cy="130" r="4" fill="#6366f1"/>'
    '<circle cx="280" cy="93" r="4" fill="#6366f1"/>'
    '<text x="260" y="35" fill="#6366f1" font-size="13" font-weight="bold">y = mx + b</text>'
    '</svg>'
)

replacement = (
    '<div style="margin:20px 0;border-radius:12px;overflow:hidden;'
    'border:1px solid #e2e8f0;background:#fafbfc;padding:4px">'
    + svg_graph +
    '</div>'
)

for fname in ["module1_heart_of_algebra.py", "seed_sat_math_v3_modules234.py"]:
    with open(fname, "r", encoding="utf-8") as f:
        content = f.read()

    count_before = content.count("desmos.com")
    if count_before == 0:
        print(f"{fname}: no Desmos iframes")
        continue

    # Replace all Desmos patterns
    content = re.sub(
        r'<div style="margin:20px 0;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">'
        r'<iframe src="https://www\.desmos\.com/calculator"[^>]*></iframe></div>',
        replacement,
        content
    )
    # Also handle the quoted concatenation style
    content = re.sub(
        r"""'<iframe src="https://www\.desmos\.com/calculator"[^']*'""",
        "'" + svg_graph + "'",
        content
    )

    with open(fname, "w", encoding="utf-8") as f:
        f.write(content)

    count_after = content.count("desmos.com")
    print(f"{fname}: {count_before} -> {count_after} Desmos refs")
