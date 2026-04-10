"""Lesson 13: Graphing Quadratics."""
from .template import (
    BASE_WIDGET_CSS, assemble_lesson, callout, hero, pitfall_list,
    recap_list, section, tactic_list, widget, worked_example,
)

WIDGET_CSS = BASE_WIDGET_CSS + """
.eq-display{text-align:center;font-family:ui-monospace,Menlo,monospace;font-size:1.2rem;font-weight:700;color:#4338ca;margin:8px 0}
@media(prefers-color-scheme:dark){.eq-display{color:#a5b4fc}}
.vertex-info{display:flex;justify-content:space-around;font-family:ui-monospace,Menlo,monospace;font-size:0.95rem;margin:8px 0;flex-wrap:wrap;gap:8px}
.vertex-info span{background:white;border:1px solid #c7d2fe;padding:6px 12px;border-radius:8px;color:#4338ca}
@media(prefers-color-scheme:dark){.vertex-info span{background:#0f172a;border-color:#3730a3;color:#a5b4fc}}
"""

WIDGET_HTML = """
<p style="font-size:0.88rem;color:#64748b;margin:6px 0 10px;text-align:center">
  Drag the sliders to change <strong>a</strong>, <strong>b</strong>, <strong>c</strong>. The vertex, axis of symmetry, and $y$-intercept update.
</p>
<canvas id="parab" width="440" height="340"></canvas>
<div class="eq-display" id="eq">y = x² + 0·x + 0</div>
<div class="vertex-info">
  <span id="vertexInfo">vertex (0, 0)</span>
  <span id="axisInfo">axis: x = 0</span>
  <span id="yInfo">y-int: 0</span>
</div>
<div class="lms-row"><label>a</label><input type="range" id="a" min="-3" max="3" step="0.5" value="1"><span class="lms-val" id="aVal">1</span></div>
<div class="lms-row"><label>b</label><input type="range" id="b" min="-6" max="6" step="0.5" value="0"><span class="lms-val" id="bVal">0</span></div>
<div class="lms-row"><label>c</label><input type="range" id="c" min="-6" max="6" step="0.5" value="0"><span class="lms-val" id="cVal">0</span></div>
<div class="lms-info">Vertex form: $y = a(x - h)^2 + k$ where vertex is $(h, k)$. From standard form, $h = -\\dfrac{b}{2a}$.</div>
"""

WIDGET_JS = r"""
var canvas = document.getElementById('parab');
var ctx = canvas.getContext('2d');
var W = canvas.width, H = canvas.height, unit = 28;
function gs(x,y){ return {x: W/2 + x*unit, y: H/2 - y*unit}; }

function fmtCoef(c, v, first){
  if (c === 0) return '';
  var sign = c > 0 ? (first ? '' : ' + ') : ' − ';
  var abs = Math.abs(c);
  var coef = (abs === 1 && v !== '') ? '' : abs;
  return sign + coef + v;
}

function draw(){
  var a = +document.getElementById('a').value;
  var b = +document.getElementById('b').value;
  var c = +document.getElementById('c').value;
  document.getElementById('aVal').textContent = a;
  document.getElementById('bVal').textContent = b;
  document.getElementById('cVal').textContent = c;

  var eq = (a === 1 ? 'x²' : (a === -1 ? '−x²' : (a === 0 ? '0' : a + 'x²')));
  eq += fmtCoef(b, 'x', false);
  eq += fmtCoef(c, '', false);
  document.getElementById('eq').textContent = 'y = ' + eq;

  if (a === 0) {
    document.getElementById('vertexInfo').textContent = 'a = 0 → not a parabola';
    document.getElementById('axisInfo').textContent = '';
    document.getElementById('yInfo').textContent = '';
  } else {
    var h = -b / (2*a);
    var k = a*h*h + b*h + c;
    document.getElementById('vertexInfo').textContent = 'vertex (' + round(h) + ', ' + round(k) + ')';
    document.getElementById('axisInfo').textContent = 'axis: x = ' + round(h);
    document.getElementById('yInfo').textContent = 'y-int: ' + round(c);
  }

  ctx.fillStyle = getComputedStyle(canvas).backgroundColor || 'white';
  ctx.fillRect(0,0,W,H);
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
  for (var i = -7; i <= 7; i++){
    var p = gs(i,0); ctx.beginPath(); ctx.moveTo(p.x,0); ctx.lineTo(p.x,H); ctx.stroke();
    var q = gs(0,i); ctx.beginPath(); ctx.moveTo(0,q.y); ctx.lineTo(W,q.y); ctx.stroke();
  }
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0,H/2); ctx.lineTo(W,H/2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke();

  if (a !== 0) {
    // Parabola
    ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 3; ctx.beginPath();
    var first = true;
    for (var x = -8; x <= 8; x += 0.05) {
      var y = a*x*x + b*x + c;
      if (y < -7 || y > 7) { first = true; continue; }
      var p = gs(x, y);
      if (first) { ctx.moveTo(p.x, p.y); first = false; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    // Vertex marker
    var hh = -b / (2*a);
    var kk = a*hh*hh + b*hh + c;
    if (kk >= -7 && kk <= 7 && hh >= -8 && hh <= 8) {
      var v = gs(hh, kk);
      ctx.beginPath(); ctx.arc(v.x, v.y, 6, 0, Math.PI*2);
      ctx.fillStyle = '#10b981'; ctx.fill(); ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
    }
  }
}

function round(n){ return Math.round(n * 100) / 100; }

['a','b','c'].forEach(function(id){
  document.getElementById(id).addEventListener('input', draw);
});
draw();
"""


def build() -> str:
    parts = [
        hero("Graphing Quadratics",
             "Parabolas, vertices, and the connection between $a$, $b$, $c$ and the curve",
             gradient="from-emerald-600 to-teal-600"),

        callout("Why this matters on the SAT",
                "<p>Parabola questions appear <strong>2&ndash;3 times per test</strong>. The SAT asks: identify the vertex, find the axis of symmetry, determine if the parabola opens up or down, find $x$-intercepts. All of these come from $a$, $b$, $c$ in the equation.</p>",
                kind="info"),

        section("The shape of a parabola", '<p>The graph of $y = ax^2 + bx + c$ is a <strong>parabola</strong>. Three things determine its shape:</p>'),

        callout("Direction (sign of a)",
                "<p>If $a &gt; 0$, the parabola opens <strong>upward</strong> (smiles, has a minimum). If $a &lt; 0$, it opens <strong>downward</strong> (frowns, has a maximum).</p>",
                kind="concept"),
        callout("Vertex (turning point)",
                "<p>The vertex is at $\\left(-\\dfrac{b}{2a},\\, f\\!\\left(-\\dfrac{b}{2a}\\right)\\right)$. It's the minimum (or maximum) point of the parabola.</p>"
                "<p><strong>Vertex form</strong>: $y = a(x - h)^2 + k$ where the vertex is $(h, k)$.</p>",
                kind="concept"),
        callout("Y-intercept and x-intercepts",
                "<p>The $y$-intercept is at $(0, c)$ &mdash; just plug in $x = 0$.</p>"
                "<p>The $x$-intercepts (roots) are wherever $ax^2 + bx + c = 0$. Use the quadratic formula or factor.</p>",
                kind="concept"),

        section("Worked examples", ""),

        worked_example(
            label="Example 1 &middot; vertex from standard form",
            problem="Find the vertex of $y = 2x^2 - 8x + 5$.",
            steps=[
                "Identify $a = 2, b = -8, c = 5$.",
                "$x$-coordinate of vertex: $h = -\\dfrac{b}{2a} = -\\dfrac{-8}{2(2)} = 2$",
                "$y$-coordinate: $f(2) = 2(2)^2 - 8(2) + 5 = 8 - 16 + 5 = -3$",
            ],
            answer="vertex $= (2, -3)$",
        ),

        worked_example(
            label="Example 2 &middot; from vertex form",
            problem="What is the vertex of $y = -3(x + 1)^2 + 4$?",
            steps=[
                "Vertex form is $y = a(x - h)^2 + k$, so compare with $-3(x + 1)^2 + 4$.",
                "Note $(x + 1) = (x - (-1))$, so $h = -1$.",
                "And $k = 4$.",
                "Since $a = -3 &lt; 0$, the parabola opens downward and has a maximum at the vertex.",
            ],
            answer="vertex $= (-1, 4)$, maximum",
        ),

        worked_example(
            label="Example 3 &middot; SAT-style",
            problem="A ball's height (in feet) after $t$ seconds is $h(t) = -16t^2 + 64t + 5$. What is the maximum height?",
            steps=[
                "$a = -16 &lt; 0$, so the parabola opens downward — the vertex is a maximum.",
                "$t$ at the vertex: $-\\dfrac{b}{2a} = -\\dfrac{64}{-32} = 2$ seconds.",
                "Plug back: $h(2) = -16(4) + 64(2) + 5 = -64 + 128 + 5 = 69$",
            ],
            answer="$69$ feet at $t = 2$ seconds",
        ),

        callout("Common pitfalls", pitfall_list([
            ("Reading vertex form as $y = a(x + h)^2 + k$ → vertex $(h, k)$",
             "the formula is $a(x - h)^2 + k$. So $a(x + 1)^2 + 4$ has $h = -1$, NOT $+1$."),
            ("Forgetting to plug $h$ back in for the y-coordinate",
             "$-b/(2a)$ gives only the $x$-coordinate. You need $f(h)$ for the $y$-coordinate."),
            ("Confusing &laquo;axis of symmetry&raquo; with &laquo;y-axis&raquo;",
             "the axis of symmetry is the vertical line $x = h$ through the vertex, NOT the $y$-axis (unless $h = 0$)."),
            ("Saying &laquo;$a$ is the $y$-intercept&raquo;",
             "$a$ controls the width and direction. The $y$-intercept is $c$."),
        ]), kind="pitfall"),

        callout("SAT tactics", tactic_list([
            "<strong>For min/max problems, the answer is at the vertex.</strong> Use $h = -b/(2a)$, then plug back.",
            "<strong>If the equation is in vertex form, the vertex is right there.</strong> Don't expand it &mdash; that's slower.",
            "<strong>$y$-intercept is $c$.</strong> No work needed &mdash; it's the constant in standard form.",
        ]), kind="tactic"),

        widget("Parabola Explorer", html_body=WIDGET_HTML, css=WIDGET_CSS, js=WIDGET_JS),

        callout("Quick recap", recap_list([
            "$y = ax^2 + bx + c$ is a parabola",
            "$a &gt; 0$ → opens up (min). $a &lt; 0$ → opens down (max).",
            "Vertex $x$-coord: $-\\dfrac{b}{2a}$",
            "Vertex form: $y = a(x - h)^2 + k$, vertex $(h, k)$",
            "$y$-intercept: $(0, c)$",
        ]), kind="recap"),
    ]
    return assemble_lesson(parts)
