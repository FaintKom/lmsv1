"""Lesson 11: Probability & Two-Way Tables."""
from .template import (
    BASE_WIDGET_CSS, assemble_lesson, callout, hero, pitfall_list,
    recap_list, section, tactic_list, widget, worked_example,
)

WIDGET_CSS = BASE_WIDGET_CSS + """
.tw-table{margin:12px auto;border-collapse:collapse;font-family:ui-monospace,Menlo,monospace}
.tw-table th,.tw-table td{border:1px solid #c7d2fe;padding:8px 14px;text-align:center;background:white}
.tw-table th{background:#eef2ff;color:#4338ca;font-weight:700;font-size:0.85rem}
.tw-table td.total{background:#f5f3ff;font-weight:700}
.tw-table input{width:48px;text-align:center;border:none;background:transparent;font-family:inherit;font-size:1rem;font-weight:600;color:#4338ca}
@media(prefers-color-scheme:dark){
  .tw-table th,.tw-table td{background:#0f172a;border-color:#3730a3;color:#e2e8f0}
  .tw-table th{background:#1e1b4b;color:#a5b4fc}
  .tw-table td.total{background:#1e1b4b}
  .tw-table input{color:#a5b4fc}
}
.q-picker{display:flex;gap:6px;justify-content:center;margin:10px 0;flex-wrap:wrap}
.q-picker button{font-size:0.78rem;padding:6px 12px}
.q-picker button.active{background:#4338ca}
.prob-result{background:#ecfdf5;border:1px solid #6ee7b7;color:#065f46;padding:12px 16px;border-radius:10px;margin:10px 0;text-align:center;font-weight:600}
@media(prefers-color-scheme:dark){.prob-result{background:#022c22;border-color:#047857;color:#6ee7b7}}
"""

WIDGET_HTML = """
<p style="font-size:0.88rem;color:#64748b;margin:6px 0 10px;text-align:center">
  Edit the cells. Pick a probability question to compute it from your table.
</p>
<table class="tw-table">
  <tr><th></th><th>Likes coffee</th><th>Dislikes coffee</th><th>Total</th></tr>
  <tr><th>Adult</th><td><input id="aa" value="40"></td><td><input id="ab" value="10"></td><td class="total" id="ra">50</td></tr>
  <tr><th>Teen</th><td><input id="ba" value="15"></td><td><input id="bb" value="35"></td><td class="total" id="rb">50</td></tr>
  <tr><th>Total</th><td class="total" id="ca">55</td><td class="total" id="cb">45</td><td class="total" id="grand">100</td></tr>
</table>
<div class="q-picker">
  <button class="lms-btn ghost active" data-q="0">P(adult)</button>
  <button class="lms-btn ghost" data-q="1">P(likes coffee)</button>
  <button class="lms-btn ghost" data-q="2">P(adult AND likes)</button>
  <button class="lms-btn ghost" data-q="3">P(likes | adult)</button>
  <button class="lms-btn ghost" data-q="4">P(adult | likes)</button>
</div>
<div class="prob-result" id="result">P(adult) = 50 / 100 = 0.50 (50%)</div>
<div class="lms-info"><strong>Conditional probability:</strong> $P(A \\mid B) = \\dfrac{P(A \\cap B)}{P(B)}$ &mdash; restrict to the row or column matching the condition first.</div>
"""

WIDGET_JS = r"""
function readTable(){
  return {
    aa: Number(document.getElementById('aa').value) || 0,
    ab: Number(document.getElementById('ab').value) || 0,
    ba: Number(document.getElementById('ba').value) || 0,
    bb: Number(document.getElementById('bb').value) || 0,
  };
}

function update(){
  var t = readTable();
  var ra = t.aa + t.ab, rb = t.ba + t.bb;
  var ca = t.aa + t.ba, cb = t.ab + t.bb;
  var grand = ra + rb;
  document.getElementById('ra').textContent = ra;
  document.getElementById('rb').textContent = rb;
  document.getElementById('ca').textContent = ca;
  document.getElementById('cb').textContent = cb;
  document.getElementById('grand').textContent = grand;
  computeQuestion();
}

var currentQ = 0;
function computeQuestion(){
  var t = readTable();
  var ra = t.aa + t.ab, rb = t.ba + t.bb;
  var ca = t.aa + t.ba, cb = t.ab + t.bb;
  var grand = ra + rb;
  if (grand === 0) { document.getElementById('result').textContent = 'Add some values first.'; return; }
  var p, formula;
  if (currentQ === 0) { p = ra / grand; formula = 'P(adult) = ' + ra + ' / ' + grand + ' = ' + fmtPct(p); }
  else if (currentQ === 1) { p = ca / grand; formula = 'P(likes coffee) = ' + ca + ' / ' + grand + ' = ' + fmtPct(p); }
  else if (currentQ === 2) { p = t.aa / grand; formula = 'P(adult AND likes) = ' + t.aa + ' / ' + grand + ' = ' + fmtPct(p); }
  else if (currentQ === 3) { p = ra ? t.aa / ra : 0; formula = 'P(likes | adult) = ' + t.aa + ' / ' + ra + ' = ' + fmtPct(p); }
  else { p = ca ? t.aa / ca : 0; formula = 'P(adult | likes) = ' + t.aa + ' / ' + ca + ' = ' + fmtPct(p); }
  document.getElementById('result').textContent = formula;
}

function fmtPct(p){ return (Math.round(p * 1000) / 1000) + ' (' + Math.round(p*100) + '%)'; }

['aa','ab','ba','bb'].forEach(function(id){
  document.getElementById(id).addEventListener('input', update);
});
document.querySelectorAll('.q-picker button').forEach(function(b){
  b.addEventListener('click', function(){
    document.querySelectorAll('.q-picker button').forEach(function(x){ x.classList.remove('active'); });
    b.classList.add('active');
    currentQ = +b.dataset.q;
    computeQuestion();
  });
});
update();
"""


def build() -> str:
    parts = [
        hero("Probability &amp; Two-Way Tables",
             "Read the table, restrict to the relevant subset, divide",
             gradient="from-fuchsia-500 to-purple-600"),

        callout("Why this matters on the SAT",
                "<p>Two-way table questions show up <strong>every test</strong>. They look intimidating but reduce to: identify the right cell, identify the right total, divide. Master conditional probability and you bag the question instantly.</p>",
                kind="info"),

        section("The probability formula", '<p>For an event $E$ in a finite sample space:</p>'
                '<p style="text-align:center;font-size:1.2rem">$$P(E) = \\dfrac{\\text{number of favorable outcomes}}{\\text{total number of outcomes}}$$</p>'
                '<p>Probability is always between $0$ (impossible) and $1$ (certain).</p>'),

        callout("Two-way tables",
                "<p>A 2-way table cross-classifies the same group on two categorical variables (e.g. adult/teen × likes/dislikes coffee). Each cell counts how many fall into BOTH categories. The row totals and column totals are the marginal counts.</p>",
                kind="concept"),

        callout("Conditional probability",
                "<p>$P(A \\mid B)$ &mdash; &laquo;the probability of $A$ given $B$&raquo; &mdash; restricts the universe to just $B$:</p>"
                "<p style='text-align:center;font-size:1.1rem'>$P(A \\mid B) = \\dfrac{P(A \\cap B)}{P(B)} = \\dfrac{\\text{count in both}}{\\text{count in B}}$</p>"
                "<p>In a 2-way table: divide by the row or column total of the condition, NOT the grand total.</p>",
                kind="concept"),

        section("Worked examples", ""),

        worked_example(
            label="Example 1 &middot; basic probability",
            problem="A bag has 3 red, 2 blue, and 5 green marbles. What is the probability of drawing a blue marble?",
            steps=[
                "Total marbles: $3 + 2 + 5 = 10$",
                "Favorable: $2$ blue",
                "$P(\\text{blue}) = \\dfrac{2}{10} = \\dfrac{1}{5}$",
            ],
            answer="$\\dfrac{1}{5}$ or 20%",
        ),

        worked_example(
            label="Example 2 &middot; from a two-way table",
            problem="In a survey of 100 people: 40 adults like coffee, 10 adults dislike, 15 teens like, 35 teens dislike. What is $P(\\text{likes coffee})$?",
            steps=[
                "Total who like coffee = $40 + 15 = 55$",
                "Grand total = $100$",
                "$P(\\text{likes}) = \\dfrac{55}{100} = 0.55$",
            ],
            answer="$0.55$ or 55%",
        ),

        worked_example(
            label="Example 3 &middot; conditional probability",
            problem="Using the same table, what is $P(\\text{likes} \\mid \\text{adult})$?",
            steps=[
                "Restrict to adults only: total adults = $40 + 10 = 50$",
                "Of those adults, $40$ like coffee.",
                "$P(\\text{likes} \\mid \\text{adult}) = \\dfrac{40}{50} = 0.80$",
            ],
            answer="$0.80$ or 80%",
        ),

        callout("Common pitfalls", pitfall_list([
            ("Dividing by the grand total instead of the row/column total in conditional probability",
             "$P(A \\mid B)$ uses $B$'s total as the denominator, NOT the overall total. This is the #1 SAT trap on these questions."),
            ("Confusing $P(A \\mid B)$ with $P(B \\mid A)$",
             "they're different! $P(\\text{likes} \\mid \\text{adult}) = 40/50 = 80\\%$ but $P(\\text{adult} \\mid \\text{likes}) = 40/55 \\approx 73\\%$."),
            ("Adding probabilities of overlapping events",
             "if events can both happen, $P(A \\cup B) = P(A) + P(B) - P(A \\cap B)$, not just $P(A) + P(B)$. Subtract the overlap."),
            ("Forgetting that probabilities must sum to 1",
             "for any partition (e.g. likes / dislikes), the probabilities add up to $1$. If yours don't, you miscounted."),
        ]), kind="pitfall"),

        callout("SAT tactics", tactic_list([
            "<strong>For conditional questions, find the &laquo;given&raquo; row or column first.</strong> That's your denominator.",
            "<strong>Always check the totals.</strong> If row + row ≠ grand total, the table is mis-set up.",
            "<strong>Convert probabilities to fractions, not decimals.</strong> Fractions catch arithmetic mistakes faster.",
        ]), kind="tactic"),

        widget("Two-Way Table Probability Calculator", html_body=WIDGET_HTML, css=WIDGET_CSS, js=WIDGET_JS),

        callout("Quick recap", recap_list([
            "Probability = favorable / total",
            "Two-way table cells count things in both categories",
            "Conditional $P(A \\mid B)$: divide by $B$'s total, not grand total",
            "$P(A \\mid B) \\ne P(B \\mid A)$",
            "Probabilities for a partition sum to $1$",
        ]), kind="recap"),
    ]
    return assemble_lesson(parts)
