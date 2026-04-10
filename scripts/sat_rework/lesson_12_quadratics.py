"""Lesson 12: Quadratic Equations."""
from .template import (
    BASE_WIDGET_CSS, assemble_lesson, callout, hero, pitfall_list,
    recap_list, section, tactic_list, widget, worked_example,
)

WIDGET_CSS = BASE_WIDGET_CSS + """
.coef-row{display:flex;gap:10px;justify-content:center;margin:10px 0;flex-wrap:wrap}
.coef-row label{display:flex;align-items:center;gap:6px;font-family:ui-monospace,Menlo,monospace;font-size:0.9rem;background:white;padding:6px 12px;border:1px solid #c7d2fe;border-radius:8px;color:#4338ca;font-weight:700}
.coef-row label input{width:50px;border:none;background:transparent;font-family:inherit;font-size:1rem;text-align:center;color:#4338ca}
@media(prefers-color-scheme:dark){.coef-row label{background:#0f172a;border-color:#3730a3;color:#a5b4fc}.coef-row label input{color:#a5b4fc}}
.eq-display{text-align:center;font-family:ui-monospace,Menlo,monospace;font-size:1.25rem;font-weight:700;color:#4338ca;margin:10px 0}
@media(prefers-color-scheme:dark){.eq-display{color:#a5b4fc}}
.disc-card{padding:12px 16px;border-radius:10px;margin:10px 0;text-align:center;font-weight:600;font-family:ui-monospace,Menlo,monospace}
.disc-card.pos{background:#ecfdf5;border:1px solid #6ee7b7;color:#065f46}
.disc-card.zero{background:#fffbeb;border:1px solid #fcd34d;color:#92400e}
.disc-card.neg{background:#fef2f2;border:1px solid #fca5a5;color:#991b1b}
@media(prefers-color-scheme:dark){
  .disc-card.pos{background:#022c22;border-color:#047857;color:#6ee7b7}
  .disc-card.zero{background:#451a03;border-color:#a16207;color:#fcd34d}
  .disc-card.neg{background:#450a0a;border-color:#7f1d1d;color:#fca5a5}
}
"""

WIDGET_HTML = """
<p style="font-size:0.88rem;color:#64748b;margin:6px 0 10px;text-align:center">
  Set <strong>a</strong>, <strong>b</strong>, <strong>c</strong>. The widget computes the discriminant and applies the quadratic formula.
</p>
<div class="eq-display" id="eq">x² + 5x + 6 = 0</div>
<div class="coef-row">
  <label>a = <input id="a" type="number" value="1"></label>
  <label>b = <input id="b" type="number" value="5"></label>
  <label>c = <input id="c" type="number" value="6"></label>
</div>
<div class="disc-card pos" id="disc">Discriminant = 25 − 24 = 1 → 2 real roots</div>
<div class="disc-card pos" id="roots">x = -2  or  x = -3</div>
<div class="lms-info">Quadratic formula: $x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$. The discriminant $b^2 - 4ac$ tells you how many real roots: positive → 2, zero → 1, negative → 0.</div>
"""

WIDGET_JS = r"""
function fmtCoef(c, v, first){
  if (c === 0) return '';
  var sign = c > 0 ? (first ? '' : ' + ') : ' − ';
  var abs = Math.abs(c);
  var coef = (abs === 1 && v !== '') ? '' : abs;
  return sign + coef + v;
}

function update(){
  var a = Number(document.getElementById('a').value);
  var b = Number(document.getElementById('b').value);
  var c = Number(document.getElementById('c').value);
  if (a === 0) {
    document.getElementById('eq').textContent = 'a cannot be 0 (not quadratic)';
    document.getElementById('disc').className = 'disc-card neg';
    document.getElementById('disc').textContent = 'Set a ≠ 0 to make a quadratic.';
    document.getElementById('roots').className = 'disc-card neg';
    document.getElementById('roots').textContent = '—';
    return;
  }
  // Display equation
  var eq = (a === 1 ? 'x²' : (a === -1 ? '−x²' : a + 'x²'));
  eq += fmtCoef(b, 'x', false);
  eq += fmtCoef(c, '', false);
  if (eq === '0') eq = '0';
  document.getElementById('eq').textContent = eq + ' = 0';

  // Discriminant
  var disc = b*b - 4*a*c;
  var discEl = document.getElementById('disc');
  var rootsEl = document.getElementById('roots');
  if (disc > 0) {
    discEl.className = 'disc-card pos';
    discEl.textContent = 'Discriminant = ' + (b*b) + ' − ' + (4*a*c) + ' = ' + disc + ' → 2 real roots';
    var sq = Math.sqrt(disc);
    var x1 = (-b + sq) / (2*a);
    var x2 = (-b - sq) / (2*a);
    rootsEl.className = 'disc-card pos';
    rootsEl.textContent = 'x = ' + round(x1) + '  or  x = ' + round(x2);
  } else if (disc === 0) {
    discEl.className = 'disc-card zero';
    discEl.textContent = 'Discriminant = 0 → 1 repeated root';
    var x = -b / (2*a);
    rootsEl.className = 'disc-card zero';
    rootsEl.textContent = 'x = ' + round(x) + ' (double root)';
  } else {
    discEl.className = 'disc-card neg';
    discEl.textContent = 'Discriminant = ' + disc + ' < 0 → no real roots';
    rootsEl.className = 'disc-card neg';
    rootsEl.textContent = 'x = (complex, no real solution)';
  }
}

function round(n){ return Math.round(n * 10000) / 10000; }

['a','b','c'].forEach(function(id){
  document.getElementById(id).addEventListener('input', update);
});
update();
"""


def build() -> str:
    parts = [
        hero("Quadratic Equations",
             "Three ways to solve $ax^2 + bx + c = 0$ &mdash; factor, complete the square, or quadratic formula",
             gradient="from-indigo-600 to-violet-600"),

        callout("Why this matters on the SAT",
                "<p>Quadratics show up <strong>3&ndash;5 times per test</strong> &mdash; in the no-calculator section, the calculator section, and word problems about projectile motion or area. Knowing all three solving methods lets you pick the fastest one for each question.</p>",
                kind="info"),

        section("The standard form", '<p>A <strong>quadratic equation</strong> has the form $ax^2 + bx + c = 0$ where $a \\ne 0$. It always has 0, 1, or 2 real solutions.</p>'),

        callout("Three solving methods",
                "<ol>"
                "<li><strong>Factoring</strong>: rewrite as $(x - r_1)(x - r_2) = 0$ and solve. Fast when the factors are integers.</li>"
                "<li><strong>Completing the square</strong>: rewrite as $(x + h)^2 = k$. Slower but always works.</li>"
                "<li><strong>Quadratic formula</strong>: $x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$. Always works, even when factors are messy.</li>"
                "</ol>",
                kind="concept"),

        callout("The discriminant",
                "<p>The expression $b^2 - 4ac$ inside the square root is called the <strong>discriminant</strong>. It tells you how many real solutions BEFORE you compute them:</p>"
                "<ul>"
                "<li>$b^2 - 4ac &gt; 0$ → 2 distinct real roots</li>"
                "<li>$b^2 - 4ac = 0$ → 1 repeated root</li>"
                "<li>$b^2 - 4ac &lt; 0$ → no real roots (2 complex)</li>"
                "</ul>",
                kind="concept"),

        section("Worked examples", ""),

        worked_example(
            label="Example 1 &middot; factoring",
            problem="Solve: $x^2 + 5x + 6 = 0$",
            steps=[
                "Find two numbers that multiply to $6$ and add to $5$: $2$ and $3$.",
                "Factor: $(x + 2)(x + 3) = 0$",
                "Set each factor to zero: $x + 2 = 0$ or $x + 3 = 0$",
                "Solutions: $x = -2$ or $x = -3$",
            ],
            answer="$x = -2$ or $x = -3$",
        ),

        worked_example(
            label="Example 2 &middot; quadratic formula",
            problem="Solve: $2x^2 + 3x - 2 = 0$",
            steps=[
                "Identify $a = 2, b = 3, c = -2$.",
                "Compute discriminant: $b^2 - 4ac = 9 - 4(2)(-2) = 9 + 16 = 25$.",
                "Apply formula: $x = \\dfrac{-3 \\pm \\sqrt{25}}{2 \\cdot 2} = \\dfrac{-3 \\pm 5}{4}$",
                "Two solutions: $x = \\dfrac{2}{4} = \\dfrac{1}{2}$ or $x = \\dfrac{-8}{4} = -2$",
            ],
            answer="$x = \\dfrac{1}{2}$ or $x = -2$",
        ),

        worked_example(
            label="Example 3 &middot; SAT-style",
            problem="For what value of $k$ does $x^2 + kx + 9 = 0$ have exactly one real solution?",
            steps=[
                "&laquo;Exactly one real solution&raquo; means discriminant $= 0$.",
                "$b^2 - 4ac = k^2 - 4(1)(9) = k^2 - 36 = 0$",
                "Solve: $k^2 = 36$, so $k = \\pm 6$",
            ],
            answer="$k = 6$ or $k = -6$",
        ),

        callout("Common pitfalls", pitfall_list([
            ("Trying to factor every quadratic",
             "if the discriminant isn't a perfect square, factoring won't give whole numbers. Switch to the quadratic formula."),
            ("Forgetting the &laquo;±&raquo; in the formula",
             "the quadratic formula gives TWO solutions: $\\dfrac{-b + \\sqrt{...}}{2a}$ AND $\\dfrac{-b - \\sqrt{...}}{2a}$. Don't drop one."),
            ("Sign errors when computing $-b$",
             "if $b$ is already negative (e.g. $b = -5$), $-b$ is $+5$. Watch the signs in the formula."),
            ("Confusing $\\sqrt{b^2 - 4ac}$ with $\\sqrt{b^2} - \\sqrt{4ac}$",
             "you cannot split the square root over subtraction. Compute the discriminant in full first."),
        ]), kind="pitfall"),

        callout("SAT tactics", tactic_list([
            "<strong>Try factoring first.</strong> If you can spot two numbers that multiply to $ac$ and add to $b$, factoring is faster.",
            "<strong>For &laquo;how many solutions&raquo; questions, use the discriminant.</strong> You don't need the actual roots.",
            "<strong>Sum and product of roots:</strong> for $ax^2 + bx + c = 0$, sum $= -b/a$, product $= c/a$. Sometimes the SAT asks for these directly, no need to solve.",
        ]), kind="tactic"),

        widget("Quadratic Solver + Discriminant", html_body=WIDGET_HTML, css=WIDGET_CSS, js=WIDGET_JS),

        callout("Quick recap", recap_list([
            "Standard form: $ax^2 + bx + c = 0$, $a \\ne 0$",
            "3 methods: factor, complete the square, quadratic formula",
            "Discriminant $= b^2 - 4ac$ → counts real roots",
            "Sum of roots $= -b/a$, product of roots $= c/a$",
            "Always TWO solutions from the formula (the $\\pm$)",
        ]), kind="recap"),
    ]
    return assemble_lesson(parts)
