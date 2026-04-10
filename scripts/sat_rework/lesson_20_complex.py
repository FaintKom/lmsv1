"""Lesson 20: Complex Numbers."""
from .template import (
    BASE_WIDGET_CSS, assemble_lesson, callout, hero, pitfall_list,
    recap_list, section, tactic_list, widget, worked_example,
)

WIDGET_CSS = BASE_WIDGET_CSS + """
.complex-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0}
.complex-row label{display:block;font-size:0.8rem;color:#64748b;margin-bottom:4px;font-weight:600}
.complex-row input{width:60px;padding:6px 8px;border:1px solid #c7d2fe;border-radius:8px;text-align:center;font-family:ui-monospace,Menlo,monospace;font-size:1rem;background:white;color:#4338ca;font-weight:700}
@media(prefers-color-scheme:dark){.complex-row input{background:#0f172a;border-color:#3730a3;color:#a5b4fc}}
.op-picker{display:flex;gap:6px;justify-content:center;margin:8px 0;flex-wrap:wrap}
.op-picker button{font-size:0.78rem;padding:6px 12px;font-family:ui-monospace,Menlo,monospace}
.op-picker button.active{background:#4338ca}
.result-card{background:#ecfdf5;border:1px solid #6ee7b7;color:#065f46;padding:14px 16px;border-radius:10px;margin:10px 0;text-align:center;font-family:ui-monospace,Menlo,monospace;font-size:1.05rem;font-weight:700}
@media(prefers-color-scheme:dark){.result-card{background:#022c22;border-color:#047857;color:#6ee7b7}}
"""

WIDGET_HTML = """
<p style="font-size:0.88rem;color:#64748b;margin:6px 0 10px;text-align:center">
  Two complex numbers $z_1 = a + bi$ and $z_2 = c + di$. Pick an operation and see the result.
</p>
<div class="complex-row">
  <div>
    <label>z₁ = a + bi</label>
    a: <input id="a" value="3"> &nbsp; b: <input id="b" value="2">
  </div>
  <div>
    <label>z₂ = c + di</label>
    c: <input id="c" value="1"> &nbsp; d: <input id="d" value="4">
  </div>
</div>
<div class="op-picker">
  <button class="lms-btn ghost active" data-op="add">+</button>
  <button class="lms-btn ghost" data-op="sub">−</button>
  <button class="lms-btn ghost" data-op="mul">×</button>
</div>
<div class="result-card" id="result">(3 + 2i) + (1 + 4i) = 4 + 6i</div>
<div class="lms-info"><strong>Key fact:</strong> $i^2 = -1$. Add by combining like terms. Multiply with FOIL, then replace $i^2$ with $-1$.</div>
"""

WIDGET_JS = r"""
var op = 'add';

function fmt(re, im){
  // Format real and imaginary parts using a Unicode minus (−) so that
  // the display matches the on-page typography. Also handles the special
  // cases of 0, ±1 coefficients, and pure-real / pure-imaginary results.
  function fmtNum(n){ return n < 0 ? '−' + Math.abs(n) : '' + n; }
  if (im === 0) return fmtNum(re);
  if (re === 0) {
    if (im === 1) return 'i';
    if (im === -1) return '−i';
    return fmtNum(im) + 'i';
  }
  var sign = im > 0 ? ' + ' : ' − ';
  var abs = Math.abs(im);
  var imPart = (abs === 1) ? 'i' : abs + 'i';
  return fmtNum(re) + sign + imPart;
}

function update(){
  var a = Number(document.getElementById('a').value) || 0;
  var b = Number(document.getElementById('b').value) || 0;
  var c = Number(document.getElementById('c').value) || 0;
  var d = Number(document.getElementById('d').value) || 0;
  var z1 = '(' + fmt(a, b) + ')';
  var z2 = '(' + fmt(c, d) + ')';
  var sym, result, resRe, resIm;
  if (op === 'add') {
    sym = '+'; resRe = a + c; resIm = b + d;
  } else if (op === 'sub') {
    sym = '−'; resRe = a - c; resIm = b - d;
  } else {
    sym = '×';
    // (a + bi)(c + di) = (ac - bd) + (ad + bc)i
    resRe = a*c - b*d;
    resIm = a*d + b*c;
  }
  document.getElementById('result').textContent = z1 + ' ' + sym + ' ' + z2 + ' = ' + fmt(resRe, resIm);
}

['a','b','c','d'].forEach(function(id){
  document.getElementById(id).addEventListener('input', update);
});
document.querySelectorAll('.op-picker button').forEach(function(btn){
  btn.addEventListener('click', function(){
    document.querySelectorAll('.op-picker button').forEach(function(x){ x.classList.remove('active'); });
    btn.classList.add('active');
    op = btn.dataset.op;
    update();
  });
});
update();
"""


def build() -> str:
    parts = [
        hero("Complex Numbers",
             "$i = \\sqrt{-1}$ &mdash; the SAT's least scary &laquo;advanced&raquo; topic",
             gradient="from-amber-500 to-orange-600"),

        callout("Why this matters on the SAT",
                "<p>Complex numbers appear <strong>1&ndash;2 times per test</strong>, almost always as &laquo;simplify this expression&raquo; or &laquo;in the form $a + bi$&raquo;. The trick is to remember $i^2 = -1$ and treat $i$ like a regular variable until you can replace its square.</p>",
                kind="info"),

        section("The imaginary unit", '<p>The imaginary unit $i$ is defined by:</p>'
                '<p style="text-align:center;font-size:1.25rem">$i^2 = -1$</p>'
                '<p>Equivalently, $i = \\sqrt{-1}$.</p>'),

        callout("Standard form $a + bi$",
                "<p>A <strong>complex number</strong> has the form $a + bi$ where $a$ is the real part and $b$ is the imaginary part.</p>"
                "<ul>"
                "<li>If $b = 0$: it's just a real number ($5 = 5 + 0i$).</li>"
                "<li>If $a = 0$: it's purely imaginary ($3i = 0 + 3i$).</li>"
                "</ul>",
                kind="concept"),

        callout("Operations",
                "<ul>"
                "<li><strong>Add/subtract</strong>: combine real and imaginary parts separately.<br>$(a + bi) + (c + di) = (a+c) + (b+d)i$</li>"
                "<li><strong>Multiply</strong>: FOIL, then replace $i^2$ with $-1$.<br>$(a + bi)(c + di) = ac + adi + bci + bd \\cdot i^2 = (ac - bd) + (ad + bc)i$</li>"
                "<li><strong>Powers of $i$ cycle</strong>: $i^1 = i$, $i^2 = -1$, $i^3 = -i$, $i^4 = 1$, then repeat.</li>"
                "</ul>",
                kind="concept"),

        section("Worked examples", ""),

        worked_example(
            label="Example 1 &middot; addition",
            problem="Simplify: $(3 + 2i) + (1 + 4i)$",
            steps=[
                "Add real parts: $3 + 1 = 4$",
                "Add imaginary parts: $2i + 4i = 6i$",
            ],
            answer="$4 + 6i$",
        ),

        worked_example(
            label="Example 2 &middot; multiplication",
            problem="Simplify: $(3 + 2i)(1 + 4i)$",
            steps=[
                "FOIL: $3 \\cdot 1 + 3 \\cdot 4i + 2i \\cdot 1 + 2i \\cdot 4i$",
                "Compute each: $3 + 12i + 2i + 8i^2$",
                "Replace $i^2 = -1$: $3 + 12i + 2i - 8$",
                "Combine: $(3 - 8) + (12 + 2)i = -5 + 14i$",
            ],
            answer="$-5 + 14i$",
        ),

        worked_example(
            label="Example 3 &middot; SAT-style",
            problem="Express $(2 + i)^2$ in the form $a + bi$.",
            steps=[
                "Expand: $(2 + i)(2 + i) = 4 + 2i + 2i + i^2$",
                "Combine like terms: $4 + 4i + i^2$",
                "Replace $i^2 = -1$: $4 + 4i - 1$",
                "Simplify: $3 + 4i$",
            ],
            answer="$3 + 4i$",
        ),

        callout("Common pitfalls", pitfall_list([
            ("Forgetting to replace $i^2$ with $-1$",
             "after FOILing, you get an $i^2$ term. ALWAYS substitute $i^2 = -1$ before reporting the answer in $a + bi$ form."),
            ("Treating $i$ like a normal variable for division",
             "to divide complex numbers, multiply numerator and denominator by the CONJUGATE of the denominator. The SAT rarely asks this but be aware."),
            ("Sign errors in subtraction",
             "$(3 + 2i) - (1 - 4i) = (3 - 1) + (2 - (-4))i = 2 + 6i$. Distribute the minus sign to BOTH parts of $z_2$."),
            ("Mixing up real and imaginary parts",
             "$a$ is the real part (no $i$). $b$ is the coefficient of $i$. Don't say &laquo;the real part is $4i$&raquo; — that's the imaginary part."),
        ]), kind="pitfall"),

        callout("SAT tactics", tactic_list([
            "<strong>Always end in $a + bi$ form.</strong> The SAT answer choices are written this way; matching the form lets you eliminate quickly.",
            "<strong>Memorize the $i$ cycle:</strong> $i^1 = i$, $i^2 = -1$, $i^3 = -i$, $i^4 = 1$. Higher powers reduce mod 4.",
            "<strong>For simplification, treat $i$ like a variable until the very end</strong>, then apply $i^2 = -1$.",
        ]), kind="tactic"),

        widget("Complex Number Calculator", html_body=WIDGET_HTML, css=WIDGET_CSS, js=WIDGET_JS),

        callout("Quick recap", recap_list([
            "$i = \\sqrt{-1}$, so $i^2 = -1$",
            "Standard form: $a + bi$",
            "Add/subtract: combine real and imaginary parts separately",
            "Multiply: FOIL, then replace $i^2$ with $-1$",
            "Powers of $i$ cycle every 4: $i, -1, -i, 1$",
        ]), kind="recap"),
    ]
    return assemble_lesson(parts)
