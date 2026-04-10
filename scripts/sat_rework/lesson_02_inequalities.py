"""Lesson 2: Linear Inequalities."""
from .template import (
    BASE_WIDGET_CSS, assemble_lesson, callout, hero, pitfall_list,
    recap_list, section, tactic_list, widget, worked_example,
)

WIDGET_CSS = BASE_WIDGET_CSS + """
.numline-wrap{padding:10px 0 18px}
.eq-line{display:flex;align-items:center;justify-content:center;gap:12px;font-size:1.4rem;font-weight:700;font-family:ui-monospace,Menlo,monospace;margin:8px 0}
.flip-warn{display:none;background:#fef2f2;border:1px solid #fca5a5;color:#991b1b;border-radius:8px;padding:8px 14px;margin:10px auto;max-width:400px;font-size:0.85rem;text-align:center;font-weight:600}
.flip-warn.on{display:block;animation:pulse 1s 2}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
@media(prefers-color-scheme:dark){.flip-warn{background:#450a0a;border-color:#7f1d1d;color:#fca5a5}}
"""

WIDGET_HTML = """
<p style="font-size:0.88rem;color:#64748b;margin:6px 0 10px;text-align:center">
  Solve <strong>−2x + 3 &lt; 9</strong>. Click each step and watch the inequality flip when you divide by a negative.
</p>
<div class="eq-line"><span id="eq">−2x + 3 &lt; 9</span></div>
<div class="flip-warn" id="flipWarn">⚠ Sign flipped because we divided by −2 (a negative)</div>
<div class="numline-wrap"><canvas id="num" width="540" height="120"></canvas></div>
<div class="ops" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
  <button class="lms-btn" id="step1">Step 1: −3 both sides</button>
  <button class="lms-btn" id="step2">Step 2: ÷(−2)  ⚡ flip</button>
  <button class="lms-btn ghost" id="reset">reset</button>
</div>
<div class="lms-info" id="explain"><b>Start:</b> −2x + 3 &lt; 9. Goal: isolate <em>x</em>.</div>
"""

WIDGET_JS = r"""
var stage = 0;
var canvas = document.getElementById('num');
var ctx = canvas.getContext('2d');

function drawLine(boundary, openCircle, direction){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  var w = canvas.width, h = canvas.height;
  var pad = 30, lineY = h/2 + 6;
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(pad, lineY); ctx.lineTo(w-pad, lineY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pad, lineY-5); ctx.lineTo(pad-8, lineY); ctx.lineTo(pad, lineY+5); ctx.fill();
  ctx.beginPath(); ctx.moveTo(w-pad, lineY-5); ctx.lineTo(w-pad+8, lineY); ctx.lineTo(w-pad, lineY+5); ctx.fill();
  ctx.fillStyle = '#475569'; ctx.font = '13px ui-monospace,monospace';
  for (var i = -7; i <= 7; i++){
    var x = w/2 + i*((w-2*pad)/15);
    ctx.beginPath(); ctx.moveTo(x, lineY-5); ctx.lineTo(x, lineY+5); ctx.stroke();
    if (i % 2 === 0) ctx.fillText(i, x-5, lineY+22);
  }
  if (boundary === null) return;
  var bx = w/2 + boundary*((w-2*pad)/15);
  if (direction === 'lt' || direction === 'leq'){
    ctx.fillStyle = 'rgba(99,102,241,0.25)';
    ctx.fillRect(pad, lineY-12, bx-pad, 24);
  } else if (direction === 'gt' || direction === 'geq'){
    ctx.fillStyle = 'rgba(99,102,241,0.25)';
    ctx.fillRect(bx, lineY-12, w-pad-bx, 24);
  }
  ctx.beginPath();
  ctx.arc(bx, lineY, 9, 0, Math.PI*2);
  if (openCircle){ ctx.fillStyle = 'white'; ctx.fill(); ctx.strokeStyle = '#4338ca'; ctx.lineWidth = 3; ctx.stroke(); }
  else { ctx.fillStyle = '#4338ca'; ctx.fill(); }
  ctx.fillStyle = '#312e81'; ctx.font = 'bold 14px ui-monospace,monospace';
  ctx.fillText('x = '+boundary, bx-22, lineY-16);
}

function setStage(s){
  stage = s;
  if (s === 0){
    document.getElementById('eq').innerHTML = '−2x + 3 &lt; 9';
    document.getElementById('explain').innerHTML = '<b>Start:</b> isolate <em>x</em> step by step.';
    document.getElementById('flipWarn').classList.remove('on');
    drawLine(null);
  } else if (s === 1){
    document.getElementById('eq').innerHTML = '−2x &lt; 6';
    document.getElementById('explain').innerHTML = '<b>Subtract 3 from both sides.</b> Inequality direction does NOT change for + / −.';
    document.getElementById('flipWarn').classList.remove('on');
    drawLine(null);
  } else if (s === 2){
    document.getElementById('eq').innerHTML = 'x &gt; −3';
    document.getElementById('explain').innerHTML = '<b>Divide both sides by −2 → flip the sign!</b> <em>−2x &lt; 6</em> becomes <em>x &gt; −3</em>. The boundary is open because the original inequality was strict.';
    document.getElementById('flipWarn').classList.add('on');
    drawLine(-3, true, 'gt');
  }
}

document.getElementById('step1').addEventListener('click', function(){ setStage(1); });
document.getElementById('step2').addEventListener('click', function(){ setStage(2); });
document.getElementById('reset').addEventListener('click', function(){ setStage(0); });
setStage(0);
"""


def build() -> str:
    parts = [
        hero(
            "Linear Inequalities",
            "One rule changes everything: flip the sign when you multiply or divide by a negative",
            gradient="from-emerald-600 to-teal-600",
        ),

        callout(
            "Why this matters on the SAT",
            "<p>Inequality questions show up <strong>every test</strong> &mdash; usually 1&ndash;3 in the algebra sections. They look just like equations except for one trick: flip the inequality sign when you multiply or divide by a negative number. Miss the flip, and the answer is wrong by exactly the wrong direction.</p>",
            kind="info",
        ),

        section("The core idea", '''<p>A <strong>linear inequality</strong> uses $&lt;, &gt;, \\le,$ or $\\ge$ instead of $=$. You solve it the same way as a linear equation, with one rule:</p>'''),

        callout(
            "The Golden Rule",
            "<p style='margin:0;font-size:1.05rem'><strong>When you multiply or divide BOTH sides by a negative number, FLIP the inequality sign.</strong></p><p style='margin:8px 0 0;font-size:0.9rem;color:#475569'>Adding or subtracting? No flip. Multiplying or dividing by a positive? No flip. Only multiplying or dividing by a negative.</p>",
            kind="concept",
        ),

        section("Worked examples", ""),

        worked_example(
            label="Example 1 &middot; basic",
            problem="Solve: $3x - 5 \\le 13$",
            steps=[
                "Add 5 to both sides: $3x \\le 18$",
                "Divide both sides by 3 (positive, no flip): $x \\le 6$",
            ],
            answer="$x \\le 6$. Test $x = 0$: $3(0) - 5 = -5 \\le 13$ ✓",
        ),

        worked_example(
            label="Example 2 &middot; flip required",
            problem="Solve: $-2x + 3 < 9$",
            steps=[
                "Subtract 3 from both sides: $-2x < 6$",
                "Divide both sides by $-2$ <strong>and flip</strong>: $x > -3$",
            ],
            answer="$x > -3$. Test $x = 0$: $-2(0) + 3 = 3 < 9$ ✓",
        ),

        worked_example(
            label="Example 3 &middot; SAT-style",
            problem="If $-3(2x - 4) \\ge 18$, what is the greatest possible value of $x$?",
            steps=[
                "Distribute: $-6x + 12 \\ge 18$",
                "Subtract 12: $-6x \\ge 6$",
                "Divide by $-6$ <strong>and flip</strong>: $x \\le -1$",
                "The greatest value of $x$ satisfying this is $-1$.",
            ],
            answer="The greatest value is $x = -1$.",
        ),

        callout(
            "Common pitfalls",
            pitfall_list([
                ("Forgetting to flip the sign when dividing by a negative",
                 "the #1 inequality mistake. If your final answer points the wrong way, this is almost always why."),
                ("Flipping when adding or subtracting a negative number",
                 "subtracting $-5$ is the same as adding $5$ &mdash; the inequality direction stays. Only flip on <em>multiply</em> or <em>divide</em>."),
                ("Treating $\\le$ and $&lt;$ as the same on a number line",
                 "$\\le$ uses a closed dot (boundary included), $&lt;$ uses an open circle (boundary excluded). The SAT often tests this distinction."),
                ("Solving compound inequalities one side at a time",
                 "with $-4 < 2x - 6 \\le 8$ you must apply each operation to <em>all three</em> parts simultaneously, not just one inequality at a time."),
            ]),
            kind="pitfall",
        ),

        callout(
            "SAT tactics",
            tactic_list([
                "<strong>Test a value.</strong> After solving, plug an obvious value (like $x = 0$ or the boundary) into the original. If it doesn't satisfy the inequality, you flipped wrong.",
                "<strong>Convert word problems carefully.</strong> \"At least\" → $\\ge$, \"at most\" → $\\le$, \"more than\" → $&gt;$, \"fewer than\" → $&lt;$. Read twice.",
                "<strong>For systems of inequalities,</strong> graph each one and look for the overlap region. The answer is the intersection, not the union.",
            ]),
            kind="tactic",
        ),

        widget("Inequality Flipper",
               html_body=WIDGET_HTML, css=WIDGET_CSS, js=WIDGET_JS),

        callout(
            "Quick recap",
            recap_list([
                "Solve like an equation, with one rule: flip on multiply/divide by negative",
                "$\\le, \\ge$ → closed dot. $&lt;, &gt;$ → open circle.",
                "\"At least\" → $\\ge$, \"at most\" → $\\le$",
                "Always test a value to verify direction",
            ]),
            kind="recap",
        ),
    ]
    return assemble_lesson(parts)
