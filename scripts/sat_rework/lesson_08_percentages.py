"""Lesson 8: Percentages."""
from .template import (
    BASE_WIDGET_CSS, assemble_lesson, callout, hero, pitfall_list,
    recap_list, section, tactic_list, widget, worked_example,
)

WIDGET_CSS = BASE_WIDGET_CSS + """
.calc-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0}
.calc-row label{font-size:0.8rem;color:#64748b;font-weight:600;display:block;margin-bottom:4px}
.calc-row input{width:100%;padding:8px 10px;border:1px solid #c7d2fe;border-radius:8px;font-family:ui-monospace,Menlo,monospace;font-size:1rem;background:white}
@media(prefers-color-scheme:dark){.calc-row input{background:#0f172a;color:#e2e8f0;border-color:#3730a3}}
.mode-picker{display:flex;gap:6px;justify-content:center;margin:8px 0;flex-wrap:wrap}
.mode-picker button{font-size:0.78rem;padding:6px 12px}
.mode-picker button.active{background:#4338ca}
.result-card{background:#ecfdf5;border:1px solid #6ee7b7;color:#065f46;padding:12px 16px;border-radius:10px;margin:10px 0;font-size:1rem;font-weight:600;text-align:center}
@media(prefers-color-scheme:dark){.result-card{background:#022c22;border-color:#047857;color:#6ee7b7}}
"""

WIDGET_HTML = """
<p style="font-size:0.88rem;color:#64748b;margin:6px 0 10px;text-align:center">
  Pick the question type, fill in the two known values, see the answer.
</p>
<div class="mode-picker">
  <button class="lms-btn ghost active" data-mode="0">What is X% of Y?</button>
  <button class="lms-btn ghost" data-mode="1">A is what % of B?</button>
  <button class="lms-btn ghost" data-mode="2">A is X% of what?</button>
</div>
<div class="calc-row">
  <div><label id="lab1">X (percent)</label><input id="in1" type="number" value="20"></div>
  <div><label id="lab2">Y (whole)</label><input id="in2" type="number" value="80"></div>
</div>
<div class="result-card" id="result">20% of 80 = 16</div>
<div class="lms-info"><strong>Translate to math:</strong> "of" → multiply, "is" → equals, "%" → divide by 100. So <em>"What is 20% of 80"</em> becomes <em>x = 0.20 × 80</em>.</div>
"""

WIDGET_JS = r"""
var mode = 0;
function update(){
  var a = Number(document.getElementById('in1').value);
  var b = Number(document.getElementById('in2').value);
  var res = '';
  if (mode === 0) {
    // What is X% of Y → result = (X/100) * Y
    var r = (a / 100) * b;
    res = a + '% of ' + b + ' = ' + round(r);
  } else if (mode === 1) {
    // A is what % of B → result = (A/B) * 100
    if (b === 0) { res = 'B cannot be zero.'; }
    else { var p = (a / b) * 100; res = a + ' is ' + round(p) + '% of ' + b; }
  } else {
    // A is X% of what → result = A / (X/100)
    if (a === 0) { res = 'X cannot be zero.'; }
    else { var w = b / (a / 100); res = b + ' is ' + a + '% of ' + round(w); }
  }
  document.getElementById('result').textContent = res;
}
function round(n){ return Math.round(n * 100) / 100; }

document.querySelectorAll('.mode-picker button').forEach(function(b){
  b.addEventListener('click', function(){
    document.querySelectorAll('.mode-picker button').forEach(function(x){ x.classList.remove('active'); });
    b.classList.add('active');
    mode = +b.dataset.mode;
    var lab1 = document.getElementById('lab1');
    var lab2 = document.getElementById('lab2');
    if (mode === 0) { lab1.textContent = 'X (percent)'; lab2.textContent = 'Y (whole)'; document.getElementById('in1').value = 20; document.getElementById('in2').value = 80; }
    else if (mode === 1) { lab1.textContent = 'A (part)'; lab2.textContent = 'B (whole)'; document.getElementById('in1').value = 16; document.getElementById('in2').value = 80; }
    else { lab1.textContent = 'X (percent)'; lab2.textContent = 'A (part)'; document.getElementById('in1').value = 20; document.getElementById('in2').value = 16; }
    update();
  });
});
document.getElementById('in1').addEventListener('input', update);
document.getElementById('in2').addEventListener('input', update);
update();
"""


def build() -> str:
    parts = [
        hero("Percentages",
             "Translate &laquo;percent of&raquo; into multiplication &mdash; the highest-frequency word-problem pattern on the SAT",
             gradient="from-rose-500 to-pink-600"),

        callout("Why this matters on the SAT",
                "<p>Percentages show up <strong>3&ndash;5 times per test</strong>: tax, tip, discount, increase, decrease, percent of change. The trick is always the same &mdash; convert percent to a decimal and multiply.</p>",
                kind="info"),

        section("The three percent questions", '<p>Every percent problem on the SAT is one of these three forms. Learn to recognize them at sight:</p>'),

        callout("1. What is X% of Y?",
                "<p>Convert and multiply: $\\dfrac{X}{100} \\cdot Y$. Example: 20% of 80 = $0.20 \\cdot 80 = 16$.</p>",
                kind="concept"),
        callout("2. A is what % of B?",
                "<p>Divide and convert: $\\dfrac{A}{B} \\cdot 100$. Example: 16 is what % of 80? → $\\dfrac{16}{80} \\cdot 100 = 20\\%$.</p>",
                kind="concept"),
        callout("3. A is X% of what?",
                "<p>Divide by the decimal: $\\dfrac{A}{X/100}$. Example: 16 is 20% of what? → $\\dfrac{16}{0.20} = 80$.</p>",
                kind="concept"),

        section("Worked examples", ""),

        worked_example(
            label="Example 1 &middot; tax",
            problem="A shirt costs $25. Sales tax is 8%. What is the total cost?",
            steps=[
                "Find the tax: $0.08 \\cdot 25 = 2.00$",
                "Add to the original price: $25 + 2 = 27$",
            ],
            answer="$27.00",
        ),

        worked_example(
            label="Example 2 &middot; percent change",
            problem="A stock rose from $40 to $50. What is the percent increase?",
            steps=[
                "Find the change: $50 - 40 = 10$",
                "Divide by the ORIGINAL value (not the new one): $\\dfrac{10}{40} = 0.25$",
                "Convert to percent: $0.25 \\cdot 100 = 25\\%$",
            ],
            answer="25% increase",
        ),

        worked_example(
            label="Example 3 &middot; SAT-style",
            problem="After a 30% discount, a jacket costs $42. What was the original price?",
            steps=[
                "After a 30% discount, the customer pays $100\\% - 30\\% = 70\\%$ of the original.",
                "So $42 = 0.70 \\cdot \\text{original}$.",
                "Original $= \\dfrac{42}{0.70} = 60$",
            ],
            answer="$60",
        ),

        callout("Common pitfalls", pitfall_list([
            ("Dividing by the new value instead of the original",
             "percent change is always (change / ORIGINAL) × 100. If a price went from $40 to $50, divide 10 by 40, not 50."),
            ("Adding percents that don't share a base",
             "10% off then another 20% off is NOT 30% off. The second discount applies to the already-reduced price. Multiply: $0.90 \\cdot 0.80 = 0.72$, so 28% total off."),
            ("Confusing &laquo;X% more than Y&raquo; with &laquo;X% of Y&raquo;",
             "&laquo;25% more than 80&raquo; is $80 \\cdot 1.25 = 100$. &laquo;25% of 80&raquo; is $20$. Different questions."),
            ("Forgetting that 50% off = pay 50%",
             "discount means subtract; price paid means what's left. Some questions ask for the price paid, some for the savings."),
        ]), kind="pitfall"),

        callout("SAT tactics", tactic_list([
            "<strong>Convert percent to decimal first.</strong> 25% → 0.25. Then it's just multiplication.",
            "<strong>For successive discounts, multiply factors.</strong> 20% off then 10% off = $0.80 \\cdot 0.90 = 0.72$ of original.",
            "<strong>Percent of change = $\\dfrac{\\text{new − old}}{\\text{old}} \\cdot 100$.</strong> The denominator is ALWAYS the old (starting) value.",
        ]), kind="tactic"),

        widget("Percent Calculator", html_body=WIDGET_HTML, css=WIDGET_CSS, js=WIDGET_JS),

        callout("Quick recap", recap_list([
            "Percent → decimal: divide by 100",
            "&laquo;Of&raquo; means multiply, &laquo;is&raquo; means equals",
            "Percent change uses the ORIGINAL value as the denominator",
            "Successive discounts multiply (don't add)",
            "Three question types: $X\\%$ of $Y$, $A$ is what $\\%$ of $B$, $A$ is $X\\%$ of what",
        ]), kind="recap"),
    ]
    return assemble_lesson(parts)
