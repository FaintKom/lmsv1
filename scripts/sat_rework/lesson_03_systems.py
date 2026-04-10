"""Lesson 3: Systems of Linear Equations."""
from .template import (
    BASE_WIDGET_CSS, assemble_lesson, callout, hero, pitfall_list,
    recap_list, section, tactic_list, widget, worked_example,
)

WIDGET_CSS = BASE_WIDGET_CSS + """
.coef-row{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:8px 0}
.coef-row > div{display:flex;align-items:center;gap:6px;background:white;padding:6px 12px;border-radius:8px;border:1px solid #e2e8f0}
.coef-row label{font-size:0.8rem;color:#64748b;font-weight:600}
.coef-row input{width:55px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px;text-align:center;font-family:ui-monospace,Menlo,monospace}
.eq-row{font-family:ui-monospace,Menlo,monospace;text-align:center;font-size:1.05rem;margin:6px 0;font-weight:700}
.eq-row.l1{color:#6366f1}
.eq-row.l2{color:#f97316}
.intersection-info{background:#ecfdf5;border:1px solid #6ee7b7;border-radius:10px;padding:10px 14px;margin:10px 0;text-align:center;color:#065f46;font-weight:600}
.no-sol{background:#fef2f2;border-color:#fca5a5;color:#991b1b}
@media(prefers-color-scheme:dark){
  .coef-row > div{background:#0f172a;border-color:#334155}
  .coef-row input{background:#1e293b;color:#e2e8f0;border-color:#475569}
  .intersection-info{background:#022c22;border-color:#047857;color:#6ee7b7}
}
"""

WIDGET_HTML = """
<p style="font-size:0.88rem;color:#64748b;margin:6px 0 10px;text-align:center">
  Adjust the coefficients and watch where the two lines meet.
</p>
<div class="coef-row">
  <div><label>a₁</label><input type="number" id="a1" value="2"></div>
  <div><label>b₁</label><input type="number" id="b1" value="1"></div>
  <div><label>c₁</label><input type="number" id="c1" value="7"></div>
</div>
<div class="eq-row l1" id="eq1">2x + y = 7</div>
<div class="coef-row">
  <div><label>a₂</label><input type="number" id="a2" value="1"></div>
  <div><label>b₂</label><input type="number" id="b2" value="-1"></div>
  <div><label>c₂</label><input type="number" id="c2" value="-1"></div>
</div>
<div class="eq-row l2" id="eq2">x − y = −1</div>
<canvas id="graph" width="420" height="320"></canvas>
<div class="intersection-info" id="info">Solution: x = 2, y = 3</div>
"""

WIDGET_JS = r"""
var canvas = document.getElementById('graph');
var ctx = canvas.getContext('2d');
var W = canvas.width, H = canvas.height;
var unit = 28;

function gridToScreen(x, y){ return {x: W/2 + x*unit, y: H/2 - y*unit}; }
function fmtTerm(c, v, first){
  if (c === 0) return '';
  var sign = c > 0 ? (first ? '' : ' + ') : ' − ';
  var abs = Math.abs(c);
  var coef = (abs === 1 ? '' : abs);
  return sign + coef + v;
}
function fmtEq(a,b,c){
  var s = (fmtTerm(a,'x',true) || '0') + fmtTerm(b,'y',false);
  return (s || '0') + ' = ' + c;
}

function drawAxes(){
  ctx.fillStyle = getComputedStyle(canvas).backgroundColor || 'white';
  ctx.fillRect(0,0,W,H);
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
  for (var i=-7;i<=7;i++){
    var p = gridToScreen(i, 0);
    ctx.beginPath(); ctx.moveTo(p.x, 0); ctx.lineTo(p.x, H); ctx.stroke();
    var q = gridToScreen(0, i);
    ctx.beginPath(); ctx.moveTo(0, q.y); ctx.lineTo(W, q.y); ctx.stroke();
  }
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
}

function drawLine(a, b, c, color){
  // ax + by = c → solve for two endpoints in view
  ctx.strokeStyle = color; ctx.lineWidth = 3;
  ctx.beginPath();
  if (b !== 0){
    var x1 = -8, y1 = (c - a*x1)/b;
    var x2 = 8,  y2 = (c - a*x2)/b;
    var p1 = gridToScreen(x1, y1), p2 = gridToScreen(x2, y2);
    ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
  } else if (a !== 0){
    var x = c/a;
    var p1 = gridToScreen(x, -8), p2 = gridToScreen(x, 8);
    ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
  }
  ctx.stroke();
}

function solve(a1,b1,c1,a2,b2,c2){
  var det = a1*b2 - a2*b1;
  if (det === 0){
    // No unique solution
    if (a1*c2 - a2*c1 === 0 && b1*c2 - b2*c1 === 0) return {kind:'infinite'};
    return {kind:'none'};
  }
  return {kind:'unique', x: (c1*b2 - c2*b1)/det, y: (a1*c2 - a2*c1)/det};
}

function update(){
  var a1 = +document.getElementById('a1').value;
  var b1 = +document.getElementById('b1').value;
  var c1 = +document.getElementById('c1').value;
  var a2 = +document.getElementById('a2').value;
  var b2 = +document.getElementById('b2').value;
  var c2 = +document.getElementById('c2').value;
  document.getElementById('eq1').textContent = fmtEq(a1,b1,c1);
  document.getElementById('eq2').textContent = fmtEq(a2,b2,c2);
  drawAxes();
  drawLine(a1,b1,c1,'#6366f1');
  drawLine(a2,b2,c2,'#f97316');
  var s = solve(a1,b1,c1,a2,b2,c2);
  var info = document.getElementById('info');
  info.classList.remove('no-sol');
  if (s.kind === 'unique'){
    var p = gridToScreen(s.x, s.y);
    ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI*2);
    ctx.fillStyle = '#10b981'; ctx.fill();
    ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
    var nx = Math.round(s.x*100)/100, ny = Math.round(s.y*100)/100;
    info.textContent = 'Solution: x = ' + nx + ', y = ' + ny;
  } else if (s.kind === 'none'){
    info.textContent = 'No solution — the lines are parallel.';
    info.classList.add('no-sol');
  } else {
    info.textContent = 'Infinite solutions — the equations describe the same line.';
  }
}

['a1','b1','c1','a2','b2','c2'].forEach(function(id){
  document.getElementById(id).addEventListener('input', update);
});
update();
"""


def build() -> str:
    parts = [
        hero(
            "Systems of Linear Equations",
            "Two equations, two unknowns &mdash; three methods to solve",
            gradient="from-rose-500 to-pink-600",
        ),

        callout(
            "Why this matters on the SAT",
            "<p>Systems show up <strong>2&ndash;4 times per test</strong> &mdash; usually as a word problem about ages, prices, or rates. The SAT tests your ability to choose the fastest method (substitution vs elimination) for a given problem, not just any method that works.</p>",
            kind="info",
        ),

        section("The three methods", '<p>You can solve any 2×2 linear system three ways. The SAT loves all three, but each one is best in different situations:</p>'),

        callout("1. Substitution",
                "<p><strong>Best when one equation is already solved for a variable</strong> (e.g. $y = 2x + 3$). Substitute that expression into the other equation, solve for one variable, then back-substitute.</p>",
                kind="concept"),
        callout("2. Elimination",
                "<p><strong>Best when coefficients line up</strong> for cancellation. Add or subtract the equations (after multiplying if needed) so one variable disappears.</p>",
                kind="concept"),
        callout("3. Graphing",
                "<p><strong>Best for conceptual questions</strong> about \"how many solutions\" or \"what are the intersection points\". Slow for actually finding numbers, fast for sketches.</p>",
                kind="concept"),

        section("Worked examples", ""),

        worked_example(
            label="Example 1 &middot; substitution",
            problem="Solve: $\\begin{cases} y = 2x + 1 \\\\ 3x + y = 11 \\end{cases}$",
            steps=[
                "The first equation is already solved for $y$. Substitute $2x + 1$ for $y$ in the second equation: $3x + (2x + 1) = 11$",
                "Combine: $5x + 1 = 11$",
                "Subtract 1: $5x = 10$, so $x = 2$",
                "Plug back into the first equation: $y = 2(2) + 1 = 5$",
            ],
            answer="$x = 2, y = 5$. Check: $3(2) + 5 = 11$ ✓",
        ),

        worked_example(
            label="Example 2 &middot; elimination",
            problem="Solve: $\\begin{cases} 2x + 3y = 12 \\\\ 4x - 3y = 6 \\end{cases}$",
            steps=[
                "Notice the $+3y$ and $-3y$ &mdash; they cancel when added.",
                "Add the equations: $(2x + 3y) + (4x - 3y) = 12 + 6$ → $6x = 18$",
                "Divide by 6: $x = 3$",
                "Substitute back into $2x + 3y = 12$: $6 + 3y = 12$, $3y = 6$, $y = 2$",
            ],
            answer="$x = 3, y = 2$. Check: $4(3) - 3(2) = 12 - 6 = 6$ ✓",
        ),

        worked_example(
            label="Example 3 &middot; SAT word problem",
            problem="A store sells apples for $2 each and oranges for $3 each. A customer buys 8 pieces of fruit and pays $19. How many oranges did they buy?",
            steps=[
                "Let $a$ = apples, $o$ = oranges. Set up: $a + o = 8$ and $2a + 3o = 19$.",
                "From the first equation: $a = 8 - o$.",
                "Substitute into the second: $2(8 - o) + 3o = 19$",
                "Distribute: $16 - 2o + 3o = 19$ → $16 + o = 19$ → $o = 3$",
            ],
            answer="3 oranges.",
        ),

        callout(
            "Common pitfalls",
            pitfall_list([
                ("Solving for one variable but forgetting to back-substitute",
                 "you found $x$, now you must plug it in to get $y$. Most SAT systems questions need BOTH values."),
                ("Using elimination without lining up coefficients first",
                 "you might need to multiply one (or both) equations by a constant before adding/subtracting cancels a variable."),
                ("Misreading 'no solution' vs 'infinite solutions'",
                 "if the variables vanish AND the constants match (e.g. $0 = 0$), the system has infinite solutions. If the constants don't match (e.g. $0 = 5$), no solution."),
                ("Setting up the wrong system in word problems",
                 "carefully label your variables and double-check that each equation actually uses the conditions stated."),
            ]),
            kind="pitfall",
        ),

        callout(
            "SAT tactics",
            tactic_list([
                "<strong>Pick the method that matches the problem.</strong> Already solved for $y$? Substitution. Coefficients line up? Elimination. Conceptual? Graphing.",
                "<strong>For 'no solution' questions,</strong> compare slopes. Two lines have no intersection iff their slopes are equal AND their $y$-intercepts differ. (Same slope, same intercept = infinitely many.)",
                "<strong>Plug answer choices in</strong> if the algebra is messy &mdash; substituting the candidate values into both original equations is fast on multiple-choice questions.",
            ]),
            kind="tactic",
        ),

        widget("Two-Line Intersection Explorer",
               html_body=WIDGET_HTML, css=WIDGET_CSS, js=WIDGET_JS),

        callout(
            "Quick recap",
            recap_list([
                "3 methods: substitution, elimination, graphing",
                "Use the method that matches the form of the equations",
                "Same slope + different intercepts = no solution",
                "Same slope + same intercept = infinitely many",
                "Always back-substitute to find the second variable",
            ]),
            kind="recap",
        ),
    ]
    return assemble_lesson(parts)
