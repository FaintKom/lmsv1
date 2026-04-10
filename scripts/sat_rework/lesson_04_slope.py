"""Lesson 4: Linear Functions & Slope."""
from .template import (
    BASE_WIDGET_CSS, assemble_lesson, callout, hero, pitfall_list,
    recap_list, section, tactic_list, widget, worked_example,
)

WIDGET_CSS = BASE_WIDGET_CSS + """
.canvas-wrap{display:flex;justify-content:center;margin:10px 0}
.slope-formula{text-align:center;font-family:ui-monospace,Menlo,monospace;font-size:1.2rem;font-weight:700;color:#4338ca;margin:8px 0;padding:10px;background:white;border:1px solid #e2e8f0;border-radius:10px}
.point-info{display:flex;justify-content:space-around;font-family:ui-monospace,Menlo,monospace;font-size:0.95rem;margin:6px 0}
.point-info .pt1{color:#6366f1}
.point-info .pt2{color:#f97316}
@media(prefers-color-scheme:dark){.slope-formula{background:#0f172a;border-color:#334155;color:#a5b4fc}}
"""

WIDGET_HTML = """
<p style="font-size:0.88rem;color:#64748b;margin:6px 0 10px;text-align:center">
  Drag either point. The slope updates live using <strong>m = (y₂ − y₁) / (x₂ − x₁)</strong>.
</p>
<div class="canvas-wrap"><canvas id="plane" width="440" height="340"></canvas></div>
<div class="point-info">
  <span class="pt1" id="p1Lbl">P₁ (1, 2)</span>
  <span class="pt2" id="p2Lbl">P₂ (5, 6)</span>
</div>
<div class="slope-formula" id="slope">m = (6 − 2) / (5 − 1) = 4 / 4 = 1</div>
"""

WIDGET_JS = r"""
var canvas = document.getElementById('plane');
var ctx = canvas.getContext('2d');
var W = canvas.width, H = canvas.height;
var unit = 30;
var p1 = {x: 1, y: 2};
var p2 = {x: 5, y: 6};
var dragging = null;

function gs(x, y){ return {x: W/2 + x*unit, y: H/2 - y*unit}; }
function sg(px, py){ return {x: Math.round((px - W/2)/unit), y: Math.round((H/2 - py)/unit)}; }

function draw(){
  ctx.fillStyle = getComputedStyle(canvas).backgroundColor || 'white';
  ctx.fillRect(0,0,W,H);
  // grid
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
  for (var i=-7;i<=7;i++){
    var p = gs(i, 0); ctx.beginPath(); ctx.moveTo(p.x, 0); ctx.lineTo(p.x, H); ctx.stroke();
    var q = gs(0, i); ctx.beginPath(); ctx.moveTo(0, q.y); ctx.lineTo(W, q.y); ctx.stroke();
  }
  // axes
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
  // line through points
  if (p2.x !== p1.x){
    var m = (p2.y - p1.y)/(p2.x - p1.x);
    var b = p1.y - m*p1.x;
    var x1 = -8, y1 = m*x1 + b;
    var x2 = 8,  y2 = m*x2 + b;
    var l1 = gs(x1, y1), l2 = gs(x2, y2);
    ctx.strokeStyle = '#4338ca'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(l1.x, l1.y); ctx.lineTo(l2.x, l2.y); ctx.stroke();
  } else {
    // vertical
    var v = gs(p1.x, 0);
    ctx.strokeStyle = '#4338ca'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(v.x, 0); ctx.lineTo(v.x, H); ctx.stroke();
  }
  // rise/run dotted triangle
  var sp1 = gs(p1.x, p1.y), sp2 = gs(p2.x, p2.y);
  ctx.strokeStyle = '#10b981'; ctx.setLineDash([5,4]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(sp1.x, sp1.y); ctx.lineTo(sp2.x, sp1.y); ctx.lineTo(sp2.x, sp2.y); ctx.stroke();
  ctx.setLineDash([]);
  // points
  ctx.beginPath(); ctx.arc(sp1.x, sp1.y, 9, 0, Math.PI*2);
  ctx.fillStyle = '#6366f1'; ctx.fill(); ctx.strokeStyle = 'white'; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(sp2.x, sp2.y, 9, 0, Math.PI*2);
  ctx.fillStyle = '#f97316'; ctx.fill(); ctx.strokeStyle = 'white'; ctx.lineWidth = 3; ctx.stroke();
}

function updateLabels(){
  document.getElementById('p1Lbl').textContent = 'P₁ (' + p1.x + ', ' + p1.y + ')';
  document.getElementById('p2Lbl').textContent = 'P₂ (' + p2.x + ', ' + p2.y + ')';
  var dx = p2.x - p1.x, dy = p2.y - p1.y;
  var formula = 'm = (' + p2.y + ' − ' + p1.y + ') / (' + p2.x + ' − ' + p1.x + ')';
  if (dx === 0){
    document.getElementById('slope').textContent = formula + ' = undefined (vertical line)';
  } else {
    var m = dy/dx;
    var mTxt = (Math.round(m*1000)/1000).toString();
    document.getElementById('slope').textContent = formula + ' = ' + dy + ' / ' + dx + ' = ' + mTxt;
  }
}

function nearest(px, py){
  var sp1 = gs(p1.x, p1.y), sp2 = gs(p2.x, p2.y);
  var d1 = Math.hypot(px-sp1.x, py-sp1.y);
  var d2 = Math.hypot(px-sp2.x, py-sp2.y);
  if (d1 < 22 && d1 < d2) return 'p1';
  if (d2 < 22) return 'p2';
  return null;
}

canvas.addEventListener('pointerdown', function(e){
  var r = canvas.getBoundingClientRect();
  var px = (e.clientX - r.left) * (W/r.width);
  var py = (e.clientY - r.top) * (H/r.height);
  dragging = nearest(px, py);
});
canvas.addEventListener('pointermove', function(e){
  if (!dragging) return;
  var r = canvas.getBoundingClientRect();
  var px = (e.clientX - r.left) * (W/r.width);
  var py = (e.clientY - r.top) * (H/r.height);
  var g = sg(px, py);
  if (g.x < -7) g.x = -7; if (g.x > 7) g.x = 7;
  if (g.y < -5) g.y = -5; if (g.y > 5) g.y = 5;
  if (dragging === 'p1') p1 = g; else p2 = g;
  draw(); updateLabels();
});
canvas.addEventListener('pointerup', function(){ dragging = null; });
canvas.addEventListener('pointerleave', function(){ dragging = null; });
draw(); updateLabels();
"""


def build() -> str:
    parts = [
        hero(
            "Linear Functions &amp; Slope",
            "Slope is rate of change &mdash; the engine of every word problem about speed, cost, and growth",
            gradient="from-amber-500 to-orange-600",
        ),

        callout(
            "Why this matters on the SAT",
            "<p>Slope appears in <strong>every SAT Math test</strong>. You'll be asked to compute it from two points, read it off a graph, identify it from an equation, or interpret what it means in a real-world scenario. Master the formula and you unlock huge sections of the test.</p>",
            kind="info",
        ),

        section("The slope formula", '''<p>Given any two points $(x_1, y_1)$ and $(x_2, y_2)$ on a line:</p>
<p style="text-align:center;font-size:1.25rem;margin:14px 0">$$m = \\dfrac{y_2 - y_1}{x_2 - x_1} = \\dfrac{\\text{rise}}{\\text{run}}$$</p>
<p>Slope tells you how much $y$ changes for each 1-unit increase in $x$.</p>'''),

        callout("Slope-intercept form",
                "<p style='font-size:1.1rem;text-align:center;margin:8px 0'>$$y = mx + b$$</p>"
                "<p>Where $m$ is the slope and $b$ is the $y$-intercept (the value of $y$ when $x = 0$). This is the most common form on the SAT &mdash; learn to read it instantly.</p>",
                kind="concept"),

        section("Slope tells you the line's behavior", ''),
        callout("Reading slope at a glance",
                '''<ul>
<li><strong>$m &gt; 0$</strong> (positive): line goes up left-to-right</li>
<li><strong>$m &lt; 0$</strong> (negative): line goes down left-to-right</li>
<li><strong>$m = 0$</strong>: horizontal line (e.g. $y = 4$)</li>
<li><strong>$m$ undefined</strong>: vertical line (e.g. $x = 3$). The slope formula has zero in the denominator.</li>
</ul>''',
                kind="info"),

        section("Worked examples", ""),

        worked_example(
            label="Example 1 &middot; from two points",
            problem="Find the slope of the line through $(2, 3)$ and $(5, 12)$.",
            steps=[
                "Apply the slope formula: $m = \\dfrac{12 - 3}{5 - 2}$",
                "Compute: $m = \\dfrac{9}{3} = 3$",
            ],
            answer="$m = 3$",
        ),

        worked_example(
            label="Example 2 &middot; from an equation",
            problem="What is the slope of the line $4x - 2y = 10$?",
            steps=[
                "Rewrite in slope-intercept form by solving for $y$.",
                "Subtract $4x$: $-2y = -4x + 10$",
                "Divide by $-2$: $y = 2x - 5$",
                "Read off the slope from $y = mx + b$.",
            ],
            answer="$m = 2$",
        ),

        worked_example(
            label="Example 3 &middot; SAT-style",
            problem="A line passes through $(1, -2)$ and is parallel to $y = 3x + 4$. What is the equation of the line in slope-intercept form?",
            steps=[
                "Parallel lines have the same slope, so $m = 3$.",
                "Use the point-slope idea: $y - (-2) = 3(x - 1)$",
                "Distribute: $y + 2 = 3x - 3$",
                "Subtract 2 from both sides: $y = 3x - 5$",
            ],
            answer="$y = 3x - 5$",
        ),

        callout(
            "Common pitfalls",
            pitfall_list([
                ("Subtracting in the wrong order in the slope formula",
                 "you must subtract $y$'s and $x$'s in the SAME order. $\\frac{y_2 - y_1}{x_2 - x_1}$, NOT $\\frac{y_2 - y_1}{x_1 - x_2}$. Mixing them flips the sign."),
                ("Forgetting that horizontal lines have slope 0, not 'no slope'",
                 "horizontal: $m = 0$ (well-defined). Vertical: $m$ is undefined (division by zero). They are not the same."),
                ("Reading the y-intercept as the slope (or vice versa) in $y = mx + b$",
                 "$m$ is the coefficient of $x$. $b$ is the constant. The order matters."),
                ("Treating perpendicular slopes as just opposite signs",
                 "perpendicular slopes are <strong>negative reciprocals</strong>: if one is $\\frac{2}{3}$, the other is $-\\frac{3}{2}$. You flip AND change the sign."),
            ]),
            kind="pitfall",
        ),

        callout(
            "SAT tactics",
            tactic_list([
                "<strong>Memorize parallel/perpendicular relationships:</strong> parallel = same slope; perpendicular = negative reciprocal slope.",
                "<strong>Convert standard form to slope-intercept first.</strong> $Ax + By = C$ → solve for $y$. Now you can read $m$ and $b$ in 2 seconds.",
                "<strong>For 'rate of change' word problems,</strong> the slope is the rate (e.g. dollars per hour, meters per second). The $y$-intercept is the starting value at $x = 0$.",
            ]),
            kind="tactic",
        ),

        widget("Slope from Two Points",
               html_body=WIDGET_HTML, css=WIDGET_CSS, js=WIDGET_JS),

        callout(
            "Quick recap",
            recap_list([
                "Slope: $m = \\dfrac{y_2 - y_1}{x_2 - x_1} = \\dfrac{\\text{rise}}{\\text{run}}$",
                "Slope-intercept form: $y = mx + b$",
                "Parallel: same slope. Perpendicular: negative reciprocal.",
                "Horizontal $m = 0$, vertical $m$ undefined",
                "Slope = rate of change in word problems",
            ]),
            kind="recap",
        ),
    ]
    return assemble_lesson(parts)
