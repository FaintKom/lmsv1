"""Lesson 19: Trigonometry Basics."""
from .template import (
    BASE_WIDGET_CSS, assemble_lesson, callout, hero, pitfall_list,
    recap_list, section, tactic_list, widget, worked_example,
)

WIDGET_CSS = BASE_WIDGET_CSS + """
.trig-display{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:10px 0}
.trig-cell{background:white;border:1px solid #c7d2fe;border-radius:10px;padding:10px;text-align:center;font-family:ui-monospace,Menlo,monospace}
.trig-cell .lab{font-size:0.7rem;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:700}
.trig-cell .val{font-size:1.1rem;font-weight:800;color:#4338ca;margin-top:4px}
@media(prefers-color-scheme:dark){.trig-cell{background:#0f172a;border-color:#3730a3}.trig-cell .val{color:#a5b4fc}}
"""

WIDGET_HTML = """
<p style="font-size:0.88rem;color:#64748b;margin:6px 0 10px;text-align:center">
  Move the slider to change the angle. The unit-circle point shows $(\\cos\\theta, \\sin\\theta)$.
</p>
<canvas id="unit" width="320" height="320"></canvas>
<div class="lms-row"><label>angle θ</label><input type="range" id="ang" min="0" max="360" step="1" value="30"><span class="lms-val" id="angVal">30°</span></div>
<div class="trig-display">
  <div class="trig-cell"><div class="lab">sin θ</div><div class="val" id="sinV">0.500</div></div>
  <div class="trig-cell"><div class="lab">cos θ</div><div class="val" id="cosV">0.866</div></div>
  <div class="trig-cell"><div class="lab">tan θ</div><div class="val" id="tanV">0.577</div></div>
</div>
<div class="lms-info"><strong>SOH-CAH-TOA (right triangles):</strong> sin = opp/hyp, cos = adj/hyp, tan = opp/adj. <strong>Unit circle:</strong> $(x, y) = (\\cos\\theta, \\sin\\theta)$.</div>
"""

WIDGET_JS = r"""
var canvas = document.getElementById('unit');
var ctx = canvas.getContext('2d');
var W = canvas.width, H = canvas.height;
var cx = W/2, cy = H/2, r = 110;

function draw(){
  var ang = +document.getElementById('ang').value;
  var rad = ang * Math.PI / 180;
  document.getElementById('angVal').textContent = ang + '°';
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var t = Math.cos(rad) === 0 ? 'undefined' : (s/c).toFixed(3);
  document.getElementById('sinV').textContent = s.toFixed(3);
  document.getElementById('cosV').textContent = c.toFixed(3);
  document.getElementById('tanV').textContent = t;

  ctx.fillStyle = getComputedStyle(canvas).backgroundColor || 'white';
  ctx.fillRect(0,0,W,H);

  // Axes
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(20, cy); ctx.lineTo(W-20, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, 20); ctx.lineTo(cx, H-20); ctx.stroke();

  // Unit circle
  ctx.strokeStyle = '#c7d2fe'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();

  // Angle arc
  ctx.strokeStyle = '#10b981'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, 28, 0, -rad, true); ctx.stroke();

  // Radius line
  ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r*c, cy - r*s); ctx.stroke();

  // Point
  ctx.beginPath(); ctx.arc(cx + r*c, cy - r*s, 6, 0, Math.PI*2);
  ctx.fillStyle = '#4338ca'; ctx.fill();
  ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();

  // Sin (vertical green dashed)
  ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(cx + r*c, cy - r*s); ctx.lineTo(cx + r*c, cy); ctx.stroke();
  ctx.setLineDash([]);
  // Cos (horizontal orange dashed)
  ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r*c, cy); ctx.stroke();
  ctx.setLineDash([]);
}

document.getElementById('ang').addEventListener('input', draw);
draw();
"""


def build() -> str:
    parts = [
        hero("Trigonometry Basics",
             "SOH-CAH-TOA &mdash; sine, cosine, and tangent in right triangles and the unit circle",
             gradient="from-rose-500 to-pink-600"),

        callout("Why this matters on the SAT",
                "<p>Trig appears <strong>1&ndash;3 times per test</strong>. The SAT mostly tests basic SOH-CAH-TOA in right triangles, with occasional unit-circle and complementary-angle questions. Memorize three definitions and you'll handle most.</p>",
                kind="info"),

        section("SOH-CAH-TOA in right triangles", '<p>For a right triangle with an angle $\\theta$ (not the right angle):</p>'),

        callout("The three ratios",
                "<ul>"
                "<li><strong>sin $\\theta$ = opposite / hypotenuse</strong> &mdash; SOH</li>"
                "<li><strong>cos $\\theta$ = adjacent / hypotenuse</strong> &mdash; CAH</li>"
                "<li><strong>tan $\\theta$ = opposite / adjacent</strong> &mdash; TOA</li>"
                "</ul>"
                "<p>The <strong>opposite</strong> side is across from $\\theta$. The <strong>adjacent</strong> side is next to $\\theta$ (not the hypotenuse). The hypotenuse is across from the right angle.</p>",
                kind="concept"),

        callout("Complementary-angle identity",
                "<p>If $\\theta$ and $\\phi$ are complementary ($\\theta + \\phi = 90°$), then:</p>"
                "<p style='text-align:center'>$\\sin\\theta = \\cos\\phi$ and $\\cos\\theta = \\sin\\phi$</p>"
                "<p>The SAT loves to ask this in disguise: &laquo;if $\\sin x = 0.6$, what is $\\cos(90° - x)$?&raquo; → answer is $0.6$.</p>",
                kind="concept"),

        callout("Unit circle",
                "<p>For any angle $\\theta$ measured from the positive $x$-axis, the point on the unit circle is $(\\cos\\theta, \\sin\\theta)$. This generalizes the right-triangle definitions to all angles, including obtuse and negative.</p>"
                "<p>Memorize the values at $0°, 30°, 45°, 60°, 90°$ &mdash; they show up constantly.</p>",
                kind="concept"),

        section("Worked examples", ""),

        worked_example(
            label="Example 1 &middot; SOH-CAH-TOA",
            problem="In a right triangle, the angle $\\theta$ has opposite side $3$ and hypotenuse $5$. Find $\\sin\\theta$ and $\\cos\\theta$.",
            steps=[
                "$\\sin\\theta = \\dfrac{\\text{opp}}{\\text{hyp}} = \\dfrac{3}{5}$",
                "By Pythagoras, the adjacent side is $\\sqrt{5^2 - 3^2} = \\sqrt{16} = 4$.",
                "$\\cos\\theta = \\dfrac{\\text{adj}}{\\text{hyp}} = \\dfrac{4}{5}$",
            ],
            answer="$\\sin\\theta = \\dfrac{3}{5}$, $\\cos\\theta = \\dfrac{4}{5}$",
        ),

        worked_example(
            label="Example 2 &middot; complementary identity",
            problem="If $\\sin 25° = 0.42$, what is $\\cos 65°$?",
            steps=[
                "$25° + 65° = 90°$, so they are complementary.",
                "By the identity $\\sin\\theta = \\cos(90° - \\theta)$, $\\sin 25° = \\cos 65°$.",
                "Therefore $\\cos 65° = 0.42$.",
            ],
            answer="$0.42$",
        ),

        worked_example(
            label="Example 3 &middot; SAT-style",
            problem="In a right triangle, $\\tan\\theta = \\dfrac{8}{15}$. Find the hypotenuse.",
            steps=[
                "$\\tan\\theta = \\dfrac{\\text{opp}}{\\text{adj}} = \\dfrac{8}{15}$ → opp $= 8$, adj $= 15$",
                "Pythagoras: hyp $= \\sqrt{8^2 + 15^2} = \\sqrt{64 + 225} = \\sqrt{289} = 17$",
            ],
            answer="hypotenuse $= 17$",
        ),

        callout("Common pitfalls", pitfall_list([
            ("Mixing up &laquo;opposite&raquo; and &laquo;adjacent&raquo;",
             "the opposite side is ACROSS from the angle. The adjacent side is the one TOUCHING the angle that's not the hypotenuse. Always identify these visually first."),
            ("Using SOH-CAH-TOA on non-right triangles",
             "these definitions only work for right triangles. For other triangles you need the Law of Sines / Cosines, which the SAT does not test."),
            ("Confusing degrees and radians",
             "the SAT uses degrees by default. Make sure your calculator is in DEG mode, not RAD."),
            ("Forgetting that $\\sin^2 + \\cos^2 = 1$",
             "the Pythagorean identity. If $\\sin\\theta = 0.6$ then $\\cos^2\\theta = 1 - 0.36 = 0.64$, so $\\cos\\theta = 0.8$ (assuming first quadrant)."),
        ]), kind="pitfall"),

        callout("SAT tactics", tactic_list([
            "<strong>Identify opposite/adjacent/hypotenuse FIRST.</strong> Label the sides on the diagram before plugging into a ratio.",
            "<strong>Pythagorean triples shortcut:</strong> if you see $3,4,?$ or $5,12,?$ you know the answer without computing.",
            "<strong>Complementary-angle questions reduce to one substitution.</strong> Don't compute the angle &mdash; use $\\sin\\theta = \\cos(90° - \\theta)$.",
        ]), kind="tactic"),

        widget("Unit Circle Explorer", html_body=WIDGET_HTML, css=WIDGET_CSS, js=WIDGET_JS),

        callout("Quick recap", recap_list([
            "SOH: sin = opposite / hypotenuse",
            "CAH: cos = adjacent / hypotenuse",
            "TOA: tan = opposite / adjacent",
            "$\\sin\\theta = \\cos(90° - \\theta)$ (complementary identity)",
            "Unit circle: $(\\cos\\theta, \\sin\\theta)$",
        ]), kind="recap"),
    ]
    return assemble_lesson(parts)
