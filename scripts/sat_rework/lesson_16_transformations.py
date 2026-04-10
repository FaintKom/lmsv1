"""Lesson 16: Function Transformations."""
from .template import (
    BASE_WIDGET_CSS, assemble_lesson, callout, hero, pitfall_list,
    recap_list, section, tactic_list, widget, worked_example,
)

WIDGET_CSS = BASE_WIDGET_CSS + """
.eq-display{text-align:center;font-family:ui-monospace,Menlo,monospace;font-size:1.15rem;font-weight:700;color:#4338ca;margin:8px 0}
@media(prefers-color-scheme:dark){.eq-display{color:#a5b4fc}}
.legend{display:flex;justify-content:center;gap:14px;font-size:0.85rem;margin:6px 0}
.legend span{display:inline-flex;align-items:center;gap:6px}
.legend .swatch{display:inline-block;width:14px;height:3px;border-radius:2px}
"""

WIDGET_HTML = """
<p style="font-size:0.88rem;color:#64748b;margin:6px 0 10px;text-align:center">
  See how each transformation moves $f(x) = x^2$. Adjust the sliders.
</p>
<canvas id="trans" width="440" height="340"></canvas>
<div class="legend">
  <span><span class="swatch" style="background:#94a3b8"></span>original $f(x) = x^2$</span>
  <span><span class="swatch" style="background:#6366f1"></span>transformed</span>
</div>
<div class="eq-display" id="eq">y = 1·(x − 0)² + 0</div>
<div class="lms-row"><label>vert (k)</label><input type="range" id="k" min="-5" max="5" step="0.5" value="0"><span class="lms-val" id="kVal">0</span></div>
<div class="lms-row"><label>horiz (h)</label><input type="range" id="h" min="-5" max="5" step="0.5" value="0"><span class="lms-val" id="hVal">0</span></div>
<div class="lms-row"><label>stretch (a)</label><input type="range" id="a" min="-3" max="3" step="0.5" value="1"><span class="lms-val" id="aVal">1</span></div>
<div class="lms-info"><strong>Rules:</strong> $f(x) + k$ shifts UP by $k$. $f(x - h)$ shifts RIGHT by $h$. $a \\cdot f(x)$ stretches vertically by $a$ (negative flips upside-down).</div>
"""

WIDGET_JS = r"""
var canvas = document.getElementById('trans');
var ctx = canvas.getContext('2d');
var W = canvas.width, H = canvas.height, unit = 26;
function gs(x,y){ return {x: W/2 + x*unit, y: H/2 - y*unit}; }

function draw(){
  var k = +document.getElementById('k').value;
  var h = +document.getElementById('h').value;
  var a = +document.getElementById('a').value;
  document.getElementById('kVal').textContent = k;
  document.getElementById('hVal').textContent = h;
  document.getElementById('aVal').textContent = a;
  document.getElementById('eq').textContent = 'y = ' + a + '·(x − ' + h + ')² + ' + k;

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

  // Original f(x) = x²
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.setLineDash([4,4]); ctx.beginPath();
  var first = true;
  for (var x = -7; x <= 7; x += 0.05){
    var y = x*x;
    if (y > 7) { first = true; continue; }
    var p2 = gs(x, y);
    if (first) { ctx.moveTo(p2.x, p2.y); first = false; }
    else ctx.lineTo(p2.x, p2.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Transformed
  ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 3; ctx.beginPath();
  var first2 = true;
  for (var xx = -7; xx <= 7; xx += 0.05){
    var yy = a * (xx - h) * (xx - h) + k;
    if (yy < -7 || yy > 7) { first2 = true; continue; }
    var p3 = gs(xx, yy);
    if (first2) { ctx.moveTo(p3.x, p3.y); first2 = false; }
    else ctx.lineTo(p3.x, p3.y);
  }
  ctx.stroke();
}

['k','h','a'].forEach(function(id){
  document.getElementById(id).addEventListener('input', draw);
});
draw();
"""


def build() -> str:
    parts = [
        hero("Function Transformations",
             "Shift, stretch, flip &mdash; the rules that move any graph",
             gradient="from-sky-500 to-blue-600"),

        callout("Why this matters on the SAT",
                "<p>Transformation questions appear <strong>1&ndash;2 times per test</strong>. The SAT shows you a graph of $y = f(x)$ and asks for the equation of $y = f(x + 3) - 2$ or similar. If you know the rules, you don't need to plot a single point.</p>",
                kind="info"),

        section("The transformation rules", '<p>Starting from any function $y = f(x)$, here is how each modification affects the graph:</p>'),

        callout("Vertical shift (up/down)",
                "<p>$y = f(x) + k$ shifts the graph <strong>up by $k$</strong> if $k &gt; 0$, down by $|k|$ if $k &lt; 0$.</p>",
                kind="concept"),
        callout("Horizontal shift (left/right) — counter-intuitive",
                "<p>$y = f(x - h)$ shifts the graph <strong>right by $h$</strong> (NOT left!) if $h &gt; 0$.</p>"
                "<p>$y = f(x + h)$ shifts <strong>left by $h$</strong>. The sign is opposite of what you'd expect.</p>",
                kind="concept"),
        callout("Vertical stretch / compression",
                "<p>$y = a \\cdot f(x)$ stretches the graph vertically by factor $|a|$. If $a &gt; 1$, taller. If $0 &lt; a &lt; 1$, shorter.</p>"
                "<p>If $a &lt; 0$, the graph also <strong>reflects</strong> across the $x$-axis (flipped upside-down).</p>",
                kind="concept"),
        callout("Horizontal stretch / compression",
                "<p>$y = f(b \\cdot x)$ compresses horizontally by factor $|b|$ if $|b| &gt; 1$, stretches if $0 &lt; |b| &lt; 1$.</p>"
                "<p>If $b &lt; 0$, reflects across the $y$-axis.</p>",
                kind="concept"),

        section("Worked examples", ""),

        worked_example(
            label="Example 1 &middot; vertical shift",
            problem="If $f(x) = x^2$, describe the graph of $g(x) = x^2 + 3$.",
            steps=[
                "$g(x) = f(x) + 3$, so the +3 is a vertical shift.",
                "$+3$ → up 3 units.",
            ],
            answer="The parabola $f(x) = x^2$ shifted up by 3 units.",
        ),

        worked_example(
            label="Example 2 &middot; horizontal shift",
            problem="If $f(x) = |x|$, describe the graph of $g(x) = |x - 4|$.",
            steps=[
                "$g(x) = f(x - 4)$, so this is a horizontal shift.",
                "$x - 4$ → shift RIGHT by 4 (sign flips for horizontal).",
            ],
            answer="The V-shape $|x|$ shifted right by 4 units.",
        ),

        worked_example(
            label="Example 3 &middot; SAT-style combo",
            problem="If $f(x) = x^2$, what is the equation of the graph obtained by shifting $f$ left 2 units and down 5 units?",
            steps=[
                "Left 2 → use $f(x + 2) = (x + 2)^2$",
                "Down 5 → subtract 5: $(x + 2)^2 - 5$",
            ],
            answer="$y = (x + 2)^2 - 5$",
        ),

        callout("Common pitfalls", pitfall_list([
            ("Reading $f(x - 2)$ as &laquo;shift left 2&raquo;",
             "$f(x - h)$ shifts RIGHT by $h$. The sign is OPPOSITE inside the parentheses. This is the #1 SAT trap on transformations."),
            ("Mixing up vertical and horizontal modifications",
             "things ADDED OUTSIDE the function ($+ k$) act vertically. Things INSIDE the parentheses ($x - h$) act horizontally."),
            ("Forgetting that $-f(x)$ flips, not shifts",
             "$y = -f(x)$ reflects across the $x$-axis (upside-down). $y = f(-x)$ reflects across the $y$-axis (left-right mirror)."),
            ("Order of operations in combinations",
             "$y = a \\cdot f(x - h) + k$ does the inside shift FIRST, then the stretch, then the vertical shift. Get the order wrong and the graph won't match."),
        ]), kind="pitfall"),

        callout("SAT tactics", tactic_list([
            "<strong>Inside the parentheses → horizontal AND opposite direction.</strong>",
            "<strong>Outside the function → vertical AND same direction.</strong>",
            "<strong>Negative sign:</strong> $-f$ flips across $x$-axis, $f(-x)$ flips across $y$-axis.",
        ]), kind="tactic"),

        widget("Function Transformer", html_body=WIDGET_HTML, css=WIDGET_CSS, js=WIDGET_JS),

        callout("Quick recap", recap_list([
            "$f(x) + k$ → vertical shift up/down by $k$",
            "$f(x - h)$ → horizontal shift right/left (sign flips)",
            "$a \\cdot f(x)$ → vertical stretch (negative flips $x$-axis)",
            "$f(b x)$ → horizontal compression (negative flips $y$-axis)",
            "Inside = horizontal + opposite. Outside = vertical + same.",
        ]), kind="recap"),
    ]
    return assemble_lesson(parts)
