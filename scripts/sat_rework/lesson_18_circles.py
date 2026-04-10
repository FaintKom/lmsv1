"""Lesson 18: Circles."""
from .template import (
    BASE_WIDGET_CSS, assemble_lesson, callout, hero, pitfall_list,
    recap_list, section, tactic_list, widget, worked_example,
)

WIDGET_CSS = BASE_WIDGET_CSS + """
.formula-card{background:#eef2ff;border:1px solid #c7d2fe;color:#4338ca;padding:14px 16px;border-radius:10px;margin:10px 0;text-align:center;font-family:ui-monospace,Menlo,monospace;font-weight:700}
@media(prefers-color-scheme:dark){.formula-card{background:#1e1b4b;border-color:#3730a3;color:#a5b4fc}}
.metrics{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:10px 0}
.metric{background:white;border:1px solid #e2e8f0;border-radius:10px;padding:10px;text-align:center}
.metric .lab{font-size:0.7rem;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:700}
.metric .val{font-size:1.1rem;font-weight:800;color:#4338ca;margin-top:4px;font-family:ui-monospace,Menlo,monospace}
@media(prefers-color-scheme:dark){.metric{background:#0f172a;border-color:#334155}.metric .val{color:#a5b4fc}}
"""

WIDGET_HTML = """
<p style="font-size:0.88rem;color:#64748b;margin:6px 0 10px;text-align:center">
  Adjust the radius. Diameter, circumference, and area update with the formulas.
</p>
<canvas id="circle" width="320" height="280"></canvas>
<div class="lms-row"><label>radius</label><input type="range" id="r" min="1" max="8" step="0.5" value="4"><span class="lms-val" id="rVal">4</span></div>
<div class="metrics">
  <div class="metric"><div class="lab">Diameter</div><div class="val" id="d">8</div></div>
  <div class="metric"><div class="lab">Circumference</div><div class="val" id="c">25.13</div></div>
  <div class="metric"><div class="lab">Area</div><div class="val" id="a">50.27</div></div>
</div>
<div class="formula-card" id="formula">d = 2r &nbsp; · &nbsp; C = 2πr &nbsp; · &nbsp; A = πr²</div>
"""

WIDGET_JS = r"""
var canvas = document.getElementById('circle');
var ctx = canvas.getContext('2d');
var W = canvas.width, H = canvas.height;

function draw(){
  var r = +document.getElementById('r').value;
  document.getElementById('rVal').textContent = r;
  document.getElementById('d').textContent = (2 * r).toFixed(1);
  document.getElementById('c').textContent = (2 * Math.PI * r).toFixed(2);
  document.getElementById('a').textContent = (Math.PI * r * r).toFixed(2);

  ctx.fillStyle = getComputedStyle(canvas).backgroundColor || 'white';
  ctx.fillRect(0,0,W,H);
  var cx = W/2, cy = H/2;
  var radPx = r * 14;
  // Circle
  ctx.beginPath(); ctx.arc(cx, cy, radPx, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(99,102,241,0.15)'; ctx.fill();
  ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 3; ctx.stroke();
  // Center
  ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI*2); ctx.fillStyle = '#4338ca'; ctx.fill();
  // Radius line
  ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + radPx, cy); ctx.stroke();
  ctx.fillStyle = '#065f46'; ctx.font = 'bold 12px ui-monospace,monospace';
  ctx.fillText('r = ' + r, cx + radPx/2 - 14, cy - 6);
}

document.getElementById('r').addEventListener('input', draw);
draw();
"""


def build() -> str:
    parts = [
        hero("Circles",
             "Radius, diameter, circumference, area &mdash; and the formulas that connect them",
             gradient="from-emerald-600 to-teal-600"),

        callout("Why this matters on the SAT",
                "<p>Circle questions appear <strong>2&ndash;4 times per test</strong>. The four formulas below cover almost every question. Bonus: the SAT also tests circle equations $(x - h)^2 + (y - k)^2 = r^2$ and arc/sector problems.</p>",
                kind="info"),

        section("The four key facts", '<p>Every circle is defined by its center and radius. From the radius alone, you can compute everything else:</p>'),

        callout("Circle formulas",
                "<ul>"
                "<li><strong>Diameter</strong>: $d = 2r$ (twice the radius)</li>"
                "<li><strong>Circumference</strong>: $C = 2\\pi r = \\pi d$ (the perimeter)</li>"
                "<li><strong>Area</strong>: $A = \\pi r^2$</li>"
                "<li><strong>Equation</strong>: $(x - h)^2 + (y - k)^2 = r^2$ for a circle centered at $(h, k)$ with radius $r$</li>"
                "</ul>",
                kind="concept"),

        callout("Arcs and sectors",
                "<p>An <strong>arc</strong> is a portion of the circumference; a <strong>sector</strong> is a pie slice.</p>"
                "<ul>"
                "<li>Arc length: $\\dfrac{\\theta}{360°} \\cdot 2\\pi r$</li>"
                "<li>Sector area: $\\dfrac{\\theta}{360°} \\cdot \\pi r^2$</li>"
                "</ul>"
                "<p>$\\theta$ is the central angle in degrees. The fraction $\\theta/360$ is the portion of the whole circle.</p>",
                kind="concept"),

        section("Worked examples", ""),

        worked_example(
            label="Example 1 &middot; circumference and area",
            problem="A circle has radius $5$. Find its circumference and area.",
            steps=[
                "Circumference: $C = 2\\pi r = 2\\pi(5) = 10\\pi$",
                "Area: $A = \\pi r^2 = \\pi(5)^2 = 25\\pi$",
            ],
            answer="$C = 10\\pi$, $A = 25\\pi$",
        ),

        worked_example(
            label="Example 2 &middot; from circle equation",
            problem="Identify the center and radius of $(x - 3)^2 + (y + 2)^2 = 16$.",
            steps=[
                "Compare with standard form: $(x - h)^2 + (y - k)^2 = r^2$",
                "Note $(y + 2) = (y - (-2))$, so $k = -2$.",
                "$h = 3$, $k = -2$, $r^2 = 16 \\Rightarrow r = 4$",
            ],
            answer="center $(3, -2)$, radius $4$",
        ),

        worked_example(
            label="Example 3 &middot; SAT-style sector",
            problem="A circle has radius $6$. What is the area of a sector with central angle $60°$?",
            steps=[
                "Sector area $= \\dfrac{\\theta}{360} \\cdot \\pi r^2$",
                "Substitute: $\\dfrac{60}{360} \\cdot \\pi (6)^2 = \\dfrac{1}{6} \\cdot 36\\pi$",
                "Simplify: $6\\pi$",
            ],
            answer="$6\\pi$",
        ),

        callout("Common pitfalls", pitfall_list([
            ("Confusing radius with diameter",
             "if the SAT gives diameter $d = 10$, the radius is $5$. Plug $r = 5$ into the formulas, not $r = 10$."),
            ("Squaring the diameter for area",
             "area is $\\pi r^2$, NOT $\\pi d^2$. If you have the diameter, divide by 2 first."),
            ("Misreading $(x + 3)^2$ in circle equations",
             "$(x + 3)^2 = (x - (-3))^2$, so $h = -3$. The sign flips, just like in vertex form for parabolas."),
            ("Forgetting $r^2$ in the equation",
             "$(x - h)^2 + (y - k)^2 = r^2$ — the right side is $r$ SQUARED. If the equation says $= 25$, then $r = 5$, not $25$."),
        ]), kind="pitfall"),

        callout("SAT tactics", tactic_list([
            "<strong>Leave $\\pi$ in the answer unless asked otherwise.</strong> $25\\pi$ is exact; $78.54$ is rounded.",
            "<strong>For arc/sector, use the fraction $\\theta/360$ first.</strong> $90°$ is $\\dfrac{1}{4}$, $60°$ is $\\dfrac{1}{6}$, $30°$ is $\\dfrac{1}{12}$.",
            "<strong>Convert circle equation by completing the square</strong> if it's given in expanded form like $x^2 + y^2 - 6x + 4y - 12 = 0$.",
        ]), kind="tactic"),

        widget("Circle Calculator", html_body=WIDGET_HTML, css=WIDGET_CSS, js=WIDGET_JS),

        callout("Quick recap", recap_list([
            "$d = 2r$",
            "Circumference $C = 2\\pi r$",
            "Area $A = \\pi r^2$",
            "Equation: $(x - h)^2 + (y - k)^2 = r^2$",
            "Arc / sector: multiply by $\\theta/360$",
        ]), kind="recap"),
    ]
    return assemble_lesson(parts)
