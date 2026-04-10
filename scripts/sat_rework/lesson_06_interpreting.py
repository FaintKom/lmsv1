"""Lesson 6: Interpreting Linear Models."""
from .template import (
    BASE_WIDGET_CSS, assemble_lesson, callout, hero, pitfall_list,
    recap_list, section, tactic_list, widget, worked_example,
)

WIDGET_CSS = BASE_WIDGET_CSS + """
.scenario-picker{display:flex;gap:6px;justify-content:center;margin:8px 0 14px;flex-wrap:wrap}
.scenario-picker button{font-size:0.78rem;padding:6px 12px}
.scenario-picker button.active{background:#4338ca}
.eq-card{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:10px 0;text-align:center;font-family:ui-monospace,Menlo,monospace;font-size:1.15rem;font-weight:700;color:#4338ca}
.parts-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}
.part{padding:12px 14px;border-radius:10px;border:1px solid #c7d2fe;background:#eef2ff}
.part h4{margin:0 0 4px;font-size:0.85rem;color:#4338ca;text-transform:uppercase;letter-spacing:0.04em}
.part p{margin:0;font-size:0.92rem;color:#312e81}
@media(prefers-color-scheme:dark){
  .eq-card{background:#0f172a;border-color:#334155;color:#a5b4fc}
  .part{background:#1e1b4b;border-color:#3730a3}
  .part h4{color:#a5b4fc}
  .part p{color:#cbd5e1}
}
"""

WIDGET_HTML = """
<p style="font-size:0.88rem;color:#64748b;margin:6px 0 10px;text-align:center">
  Pick a real-world scenario. See how the same equation form means different things in context.
</p>
<div class="scenario-picker">
  <button class="lms-btn ghost active" data-s="0">📞 phone bill</button>
  <button class="lms-btn ghost" data-s="1">🚗 road trip</button>
  <button class="lms-btn ghost" data-s="2">🌱 plant growth</button>
  <button class="lms-btn ghost" data-s="3">💰 savings</button>
</div>
<div class="eq-card" id="eq">C = 0.10·m + 25</div>
<div class="parts-grid">
  <div class="part"><h4>Slope (m)</h4><p id="slopePart">$0.10 — cost per text message</p></div>
  <div class="part"><h4>Intercept (b)</h4><p id="interPart">$25 — flat monthly base fee</p></div>
</div>
<div class="lms-info" id="storyInfo"><b>Translation:</b> Your monthly bill is a $25 base fee plus 10 cents for each text you send. After 100 texts, the total is $25 + $10 = $35.</div>
"""

WIDGET_JS = r"""
var scenarios = [
  {
    eq: 'C = 0.10·m + 25',
    slopeWord: '$0.10 — cost per text message',
    interWord: '$25 — flat monthly base fee',
    story: '<b>Translation:</b> Your monthly bill is a $25 base fee plus 10 cents for each text you send. After 100 texts, the total is $25 + $10 = $35.'
  },
  {
    eq: 'D = 60·t + 30',
    slopeWord: '60 mph — driving speed',
    interWord: '30 miles — head start before time started',
    story: '<b>Translation:</b> A car travels at 60 mph and was already 30 miles down the road when timing began. After 2 hours, total distance = 30 + 120 = 150 miles.'
  },
  {
    eq: 'H = 0.5·d + 4',
    slopeWord: '0.5 cm — growth per day',
    interWord: '4 cm — initial height of seedling',
    story: '<b>Translation:</b> A plant starts at 4 cm tall and grows half a centimeter each day. After 10 days it is 4 + 5 = 9 cm tall.'
  },
  {
    eq: 'B = 50·w + 200',
    slopeWord: '$50 — saved each week',
    interWord: '$200 — starting balance',
    story: '<b>Translation:</b> You start with $200 and add $50 every week. After 8 weeks the balance is $200 + $400 = $600.'
  }
];
function setScenario(i){
  var s = scenarios[i];
  document.getElementById('eq').textContent = s.eq;
  document.getElementById('slopePart').textContent = s.slopeWord;
  document.getElementById('interPart').textContent = s.interWord;
  document.getElementById('storyInfo').innerHTML = s.story;
}
document.querySelectorAll('.scenario-picker button').forEach(function(b){
  b.addEventListener('click', function(){
    document.querySelectorAll('.scenario-picker button').forEach(function(x){ x.classList.remove('active'); });
    b.classList.add('active');
    setScenario(+b.dataset.s);
  });
});
setScenario(0);
"""


def build() -> str:
    parts = [
        hero(
            "Interpreting Linear Models",
            "Translate equations into real-world meaning &mdash; the SAT's favourite kind of word problem",
            gradient="from-fuchsia-500 to-purple-600",
        ),

        callout(
            "Why this matters on the SAT",
            "<p>Interpretation questions are <strong>everywhere</strong>. The SAT will give you an equation like $C = 0.10m + 25$ and ask: \"What does the 25 represent?\" or \"What does 0.10 mean in this context?\" Knowing the formal slope/intercept rules is half the job &mdash; explaining them in plain English is the other half.</p>",
            kind="info",
        ),

        section("The translation rules", '''<p>For any linear model $y = mx + b$ describing a real-world situation, here is what each part means:</p>'''),

        callout(
            "Slope = rate of change",
            "<p>The slope $m$ tells you <strong>how much $y$ changes per unit increase of $x$</strong>. Its units are the units of $y$ divided by the units of $x$. Examples: dollars per hour, miles per gallon, students per classroom.</p>",
            kind="concept",
        ),

        callout(
            "$y$-intercept = starting value",
            "<p>The intercept $b$ tells you <strong>the value of $y$ when $x = 0$</strong>. In a real-world model this is usually a baseline, fixed cost, head start, or initial amount &mdash; whatever exists before the rate kicks in.</p>",
            kind="concept",
        ),

        section("Worked examples", ""),

        worked_example(
            label="Example 1 &middot; phone bill",
            problem="A phone plan costs $C = 0.10m + 25$, where $C$ is the monthly cost in dollars and $m$ is the number of text messages. What does the $0.10$ represent?",
            steps=[
                "Compare with $y = mx + b$. Here $0.10$ is the slope (the coefficient of $m$).",
                "Slope = rate of change of $C$ per 1-unit increase of $m$.",
                "Translate to context: each additional text adds $0.10 to the cost.",
            ],
            answer="The cost per text message is $0.10.",
        ),

        worked_example(
            label="Example 2 &middot; finding the y-intercept",
            problem="In the same equation $C = 0.10m + 25$, what does $25$ represent?",
            steps=[
                "$25$ is the constant term, so it is the $y$-intercept $b$.",
                "Set $m = 0$ (no texts sent): $C = 0.10(0) + 25 = 25$.",
                "Translate: even with zero texts, the bill is $25.",
            ],
            answer="The flat monthly base fee is $25.",
        ),

        worked_example(
            label="Example 3 &middot; SAT-style",
            problem="A car rental costs $T = 0.20m + 35$, where $T$ is the total cost in dollars and $m$ is the number of miles driven. Which is the best interpretation of $0.20$?",
            steps=[
                "$0.20$ is the slope &mdash; the rate of change of cost per mile.",
                "Units: dollars / mile = $0.20 per mile.",
            ],
            answer="$0.20 represents the additional cost per mile driven.",
        ),

        callout(
            "Common pitfalls",
            pitfall_list([
                ("Confusing slope and intercept",
                 "slope is the per-unit rate (the coefficient of $x$); intercept is the starting value (the constant). Don't swap them."),
                ("Ignoring units",
                 "the slope's units are y's units divided by x's units. \"Dollars per hour\" is not the same as \"hours per dollar.\""),
                ("Treating the intercept as 'time zero' even when $x$ is not time",
                 "in $W = 2.5n + 50$ where $n$ is number of items, the 50 is the value when $n = 0$ (zero items), NOT when time is zero."),
                ("Forgetting that slope is meaningful even when negative",
                 "if a balance follows $B = -15w + 200$, the slope $-15$ means the balance DECREASES by $15 per week. Don't ignore the sign."),
            ]),
            kind="pitfall",
        ),

        callout(
            "SAT tactics",
            tactic_list([
                "<strong>Always identify slope vs intercept FIRST</strong> before reading the answer choices. Half the trap answers swap them.",
                "<strong>Check units in your interpretation.</strong> If the answer says \"$0.20 per mile\" and the equation has miles in $x$, the units match. If the answer says \"miles per dollar\", the units are inverted &mdash; wrong.",
                "<strong>Plug in $x = 0$</strong> if you're unsure what the intercept means. Ask: \"Before anything happens, what is $y$?\"",
            ]),
            kind="tactic",
        ),

        widget("Real-World Linear Model Translator",
               html_body=WIDGET_HTML, css=WIDGET_CSS, js=WIDGET_JS),

        callout(
            "Quick recap",
            recap_list([
                "Slope $m$ = rate of change. Units = $y$-units / $x$-units.",
                "Intercept $b$ = starting value (when $x = 0$).",
                "Translate to plain English using the variable's real-world meaning.",
                "Always check units and the sign of the slope.",
                "Half the trap answers swap slope and intercept &mdash; identify each first.",
            ]),
            kind="recap",
        ),
    ]
    return assemble_lesson(parts)
