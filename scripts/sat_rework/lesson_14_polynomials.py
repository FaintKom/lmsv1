"""Lesson 14: Polynomial Expressions."""
from .template import (
    BASE_WIDGET_CSS, assemble_lesson, callout, hero, pitfall_list,
    recap_list, section, tactic_list, widget, worked_example,
)

WIDGET_CSS = BASE_WIDGET_CSS + """
.poly-row{display:flex;gap:10px;justify-content:center;align-items:center;margin:12px 0;font-family:ui-monospace,Menlo,monospace;font-size:1.05rem;color:#4338ca;flex-wrap:wrap}
.poly-row input{width:50px;padding:6px;text-align:center;border:1px solid #c7d2fe;border-radius:6px;background:white;font-family:inherit;font-size:1rem;color:#4338ca}
@media(prefers-color-scheme:dark){.poly-row,.poly-row input{color:#a5b4fc}.poly-row input{background:#0f172a;border-color:#3730a3}}
.expand-card{background:#fffbeb;border:1px solid #fcd34d;color:#92400e;padding:14px 16px;border-radius:10px;margin:12px 0;text-align:center;font-family:ui-monospace,Menlo,monospace;font-size:1.05rem;font-weight:700}
@media(prefers-color-scheme:dark){.expand-card{background:#451a03;border-color:#a16207;color:#fcd34d}}
.method-picker{display:flex;gap:6px;justify-content:center;margin:8px 0;flex-wrap:wrap}
.method-picker button{font-size:0.78rem;padding:6px 12px}
.method-picker button.active{background:#4338ca}
"""

WIDGET_HTML = """
<p style="font-size:0.88rem;color:#64748b;margin:6px 0 10px;text-align:center">
  Pick a multiplication pattern. Edit the coefficients to see the expansion.
</p>
<div class="method-picker">
  <button class="lms-btn ghost active" data-m="0">(x + a)(x + b)</button>
  <button class="lms-btn ghost" data-m="1">(x + a)²</button>
  <button class="lms-btn ghost" data-m="2">(x + a)(x − a)</button>
</div>
<div class="poly-row" id="inputRow"></div>
<div class="expand-card" id="result">x² + 5x + 6</div>
<div class="lms-info" id="rule"><strong>FOIL:</strong> First, Outer, Inner, Last. (x + a)(x + b) = x² + (a + b)x + ab.</div>
"""

WIDGET_JS = r"""
var method = 0;

function fmtTerm(c, v, first){
  if (c === 0) return '';
  var sign = c > 0 ? (first ? '' : ' + ') : ' − ';
  var abs = Math.abs(c);
  var coef = (abs === 1 && v !== '') ? '' : abs;
  return sign + coef + v;
}

function update(){
  var rule = document.getElementById('rule');
  var result = document.getElementById('result');
  var inputRow = document.getElementById('inputRow');
  if (method === 0) {
    inputRow.innerHTML = '(x + <input id="a" type="number" value="2">)(x + <input id="b" type="number" value="3">)';
    rule.innerHTML = '<strong>FOIL:</strong> (x + a)(x + b) = x² + (a + b)x + ab';
    bindAndExpand();
  } else if (method === 1) {
    inputRow.innerHTML = '(x + <input id="a" type="number" value="3">)²';
    rule.innerHTML = '<strong>Square:</strong> (x + a)² = x² + 2ax + a²';
    bindAndExpand();
  } else {
    inputRow.innerHTML = '(x + <input id="a" type="number" value="4">)(x − <input id="b" type="number" value="4">)';
    rule.innerHTML = '<strong>Difference of squares:</strong> (x + a)(x − a) = x² − a²';
    bindAndExpand();
  }
}

function bindAndExpand(){
  document.querySelectorAll('#inputRow input').forEach(function(i){
    i.addEventListener('input', expand);
  });
  expand();
}

function expand(){
  var a = Number((document.getElementById('a') || {}).value || 0);
  var b = Number((document.getElementById('b') || {}).value || 0);
  var poly;
  if (method === 0) {
    poly = 'x²' + fmtTerm(a + b, 'x', false) + fmtTerm(a * b, '', false);
  } else if (method === 1) {
    poly = 'x²' + fmtTerm(2 * a, 'x', false) + fmtTerm(a * a, '', false);
  } else {
    poly = 'x²' + fmtTerm(-a * b, '', false);
  }
  document.getElementById('result').textContent = poly;
}

document.querySelectorAll('.method-picker button').forEach(function(btn){
  btn.addEventListener('click', function(){
    document.querySelectorAll('.method-picker button').forEach(function(x){ x.classList.remove('active'); });
    btn.classList.add('active');
    method = +btn.dataset.m;
    update();
  });
});
update();
"""


def build() -> str:
    parts = [
        hero("Polynomial Expressions",
             "FOIL, factor, and the patterns the SAT loves",
             gradient="from-rose-500 to-pink-600"),

        callout("Why this matters on the SAT",
                "<p>Polynomial multiplication and factoring appear <strong>3&ndash;4 times per test</strong>. Master FOIL plus the three special patterns (square of sum, square of difference, difference of squares) and you can expand or factor most SAT polynomials at sight.</p>",
                kind="info"),

        section("Multiplying polynomials with FOIL", "<p><strong>FOIL</strong> stands for <strong>First, Outer, Inner, Last</strong>. It is a way to remember all four products when multiplying two binomials:</p>"),

        callout("FOIL",
                "<p>$(x + a)(x + b) = \\underbrace{x \\cdot x}_{\\text{First}} + \\underbrace{x \\cdot b}_{\\text{Outer}} + \\underbrace{a \\cdot x}_{\\text{Inner}} + \\underbrace{a \\cdot b}_{\\text{Last}}$</p>"
                "<p>Combining: $(x + a)(x + b) = x^2 + (a + b)x + ab$</p>",
                kind="concept"),

        callout("Three patterns to memorize",
                "<ul>"
                "<li><strong>Square of a sum:</strong> $(x + a)^2 = x^2 + 2ax + a^2$</li>"
                "<li><strong>Square of a difference:</strong> $(x - a)^2 = x^2 - 2ax + a^2$</li>"
                "<li><strong>Difference of squares:</strong> $(x + a)(x - a) = x^2 - a^2$</li>"
                "</ul>"
                "<p>Recognize these in BOTH directions: expanding and factoring.</p>",
                kind="concept"),

        section("Worked examples", ""),

        worked_example(
            label="Example 1 &middot; FOIL",
            problem="Expand: $(x + 4)(x - 3)$",
            steps=[
                "First: $x \\cdot x = x^2$",
                "Outer: $x \\cdot (-3) = -3x$",
                "Inner: $4 \\cdot x = 4x$",
                "Last: $4 \\cdot (-3) = -12$",
                "Combine like terms: $x^2 + (-3 + 4)x - 12 = x^2 + x - 12$",
            ],
            answer="$x^2 + x - 12$",
        ),

        worked_example(
            label="Example 2 &middot; pattern recognition",
            problem="Expand: $(2x + 5)^2$",
            steps=[
                "Use the square-of-a-sum pattern: $(a + b)^2 = a^2 + 2ab + b^2$",
                "Here $a = 2x$, $b = 5$.",
                "$(2x)^2 + 2(2x)(5) + 5^2 = 4x^2 + 20x + 25$",
            ],
            answer="$4x^2 + 20x + 25$",
        ),

        worked_example(
            label="Example 3 &middot; SAT-style factoring",
            problem="Factor: $x^2 - 49$",
            steps=[
                "Recognize the difference of squares: $a^2 - b^2 = (a + b)(a - b)$",
                "Here $a^2 = x^2$ and $b^2 = 49$, so $a = x$, $b = 7$.",
                "Factor: $(x + 7)(x - 7)$",
            ],
            answer="$(x + 7)(x - 7)$",
        ),

        callout("Common pitfalls", pitfall_list([
            ("Writing $(x + a)^2 = x^2 + a^2$",
             "you forgot the middle term! It's $x^2 + 2ax + a^2$. The $2ax$ is the most-missed term on the SAT."),
            ("Distributing only one term in FOIL",
             "all FOUR products are needed: First, Outer, Inner, Last. Drop one and you'll have a wrong polynomial."),
            ("Sign errors with negatives",
             "$(x - a)(x + a) = x^2 + ax - ax - a^2 = x^2 - a^2$. Be careful when signs flip."),
            ("Confusing $(x + a)(x + b)$ with $(x + a + b)$",
             "the first is multiplication (gives a quadratic). The second is addition (still linear). Brackets indicate multiplication only when adjacent."),
        ]), kind="pitfall"),

        callout("SAT tactics", tactic_list([
            "<strong>Recognize patterns at sight.</strong> $x^2 - 25$ → difference of squares → $(x+5)(x-5)$ in 2 seconds.",
            "<strong>For factoring trinomials,</strong> find two numbers that multiply to the constant and add to the middle coefficient. They become the factors.",
            "<strong>Always check by re-expanding.</strong> Multiply your factors back &mdash; you should get the original polynomial.",
        ]), kind="tactic"),

        widget("Polynomial Expander", html_body=WIDGET_HTML, css=WIDGET_CSS, js=WIDGET_JS),

        callout("Quick recap", recap_list([
            "FOIL: First, Outer, Inner, Last",
            "$(x + a)^2 = x^2 + 2ax + a^2$",
            "$(x - a)^2 = x^2 - 2ax + a^2$",
            "$(x + a)(x - a) = x^2 - a^2$",
            "Always include the middle term when squaring",
        ]), kind="recap"),
    ]
    return assemble_lesson(parts)
