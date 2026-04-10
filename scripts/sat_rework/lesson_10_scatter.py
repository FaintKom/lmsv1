"""Lesson 10: Scatter Plots & Lines of Best Fit."""
from .template import (
    BASE_WIDGET_CSS, assemble_lesson, callout, hero, pitfall_list,
    recap_list, section, tactic_list, widget, worked_example,
)

WIDGET_CSS = BASE_WIDGET_CSS + """
.eq-display{text-align:center;font-family:ui-monospace,Menlo,monospace;font-size:1.2rem;font-weight:700;color:#4338ca;padding:10px;background:white;border:1px solid #e2e8f0;border-radius:10px;margin:10px 0}
@media(prefers-color-scheme:dark){.eq-display{background:#0f172a;border-color:#334155;color:#a5b4fc}}
.dataset-picker{display:flex;gap:6px;justify-content:center;margin:8px 0;flex-wrap:wrap}
.dataset-picker button{font-size:0.78rem;padding:6px 12px}
.dataset-picker button.active{background:#4338ca}
"""

WIDGET_HTML = """
<p style="font-size:0.88rem;color:#64748b;margin:6px 0 10px;text-align:center">
  Adjust slope <strong>m</strong> and intercept <strong>b</strong> to fit a line through the points. The smaller the residual sum, the better the fit.
</p>
<div class="dataset-picker">
  <button class="lms-btn ghost active" data-set="0">positive</button>
  <button class="lms-btn ghost" data-set="1">negative</button>
  <button class="lms-btn ghost" data-set="2">no correlation</button>
</div>
<canvas id="plot" width="440" height="340"></canvas>
<div class="eq-display" id="eq">y = 1·x + 0</div>
<div class="lms-row"><label>m</label><input type="range" id="m" min="-3" max="3" step="0.1" value="1"><span class="lms-val" id="mVal">1</span></div>
<div class="lms-row"><label>b</label><input type="range" id="b" min="-5" max="5" step="0.5" value="0"><span class="lms-val" id="bVal">0</span></div>
<div class="lms-info" id="fit">Sum of squared residuals: —</div>
"""

WIDGET_JS = r"""
var datasets = [
  // (x, y) pairs that follow y ≈ 0.7x + 1 with noise
  [[0,1.5],[1,1.8],[2,2.3],[3,3.2],[4,3.9],[5,4.6],[6,5.1],[7,5.9]],
  // negative correlation y ≈ -0.6x + 5
  [[0,5.2],[1,4.4],[2,3.6],[3,3.5],[4,2.8],[5,1.9],[6,1.3],[7,0.4]],
  // no correlation
  [[0,3],[1,2],[2,5],[3,1],[4,4],[5,3],[6,2],[7,5]],
];
var current = 0;
var canvas = document.getElementById('plot');
var ctx = canvas.getContext('2d');
var W = canvas.width, H = canvas.height, unit = 38;

function gs(x, y){ return {x: 30 + x*unit, y: H - 30 - y*unit}; }

function draw(){
  var m = +document.getElementById('m').value;
  var b = +document.getElementById('b').value;
  document.getElementById('mVal').textContent = m.toFixed(1);
  document.getElementById('bVal').textContent = b.toFixed(1);
  document.getElementById('eq').textContent = 'y = ' + m.toFixed(1) + '·x + ' + b.toFixed(1);

  ctx.fillStyle = getComputedStyle(canvas).backgroundColor || 'white';
  ctx.fillRect(0,0,W,H);

  // Grid
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
  for (var i = 0; i <= 8; i++){
    var p = gs(i, 0); ctx.beginPath(); ctx.moveTo(p.x, 30); ctx.lineTo(p.x, H-30); ctx.stroke();
    var q = gs(0, i); ctx.beginPath(); ctx.moveTo(30, q.y); ctx.lineTo(W-10, q.y); ctx.stroke();
  }
  // Axes
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(30, H-30); ctx.lineTo(W-10, H-30); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(30, 30); ctx.lineTo(30, H-30); ctx.stroke();

  // Line
  var x1 = 0, y1 = m*x1 + b;
  var x2 = 8, y2 = m*x2 + b;
  if (y1 < 0) { x1 = -b/m; y1 = 0; }
  if (y2 > 8) { x2 = (8-b)/m; y2 = 8; }
  if (y1 > 8) { x1 = (8-b)/m; y1 = 8; }
  if (y2 < 0) { x2 = -b/m; y2 = 0; }
  var p1 = gs(Math.max(0, Math.min(8, x1)), Math.max(0, Math.min(8, y1)));
  var p2 = gs(Math.max(0, Math.min(8, x2)), Math.max(0, Math.min(8, y2)));
  ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();

  // Points + residual lines
  var residSum = 0;
  datasets[current].forEach(function(pt){
    var px = pt[0], py = pt[1];
    var predicted = m * px + b;
    var resid = py - predicted;
    residSum += resid * resid;
    var spt = gs(px, py);
    var sline = gs(px, predicted);
    // residual line
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(spt.x, spt.y); ctx.lineTo(sline.x, sline.y); ctx.stroke();
    ctx.setLineDash([]);
    // point
    ctx.beginPath(); ctx.arc(spt.x, spt.y, 5, 0, Math.PI*2);
    ctx.fillStyle = '#10b981'; ctx.fill();
    ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
  });
  document.getElementById('fit').innerHTML = '<b>Sum of squared residuals:</b> ' + residSum.toFixed(2) + ' (smaller is a better fit)';
}

document.getElementById('m').addEventListener('input', draw);
document.getElementById('b').addEventListener('input', draw);
document.querySelectorAll('.dataset-picker button').forEach(function(b){
  b.addEventListener('click', function(){
    document.querySelectorAll('.dataset-picker button').forEach(function(x){ x.classList.remove('active'); });
    b.classList.add('active');
    current = +b.dataset.set;
    draw();
  });
});
draw();
"""


def build() -> str:
    parts = [
        hero("Scatter Plots &amp; Lines of Best Fit",
             "Read the trend &mdash; SAT loves &laquo;based on the line of best fit, predict...&raquo; questions",
             gradient="from-sky-500 to-blue-600"),

        callout("Why this matters on the SAT",
                "<p>Scatter plots show up <strong>2&ndash;3 times per test</strong>, almost always with a line of best fit drawn through. The questions ask you to: identify the relationship type, predict a value using the line, or interpret the slope and intercept in real-world terms.</p>",
                kind="info"),

        section("What a scatter plot shows", '<p>Each dot is one observation with two measurements: an $x$-value and a $y$-value. The pattern of dots tells you whether the two variables are <strong>related</strong>, and how:</p>'),

        callout("Three correlation patterns",
                '<ul>'
                '<li><strong>Positive correlation</strong>: as $x$ increases, $y$ tends to increase. Dots slope upward.</li>'
                '<li><strong>Negative correlation</strong>: as $x$ increases, $y$ tends to decrease. Dots slope downward.</li>'
                '<li><strong>No correlation</strong>: dots are scattered randomly. No clear linear pattern.</li>'
                '</ul>',
                kind="concept"),

        callout("Line of best fit",
                "<p>The straight line that best summarizes the trend &mdash; minimizing the squared distances from each point to the line (least-squares). The SAT just gives you the line; you don't have to compute it. Read the slope and intercept to make predictions and interpretations.</p>",
                kind="concept"),

        section("Worked examples", ""),

        worked_example(
            label="Example 1 &middot; predict from the line",
            problem="A scatter plot's line of best fit is $y = 2.5x + 4$. Predict $y$ when $x = 6$.",
            steps=[
                "Substitute $x = 6$: $y = 2.5(6) + 4$",
                "Compute: $y = 15 + 4 = 19$",
            ],
            answer="$y = 19$",
        ),

        worked_example(
            label="Example 2 &middot; interpret the slope",
            problem="A study models hours studied ($x$) vs test score ($y$) with $y = 8x + 50$. What does the slope mean?",
            steps=[
                "Slope is the rate of change of $y$ per 1-unit increase of $x$.",
                "Units: points per hour studied.",
                "Translation: each additional hour studied corresponds to 8 more points on the test.",
            ],
            answer="Each extra hour of studying predicts 8 more points on the test.",
        ),

        worked_example(
            label="Example 3 &middot; SAT-style",
            problem="A line of best fit for plant height (cm) vs week is $h = 1.5w + 4$. According to the model, what is the plant's height at week $0$?",
            steps=[
                "$y$-intercept is $b = 4$ (the value when $w = 0$).",
                "Translation: at week 0 the plant is 4 cm tall (the starting height).",
            ],
            answer="$4$ cm",
        ),

        callout("Common pitfalls", pitfall_list([
            ("Confusing correlation with causation",
             "a positive correlation between ice cream sales and drownings doesn't mean ice cream causes drownings &mdash; both increase in summer. The SAT often catches this."),
            ("Extrapolating beyond the data",
             "the line of best fit only models the range of $x$ values you actually observed. Predictions far outside that range are unreliable."),
            ("Misreading positive vs negative slope",
             "lines that go DOWN left-to-right have negative slope. Don't say &laquo;positive&raquo; just because the line is &laquo;there.&raquo;"),
            ("Thinking the line passes through every point",
             "the best-fit line is the BEST AVERAGE &mdash; individual points scatter around it. The line minimizes total error, not individual error."),
        ]), kind="pitfall"),

        callout("SAT tactics", tactic_list([
            "<strong>For prediction questions, plug $x$ into the line equation.</strong> Don't try to read it off the chart by eye.",
            "<strong>For slope interpretation, use the units.</strong> Slope = (units of $y$) per (1 unit of $x$). State that in plain English.",
            "<strong>For &laquo;most/fewer than&raquo; questions, count points above or below the line.</strong> Each one represents one data observation.",
        ]), kind="tactic"),

        widget("Line of Best Fit Tuner", html_body=WIDGET_HTML, css=WIDGET_CSS, js=WIDGET_JS),

        callout("Quick recap", recap_list([
            "Positive correlation: line slopes up. Negative: line slopes down.",
            "Line of best fit: $y = mx + b$, minimizes squared residuals",
            "Predict $y$ by plugging $x$ into the equation",
            "Interpret slope as a rate (units of $y$ per unit of $x$)",
            "Correlation ≠ causation; don't extrapolate far beyond the data",
        ]), kind="recap"),
    ]
    return assemble_lesson(parts)
