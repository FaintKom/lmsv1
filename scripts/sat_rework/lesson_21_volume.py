"""Lesson 21: Volume & Surface Area."""
from .template import (
    BASE_WIDGET_CSS, assemble_lesson, callout, hero, pitfall_list,
    recap_list, section, tactic_list, widget, worked_example,
)

WIDGET_CSS = BASE_WIDGET_CSS + """
.shape-picker{display:flex;gap:6px;justify-content:center;margin:8px 0;flex-wrap:wrap}
.shape-picker button{font-size:0.78rem;padding:6px 12px}
.shape-picker button.active{background:#4338ca}
.formula-card{background:#eef2ff;border:1px solid #c7d2fe;color:#4338ca;padding:12px 16px;border-radius:10px;margin:10px 0;text-align:center;font-family:ui-monospace,Menlo,monospace;font-weight:700}
@media(prefers-color-scheme:dark){.formula-card{background:#1e1b4b;border-color:#3730a3;color:#a5b4fc}}
.metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}
.metric{background:white;border:1px solid #e2e8f0;border-radius:10px;padding:10px;text-align:center}
.metric .lab{font-size:0.7rem;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:700}
.metric .val{font-size:1.1rem;font-weight:800;color:#4338ca;margin-top:4px;font-family:ui-monospace,Menlo,monospace}
@media(prefers-color-scheme:dark){.metric{background:#0f172a;border-color:#334155}.metric .val{color:#a5b4fc}}
"""

WIDGET_HTML = """
<p style="font-size:0.88rem;color:#64748b;margin:6px 0 10px;text-align:center">
  Pick a 3D shape. Adjust dimensions. Volume and surface area update with the right formula.
</p>
<div class="shape-picker">
  <button class="lms-btn ghost active" data-s="0">cube</button>
  <button class="lms-btn ghost" data-s="1">box</button>
  <button class="lms-btn ghost" data-s="2">cylinder</button>
  <button class="lms-btn ghost" data-s="3">sphere</button>
</div>
<canvas id="shape3d" width="320" height="220"></canvas>
<div id="dim1Wrap" class="lms-row"><label id="lab1">side</label><input type="range" id="d1" min="1" max="10" step="0.5" value="4"><span class="lms-val" id="d1Val">4</span></div>
<div id="dim2Wrap" class="lms-row" style="display:none"><label id="lab2">—</label><input type="range" id="d2" min="1" max="10" step="0.5" value="3"><span class="lms-val" id="d2Val">3</span></div>
<div id="dim3Wrap" class="lms-row" style="display:none"><label id="lab3">—</label><input type="range" id="d3" min="1" max="10" step="0.5" value="2"><span class="lms-val" id="d3Val">2</span></div>
<div class="formula-card" id="formula">V = s³ = 4³ = 64</div>
<div class="metrics">
  <div class="metric"><div class="lab">Volume</div><div class="val" id="volV">64</div></div>
  <div class="metric"><div class="lab">Surface Area</div><div class="val" id="saV">96</div></div>
</div>
"""

WIDGET_JS = r"""
var shape = 0;
var canvas = document.getElementById('shape3d');
var ctx = canvas.getContext('2d');
var W = canvas.width, H = canvas.height;

function showDim2(show){ document.getElementById('dim2Wrap').style.display = show ? 'flex' : 'none'; }
function showDim3(show){ document.getElementById('dim3Wrap').style.display = show ? 'flex' : 'none'; }

function update(){
  var d1 = +document.getElementById('d1').value;
  var d2 = +document.getElementById('d2').value;
  var d3 = +document.getElementById('d3').value;
  document.getElementById('d1Val').textContent = d1;
  document.getElementById('d2Val').textContent = d2;
  document.getElementById('d3Val').textContent = d3;

  ctx.fillStyle = getComputedStyle(canvas).backgroundColor || 'white';
  ctx.fillRect(0,0,W,H);
  var cx = W/2, cy = H/2 + 10;
  ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 2.5;
  ctx.fillStyle = 'rgba(99,102,241,0.15)';

  var vol, sa, formula;
  if (shape === 0) {
    document.getElementById('lab1').textContent = 'side (s)';
    showDim2(false); showDim3(false);
    var s = d1, sz = 14 * Math.sqrt(s);
    drawBox(cx, cy, sz, sz, sz);
    vol = s * s * s;
    sa = 6 * s * s;
    formula = 'V = s³ = ' + s + '³ = ' + round(vol);
  } else if (shape === 1) {
    document.getElementById('lab1').textContent = 'length (l)';
    document.getElementById('lab2').textContent = 'width (w)';
    document.getElementById('lab3').textContent = 'height (h)';
    showDim2(true); showDim3(true);
    drawBox(cx, cy, d1*8, d3*8, d2*8);
    vol = d1 * d2 * d3;
    sa = 2 * (d1*d2 + d2*d3 + d1*d3);
    formula = 'V = l·w·h = ' + d1 + '·' + d2 + '·' + d3 + ' = ' + round(vol);
  } else if (shape === 2) {
    document.getElementById('lab1').textContent = 'radius (r)';
    document.getElementById('lab2').textContent = 'height (h)';
    showDim2(true); showDim3(false);
    drawCylinder(cx, cy, d1*10, d2*8);
    vol = Math.PI * d1*d1 * d2;
    sa = 2 * Math.PI * d1*d1 + 2 * Math.PI * d1 * d2;
    formula = 'V = πr²h = π·' + d1 + '²·' + d2 + ' = ' + round(vol);
  } else {
    document.getElementById('lab1').textContent = 'radius (r)';
    showDim2(false); showDim3(false);
    drawSphere(cx, cy, d1*10);
    vol = (4/3) * Math.PI * d1*d1*d1;
    sa = 4 * Math.PI * d1*d1;
    formula = 'V = (4/3)πr³ = (4/3)π·' + d1 + '³ = ' + round(vol);
  }
  document.getElementById('formula').textContent = formula;
  document.getElementById('volV').textContent = round(vol);
  document.getElementById('saV').textContent = round(sa);
}

function drawBox(cx, cy, w, h, d){
  // Front face
  ctx.fillRect(cx - w/2, cy - h/2, w, h);
  ctx.strokeRect(cx - w/2, cy - h/2, w, h);
  // Top
  ctx.beginPath();
  ctx.moveTo(cx - w/2, cy - h/2);
  ctx.lineTo(cx - w/2 + d*0.5, cy - h/2 - d*0.4);
  ctx.lineTo(cx + w/2 + d*0.5, cy - h/2 - d*0.4);
  ctx.lineTo(cx + w/2, cy - h/2);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Right
  ctx.beginPath();
  ctx.moveTo(cx + w/2, cy - h/2);
  ctx.lineTo(cx + w/2 + d*0.5, cy - h/2 - d*0.4);
  ctx.lineTo(cx + w/2 + d*0.5, cy + h/2 - d*0.4);
  ctx.lineTo(cx + w/2, cy + h/2);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

function drawCylinder(cx, cy, r, h){
  // Body
  ctx.beginPath();
  ctx.moveTo(cx - r, cy - h/2);
  ctx.lineTo(cx - r, cy + h/2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + r, cy - h/2);
  ctx.lineTo(cx + r, cy + h/2);
  ctx.stroke();
  // Bottom ellipse
  ctx.beginPath(); ctx.ellipse(cx, cy + h/2, r, r*0.3, 0, 0, Math.PI*2);
  ctx.fill(); ctx.stroke();
  // Top ellipse
  ctx.beginPath(); ctx.ellipse(cx, cy - h/2, r, r*0.3, 0, 0, Math.PI*2);
  ctx.fill(); ctx.stroke();
}

function drawSphere(cx, cy, r){
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.fill(); ctx.stroke();
  // Equator ellipse for 3D feel
  ctx.beginPath(); ctx.ellipse(cx, cy, r, r*0.3, 0, 0, Math.PI*2);
  ctx.strokeStyle = '#a5b4fc'; ctx.lineWidth = 1.5; ctx.stroke();
}

function round(n){ return Math.round(n * 100) / 100; }

document.querySelectorAll('.shape-picker button').forEach(function(btn){
  btn.addEventListener('click', function(){
    document.querySelectorAll('.shape-picker button').forEach(function(x){ x.classList.remove('active'); });
    btn.classList.add('active');
    shape = +btn.dataset.s;
    update();
  });
});
['d1','d2','d3'].forEach(function(id){
  document.getElementById(id).addEventListener('input', update);
});
update();
"""


def build() -> str:
    parts = [
        hero("Volume &amp; Surface Area",
             "The 3D formulas the SAT actually tests &mdash; cube, box, cylinder, sphere",
             gradient="from-fuchsia-500 to-purple-600"),

        callout("Why this matters on the SAT",
                "<p>Volume questions appear <strong>1&ndash;2 times per test</strong>. The SAT gives you a <strong>reference sheet</strong> with all the formulas at the start of the math section, but knowing them by heart saves you flipping back and forth — and lets you set up the problem faster.</p>",
                kind="info"),

        section("The four shapes the SAT tests", '<p>Memorize these formulas. The SAT reference sheet has them, but knowing them at sight is faster:</p>'),

        callout("Volume formulas",
                "<ul>"
                "<li><strong>Cube</strong> with side $s$: $V = s^3$</li>"
                "<li><strong>Rectangular box</strong> ($l \\times w \\times h$): $V = l \\cdot w \\cdot h$</li>"
                "<li><strong>Cylinder</strong> with radius $r$ and height $h$: $V = \\pi r^2 h$</li>"
                "<li><strong>Sphere</strong> with radius $r$: $V = \\dfrac{4}{3}\\pi r^3$</li>"
                "<li><strong>Cone</strong> with radius $r$ and height $h$: $V = \\dfrac{1}{3}\\pi r^2 h$</li>"
                "</ul>",
                kind="concept"),

        callout("Surface area formulas",
                "<ul>"
                "<li><strong>Cube</strong>: $SA = 6s^2$</li>"
                "<li><strong>Rectangular box</strong>: $SA = 2(lw + wh + lh)$</li>"
                "<li><strong>Cylinder</strong>: $SA = 2\\pi r^2 + 2\\pi r h$ (top + bottom + side)</li>"
                "<li><strong>Sphere</strong>: $SA = 4\\pi r^2$</li>"
                "</ul>",
                kind="concept"),

        section("Worked examples", ""),

        worked_example(
            label="Example 1 &middot; cube",
            problem="A cube has side length 5. Find its volume and surface area.",
            steps=[
                "Volume: $V = s^3 = 5^3 = 125$",
                "Surface area: $SA = 6s^2 = 6(25) = 150$",
            ],
            answer="$V = 125$, $SA = 150$",
        ),

        worked_example(
            label="Example 2 &middot; cylinder",
            problem="A cylinder has radius $3$ and height $7$. Find its volume.",
            steps=[
                "Volume: $V = \\pi r^2 h$",
                "Substitute: $V = \\pi (3)^2 (7) = \\pi \\cdot 9 \\cdot 7 = 63\\pi$",
            ],
            answer="$V = 63\\pi$",
        ),

        worked_example(
            label="Example 3 &middot; SAT-style scaling",
            problem="If the radius of a sphere is doubled, by what factor does the volume increase?",
            steps=[
                "Original volume: $V_1 = \\dfrac{4}{3}\\pi r^3$",
                "New volume: $V_2 = \\dfrac{4}{3}\\pi (2r)^3 = \\dfrac{4}{3}\\pi \\cdot 8r^3 = 8 V_1$",
                "Volume scales by the cube of the linear factor.",
            ],
            answer="Volume increases by a factor of $8$.",
        ),

        callout("Common pitfalls", pitfall_list([
            ("Confusing volume with surface area",
             "Volume measures how much fits INSIDE (cubic units). Surface area measures how much wraps AROUND (square units). The SAT often asks for one in a question that hints at the other."),
            ("Forgetting the 1/3 in cone volume",
             "$V_{\\text{cone}} = \\dfrac{1}{3} \\pi r^2 h$, NOT $\\pi r^2 h$. The cone is exactly 1/3 the volume of a cylinder with the same base and height."),
            ("Cubing only the radius (not the linear factor) in scaling questions",
             "if every linear dimension doubles, volume goes up by $2^3 = 8$, not $2$. Surface area goes up by $2^2 = 4$."),
            ("Mixing up radius and diameter",
             "if the SAT gives diameter, divide by 2 first. Volume formulas use $r$, not $d$."),
        ]), kind="pitfall"),

        callout("SAT tactics", tactic_list([
            "<strong>Leave $\\pi$ in the answer</strong> unless asked to round. $63\\pi$ is exact and matches answer choices.",
            "<strong>Scaling shortcuts:</strong> if a linear dimension scales by $k$, then area scales by $k^2$ and volume scales by $k^3$.",
            "<strong>For combined-shape problems</strong> (e.g. a cylinder with a hemisphere on top), compute each part separately and add.",
        ]), kind="tactic"),

        widget("3D Shape Calculator", html_body=WIDGET_HTML, css=WIDGET_CSS, js=WIDGET_JS),

        callout("Quick recap", recap_list([
            "Cube: $V = s^3$, $SA = 6s^2$",
            "Box: $V = lwh$, $SA = 2(lw + wh + lh)$",
            "Cylinder: $V = \\pi r^2 h$",
            "Sphere: $V = \\dfrac{4}{3}\\pi r^3$, $SA = 4\\pi r^2$",
            "Linear $\\times k$ → area $\\times k^2$, volume $\\times k^3$",
        ]), kind="recap"),
    ]
    return assemble_lesson(parts)
