"""Lesson 5: Graphing Linear Equations."""
from .template import (
    BASE_WIDGET_CSS, assemble_lesson, callout, hero, pitfall_list,
    recap_list, section, tactic_list, widget, worked_example,
)

WIDGET_CSS = BASE_WIDGET_CSS + """
.canvas-wrap{display:flex;justify-content:center;margin:10px 0}
.eq-display{text-align:center;font-family:ui-monospace,Menlo,monospace;font-size:1.3rem;font-weight:700;color:#4338ca;margin:8px 0}
@media(prefers-color-scheme:dark){.eq-display{color:#a5b4fc}}
"""

WIDGET_HTML = """
<p style="font-size:0.88rem;color:#64748b;margin:6px 0 10px;text-align:center">
  Adjust slope <strong>m</strong> and y-intercept <strong>b</strong> with the sliders. Watch the line transform.
</p>
<div class="eq-display" id="eq">y = 1·x + 0</div>
<div class="canvas-wrap"><canvas id="plane" width="440" height="340"></canvas></div>
<div class="lms-row">
  <label>m</label><input type="range" id="m" min="-5" max="5" step="0.5" value="1"><span class="lms-val" id="mVal">1</span>
</div>
<div class="lms-row">
  <label>b</label><input type="range" id="b" min="-6" max="6" step="1" value="0"><span class="lms-val" id="bVal">0</span>
</div>
<div class="lms-info">Try <strong>m = 0</strong> for a horizontal line, <strong>m = 1</strong> for 45°, large m for steep climbs, and negative m for downhill lines. Move <strong>b</strong> to slide the line up and down.</div>
"""

WIDGET_JS = r"""
var canvas = document.getElementById('plane');
var ctx = canvas.getContext('2d');
var W = canvas.width, H = canvas.height, unit = 30;
function gs(x,y){ return {x: W/2 + x*unit, y: H/2 - y*unit}; }

function draw(){
  var m = +document.getElementById('m').value;
  var b = +document.getElementById('b').value;
  document.getElementById('mVal').textContent = m;
  document.getElementById('bVal').textContent = b;
  var mTxt = (m === 1 ? 'x' : (m === -1 ? '−x' : (m === 0 ? '0' : m + '·x')));
  var bTxt = (b === 0 ? '' : (b > 0 ? ' + ' + b : ' − ' + (-b)));
  document.getElementById('eq').textContent = 'y = ' + mTxt + bTxt;

  ctx.fillStyle = getComputedStyle(canvas).backgroundColor || 'white';
  ctx.fillRect(0,0,W,H);
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
  for (var i=-7;i<=7;i++){
    var p = gs(i,0); ctx.beginPath(); ctx.moveTo(p.x,0); ctx.lineTo(p.x,H); ctx.stroke();
    var q = gs(0,i); ctx.beginPath(); ctx.moveTo(0,q.y); ctx.lineTo(W,q.y); ctx.stroke();
  }
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0,H/2); ctx.lineTo(W,H/2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke();

  // line y = mx + b
  var x1 = -8, y1 = m*x1 + b, x2 = 8, y2 = m*x2 + b;
  var p1 = gs(x1,y1), p2 = gs(x2,y2);
  ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke();

  // y-intercept marker
  var bp = gs(0,b);
  ctx.beginPath(); ctx.arc(bp.x, bp.y, 8, 0, Math.PI*2);
  ctx.fillStyle = '#10b981'; ctx.fill();
  ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#065f46'; ctx.font = 'bold 12px ui-monospace,monospace';
  ctx.fillText('(0,'+b+')', bp.x+12, bp.y+4);

  // slope triangle from (0,b) to (1, b+m)
  if (m !== 0){
    var p3 = gs(1, b);
    var p4 = gs(1, b+m);
    ctx.setLineDash([5,4]);
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bp.x,bp.y); ctx.lineTo(p3.x,p3.y); ctx.lineTo(p4.x,p4.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#9a3412'; ctx.font = 'bold 11px ui-monospace,monospace';
    ctx.fillText('1', (bp.x+p3.x)/2-3, p3.y+14);
    ctx.fillText(''+m, p3.x+5, (p3.y+p4.y)/2+4);
  }
}
document.getElementById('m').addEventListener('input', draw);
document.getElementById('b').addEventListener('input', draw);
draw();
"""


def build() -> str:
    parts = [
        hero(
            "Graphing Linear Equations",
            "Master $y = mx + b$ &mdash; the form behind every line on the SAT",
            gradient="from-sky-500 to-blue-600",
        ),

        callout(
            "Why this matters on the SAT",
            "<p>Every test has questions about linear graphs &mdash; identifying which equation matches a line, sketching from an equation, finding intercepts, or comparing two lines. You also need this skill for systems, inequalities, and word problems involving rates.</p>",
            kind="info",
        ),

        section("The slope-intercept form", '''<p style="text-align:center;font-size:1.3rem;margin:14px 0">$$y = mx + b$$</p>
<p>This is the most useful form for graphing because it gives you everything you need at a glance:</p>
<ul>
<li><strong>$b$</strong> &mdash; the $y$-intercept. Plot the point $(0, b)$ to start.</li>
<li><strong>$m$</strong> &mdash; the slope. From the intercept, move <em>1 right and $m$ up</em> (or down if $m$ is negative) to find the next point.</li>
</ul>'''),

        callout(
            "Three ways to graph a line",
            '''<ol>
<li><strong>Slope-intercept</strong>: plot $(0, b)$, then use slope to step to the next point.</li>
<li><strong>Two points</strong>: pick any two $x$ values, compute $y$, plot both, draw a line.</li>
<li><strong>Intercepts</strong>: set $y = 0$ to find the $x$-intercept, set $x = 0$ to find the $y$-intercept. Two points → line.</li>
</ol>''',
            kind="concept",
        ),

        section("Worked examples", ""),

        worked_example(
            label="Example 1 &middot; from y = mx + b",
            problem="Graph $y = 2x - 3$.",
            steps=[
                "$y$-intercept is $b = -3$. Plot $(0, -3)$.",
                "Slope is $m = 2 = \\frac{2}{1}$. From $(0, -3)$, go right 1 and up 2 to reach $(1, -1)$.",
                "Repeat: from $(1, -1)$ go right 1 up 2 to $(2, 1)$.",
                "Connect the points with a straight line.",
            ],
            answer="A line through $(0, -3)$ and $(1, -1)$ with slope 2.",
        ),

        worked_example(
            label="Example 2 &middot; from intercepts",
            problem="Graph $3x + 4y = 12$.",
            steps=[
                "Find the $x$-intercept: set $y = 0$ → $3x = 12$ → $x = 4$. Point: $(4, 0)$.",
                "Find the $y$-intercept: set $x = 0$ → $4y = 12$ → $y = 3$. Point: $(0, 3)$.",
                "Plot both points and connect them.",
            ],
            answer="A line through $(4, 0)$ and $(0, 3)$ with slope $-\\frac{3}{4}$.",
        ),

        worked_example(
            label="Example 3 &middot; SAT-style",
            problem="A line has $y$-intercept $4$ and passes through the point $(3, 10)$. Which equation describes this line?",
            steps=[
                "$y$-intercept is $b = 4$, so $y = mx + 4$.",
                "Plug in $(3, 10)$: $10 = 3m + 4$",
                "Solve: $3m = 6$, $m = 2$",
            ],
            answer="$y = 2x + 4$",
        ),

        callout(
            "Common pitfalls",
            pitfall_list([
                ("Plotting (0, b) on the x-axis instead of the y-axis",
                 "the $y$-intercept is on the $y$-axis &mdash; the vertical one. $(0, b)$ means $x = 0$ and $y = b$."),
                ("Misreading slope as 'rise over run = 2/1' as just 2 across",
                 "slope $m = 2$ means UP 2 for every 1 to the RIGHT. Don't confuse the order."),
                ("Drawing a curved line",
                 "linear functions are always straight. If it bends, it's not linear."),
                ("Forgetting that the equation must be in $y = mx + b$ form before reading slope and intercept",
                 "if you see $2x + 3y = 6$, solve for $y$ first → $y = -\\frac{2}{3}x + 2$. Now $m = -\\frac{2}{3}$, $b = 2$."),
            ]),
            kind="pitfall",
        ),

        callout(
            "SAT tactics",
            tactic_list([
                "<strong>For 'which graph matches this equation' questions,</strong> check the $y$-intercept first &mdash; it eliminates most wrong answers in 5 seconds.",
                "<strong>If two lines have the same slope, they're parallel.</strong> If their $y$-intercepts are also equal, they're the same line.",
                "<strong>For word problems with a starting amount and a rate,</strong> the starting amount is $b$ and the rate is $m$. Set up $y = mx + b$ where $x$ is time (or number of items, etc.).",
            ]),
            kind="tactic",
        ),

        widget("y = mx + b Explorer",
               html_body=WIDGET_HTML, css=WIDGET_CSS, js=WIDGET_JS),

        callout(
            "Quick recap",
            recap_list([
                "Slope-intercept form: $y = mx + b$",
                "$b$ is the $y$-intercept &mdash; plot $(0, b)$ first",
                "$m$ is the slope &mdash; rise over run from there",
                "Convert other forms (like $Ax + By = C$) to slope-intercept first",
                "Parallel lines: same slope. Perpendicular: negative reciprocal slope.",
            ]),
            kind="recap",
        ),
    ]
    return assemble_lesson(parts)
