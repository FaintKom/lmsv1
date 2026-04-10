"""Lesson 17: Geometry Essentials."""
from .template import (
    BASE_WIDGET_CSS, assemble_lesson, callout, hero, pitfall_list,
    recap_list, section, tactic_list, widget, worked_example,
)

WIDGET_CSS = BASE_WIDGET_CSS + """
.shape-picker{display:flex;gap:6px;justify-content:center;margin:8px 0;flex-wrap:wrap}
.shape-picker button{font-size:0.78rem;padding:6px 12px}
.shape-picker button.active{background:#4338ca}
.angle-info{display:flex;justify-content:space-around;font-family:ui-monospace,Menlo,monospace;font-size:0.95rem;margin:8px 0;flex-wrap:wrap;gap:8px}
.angle-info span{background:white;border:1px solid #c7d2fe;padding:6px 12px;border-radius:8px;color:#4338ca}
@media(prefers-color-scheme:dark){.angle-info span{background:#0f172a;border-color:#3730a3;color:#a5b4fc}}
.formula-card{background:#eef2ff;border:1px solid #c7d2fe;color:#4338ca;padding:10px 14px;border-radius:10px;margin:10px 0;text-align:center;font-family:ui-monospace,Menlo,monospace;font-weight:600}
@media(prefers-color-scheme:dark){.formula-card{background:#1e1b4b;border-color:#3730a3;color:#a5b4fc}}
"""

WIDGET_HTML = """
<p style="font-size:0.88rem;color:#64748b;margin:6px 0 10px;text-align:center">
  Pick a shape and adjust its dimensions. Area, perimeter, and key angles update.
</p>
<div class="shape-picker">
  <button class="lms-btn ghost active" data-s="0">rectangle</button>
  <button class="lms-btn ghost" data-s="1">triangle</button>
  <button class="lms-btn ghost" data-s="2">right triangle</button>
</div>
<canvas id="shape" width="440" height="280"></canvas>
<div class="lms-row" id="dim1Row"><label>width</label><input type="range" id="d1" min="2" max="10" step="1" value="6"><span class="lms-val" id="d1Val">6</span></div>
<div class="lms-row" id="dim2Row"><label>height</label><input type="range" id="d2" min="2" max="8" step="1" value="4"><span class="lms-val" id="d2Val">4</span></div>
<div class="formula-card" id="formula">Area = w × h = 6 × 4 = 24</div>
<div class="angle-info">
  <span id="info1">perimeter: 20</span>
  <span id="info2">interior angles sum: 360°</span>
</div>
"""

WIDGET_JS = r"""
var shape = 0;
var canvas = document.getElementById('shape');
var ctx = canvas.getContext('2d');
var W = canvas.width, H = canvas.height;

function draw(){
  var d1 = +document.getElementById('d1').value;
  var d2 = +document.getElementById('d2').value;
  document.getElementById('d1Val').textContent = d1;
  document.getElementById('d2Val').textContent = d2;
  ctx.fillStyle = getComputedStyle(canvas).backgroundColor || 'white';
  ctx.fillRect(0,0,W,H);

  var scale = 22;
  var cx = W/2, cy = H/2 + 20;
  ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 3;
  ctx.fillStyle = 'rgba(99,102,241,0.15)';
  if (shape === 0) {
    var w = d1*scale, h = d2*scale;
    ctx.beginPath();
    ctx.rect(cx - w/2, cy - h/2, w, h);
    ctx.fill(); ctx.stroke();
    var area = d1 * d2;
    var per = 2 * (d1 + d2);
    document.getElementById('formula').textContent = 'Area = w × h = ' + d1 + ' × ' + d2 + ' = ' + area;
    document.getElementById('info1').textContent = 'perimeter: ' + per;
    document.getElementById('info2').textContent = 'interior angles: 4 × 90° = 360°';
  } else if (shape === 1) {
    // Generic triangle: base d1, height d2
    var base = d1*scale, height = d2*scale;
    var x1 = cx - base/2, y1 = cy + height/2;
    var x2 = cx + base/2, y2 = cy + height/2;
    var x3 = cx, y3 = cy - height/2;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x3,y3); ctx.closePath();
    ctx.fill(); ctx.stroke();
    var area = 0.5 * d1 * d2;
    document.getElementById('formula').textContent = 'Area = ½ × b × h = ½ × ' + d1 + ' × ' + d2 + ' = ' + area;
    document.getElementById('info1').textContent = 'base: ' + d1 + ', height: ' + d2;
    document.getElementById('info2').textContent = 'interior angles sum: 180°';
  } else {
    // Right triangle: legs d1 and d2
    var a = d1*scale, b = d2*scale;
    var x1 = cx - a/2, y1 = cy + b/2;
    var x2 = cx + a/2, y2 = cy + b/2;
    var x3 = x1, y3 = cy - b/2;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x3,y3); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Right-angle marker
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
    ctx.strokeRect(x1, y1 - 12, 12, 12);
    var hyp = Math.sqrt(d1*d1 + d2*d2);
    var area = 0.5 * d1 * d2;
    document.getElementById('formula').textContent = 'Hypotenuse² = ' + d1 + '² + ' + d2 + '² = ' + (d1*d1 + d2*d2);
    document.getElementById('info1').textContent = 'hypotenuse ≈ ' + (Math.round(hyp*100)/100);
    document.getElementById('info2').textContent = 'area = ½ · ' + d1 + ' · ' + d2 + ' = ' + area;
  }
}

document.querySelectorAll('.shape-picker button').forEach(function(btn){
  btn.addEventListener('click', function(){
    document.querySelectorAll('.shape-picker button').forEach(function(x){ x.classList.remove('active'); });
    btn.classList.add('active');
    shape = +btn.dataset.s;
    draw();
  });
});
['d1','d2'].forEach(function(id){
  document.getElementById(id).addEventListener('input', draw);
});
draw();
"""


def build() -> str:
    parts = [
        hero("Geometry Essentials",
             "Triangles, rectangles, the Pythagorean theorem &mdash; the foundations of every SAT geometry problem",
             gradient="from-indigo-600 to-violet-600"),

        callout("Why this matters on the SAT",
                "<p>Geometry questions appear <strong>3&ndash;5 times per test</strong>. The SAT focuses on a small set of formulas — area, perimeter, angle sums, the Pythagorean theorem — used in clever combinations. Master these and most problems become routine.</p>",
                kind="info"),

        section("Triangles", '<p>The most-tested shape on the SAT. Three key facts:</p>'),

        callout("Triangle facts",
                "<ul>"
                "<li><strong>Angle sum</strong>: the three interior angles of any triangle add to $180°$.</li>"
                "<li><strong>Area</strong>: $A = \\dfrac{1}{2} \\cdot b \\cdot h$ (base times height divided by 2).</li>"
                "<li><strong>Pythagorean theorem (right triangles only)</strong>: $a^2 + b^2 = c^2$ where $c$ is the hypotenuse.</li>"
                "</ul>",
                kind="concept"),

        callout("Special right triangles",
                "<ul>"
                "<li><strong>30-60-90</strong>: sides in ratio $1 : \\sqrt{3} : 2$. The side opposite the $30°$ angle is the smallest.</li>"
                "<li><strong>45-45-90</strong>: sides in ratio $1 : 1 : \\sqrt{2}$. Both legs are equal; the hypotenuse is leg times $\\sqrt{2}$.</li>"
                "</ul>"
                "<p>The SAT tests these constantly — memorize the ratios.</p>",
                kind="concept"),

        section("Quadrilaterals", '<p>The SAT mostly cares about rectangles and squares:</p>'),

        callout("Rectangle / square",
                "<ul>"
                "<li>Area: $A = w \\cdot h$ (width × height). For a square, $A = s^2$.</li>"
                "<li>Perimeter: $P = 2(w + h)$. For a square, $P = 4s$.</li>"
                "<li>All four interior angles are $90°$, sum to $360°$.</li>"
                "<li>Diagonal of a rectangle by Pythagoras: $d = \\sqrt{w^2 + h^2}$.</li>"
                "</ul>",
                kind="concept"),

        section("Worked examples", ""),

        worked_example(
            label="Example 1 &middot; Pythagorean theorem",
            problem="A right triangle has legs of length 3 and 4. Find the hypotenuse.",
            steps=[
                "Use the Pythagorean theorem: $a^2 + b^2 = c^2$",
                "Substitute: $3^2 + 4^2 = c^2$",
                "Compute: $9 + 16 = 25$, so $c^2 = 25$",
                "Take square root: $c = 5$",
            ],
            answer="hypotenuse $= 5$",
        ),

        worked_example(
            label="Example 2 &middot; missing angle",
            problem="In a triangle, two angles measure $40°$ and $75°$. What is the third angle?",
            steps=[
                "Sum of angles in a triangle is $180°$.",
                "Third angle $= 180 - 40 - 75 = 65°$",
            ],
            answer="$65°$",
        ),

        worked_example(
            label="Example 3 &middot; SAT-style",
            problem="A rectangle has length 12 and width 5. Find the length of its diagonal.",
            steps=[
                "Diagonal forms a right triangle with the length and width.",
                "Apply Pythagorean theorem: $d^2 = 12^2 + 5^2 = 144 + 25 = 169$",
                "$d = \\sqrt{169} = 13$",
            ],
            answer="$13$",
        ),

        callout("Common pitfalls", pitfall_list([
            ("Applying Pythagoras to non-right triangles",
             "$a^2 + b^2 = c^2$ ONLY works for right triangles. For other triangles you need the Law of Cosines (not on SAT)."),
            ("Forgetting to divide by 2 in triangle area",
             "$A = \\dfrac{1}{2} b h$, NOT $b h$. The 1/2 distinguishes triangle area from rectangle area."),
            ("Misidentifying the hypotenuse",
             "in a right triangle, the hypotenuse is the side OPPOSITE the right angle &mdash; the longest side. Pythagoras puts it on the LEFT in $c^2 = a^2 + b^2$."),
            ("Forgetting that base and height must be perpendicular",
             "for triangle area, the height is measured PERPENDICULAR to the base, not along a slanted side."),
        ]), kind="pitfall"),

        callout("SAT tactics", tactic_list([
            "<strong>Memorize the special right triangles.</strong> $1:1:\\sqrt{2}$ and $1:\\sqrt{3}:2$ &mdash; they appear in 1-2 questions per test.",
            "<strong>Pythagorean triples</strong>: $3-4-5$, $5-12-13$, $8-15-17$. Recognizing these saves you from computing square roots.",
            "<strong>Draw a diagram</strong> if the problem is described in words. Geometry without a sketch is twice as hard.",
        ]), kind="tactic"),

        widget("Shape Explorer", html_body=WIDGET_HTML, css=WIDGET_CSS, js=WIDGET_JS),

        callout("Quick recap", recap_list([
            "Triangle angles sum to $180°$",
            "Triangle area: $A = \\dfrac{1}{2} bh$",
            "Pythagoras (right triangles only): $a^2 + b^2 = c^2$",
            "Rectangle area $= wh$, perimeter $= 2(w+h)$",
            "Special right triangles: $1:1:\\sqrt{2}$ and $1:\\sqrt{3}:2$",
        ]), kind="recap"),
    ]
    return assemble_lesson(parts)
