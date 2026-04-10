"""Lesson 9: Statistics — Mean, Median, Mode."""
from .template import (
    BASE_WIDGET_CSS, assemble_lesson, callout, hero, pitfall_list,
    recap_list, section, tactic_list, widget, worked_example,
)

WIDGET_CSS = BASE_WIDGET_CSS + """
.num-list{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:10px 0;min-height:36px}
.num-chip{display:inline-flex;align-items:center;gap:4px;background:#eef2ff;border:1px solid #c7d2fe;color:#4338ca;padding:5px 10px;border-radius:999px;font-family:ui-monospace,Menlo,monospace;font-size:0.9rem;font-weight:600}
.num-chip button{background:transparent;border:none;color:#4338ca;cursor:pointer;font-size:1rem;line-height:1;padding:0 0 0 4px}
@media(prefers-color-scheme:dark){.num-chip{background:#1e1b4b;border-color:#3730a3;color:#a5b4fc}.num-chip button{color:#a5b4fc}}
.input-row{display:flex;gap:8px;justify-content:center;margin:10px 0}
.input-row input{width:80px;padding:8px 10px;border:1px solid #c7d2fe;border-radius:8px;text-align:center;font-family:ui-monospace,Menlo,monospace;font-size:1rem;background:white}
@media(prefers-color-scheme:dark){.input-row input{background:#0f172a;color:#e2e8f0;border-color:#3730a3}}
.stats-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:12px 0}
.stat{background:white;border:1px solid #e2e8f0;border-radius:10px;padding:10px;text-align:center}
.stat .lab{font-size:0.7rem;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:700}
.stat .val{font-size:1.3rem;font-weight:800;color:#4338ca;margin-top:4px;font-family:ui-monospace,Menlo,monospace}
@media(prefers-color-scheme:dark){.stat{background:#0f172a;border-color:#334155}.stat .val{color:#a5b4fc}}
"""

WIDGET_HTML = """
<p style="font-size:0.88rem;color:#64748b;margin:6px 0 10px;text-align:center">
  Add numbers one at a time. Mean, median, and mode update live.
</p>
<div class="input-row">
  <input id="newNum" type="number" placeholder="number" value="">
  <button class="lms-btn" id="addBtn">add</button>
  <button class="lms-btn ghost" id="presetBtn">preset</button>
  <button class="lms-btn ghost" id="clearBtn">clear</button>
</div>
<div class="num-list" id="list"></div>
<div class="stats-grid">
  <div class="stat"><div class="lab">Mean</div><div class="val" id="mean">—</div></div>
  <div class="stat"><div class="lab">Median</div><div class="val" id="median">—</div></div>
  <div class="stat"><div class="lab">Mode</div><div class="val" id="mode">—</div></div>
</div>
<div class="lms-info" id="explain">Add at least one number to see the statistics.</div>
"""

WIDGET_JS = r"""
var nums = [];

function render(){
  var listEl = document.getElementById('list');
  if (nums.length === 0){
    listEl.innerHTML = '<span style="color:#94a3b8;font-size:0.85rem">no numbers yet</span>';
  } else {
    listEl.innerHTML = nums.map(function(n, i){
      return '<span class="num-chip">' + n + '<button data-i="' + i + '" aria-label="remove">×</button></span>';
    }).join('');
    listEl.querySelectorAll('button').forEach(function(btn){
      btn.addEventListener('click', function(){ nums.splice(+btn.dataset.i, 1); render(); });
    });
  }
  updateStats();
}

function updateStats(){
  if (nums.length === 0){
    document.getElementById('mean').textContent = '—';
    document.getElementById('median').textContent = '—';
    document.getElementById('mode').textContent = '—';
    document.getElementById('explain').textContent = 'Add at least one number to see the statistics.';
    return;
  }
  // Mean
  var sum = nums.reduce(function(a,b){ return a+b; }, 0);
  var mean = sum / nums.length;
  document.getElementById('mean').textContent = round(mean);
  // Median
  var sorted = nums.slice().sort(function(a,b){ return a-b; });
  var n = sorted.length;
  var median = (n % 2 === 1) ? sorted[(n-1)/2] : (sorted[n/2 - 1] + sorted[n/2]) / 2;
  document.getElementById('median').textContent = round(median);
  // Mode
  var counts = {};
  nums.forEach(function(x){ counts[x] = (counts[x] || 0) + 1; });
  var maxCount = 0;
  for (var k in counts) if (counts[k] > maxCount) maxCount = counts[k];
  if (maxCount === 1) {
    document.getElementById('mode').textContent = 'none';
  } else {
    var modes = [];
    for (var k2 in counts) if (counts[k2] === maxCount) modes.push(k2);
    document.getElementById('mode').textContent = modes.join(', ');
  }
  document.getElementById('explain').innerHTML = '<b>Mean</b> = sum ÷ count. <b>Median</b> = middle value when sorted. <b>Mode</b> = most frequent value(s).';
}

function round(n){ return Math.round(n * 100) / 100; }

document.getElementById('addBtn').addEventListener('click', function(){
  var v = document.getElementById('newNum').value.trim();
  if (v === '') return;
  var n = Number(v);
  if (isNaN(n)) return;
  nums.push(n);
  document.getElementById('newNum').value = '';
  document.getElementById('newNum').focus();
  render();
});
document.getElementById('newNum').addEventListener('keydown', function(e){
  if (e.key === 'Enter') document.getElementById('addBtn').click();
});
document.getElementById('clearBtn').addEventListener('click', function(){ nums = []; render(); });
document.getElementById('presetBtn').addEventListener('click', function(){
  nums = [4, 7, 7, 8, 12];
  render();
});
render();
"""


def build() -> str:
    parts = [
        hero("Statistics: Mean, Median, Mode",
             "Three measures of center &mdash; pick the right one for the question",
             gradient="from-amber-500 to-orange-600"),

        callout("Why this matters on the SAT",
                "<p>Center-of-data questions appear <strong>1&ndash;3 times per test</strong>. The SAT loves to ask which measure (mean / median / mode) is most appropriate for a skewed dataset, or how a single outlier changes one measure but not another. Get the definitions exact.</p>",
                kind="info"),

        section("The three measures", '<p>Each measure of center summarizes a list of numbers in a different way:</p>'),

        callout("Mean (average)",
                "<p><strong>Sum of all values divided by count.</strong> Sensitive to outliers &mdash; one extreme value can pull the mean far from the typical value.</p>"
                "<p>Formula: $\\text{mean} = \\dfrac{\\sum x_i}{n}$</p>",
                kind="concept"),
        callout("Median",
                "<p><strong>The middle value when sorted.</strong> If there are an even number of values, average the two middle ones. Resistant to outliers.</p>",
                kind="concept"),
        callout("Mode",
                "<p><strong>The value that appears most often.</strong> A dataset can have one mode, multiple modes, or no mode (if all values are unique).</p>",
                kind="concept"),

        section("Worked examples", ""),

        worked_example(
            label="Example 1 &middot; basic",
            problem="Find the mean, median, and mode of: $\\{4, 7, 7, 8, 12\\}$",
            steps=[
                "Mean: $\\dfrac{4 + 7 + 7 + 8 + 12}{5} = \\dfrac{38}{5} = 7.6$",
                "Median: already sorted, middle value is $7$ (the 3rd of 5)",
                "Mode: $7$ appears twice; everything else once. So the mode is $7$.",
            ],
            answer="mean = 7.6, median = 7, mode = 7",
        ),

        worked_example(
            label="Example 2 &middot; even count",
            problem="Find the median of: $\\{3, 8, 9, 14\\}$",
            steps=[
                "Already sorted. There are 4 values (even count).",
                "Take the average of the two middle values: $\\dfrac{8 + 9}{2}$",
                "Compute: $\\dfrac{17}{2} = 8.5$",
            ],
            answer="median = 8.5",
        ),

        worked_example(
            label="Example 3 &middot; SAT-style with outlier",
            problem="A class's quiz scores are: $\\{6, 7, 8, 8, 9, 10, 10, 10, 30\\}$. Which measure (mean or median) better represents a typical student score?",
            steps=[
                "Sort: already sorted. Median = the 5th value = $9$.",
                "Mean: $\\dfrac{6+7+8+8+9+10+10+10+30}{9} = \\dfrac{98}{9} \\approx 10.9$",
                "The 30 is an outlier &mdash; far above the rest. It pulls the mean up.",
                "The median is unaffected by the outlier and reflects the typical student score better.",
            ],
            answer="The median ($9$) is more representative because the outlier ($30$) skews the mean.",
        ),

        callout("Common pitfalls", pitfall_list([
            ("Forgetting to sort before finding the median",
             "the median is the middle value WHEN SORTED. Don't grab the middle of an unsorted list."),
            ("Averaging the two middle values incorrectly",
             "for an even count, the median is $(x_{n/2} + x_{n/2+1})/2$, not just one of them."),
            ("Saying &laquo;the mode is X&raquo; when ALL values are unique",
             "if no value repeats, the dataset has NO mode, not a mode of 1."),
            ("Treating mean as immune to outliers",
             "one extreme value can dramatically shift the mean. The median is the resistant measure."),
        ]), kind="pitfall"),

        callout("SAT tactics", tactic_list([
            "<strong>For &laquo;skewed by outlier&raquo; questions, the median is the answer.</strong> Outliers pull the mean but not the median.",
            "<strong>To find a missing value given the mean,</strong> use $\\sum x_i = \\text{mean} \\cdot n$. Compute the required total, then subtract the known values.",
            "<strong>Memorize: $\\text{range} = \\max - \\min$.</strong> The SAT sometimes lumps range in with center measures.",
        ]), kind="tactic"),

        widget("Live Statistics Calculator", html_body=WIDGET_HTML, css=WIDGET_CSS, js=WIDGET_JS),

        callout("Quick recap", recap_list([
            "Mean = sum ÷ count (sensitive to outliers)",
            "Median = middle when sorted (resistant to outliers)",
            "Mode = most frequent value",
            "Even-count median: average of two middles",
            "Skewed data → prefer median to mean",
        ]), kind="recap"),
    ]
    return assemble_lesson(parts)
