"""Lesson 7: Ratios & Proportions (Problem Solving & Data Analysis #1)."""
from .template import (
    BASE_WIDGET_CSS, assemble_lesson, callout, hero, pitfall_list,
    recap_list, section, tactic_list, widget, worked_example,
)

WIDGET_CSS = BASE_WIDGET_CSS + """
.ratio-row{display:flex;gap:14px;justify-content:center;align-items:center;margin:14px 0;font-family:ui-monospace,Menlo,monospace;font-size:1.15rem}
.ratio-row .frac{display:inline-flex;flex-direction:column;align-items:center;line-height:1.1}
.ratio-row .frac .num,.ratio-row .frac .den{padding:0 6px}
.ratio-row .frac .bar{display:block;height:2px;background:currentColor;width:100%;margin:2px 0}
.ratio-row .equals{font-size:1.4rem;color:#6366f1;font-weight:700}
.ratio-row input{width:60px;text-align:center;padding:4px 6px;border:1px solid #c7d2fe;border-radius:6px;font-family:ui-monospace,Menlo,monospace;font-size:1rem;background:white}
@media(prefers-color-scheme:dark){.ratio-row input{background:#0f172a;color:#e2e8f0;border-color:#3730a3}}
.answer-card{background:#ecfdf5;border:1px solid #6ee7b7;color:#065f46;padding:10px 14px;border-radius:10px;text-align:center;font-weight:600;margin:10px 0}
.answer-card.err{background:#fef2f2;border-color:#fca5a5;color:#991b1b}
@media(prefers-color-scheme:dark){.answer-card{background:#022c22;border-color:#047857;color:#6ee7b7} .answer-card.err{background:#450a0a;border-color:#7f1d1d;color:#fca5a5}}
"""

WIDGET_HTML = """
<p style="font-size:0.88rem;color:#64748b;margin:6px 0 10px;text-align:center">
  Set up the proportion <strong>a/b = c/d</strong>. Fill any 3 of the 4 boxes — leave the unknown blank. Click <strong>solve</strong> to cross-multiply.
</p>
<div class="ratio-row">
  <span class="frac"><span class="num"><input id="a" value="3"></span><span class="bar"></span><span class="den"><input id="b" value="5"></span></span>
  <span class="equals">=</span>
  <span class="frac"><span class="num"><input id="c" value="12"></span><span class="bar"></span><span class="den"><input id="d" value=""></span></span>
</div>
<div style="text-align:center;margin:10px 0">
  <button class="lms-btn" id="solveBtn">solve</button>
  <button class="lms-btn ghost" id="presetBtn">load example</button>
</div>
<div class="answer-card" id="ans">Fill in 3 boxes and press solve.</div>
<div class="lms-info"><strong>Cross-multiply rule:</strong> if a/b = c/d, then a × d = b × c. Solve for the missing value.</div>
"""

WIDGET_JS = r"""
function get(id){ var v = document.getElementById(id).value.trim(); return v === '' ? null : Number(v); }
function set(id, v){ document.getElementById(id).value = v; }

document.getElementById('solveBtn').addEventListener('click', function(){
  var a = get('a'), b = get('b'), c = get('c'), d = get('d');
  var blanks = [a,b,c,d].filter(function(x){ return x === null; }).length;
  var ans = document.getElementById('ans');
  ans.classList.remove('err');
  if (blanks !== 1) {
    ans.textContent = 'Leave EXACTLY one box blank to solve for it.';
    ans.classList.add('err');
    return;
  }
  if ((a !== null && isNaN(a)) || (b !== null && isNaN(b)) || (c !== null && isNaN(c)) || (d !== null && isNaN(d))) {
    ans.textContent = 'All filled boxes must be numbers.';
    ans.classList.add('err');
    return;
  }
  var result, label;
  if (a === null) { result = (b * c) / d; label = 'a = (b × c) / d = (' + b + ' × ' + c + ') / ' + d + ' = ' + round(result); set('a', round(result)); }
  else if (b === null) { result = (a * d) / c; label = 'b = (a × d) / c = (' + a + ' × ' + d + ') / ' + c + ' = ' + round(result); set('b', round(result)); }
  else if (c === null) { result = (a * d) / b; label = 'c = (a × d) / b = (' + a + ' × ' + d + ') / ' + b + ' = ' + round(result); set('c', round(result)); }
  else { result = (b * c) / a; label = 'd = (b × c) / a = (' + b + ' × ' + c + ') / ' + a + ' = ' + round(result); set('d', round(result)); }
  ans.textContent = label;
});

function round(n){ return Math.round(n * 1000) / 1000; }

document.getElementById('presetBtn').addEventListener('click', function(){
  set('a', '3'); set('b', '5'); set('c', '12'); set('d', '');
  document.getElementById('ans').textContent = 'Loaded: 3/5 = 12/?  → press solve';
  document.getElementById('ans').classList.remove('err');
});
"""


def build() -> str:
    parts = [
        hero("Ratios &amp; Proportions",
             "Cross-multiply &mdash; the SAT's favourite trick for word problems with rates",
             gradient="from-emerald-600 to-teal-600"),

        callout("Why this matters on the SAT",
                "<p>Ratio and proportion questions appear <strong>2&ndash;4 times per test</strong>, especially in word problems involving recipes, scaling, maps, mixtures, and unit conversions. They look intimidating but reduce to one operation: cross-multiplication.</p>",
                kind="info"),

        section("The core idea", "<p>A <strong>ratio</strong> compares two quantities (e.g. $3:5$ or $\\frac{3}{5}$). A <strong>proportion</strong> says two ratios are equal: $\\frac{a}{b} = \\frac{c}{d}$. To solve a proportion for an unknown, <strong>cross-multiply</strong>:</p>"),

        callout("The cross-multiply rule",
                "<p style='text-align:center;font-size:1.15rem'>If $\\dfrac{a}{b} = \\dfrac{c}{d}$, then $a \\cdot d = b \\cdot c$</p>"
                "<p>This works for ANY proportion. It converts a fraction equation into a regular linear equation you already know how to solve.</p>",
                kind="concept"),

        section("Worked examples", ""),

        worked_example(
            label="Example 1 &middot; basic",
            problem="If $\\dfrac{3}{5} = \\dfrac{x}{20}$, find $x$.",
            steps=[
                "Cross-multiply: $3 \\cdot 20 = 5 \\cdot x$",
                "Simplify: $60 = 5x$",
                "Divide both sides by 5: $x = 12$",
            ],
            answer="$x = 12$",
        ),

        worked_example(
            label="Example 2 &middot; recipe scaling",
            problem="A recipe uses 2 cups of flour for every 3 cookies. How much flour for 24 cookies?",
            steps=[
                "Set up proportion: $\\dfrac{2 \\text{ cups}}{3 \\text{ cookies}} = \\dfrac{x}{24 \\text{ cookies}}$",
                "Cross-multiply: $2 \\cdot 24 = 3 \\cdot x$",
                "Simplify: $48 = 3x$, so $x = 16$",
            ],
            answer="16 cups of flour",
        ),

        worked_example(
            label="Example 3 &middot; SAT-style",
            problem="On a map, $1$ inch represents $25$ miles. If two cities are $4.5$ inches apart on the map, how many miles apart are they?",
            steps=[
                "Set up: $\\dfrac{1 \\text{ in}}{25 \\text{ mi}} = \\dfrac{4.5 \\text{ in}}{x \\text{ mi}}$",
                "Cross-multiply: $1 \\cdot x = 25 \\cdot 4.5$",
                "Compute: $x = 112.5$",
            ],
            answer="112.5 miles",
        ),

        callout("Common pitfalls", pitfall_list([
            ("Mixing up the units across the proportion",
             "if your top-left is cups and top-right is cookies, you have units inconsistent. Both sides must compare the same things in the same order."),
            ("Cross-multiplying in the wrong direction",
             "$a/b = c/d$ → $ad = bc$, NOT $ac = bd$. The diagonal pairs multiply."),
            ("Forgetting to simplify the fraction first",
             "$6/8 = x/12$ becomes $3/4 = x/12$ which gives $x = 9$ much faster than $72 = 8x$."),
            ("Treating part-to-whole as part-to-part",
             "if a class has 3 boys for every 2 girls (part-to-part) and 30 students total, the boys are $\\frac{3}{5} \\cdot 30 = 18$, NOT $\\frac{3}{2} \\cdot 30$. Convert ratios carefully."),
        ]), kind="pitfall"),

        callout("SAT tactics", tactic_list([
            "<strong>Always label units</strong> in word problems before cross-multiplying. It catches setup errors instantly.",
            "<strong>Simplify before solving.</strong> $14/35$ becomes $2/5$ &mdash; smaller numbers, faster math.",
            "<strong>For percentage problems,</strong> set up the proportion as $\\frac{\\text{part}}{\\text{whole}} = \\frac{\\%}{100}$. It works for any of the 3 unknowns.",
        ]), kind="tactic"),

        widget("Proportion Solver", html_body=WIDGET_HTML, css=WIDGET_CSS, js=WIDGET_JS),

        callout("Quick recap", recap_list([
            "Ratio: $a:b$ or $\\dfrac{a}{b}$",
            "Proportion: $\\dfrac{a}{b} = \\dfrac{c}{d}$",
            "Cross-multiply: $ad = bc$",
            "Always check units &mdash; both sides must compare the same things",
            "Part-to-part ≠ part-to-whole",
        ]), kind="recap"),
    ]
    return assemble_lesson(parts)
