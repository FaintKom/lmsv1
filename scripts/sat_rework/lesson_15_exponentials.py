"""Lesson 15: Exponential Functions."""
from .template import (
    BASE_WIDGET_CSS, assemble_lesson, callout, hero, pitfall_list,
    recap_list, section, tactic_list, widget, worked_example,
)

WIDGET_CSS = BASE_WIDGET_CSS + """
.eq-display{text-align:center;font-family:ui-monospace,Menlo,monospace;font-size:1.25rem;font-weight:700;color:#4338ca;margin:8px 0}
@media(prefers-color-scheme:dark){.eq-display{color:#a5b4fc}}
.kind-badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:6px 0}
.kind-badge.growth{background:#ecfdf5;color:#065f46;border:1px solid #6ee7b7}
.kind-badge.decay{background:#fef2f2;color:#991b1b;border:1px solid #fca5a5}
@media(prefers-color-scheme:dark){
  .kind-badge.growth{background:#022c22;color:#6ee7b7;border-color:#047857}
  .kind-badge.decay{background:#450a0a;color:#fca5a5;border-color:#7f1d1d}
}
"""

WIDGET_HTML = """
<p style="font-size:0.88rem;color:#64748b;margin:6px 0 10px;text-align:center">
  $y = a \\cdot b^x$. Adjust the base <strong>b</strong> and the starting value <strong>a</strong>. Watch the curve grow or decay.
</p>
<canvas id="exp" width="440" height="340"></canvas>
<div class="eq-display"><span id="eq">y = 2 · 1.5ˣ</span> &nbsp; <span class="kind-badge growth" id="kind">growth</span></div>
<div class="lms-row"><label>a</label><input type="range" id="a" min="0.5" max="10" step="0.5" value="2"><span class="lms-val" id="aVal">2</span></div>
<div class="lms-row"><label>b</label><input type="range" id="b" min="0.1" max="3" step="0.1" value="1.5"><span class="lms-val" id="bVal">1.5</span></div>
<div class="lms-info">If $b &gt; 1$ → exponential <strong>growth</strong>. If $0 &lt; b &lt; 1$ → exponential <strong>decay</strong>. The starting value $y(0) = a$.</div>
"""

WIDGET_JS = r"""
var canvas = document.getElementById('exp');
var ctx = canvas.getContext('2d');
var W = canvas.width, H = canvas.height, unitX = 38, unitY = 22;
function gs(x, y){ return {x: 30 + (x + 4) * unitX, y: H - 30 - y * unitY}; }

function draw(){
  var a = +document.getElementById('a').value;
  var b = +document.getElementById('b').value;
  document.getElementById('aVal').textContent = a;
  document.getElementById('bVal').textContent = b;
  document.getElementById('eq').textContent = 'y = ' + a + ' · ' + b + 'ˣ';
  var kind = document.getElementById('kind');
  if (b > 1) { kind.textContent = 'growth'; kind.className = 'kind-badge growth'; }
  else if (b < 1 && b > 0) { kind.textContent = 'decay'; kind.className = 'kind-badge decay'; }
  else { kind.textContent = 'b = 1: constant'; kind.className = 'kind-badge growth'; }

  ctx.fillStyle = getComputedStyle(canvas).backgroundColor || 'white';
  ctx.fillRect(0,0,W,H);
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
  for (var i = -4; i <= 8; i++){
    var p = gs(i, 0); ctx.beginPath(); ctx.moveTo(p.x, 30); ctx.lineTo(p.x, H-30); ctx.stroke();
  }
  for (var j = 0; j <= 14; j++){
    var q = gs(0, j); ctx.beginPath(); ctx.moveTo(30, q.y); ctx.lineTo(W-10, q.y); ctx.stroke();
  }
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(30, H-30); ctx.lineTo(W-10, H-30); ctx.stroke();
  var yAxis = gs(0, 0);
  ctx.beginPath(); ctx.moveTo(yAxis.x, 30); ctx.lineTo(yAxis.x, H-30); ctx.stroke();

  // Curve
  ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 3; ctx.beginPath();
  var first = true;
  for (var x = -4; x <= 8; x += 0.05){
    var y = a * Math.pow(b, x);
    if (y < 0 || y > 14) { first = true; continue; }
    var p2 = gs(x, y);
    if (first) { ctx.moveTo(p2.x, p2.y); first = false; }
    else ctx.lineTo(p2.x, p2.y);
  }
  ctx.stroke();
  // Starting value marker
  var s = gs(0, a);
  ctx.beginPath(); ctx.arc(s.x, s.y, 6, 0, Math.PI*2);
  ctx.fillStyle = '#10b981'; ctx.fill();
  ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
}

document.getElementById('a').addEventListener('input', draw);
document.getElementById('b').addEventListener('input', draw);
draw();
"""


def build() -> str:
    parts = [
        hero("Exponential Functions",
             "$y = a \\cdot b^x$ &mdash; the math of growth, decay, and compound interest",
             gradient="from-amber-500 to-orange-600"),

        callout("Why this matters on the SAT",
                "<p>Exponential models appear <strong>1&ndash;3 times per test</strong>: population growth, radioactive decay, compound interest, depreciation. Recognize the form $a \\cdot b^x$ and you can read the starting value, growth rate, and predict any future value.</p>",
                kind="info"),

        section("The standard form", '<p>An exponential function has the form:</p>'
                '<p style="text-align:center;font-size:1.25rem">$$y = a \\cdot b^x$$</p>'
                '<ul>'
                '<li><strong>$a$</strong> is the <strong>starting value</strong>: $y$ when $x = 0$, since $b^0 = 1$.</li>'
                '<li><strong>$b$</strong> is the <strong>base</strong>: the multiplicative growth factor per unit increase of $x$.</li>'
                '</ul>'),

        callout("Growth vs decay",
                "<ul>"
                "<li><strong>$b &gt; 1$</strong> → exponential <strong>growth</strong>. Each unit of $x$ multiplies $y$ by $b$ (e.g. $b = 2$ means doubling).</li>"
                "<li><strong>$0 &lt; b &lt; 1$</strong> → exponential <strong>decay</strong>. Each unit of $x$ shrinks $y$ by factor $b$ (e.g. $b = 0.5$ means halving).</li>"
                "<li><strong>$b = 1$</strong> → constant (not really exponential).</li>"
                "</ul>",
                kind="concept"),

        callout("Percent rate form",
                "<p>You'll often see growth rates as percents:</p>"
                "<ul>"
                "<li>Growth at <strong>$r\\%$ per period</strong>: $y = a \\cdot (1 + r/100)^x$</li>"
                "<li>Decay at <strong>$r\\%$ per period</strong>: $y = a \\cdot (1 - r/100)^x$</li>"
                "</ul>"
                "<p>So 5% growth → base $b = 1.05$. 8% decay → base $b = 0.92$.</p>",
                kind="concept"),

        section("Worked examples", ""),

        worked_example(
            label="Example 1 &middot; growth",
            problem="A bacteria culture starts at $200$ cells and doubles every hour. How many cells after $4$ hours?",
            steps=[
                "Set up: $y = a \\cdot b^x$ with $a = 200$, $b = 2$, $x = 4$ hours.",
                "Compute: $y = 200 \\cdot 2^4 = 200 \\cdot 16$",
                "Result: $y = 3200$",
            ],
            answer="$3200$ cells",
        ),

        worked_example(
            label="Example 2 &middot; decay",
            problem="A drug breaks down at $20\\%$ per hour. If you start with $80$ mg, how much remains after $3$ hours?",
            steps=[
                "Decay rate $20\\%$ → base $b = 1 - 0.20 = 0.80$",
                "$y = 80 \\cdot 0.80^3 = 80 \\cdot 0.512$",
                "Compute: $y \\approx 40.96$",
            ],
            answer="$\\approx 40.96$ mg",
        ),

        worked_example(
            label="Example 3 &middot; SAT-style",
            problem="The population of a town is modeled by $P(t) = 5000 \\cdot (1.03)^t$ where $t$ is years since 2020. What is the annual percent growth rate, and what is the population in 2020?",
            steps=[
                "Identify $a = 5000$ &mdash; the starting value (population in 2020).",
                "Identify $b = 1.03$ → growth factor of $1 + 0.03$ → $3\\%$ growth per year.",
            ],
            answer="$3\\%$ annual growth; population in 2020 was $5000$",
        ),

        callout("Common pitfalls", pitfall_list([
            ("Confusing exponential growth with linear growth",
             "linear adds a constant amount each step. Exponential MULTIPLIES by a constant factor. They diverge fast."),
            ("Mistaking $1 + r$ for $r$ as the base",
             "5% growth is base $1.05$, NOT $0.05$. The base is the FACTOR you multiply by, not just the rate."),
            ("Forgetting that $b^0 = 1$",
             "the value at $x = 0$ is just $a \\cdot 1 = a$. The starting value is always $a$, not $0$."),
            ("Adding rates over multiple periods instead of compounding",
             "$5\\%$ growth for 2 years is NOT $10\\%$. It's $1.05 \\cdot 1.05 = 1.1025$, so $\\approx 10.25\\%$."),
        ]), kind="pitfall"),

        callout("SAT tactics", tactic_list([
            "<strong>To find the rate, look at $b$.</strong> $b - 1$ as a percent is the rate per period.",
            "<strong>For half-life problems, set $y = a/2$ and solve for $x$.</strong>",
            "<strong>Compound interest formula:</strong> $A = P(1 + r/n)^{nt}$ where $n$ is compounding periods per year. Memorize this — it shows up.",
        ]), kind="tactic"),

        widget("Exponential Curve Explorer", html_body=WIDGET_HTML, css=WIDGET_CSS, js=WIDGET_JS),

        callout("Quick recap", recap_list([
            "Standard form: $y = a \\cdot b^x$",
            "$a$ is the starting value (when $x = 0$)",
            "$b &gt; 1$: growth. $0 &lt; b &lt; 1$: decay.",
            "Percent rate: growth $b = 1 + r/100$, decay $b = 1 - r/100$",
            "Compound interest: $A = P(1 + r/n)^{nt}$",
        ]), kind="recap"),
    ]
    return assemble_lesson(parts)
