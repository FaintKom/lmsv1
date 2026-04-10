"""Lesson 1: Solving Linear Equations.

Heart of Algebra, module 1, lesson 1 of 6.

Pedagogical structure:
- Why it matters on the SAT
- Core concept (inverse operations)
- 3 worked examples (basic / multi-step / variables on both sides)
- Common pitfalls
- SAT tactics (timing, calculator, back-solve)
- Custom widget: animated balance scale + step history
- Quick recap
"""
from .template import (
    BASE_WIDGET_CSS,
    assemble_lesson,
    callout,
    hero,
    pitfall_list,
    recap_list,
    section,
    tactic_list,
    widget,
    worked_example,
)


# ---------------------------------------------------------------------------
# Custom widget: balance-scale equation solver
# ---------------------------------------------------------------------------
WIDGET_CSS = BASE_WIDGET_CSS + """
.eq-line{display:flex;align-items:center;justify-content:center;gap:14px;font-size:1.45rem;font-weight:700;font-family:ui-monospace,Menlo,monospace}
.eq-line .equals{color:#6366f1}
.beam-wrap{display:flex;justify-content:center;margin:14px 0 6px}
.history{margin-top:10px;padding:10px 14px;background:white;border:1px dashed #c7d2fe;border-radius:10px;min-height:60px;font-size:0.85rem;font-family:ui-monospace,Menlo,monospace;color:#475569}
.history .h-row{padding:3px 0;border-bottom:1px dotted #e2e8f0}
.history .h-row:last-child{border-bottom:0}
@media(prefers-color-scheme:dark){.history{background:#0f172a;color:#cbd5e1;border-color:#3730a3}}
.ops{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:14px 0 8px}
.ops button{font-family:ui-monospace,Menlo,monospace;font-size:0.95rem}
.problem-picker{display:flex;gap:6px;justify-content:center;margin-bottom:10px;flex-wrap:wrap}
.problem-picker button{font-size:0.78rem;padding:5px 10px}
.problem-picker button.active{background:#4338ca}
"""


WIDGET_HTML = """
<p style="font-size:0.88rem;color:#64748b;margin:6px 0 10px;text-align:center">
  Click an operation to apply it to <em>both sides</em> of the equation. Watch the scale balance.
</p>
<div class="problem-picker">
  <button class="lms-btn ghost active" data-prob="0">3x + 7 = 22</button>
  <button class="lms-btn ghost" data-prob="1">5x - 4 = 16</button>
  <button class="lms-btn ghost" data-prob="2">2(x + 3) = 14</button>
  <button class="lms-btn ghost" data-prob="3">4x + 9 = 2x + 17</button>
</div>
<div class="eq-line"><span id="eqL">3x + 7</span><span class="equals">=</span><span id="eqR">22</span></div>
<div class="beam-wrap"><canvas id="beam" width="420" height="120"></canvas></div>
<div class="ops">
  <button class="lms-btn" data-op="-7">−7</button>
  <button class="lms-btn" data-op="-4">−4</button>
  <button class="lms-btn" data-op="-9">−9</button>
  <button class="lms-btn" data-op="distribute">distribute</button>
  <button class="lms-btn" data-op="-2x">−2x</button>
  <button class="lms-btn" data-op="/2">÷2</button>
  <button class="lms-btn" data-op="/3">÷3</button>
  <button class="lms-btn" data-op="/5">÷5</button>
  <button class="lms-btn ghost" data-op="reset">reset</button>
</div>
<div class="lms-info" id="explain"><b>Goal:</b> Get x by itself on one side. Use inverse operations and apply each to BOTH sides.</div>
<div class="history" id="history"></div>
"""


WIDGET_JS = """
// Each problem is represented symbolically as { L:[a,b], R:[c,d] }
// where L = a*x + b and R = c*x + d. The display function rebuilds
// the human-readable string from these coefficients.
var problems = [
  {start:{L:[3,7],R:[0,22]}, label:'3x + 7 = 22', next:'-7'},
  {start:{L:[5,-4],R:[0,16]}, label:'5x - 4 = 16', next:'-4'},
  {start:{L:[0,0],R:[0,14]}, raw:'2(x + 3) = 14', distOf:[2,6,0,14], label:'2(x + 3) = 14', next:'distribute'},
  {start:{L:[4,9],R:[2,17]}, label:'4x + 9 = 2x + 17', next:'-2x'},
];
var currentIdx = 0;
var state = JSON.parse(JSON.stringify(problems[0].start));
var distributed = false;
var history = [];

function fmtSide(s){
  var a = s[0], b = s[1];
  if (a === 0 && b === 0) return '0';
  if (a === 0) return ''+b;
  var x = (a === 1 ? 'x' : (a === -1 ? '-x' : a+'x'));
  if (b === 0) return x;
  return x + (b > 0 ? ' + '+b : ' - '+(-b));
}

function update(){
  document.getElementById('eqL').textContent = fmtSide([state.L[0], state.L[1]]);
  document.getElementById('eqR').textContent = fmtSide([state.R[0], state.R[1]]);
  drawBeam();
  renderHistory();
}

function drawBeam(){
  var c = document.getElementById('beam');
  var ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  var cx = c.width/2, cy = 70, len = 150;
  // Tilt is just for visual feedback when one side has more terms
  var leftMass = Math.abs(state.L[0]) + Math.abs(state.L[1])/4;
  var rightMass = Math.abs(state.R[0]) + Math.abs(state.R[1])/4;
  var tilt = Math.max(-0.18, Math.min(0.18, (leftMass - rightMass) * 0.04));
  // Fulcrum
  ctx.beginPath(); ctx.moveTo(cx, cy+22); ctx.lineTo(cx-16, cy+44); ctx.lineTo(cx+16, cy+44); ctx.closePath();
  ctx.fillStyle = '#94a3b8'; ctx.fill();
  // Beam (rotated)
  ctx.save();
  ctx.translate(cx, cy+22);
  ctx.rotate(tilt);
  ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(len, 0);
  ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
  // Left pan
  ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(-len, -28);
  ctx.strokeStyle = '#a5b4fc'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-len, -32, 26, 9, 0, 0, Math.PI*2);
  ctx.fillStyle = '#c7d2fe'; ctx.fill(); ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#312e81'; ctx.font = 'bold 13px ui-monospace,monospace';
  ctx.textAlign = 'center'; ctx.fillText(fmtSide([state.L[0], state.L[1]]), -len, -28);
  // Right pan
  ctx.beginPath(); ctx.moveTo(len, 0); ctx.lineTo(len, -28);
  ctx.strokeStyle = '#a5b4fc'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(len, -32, 26, 9, 0, 0, Math.PI*2);
  ctx.fillStyle = '#c7d2fe'; ctx.fill(); ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#312e81'; ctx.fillText(fmtSide([state.R[0], state.R[1]]), len, -28);
  ctx.restore();
}

function renderHistory(){
  var el = document.getElementById('history');
  if (history.length === 0) {
    el.innerHTML = '<div style="color:#94a3b8">step history will appear here…</div>';
    return;
  }
  el.innerHTML = history.map(function(h){ return '<div class="h-row">' + h + '</div>'; }).join('');
}

function applyOp(op){
  var explain = '';
  if (op === 'reset') {
    state = JSON.parse(JSON.stringify(problems[currentIdx].start));
    distributed = false;
    history = [];
    explain = '<b>Reset.</b> Start over with the original equation.';
  } else if (op === 'distribute') {
    var d = problems[currentIdx].distOf;
    if (d) {
      state = {L:[d[0], d[1]], R:[d[2], d[3]]};
      distributed = true;
      explain = '<b>Distribute:</b> 2(x + 3) becomes 2x + 6. Now we have a standard linear equation.';
      history.push('distribute → ' + fmtSide(state.L) + ' = ' + fmtSide(state.R));
    } else {
      explain = '<b>Nothing to distribute</b> in this problem.';
    }
  } else if (op === '-2x') {
    state.L[0] -= 2; state.R[0] -= 2;
    explain = '<b>Subtract 2x</b> from both sides to gather variable terms on the left.';
    history.push('−2x both sides → ' + fmtSide(state.L) + ' = ' + fmtSide(state.R));
  } else if (op[0] === '-') {
    var n = parseInt(op.slice(1), 10);
    state.L[1] -= n; state.R[1] -= n;
    explain = '<b>Subtract ' + n + '</b> from both sides to undo the constant.';
    history.push('−' + n + ' both sides → ' + fmtSide(state.L) + ' = ' + fmtSide(state.R));
  } else if (op[0] === '/') {
    var d2 = parseInt(op.slice(1), 10);
    if (state.L[0] % d2 === 0 && state.R[1] % d2 === 0 && state.R[0] === 0) {
      state.L[0] /= d2; state.L[1] = state.L[1] / d2;
      state.R[0] /= d2; state.R[1] /= d2;
      explain = '<b>Divide by ' + d2 + ':</b> isolate x by undoing multiplication.';
      history.push('÷' + d2 + ' both sides → ' + fmtSide(state.L) + ' = ' + fmtSide(state.R));
      if (state.L[0] === 1 && state.L[1] === 0) {
        explain += '  &#x2705; <b>x = ' + state.R[1] + '</b>';
      }
    } else {
      explain = '<b>That division won\\'t cleanly isolate x yet.</b> Try removing the constant first.';
    }
  }
  document.getElementById('explain').innerHTML = explain;
  update();
}

document.querySelectorAll('.ops button').forEach(function(b){
  b.addEventListener('click', function(){ applyOp(b.dataset.op); });
});
document.querySelectorAll('.problem-picker button').forEach(function(b){
  b.addEventListener('click', function(){
    document.querySelectorAll('.problem-picker button').forEach(function(x){ x.classList.remove('active'); });
    b.classList.add('active');
    currentIdx = +b.dataset.prob;
    state = JSON.parse(JSON.stringify(problems[currentIdx].start));
    distributed = false;
    history = [];
    if (problems[currentIdx].raw) {
      document.getElementById('eqL').textContent = problems[currentIdx].raw.split('=')[0].trim();
      document.getElementById('eqR').textContent = problems[currentIdx].raw.split('=')[1].trim();
      document.getElementById('explain').innerHTML = '<b>Hint:</b> Start by distributing 2 across the parentheses.';
      drawBeam();
      renderHistory();
    } else {
      document.getElementById('explain').innerHTML = '<b>Goal:</b> Get x by itself on one side.';
      update();
    }
  });
});

update();
"""


def build() -> str:
    parts = [
        hero(
            "Solving Linear Equations",
            "Master inverse operations &mdash; the engine behind 30%+ of SAT Math questions",
            gradient="from-indigo-600 to-violet-600",
        ),

        callout(
            "Why this matters on the SAT",
            '<p>Roughly <strong>1 in 3</strong> SAT Math questions reduces to solving (or '
            "manipulating) a linear equation. Algebra-1 mistakes here cost more points "
            "than any other single skill, because the same trick &mdash; isolating a "
            "variable &mdash; shows up in word problems, geometry, and data questions too.</p>",
            kind="info",
        ),

        section("The core idea", '''<p>A <strong>linear equation</strong> has the form $ax + b = c$ where $a \\ne 0$. To solve, you need to <strong>isolate the variable</strong> using <em>inverse operations</em>:</p>
<ul>
<li>Addition undoes subtraction (and vice versa)</li>
<li>Multiplication undoes division (and vice versa)</li>
<li>Whatever you do to one side, you <strong>must</strong> do to the other &mdash; the equation stays balanced</li>
</ul>'''),

        callout(
            "The 4-step recipe",
            '''<ol>
<li><strong>Simplify each side.</strong> Distribute, combine like terms, clear fractions if helpful.</li>
<li><strong>Move variable terms to one side</strong> using +/− on both sides.</li>
<li><strong>Move constants to the other side.</strong></li>
<li><strong>Divide by the coefficient</strong> of the variable to get $x$ alone.</li>
</ol>''',
            kind="concept",
        ),

        section("Worked examples", ""),

        worked_example(
            label="Example 1 &middot; basic",
            problem="Solve: $3x + 7 = 22$",
            steps=[
                "Subtract 7 from both sides: $3x = 15$",
                "Divide both sides by 3: $x = 5$",
            ],
            answer="$x = 5$. Check: $3(5) + 7 = 15 + 7 = 22$ ✓",
        ),

        worked_example(
            label="Example 2 &middot; distribute first",
            problem="Solve: $2(x + 3) = 14$",
            steps=[
                "Distribute the 2: $2x + 6 = 14$",
                "Subtract 6 from both sides: $2x = 8$",
                "Divide both sides by 2: $x = 4$",
            ],
            answer="$x = 4$. Check: $2(4 + 3) = 2(7) = 14$ ✓",
        ),

        worked_example(
            label="Example 3 &middot; variables on both sides",
            problem="Solve: $4x + 9 = 2x + 17$",
            steps=[
                "Subtract $2x$ from both sides: $2x + 9 = 17$",
                "Subtract 9 from both sides: $2x = 8$",
                "Divide both sides by 2: $x = 4$",
            ],
            answer="$x = 4$. Check: $4(4) + 9 = 25$ and $2(4) + 17 = 25$ ✓",
        ),

        callout(
            "Common pitfalls",
            pitfall_list([
                ("Forgetting to apply an operation to BOTH sides",
                 "writing $3x = 22$ from $3x + 7 = 22$ instead of $3x = 15$. The equation goes out of balance and your answer will be wrong."),
                ("Sign errors when moving terms across the equals sign",
                 "moving $-4$ becomes $+4$ on the other side &mdash; not $-4$. Verbalize the operation: \"add 4 to both sides.\""),
                ("Distributing only to the first term",
                 "$2(x + 3)$ is $2x + 6$, not $2x + 3$. The 2 multiplies <em>everything</em> inside the parentheses."),
                ("Dividing only the variable's coefficient",
                 "from $3x = 15$ you must divide BOTH sides by 3. Don't get $x = 15/3$ on the left and forget to compute the right."),
            ]),
            kind="pitfall",
        ),

        callout(
            "SAT tactics",
            tactic_list([
                "<strong>Plug-in to verify.</strong> Always substitute your answer back into the <em>original</em> equation. It catches sign errors in under 5 seconds.",
                "<strong>Back-solve from answer choices.</strong> If the question is multiple-choice and the algebra looks ugly, try each choice in the original equation. Start with C (the middle value) and work outward.",
                "<strong>Clear fractions early.</strong> If you see $\\frac{x}{4} + \\frac{x}{6} = 5$, multiply <em>everything</em> by 12 first to get $3x + 2x = 60$. Way faster than working with fractions.",
                "<strong>No-calculator section?</strong> Look for chances to combine like terms before doing any arithmetic &mdash; it usually shrinks the numbers you need to handle.",
            ]),
            kind="tactic",
        ),

        widget(
            title="Equation Solver Workbench",
            html_body=WIDGET_HTML,
            css=WIDGET_CSS,
            js=WIDGET_JS,
        ),

        callout(
            "Quick recap",
            recap_list([
                "Linear equation form: $ax + b = c$",
                "Goal: isolate $x$ using inverse operations",
                "Recipe: <em>simplify → move variables → move constants → divide</em>",
                "Always do the same op to BOTH sides",
                "Verify by substituting your answer back into the original",
            ]),
            kind="recap",
        ),
    ]
    return assemble_lesson(parts)
