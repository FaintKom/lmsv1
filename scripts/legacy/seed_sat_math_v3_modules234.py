"""
Modules 2, 3, and 4 for SAT Math seed script.
These functions are designed to be called from seed_sat_math_v3.py.
Each takes a course_id (cid) and uses the helper functions defined in that script.
"""


def create_module_2(cid):
    """Module 2: Problem Solving & Data Analysis (5 lessons)."""
    mid = create_module(cid, "Problem Solving & Data Analysis", 1)
    if not mid:
        return
    print(f"  Module 2: Problem Solving & Data Analysis")

    # ── Lesson 2.1: Ratios & Proportions ──────────────────────────
    add_lesson_with_exercises(cid, mid, 0,
        "Ratios & Proportions",
        """<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.8;color:#1e293b;max-width:680px;margin:0 auto">

<div style="background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%);border-radius:16px;padding:32px;margin-bottom:24px;color:white">
<h1 style="margin:0;font-size:1.8rem">Ratios &amp; Proportions</h1>
<p style="margin:8px 0 0;opacity:0.95;font-size:1.05rem">Compare quantities and solve for unknowns using cross-multiplication</p>
</div>

<p>A <strong>ratio</strong> compares two quantities. We write it as <code>a : b</code> or <code>a/b</code>. A <strong>proportion</strong> is an equation stating that two ratios are equal:</p>

<div style="text-align:center;font-size:1.3rem;margin:16px 0;padding:12px;background:#f8fafc;border-radius:12px">
<code>a / b = c / d</code>
</div>

<div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<h3 style="color:#1d4ed8;margin:0 0 8px;font-size:1rem">&#x1F511; Key Concept</h3>
<p style="margin:0"><strong>Cross-Multiplication:</strong> If <code>a/b = c/d</code>, then <code>a &times; d = b &times; c</code>. This is the fastest way to solve any proportion problem.</p>
</div>

<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;margin:16px 0">
<h3 style="color:#92400e;margin:0 0 8px;font-size:1rem">&#x1F4DD; Example</h3>
<p>If 3 apples cost 2 dollars, how much do 12 apples cost?</p>
<p style="margin:4px 0"><code>3 / 2 = 12 / x</code></p>
<p style="margin:4px 0">Cross-multiply: <code>3x = 24</code></p>
<p style="margin:4px 0">Divide: <code>x = 8</code> dollars</p>
</div>

<h3 style="color:#1e293b;margin-top:24px">Unit Rates</h3>
<p>A <strong>unit rate</strong> tells you the amount per one unit. Divide the total by the number of units. For example, 240 miles on 8 gallons = <code>240 / 8 = 30</code> miles per gallon.</p>

<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-left:4px solid #10b981;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<strong style="color:#065f46">&#x1F4A1; Pro Tip:</strong> Always check whether the ratio stays constant across the problem. If you double one side, the other side must double too in a proportional relationship.
</div>

</div>""",
        [
            {
                "title": "Proportion Problem",
                "type": "numeric_input",
                "config": {
                    "question": "A recipe uses flour and sugar in a ratio of 2:3. If you need 9 cups of sugar, how many cups of flour do you need?",
                    "correct_answers": [6],
                    "tolerance": 0.01,
                    "allow_fraction": True,
                    "allow_decimal": True,
                    "explanation": "Set up the proportion: $\\frac{2}{3} = \\frac{x}{9}$. Cross-multiply: $3x = 18$, so $x = 6$ cups of flour."
                },
            },
            {
                "title": "Proportional Table",
                "type": "table_pattern",
                "config": {
                    "x_values": [1, 2, 3, 4, 5],
                    "y_values": [4, None, 12, None, 20],
                    "answers": {"1": 8, "3": 16},
                    "rule_label": "Rule",
                    "rule_answer": "4x",
                    "tolerance": 0.1,
                    "x_header": "x",
                    "y_header": "y"
                },
                "instructions": "Fill in the missing values in this proportional relationship and find the rule."
            },
            {
                "title": "Balance the Proportion",
                "type": "equation_balance",
                "config": {
                    "left_fixed": [6],
                    "right_fixed": [2],
                    "available_terms": [
                        {"value": 3, "label": "3"},
                        {"value": 4, "label": "4"},
                        {"value": 1, "label": "1"}
                    ],
                    "target_sum": 6,
                    "explanation": "The left side is 6. The right side starts at 2, so you need to add 4 to make both sides equal: 6 = 2 + 4."
                },
                "instructions": "Add a number to the right side to balance the equation."
            },
            {
                "title": "Unit Rate",
                "type": "multiple_choice_math",
                "config": {
                    "question": "A store sells 5 notebooks for 8 dollars. What is the cost per notebook?",
                    "choices": [
                        {"text": "1.60 dollars", "correct": True},
                        {"text": "1.50 dollars", "correct": False},
                        {"text": "2.00 dollars", "correct": False},
                        {"text": "0.63 dollars", "correct": False}
                    ],
                    "explanation": "Unit rate $= 8 \\div 5 = 1.60$ dollars per notebook."
                },
            },
        ]
    )

    # ── Lesson 2.2: Percentages ───────────────────────────────────
    add_lesson_with_exercises(cid, mid, 1,
        "Percentages",
        """<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.8;color:#1e293b;max-width:680px;margin:0 auto">

<div style="background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%);border-radius:16px;padding:32px;margin-bottom:24px;color:white">
<h1 style="margin:0;font-size:1.8rem">Percentages</h1>
<p style="margin:8px 0 0;opacity:0.95;font-size:1.05rem">Master percent calculations, tax, discount, and percent change</p>
</div>

<p><strong>Percent</strong> means "per hundred." To convert a percent to a decimal, divide by 100.</p>

<div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<h3 style="color:#1d4ed8;margin:0 0 8px;font-size:1rem">&#x1F511; Key Concept</h3>
<p style="margin:0"><strong>Three Core Formulas:</strong></p>
<ul style="margin:8px 0 0;padding-left:20px">
<li><strong>Finding a part:</strong> Part = Whole &times; (Percent / 100)</li>
<li><strong>Tax / Markup:</strong> Total = Original &times; (1 + rate)</li>
<li><strong>Percent Change:</strong> Change = (New &minus; Old) / Old &times; 100</li>
</ul>
</div>

<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;margin:16px 0">
<h3 style="color:#92400e;margin:0 0 8px;font-size:1rem">&#x1F4DD; Example</h3>
<p><strong>Percent Change:</strong> A price drops from 40 dollars to 30 dollars.</p>
<p style="margin:4px 0">Change = 40 &minus; 30 = 10</p>
<p style="margin:4px 0">Percent decrease = (10 / 40) &times; 100 = <strong>25%</strong></p>
</div>

<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-left:4px solid #10b981;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<strong style="color:#065f46">&#x1F4A1; Pro Tip:</strong> For percent increase, multiply by (1 + rate). For percent decrease, multiply by (1 &minus; rate). Example: 8% tax on 80 dollars = 80 &times; 1.08 = 86.40 dollars.
</div>

</div>""",
        [
            {
                "title": "Finding a Percent",
                "type": "numeric_input",
                "config": {
                    "question": "What is 15% of 240?",
                    "correct_answers": [36],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "$240 \\times 0.15 = 36$."
                },
            },
            {
                "title": "Sales Tax Calculation",
                "type": "numeric_input",
                "config": {
                    "question": "An item costs 80 dollars before tax. With 8% sales tax, what is the total price?",
                    "correct_answers": [86.4],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "$80 \\times 1.08 = 86.40$ dollars."
                },
            },
            {
                "title": "Percent Puzzle",
                "type": "arithmetic_puzzle",
                "config": {
                    "equations": [
                        {"template": "_ + 25 = 100", "answer": 75},
                        {"template": "20 × _ = 60", "answer": 3}
                    ],
                    "explanation": "First equation: 100 - 25 = 75. Second equation: 60 / 20 = 3."
                },
                "instructions": "Fill in the missing numbers in each equation."
            },
            {
                "title": "Percent Decrease",
                "type": "multiple_choice_math",
                "config": {
                    "question": "A shirt's price drops from 40 dollars to 30 dollars. What is the percent decrease?",
                    "choices": [
                        {"text": "25%", "correct": True},
                        {"text": "10%", "correct": False},
                        {"text": "33.3%", "correct": False},
                        {"text": "75%", "correct": False}
                    ],
                    "explanation": "Change $= 40 - 30 = 10$. Percent decrease $= \\frac{10}{40} \\times 100 = 25\\%$."
                },
            },
        ]
    )

    # ── Lesson 2.3: Statistics ────────────────────────────────────
    add_lesson_with_exercises(cid, mid, 2,
        "Statistics: Mean, Median, Mode",
        """<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.8;color:#1e293b;max-width:680px;margin:0 auto">

<div style="background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%);border-radius:16px;padding:32px;margin-bottom:24px;color:white">
<h1 style="margin:0;font-size:1.8rem">Statistics</h1>
<p style="margin:8px 0 0;opacity:0.95;font-size:1.05rem">Measures of central tendency and spread</p>
</div>

<div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<h3 style="color:#1d4ed8;margin:0 0 8px;font-size:1rem">&#x1F511; Key Concept</h3>
<p style="margin:0">Four essential measures of data:</p>
</div>

<table style="width:100%;border-collapse:collapse;margin:16px 0;border-radius:12px;overflow:hidden">
<thead>
<tr style="background:#4F46E5;color:white">
<th style="padding:12px 16px;text-align:left">Measure</th>
<th style="padding:12px 16px;text-align:left">Definition</th>
<th style="padding:12px 16px;text-align:left">Outlier Sensitive?</th>
</tr>
</thead>
<tbody>
<tr style="background:#f8fafc">
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><strong>Mean</strong></td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Sum of values / Count</td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#EF4444"><strong>Yes</strong></td>
</tr>
<tr>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><strong>Median</strong></td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Middle value when sorted</td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#22C55E"><strong>No</strong></td>
</tr>
<tr style="background:#f8fafc">
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><strong>Mode</strong></td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Most frequent value</td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#22C55E"><strong>No</strong></td>
</tr>
<tr>
<td style="padding:10px 16px"><strong>Range</strong></td>
<td style="padding:10px 16px">Maximum &minus; Minimum</td>
<td style="padding:10px 16px;color:#EF4444"><strong>Yes</strong></td>
</tr>
</tbody>
</table>

<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;margin:16px 0">
<h3 style="color:#92400e;margin:0 0 8px;font-size:1rem">&#x1F4DD; Example</h3>
<p>Data set: 12, 15, 18, 20, 25</p>
<p style="margin:4px 0">Mean = (12 + 15 + 18 + 20 + 25) / 5 = 90 / 5 = <strong>18</strong></p>
<p style="margin:4px 0">Median = <strong>18</strong> (middle value)</p>
<p style="margin:4px 0">Range = 25 &minus; 12 = <strong>13</strong></p>
</div>

<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-left:4px solid #10b981;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<strong style="color:#065f46">&#x1F4A1; Pro Tip:</strong> For an even number of values, the median is the average of the two middle values. For example, {3, 7, 9, 12} has median (7 + 9) / 2 = 8.
</div>

</div>""",
        [
            {
                "title": "Outlier Sensitivity Sort",
                "type": "card_sort",
                "config": {
                    "categories": [
                        {"id": "affected", "label": "Affected by Outliers", "color": "#EF4444"},
                        {"id": "resistant", "label": "Resistant to Outliers", "color": "#22C55E"}
                    ],
                    "cards": [
                        {"id": "c1", "text": "Mean", "category": "affected"},
                        {"id": "c2", "text": "Median", "category": "resistant"},
                        {"id": "c3", "text": "Range", "category": "affected"},
                        {"id": "c4", "text": "Mode", "category": "resistant"},
                        {"id": "c5", "text": "Standard Deviation", "category": "affected"}
                    ]
                },
                "instructions": "Sort each statistic into whether it is affected by outliers or resistant to them."
            },
            {
                "title": "Find the Mean",
                "type": "numeric_input",
                "config": {
                    "question": "Find the mean of: 12, 15, 18, 20, 25",
                    "correct_answers": [18],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "Sum $= 12 + 15 + 18 + 20 + 25 = 90$. Mean $= 90 / 5 = 18$."
                },
            },
            {
                "title": "Find the Median",
                "type": "multiple_choice_math",
                "config": {
                    "question": "What is the median of: 3, 7, 9, 12, 15, 18?",
                    "choices": [
                        {"text": "10.5", "correct": True},
                        {"text": "9", "correct": False},
                        {"text": "12", "correct": False},
                        {"text": "10", "correct": False}
                    ],
                    "explanation": "With 6 values, the median is the average of the 3rd and 4th: $(9 + 12) / 2 = 10.5$."
                },
            },
            {
                "title": "Place the Mean on Number Line",
                "type": "number_line",
                "config": {
                    "range_min": 10,
                    "range_max": 30,
                    "targets": [18],
                    "tick_interval": 2,
                    "tolerance": 1,
                    "labels": ["Mean"]
                },
                "instructions": "The data set is {12, 15, 18, 20, 25}. Place the mean on the number line."
            },
        ]
    )

    # ── Lesson 2.4: Scatter Plots & Lines of Best Fit ─────────────
    add_lesson_with_exercises(cid, mid, 3,
        "Scatter Plots & Lines of Best Fit",
        """<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.8;color:#1e293b;max-width:680px;margin:0 auto">

<div style="background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%);border-radius:16px;padding:32px;margin-bottom:24px;color:white">
<h1 style="margin:0;font-size:1.8rem">Scatter Plots &amp; Lines of Best Fit</h1>
<p style="margin:8px 0 0;opacity:0.95;font-size:1.05rem">Visualize relationships between two variables and make predictions</p>
</div>

<p>A <strong>scatter plot</strong> displays data points for two variables. The <strong>line of best fit</strong> (trend line) approximates the overall pattern.</p>

<div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<h3 style="color:#1d4ed8;margin:0 0 8px;font-size:1rem">&#x1F511; Key Concept</h3>
<p style="margin:0"><strong>Types of Correlation:</strong></p>
<ul style="margin:8px 0 0;padding-left:20px">
<li><strong>Positive:</strong> As x increases, y increases (upward trend)</li>
<li><strong>Negative:</strong> As x increases, y decreases (downward trend)</li>
<li><strong>None:</strong> No clear pattern between x and y</li>
</ul>
</div>

<p>The <strong>slope</strong> of the line of best fit tells you the rate of change &mdash; how much y changes for each unit increase in x. The <strong>y-intercept</strong> is the predicted value when x = 0.</p>

<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;margin:16px 0">
<h3 style="color:#92400e;margin:0 0 8px;font-size:1rem">&#x1F4DD; Example</h3>
<p>Line of best fit: <code>y = 12x + 10</code></p>
<p style="margin:4px 0">Slope = 12 means y increases by 12 for each 1-unit increase in x</p>
<p style="margin:4px 0">When x = 5: <code>y = 12(5) + 10 = 70</code></p>
</div>

<div style="margin:20px 0;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0"><iframe src="https://www.desmos.com/calculator" width="100%" height="300" style="border:none" title="Desmos Calculator"></iframe></div>

<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-left:4px solid #10b981;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<strong style="color:#065f46">&#x1F4A1; Pro Tip:</strong> Correlation does not imply causation! Just because two variables move together does not mean one causes the other.
</div>

</div>""",
        [
            {
                "title": "Draw Line of Best Fit",
                "type": "scatter_plot",
                "config": {
                    "mode": "best_fit",
                    "points": [
                        {"x": 1, "y": 22},
                        {"x": 2, "y": 35},
                        {"x": 3, "y": 45},
                        {"x": 4, "y": 58},
                        {"x": 5, "y": 70}
                    ],
                    "target_slope": 12,
                    "target_intercept": 10,
                    "x_label": "Hours",
                    "y_label": "Items Produced",
                    "x_range": [0, 6],
                    "y_range": [0, 80],
                    "tolerance": 3,
                    "explanation": "The best fit line is approximately $y = 12x + 10$. The slope is about 12 items per hour."
                },
                "instructions": "Draw a line of best fit through the scatter plot data."
            },
            {
                "title": "Identify Correlation",
                "type": "scatter_plot",
                "config": {
                    "mode": "correlation",
                    "points": [
                        {"x": 60, "y": 120},
                        {"x": 65, "y": 150},
                        {"x": 70, "y": 180},
                        {"x": 75, "y": 210},
                        {"x": 80, "y": 230},
                        {"x": 85, "y": 260}
                    ],
                    "correct_answer": "positive",
                    "x_label": "Temperature (F)",
                    "y_label": "Ice Cream Sales",
                    "x_range": [55, 90],
                    "y_range": [100, 280],
                    "explanation": "As temperature increases, ice cream sales increase. This is a positive correlation."
                },
                "instructions": "Look at the scatter plot. Is this a positive, negative, or no correlation?"
            },
            {
                "title": "Interpret the Slope",
                "type": "multiple_choice_math",
                "config": {
                    "question": "In $y = 1.5x + 20$ where $x$ = hours worked and $y$ = items produced, what does the slope 1.5 represent?",
                    "choices": [
                        {"text": "1.5 additional items produced per hour worked", "correct": True},
                        {"text": "20 items per hour", "correct": False},
                        {"text": "1.5 hours per item", "correct": False},
                        {"text": "The total items produced", "correct": False}
                    ],
                    "explanation": "The slope represents the rate of change: 1.5 items produced for each additional hour worked."
                },
            },
            {
                "title": "Predict from Equation",
                "type": "numeric_input",
                "config": {
                    "question": "A line of best fit is $y = 2.5x + 10$. Predict $y$ when $x = 8$.",
                    "correct_answers": [30],
                    "tolerance": 0.1,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "$y = 2.5(8) + 10 = 20 + 10 = 30$."
                },
            },
        ]
    )

    # ── Lesson 2.5: Probability & Two-Way Tables ──────────────────
    add_lesson_with_exercises(cid, mid, 4,
        "Probability & Two-Way Tables",
        """<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.8;color:#1e293b;max-width:680px;margin:0 auto">

<div style="background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%);border-radius:16px;padding:32px;margin-bottom:24px;color:white">
<h1 style="margin:0;font-size:1.8rem">Probability &amp; Two-Way Tables</h1>
<p style="margin:8px 0 0;opacity:0.95;font-size:1.05rem">Calculate probabilities and analyze categorical data</p>
</div>

<div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<h3 style="color:#1d4ed8;margin:0 0 8px;font-size:1rem">&#x1F511; Key Concept</h3>
<p style="margin:0"><strong>Probability Formula:</strong></p>
<p style="margin:8px 0 0;font-size:1.15rem;text-align:center"><code>P(event) = Favorable outcomes / Total outcomes</code></p>
<p style="margin:8px 0 0">Probability is always between 0 (impossible) and 1 (certain).</p>
</div>

<h3 style="color:#1e293b;margin-top:24px">Two-Way Tables</h3>
<p>A two-way table organizes data about two categorical variables. Row and column totals must be consistent.</p>

<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;margin:16px 0">
<h3 style="color:#92400e;margin:0 0 8px;font-size:1rem">&#x1F4DD; Example</h3>
<table style="width:100%;border-collapse:collapse;margin:8px 0">
<thead><tr style="background:#fef3c7">
<th style="padding:8px;border:1px solid #fbbf24"></th>
<th style="padding:8px;border:1px solid #fbbf24">Male</th>
<th style="padding:8px;border:1px solid #fbbf24">Female</th>
<th style="padding:8px;border:1px solid #fbbf24">Total</th>
</tr></thead>
<tbody>
<tr><td style="padding:8px;border:1px solid #fbbf24"><strong>Dog owner</strong></td><td style="padding:8px;border:1px solid #fbbf24;text-align:center">15</td><td style="padding:8px;border:1px solid #fbbf24;text-align:center">15</td><td style="padding:8px;border:1px solid #fbbf24;text-align:center">30</td></tr>
<tr><td style="padding:8px;border:1px solid #fbbf24"><strong>Cat owner</strong></td><td style="padding:8px;border:1px solid #fbbf24;text-align:center">10</td><td style="padding:8px;border:1px solid #fbbf24;text-align:center">12</td><td style="padding:8px;border:1px solid #fbbf24;text-align:center">22</td></tr>
<tr style="background:#fef3c7"><td style="padding:8px;border:1px solid #fbbf24"><strong>Total</strong></td><td style="padding:8px;border:1px solid #fbbf24;text-align:center">25</td><td style="padding:8px;border:1px solid #fbbf24;text-align:center">27</td><td style="padding:8px;border:1px solid #fbbf24;text-align:center">52</td></tr>
</tbody>
</table>
<p style="margin:8px 0 0">P(male dog owner) = 15 / 52. P(dog | male) = 15 / 25 = 0.6</p>
</div>

<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-left:4px solid #10b981;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<strong style="color:#065f46">&#x1F4A1; Pro Tip:</strong> For conditional probability P(A|B), restrict your attention to only group B, then find the fraction that is also A.
</div>

</div>""",
        [
            {
                "title": "Two-Way Table",
                "type": "two_way_table",
                "config": {
                    "row_headers": ["Dog owner", "Cat owner", "Total"],
                    "col_headers": ["Male", "Female", "Total"],
                    "cells": [
                        [15, None, 30],
                        [None, 12, 22],
                        [25, 27, 52]
                    ],
                    "answers": {"0_1": 15, "1_0": 10}
                },
                "instructions": "Fill in the missing values. Rows and columns must add to the totals."
            },
            {
                "title": "Venn Diagram",
                "type": "venn_diagram",
                "config": {
                    "set_a_label": "Math Club",
                    "set_b_label": "Science Club",
                    "total": 40,
                    "regions": {
                        "a_only": 12,
                        "b_only": None,
                        "intersection": 8,
                        "neither": None
                    },
                    "answers": {"b_only": 10, "neither": 10},
                    "explanation": "Total = a_only + b_only + intersection + neither. 40 = 12 + b_only + 8 + neither. Since b_only + neither = 20 and Science Club total is 18 so b_only = 18 - 8 = 10, neither = 40 - 12 - 8 - 10 = 10."
                },
                "instructions": "Fill in the missing regions of the Venn diagram. The Science Club has 18 total members."
            },
            {
                "title": "Basic Probability",
                "type": "multiple_choice_math",
                "config": {
                    "question": "A bag has 3 red, 5 blue, and 2 green marbles. What is the probability of drawing a blue marble?",
                    "choices": [
                        {"text": "$\\frac{1}{2}$", "correct": True},
                        {"text": "$\\frac{1}{3}$", "correct": False},
                        {"text": "$\\frac{5}{3}$", "correct": False},
                        {"text": "$\\frac{2}{5}$", "correct": False}
                    ],
                    "explanation": "Total marbles $= 3 + 5 + 2 = 10$. $P(\\text{blue}) = 5/10 = 1/2$."
                },
            },
            {
                "title": "Conditional Probability",
                "type": "numeric_input",
                "config": {
                    "question": "From the table: 52 people total, 25 male. 15 male dog owners. What fraction of males own dogs? Enter as a decimal.",
                    "correct_answers": [0.6],
                    "tolerance": 0.01,
                    "allow_fraction": True,
                    "allow_decimal": True,
                    "explanation": "$P(\\text{dog}|\\text{male}) = 15/25 = 0.6$."
                },
            },
        ]
    )


def create_module_3(cid):
    """Module 3: Passport to Advanced Math (5 lessons)."""
    mid = create_module(cid, "Passport to Advanced Math", 2)
    if not mid:
        return
    print(f"  Module 3: Passport to Advanced Math")

    # ── Lesson 3.1: Quadratic Equations ───────────────────────────
    add_lesson_with_exercises(cid, mid, 0,
        "Quadratic Equations",
        """<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.8;color:#1e293b;max-width:680px;margin:0 auto">

<div style="background:linear-gradient(135deg,#4facfe 0%,#00f2fe 100%);border-radius:16px;padding:32px;margin-bottom:24px;color:white">
<h1 style="margin:0;font-size:1.8rem">Quadratic Equations</h1>
<p style="margin:8px 0 0;opacity:0.95;font-size:1.05rem">Three methods to solve any quadratic equation</p>
</div>

<p>A quadratic equation has the standard form <code>ax&sup2; + bx + c = 0</code> where <code>a &ne; 0</code>.</p>

<div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<h3 style="color:#1d4ed8;margin:0 0 8px;font-size:1rem">&#x1F511; Key Concept</h3>
<p style="margin:0"><strong>Three Solution Methods:</strong></p>
</div>

<table style="width:100%;border-collapse:collapse;margin:16px 0;border-radius:12px;overflow:hidden">
<thead>
<tr style="background:#0284c7;color:white">
<th style="padding:12px 16px;text-align:left">Method</th>
<th style="padding:12px 16px;text-align:left">When to Use</th>
<th style="padding:12px 16px;text-align:left">Example</th>
</tr>
</thead>
<tbody>
<tr style="background:#f0f9ff">
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><strong>Factoring</strong></td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">When the expression factors neatly</td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><code>x&sup2; &minus; 5x + 6 = (x&minus;2)(x&minus;3)</code></td>
</tr>
<tr>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><strong>Quadratic Formula</strong></td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Always works &mdash; the universal method</td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><code>x = (&minus;b &plusmn; &radic;(b&sup2;&minus;4ac)) / 2a</code></td>
</tr>
<tr style="background:#f0f9ff">
<td style="padding:10px 16px"><strong>Completing the Square</strong></td>
<td style="padding:10px 16px">To convert to vertex form</td>
<td style="padding:10px 16px"><code>x&sup2; + 6x = (x+3)&sup2; &minus; 9</code></td>
</tr>
</tbody>
</table>

<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;margin:16px 0">
<h3 style="color:#92400e;margin:0 0 8px;font-size:1rem">&#x1F4DD; Example</h3>
<p>Solve <code>x&sup2; &minus; 5x + 6 = 0</code> by factoring:</p>
<p style="margin:4px 0">Find two numbers that multiply to 6 and add to &minus;5: &minus;2 and &minus;3</p>
<p style="margin:4px 0"><code>(x &minus; 2)(x &minus; 3) = 0</code></p>
<p style="margin:4px 0">Solutions: <strong>x = 2</strong> or <strong>x = 3</strong></p>
</div>

<p>The <strong>discriminant</strong> <code>b&sup2; &minus; 4ac</code> determines the number of solutions:</p>
<ul>
<li>Positive: Two distinct real solutions</li>
<li>Zero: One repeated solution</li>
<li>Negative: No real solutions (complex roots)</li>
</ul>

<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-left:4px solid #10b981;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<strong style="color:#065f46">&#x1F4A1; Pro Tip:</strong> On the SAT, try factoring first. It is much faster than the quadratic formula. If the numbers do not factor neatly, use the formula.
</div>

</div>""",
        [
            {
                "title": "Factor a Quadratic",
                "type": "equation_solver",
                "config": {
                    "equation": "x^2 - 5x + 6 = 0",
                    "steps": [
                        {
                            "id": "s1",
                            "actionLabel": "Factor as (x-2)(x-3) = 0",
                            "resultLeft": "(x-2)(x-3)",
                            "resultRight": "0"
                        },
                        {
                            "id": "s2",
                            "actionLabel": "Set each factor to zero: x-2=0 or x-3=0",
                            "resultLeft": "x",
                            "resultRight": "2 or 3"
                        }
                    ],
                    "solutions": [2, 3],
                    "explanation": "Factor: $(x-2)(x-3) = 0$. Set each factor to zero: $x = 2$ or $x = 3$."
                },
                "instructions": "Solve the quadratic equation by following the factoring steps."
            },
            {
                "title": "Quadratic Formula Solutions",
                "type": "multiple_choice_math",
                "config": {
                    "question": "Using the quadratic formula on $2x^2 - 8x + 6 = 0$, what are the solutions?",
                    "choices": [
                        {"text": "$x = 1$ and $x = 3$", "correct": True},
                        {"text": "$x = 2$ and $x = 6$", "correct": False},
                        {"text": "$x = -1$ and $x = -3$", "correct": False},
                        {"text": "$x = 4$ and $x = 0$", "correct": False}
                    ],
                    "explanation": "$a=2, b=-8, c=6$. Discriminant $= 64 - 48 = 16$. $x = \\frac{8 \\pm 4}{4}$. So $x = 3$ or $x = 1$."
                },
            },
            {
                "title": "Calculate the Discriminant",
                "type": "numeric_input",
                "config": {
                    "question": "What is the discriminant of $2x^2 - 8x + 6 = 0$? (Calculate $b^2 - 4ac$)",
                    "correct_answers": [16],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "$b^2 - 4ac = (-8)^2 - 4(2)(6) = 64 - 48 = 16$. Since it is positive, there are two real solutions."
                },
            },
            {
                "title": "Vertex x-coordinate",
                "type": "numeric_input",
                "config": {
                    "question": "Find the x-coordinate of the vertex of $y = x^2 - 6x + 5$. (Use $x = -b / (2a)$)",
                    "correct_answers": [3],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "$x = -b / (2a) = -(-6) / (2 \\cdot 1) = 6 / 2 = 3$."
                },
            },
        ]
    )

    # ── Lesson 3.2: Graphing Quadratics ───────────────────────────
    add_lesson_with_exercises(cid, mid, 1,
        "Graphing Quadratics",
        """<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.8;color:#1e293b;max-width:680px;margin:0 auto">

<div style="background:linear-gradient(135deg,#4facfe 0%,#00f2fe 100%);border-radius:16px;padding:32px;margin-bottom:24px;color:white">
<h1 style="margin:0;font-size:1.8rem">Graphing Quadratics</h1>
<p style="margin:8px 0 0;opacity:0.95;font-size:1.05rem">Understand parabola shape, vertex, and transformations</p>
</div>

<div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<h3 style="color:#1d4ed8;margin:0 0 8px;font-size:1rem">&#x1F511; Key Concept</h3>
<p style="margin:0"><strong>Anatomy of a Parabola:</strong></p>
<ul style="margin:8px 0 0;padding-left:20px">
<li><strong>Vertex:</strong> The highest or lowest point</li>
<li><strong>Axis of symmetry:</strong> Vertical line through the vertex</li>
<li><strong>Opens up</strong> if a &gt; 0, <strong>opens down</strong> if a &lt; 0</li>
<li><strong>y-intercept:</strong> The value of c (when x = 0)</li>
</ul>
</div>

<h3>Vertex Form</h3>
<p style="text-align:center;font-size:1.2rem;margin:12px 0;padding:12px;background:#f0f9ff;border-radius:12px"><code>y = a(x &minus; h)&sup2; + k</code></p>
<p>The vertex is at <strong>(h, k)</strong>. The value <strong>a</strong> controls the width and direction of the parabola.</p>

<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;margin:16px 0">
<h3 style="color:#92400e;margin:0 0 8px;font-size:1rem">&#x1F4DD; Example</h3>
<p><code>y = (x &minus; 3)&sup2; &minus; 4</code></p>
<p style="margin:4px 0">Vertex: <strong>(3, &minus;4)</strong></p>
<p style="margin:4px 0">Opens upward (a = 1 &gt; 0)</p>
<p style="margin:4px 0">y-intercept: <code>(0 &minus; 3)&sup2; &minus; 4 = 9 &minus; 4 = 5</code>, so (0, 5)</p>
</div>

<div style="margin:20px 0;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0"><iframe src="https://www.desmos.com/calculator" width="100%" height="300" style="border:none" title="Desmos Calculator"></iframe></div>

<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-left:4px solid #10b981;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<strong style="color:#065f46">&#x1F4A1; Pro Tip:</strong> To find the vertex from standard form <code>y = ax&sup2; + bx + c</code>, use <code>x = &minus;b / (2a)</code>, then plug that x back in to find the y-coordinate.
</div>

</div>""",
        [
            {
                "title": "Match the Parabola",
                "type": "function_graph",
                "config": {
                    "function_type": "quadratic",
                    "target_params": {"a": 1, "b": 0, "c": -4},
                    "grid_range": 6,
                    "mode": "match_graph",
                    "show_target": True,
                    "tolerance": 0.3,
                    "explanation": "The graph is $y = x^2 - 4$. It opens upward with vertex at $(0, -4)$."
                },
                "instructions": "Adjust the sliders to match the target parabola y = x^2 - 4."
            },
            {
                "title": "Plot Key Points",
                "type": "coordinate_plane",
                "config": {
                    "targets": [
                        {"x": 3, "y": -4},
                        {"x": 0, "y": 5}
                    ],
                    "grid_range": 8,
                    "tolerance": 0.5,
                    "labels": ["Vertex (3, -4)", "y-intercept (0, 5)"],
                    "explanation": "For $y = (x-3)^2 - 4$: vertex is $(3, -4)$ and y-intercept is $(0, 5)$."
                },
                "instructions": "Plot the vertex (3, -4) and y-intercept (0, 5) of y = (x-3)^2 - 4."
            },
            {
                "title": "Transform the Parabola",
                "type": "graph_transform",
                "config": {
                    "parent": "x^2",
                    "target_h": 2,
                    "target_v": -1,
                    "target_a": 1,
                    "grid_range": 6,
                    "tolerance": 0.3,
                    "explanation": "Shifting $x^2$ right 2 and down 1 gives $y = (x-2)^2 - 1$. Vertex moves to $(2, -1)$."
                },
                "instructions": "Shift the parent function x^2 right 2 units and down 1 unit."
            },
            {
                "title": "Identify Vertex from Equation",
                "type": "multiple_choice_math",
                "config": {
                    "question": "What is the vertex of $y = -2(x + 1)^2 + 7$?",
                    "choices": [
                        {"text": "$(-1, 7)$", "correct": True},
                        {"text": "$(1, 7)$", "correct": False},
                        {"text": "$(-1, -7)$", "correct": False},
                        {"text": "$(2, 7)$", "correct": False}
                    ],
                    "explanation": "In vertex form $y = a(x-h)^2 + k$, here $h = -1$ and $k = 7$. Vertex: $(-1, 7)$."
                },
            },
        ]
    )

    # ── Lesson 3.3: Polynomials ───────────────────────────────────
    add_lesson_with_exercises(cid, mid, 2,
        "Polynomial Expressions",
        """<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.8;color:#1e293b;max-width:680px;margin:0 auto">

<div style="background:linear-gradient(135deg,#4facfe 0%,#00f2fe 100%);border-radius:16px;padding:32px;margin-bottom:24px;color:white">
<h1 style="margin:0;font-size:1.8rem">Polynomials</h1>
<p style="margin:8px 0 0;opacity:0.95;font-size:1.05rem">Classify, evaluate, and operate on polynomial expressions</p>
</div>

<p>A <strong>polynomial</strong> is a sum of terms, each consisting of a coefficient times a variable raised to a non-negative integer power.</p>

<div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<h3 style="color:#1d4ed8;margin:0 0 8px;font-size:1rem">&#x1F511; Key Concept</h3>
<p style="margin:0">The <strong>degree</strong> is the highest exponent. The <strong>leading coefficient</strong> is the coefficient of the highest-degree term.</p>
</div>

<table style="width:100%;border-collapse:collapse;margin:16px 0;border-radius:12px;overflow:hidden">
<thead>
<tr style="background:#0284c7;color:white">
<th style="padding:12px 16px;text-align:left">Name</th>
<th style="padding:12px 16px;text-align:left">Degree</th>
<th style="padding:12px 16px;text-align:left">Example</th>
</tr>
</thead>
<tbody>
<tr style="background:#f0f9ff">
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><strong>Constant</strong></td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">0</td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><code>7</code></td>
</tr>
<tr>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><strong>Linear</strong></td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">1</td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><code>5x + 2</code></td>
</tr>
<tr style="background:#f0f9ff">
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><strong>Quadratic</strong></td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">2</td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><code>x&sup2; &minus; 4x + 3</code></td>
</tr>
<tr>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><strong>Cubic</strong></td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">3</td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><code>x&sup3; + 1</code></td>
</tr>
<tr style="background:#f0f9ff">
<td style="padding:10px 16px"><strong>Quartic</strong></td>
<td style="padding:10px 16px">4</td>
<td style="padding:10px 16px"><code>3x&#x2074; &minus; 2x&sup2; + 7x &minus; 1</code></td>
</tr>
</tbody>
</table>

<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;margin:16px 0">
<h3 style="color:#92400e;margin:0 0 8px;font-size:1rem">&#x1F4DD; Example</h3>
<p>Adding polynomials: <code>(3x&sup2; + 2x &minus; 1) + (x&sup2; &minus; 4x + 5)</code></p>
<p style="margin:4px 0">Combine like terms: <code>4x&sup2; &minus; 2x + 4</code></p>
</div>

<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-left:4px solid #10b981;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<strong style="color:#065f46">&#x1F4A1; Pro Tip:</strong> When adding or subtracting polynomials, line up like terms (same variable and exponent) and combine the coefficients.
</div>

</div>""",
        [
            {
                "title": "Classify Polynomials",
                "type": "card_sort",
                "config": {
                    "categories": [
                        {"id": "linear", "label": "Linear (degree 1)", "color": "#3B82F6"},
                        {"id": "quadratic", "label": "Quadratic (degree 2)", "color": "#F59E0B"},
                        {"id": "cubic", "label": "Cubic (degree 3)", "color": "#10B981"}
                    ],
                    "cards": [
                        {"id": "c1", "text": "5x + 2", "category": "linear"},
                        {"id": "c2", "text": "x\u00b2 - 4x + 3", "category": "quadratic"},
                        {"id": "c3", "text": "x\u00b3 + 1", "category": "cubic"},
                        {"id": "c4", "text": "-2x + 7", "category": "linear"},
                        {"id": "c5", "text": "3x\u00b2", "category": "quadratic"},
                        {"id": "c6", "text": "2x\u00b3 - x\u00b2 + x", "category": "cubic"}
                    ]
                },
                "instructions": "Sort each expression by its polynomial degree."
            },
            {
                "title": "Coefficient in Sum",
                "type": "numeric_input",
                "config": {
                    "question": "If $f(x) = 3x^2 + 2x - 1$ and $g(x) = x^2 - 4x + 5$, what is the coefficient of $x$ in $f(x) + g(x)$?",
                    "correct_answers": [-2],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "$f(x) + g(x) = 4x^2 + (2 - 4)x + (-1 + 5) = 4x^2 - 2x + 4$. Coefficient of $x$ is $-2$."
                },
            },
            {
                "title": "Polynomial Degree",
                "type": "multiple_choice_math",
                "config": {
                    "question": "What is the degree of $3x^4 - 2x^2 + 7x - 1$?",
                    "choices": [
                        {"text": "4", "correct": True},
                        {"text": "3", "correct": False},
                        {"text": "2", "correct": False},
                        {"text": "7", "correct": False}
                    ],
                    "explanation": "The highest exponent is 4 (from $3x^4$), so the degree is 4."
                },
            },
            {
                "title": "Evaluate Polynomial Table",
                "type": "table_pattern",
                "config": {
                    "x_values": [0, 1, 2, 3, 4],
                    "y_values": [1, None, 5, None, 17],
                    "answers": {"1": 2, "3": 10},
                    "rule_label": "Formula",
                    "rule_answer": "x^2+1",
                    "tolerance": 0.1,
                    "x_header": "x",
                    "y_header": "f(x) = x\u00b2 + 1"
                },
                "instructions": "Evaluate f(x) = x\u00b2 + 1 for each value of x. Fill in the blanks."
            },
        ]
    )

    # ── Lesson 3.4: Exponential Functions ─────────────────────────
    add_lesson_with_exercises(cid, mid, 3,
        "Exponential Functions",
        """<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.8;color:#1e293b;max-width:680px;margin:0 auto">

<div style="background:linear-gradient(135deg,#4facfe 0%,#00f2fe 100%);border-radius:16px;padding:32px;margin-bottom:24px;color:white">
<h1 style="margin:0;font-size:1.8rem">Exponential Functions</h1>
<p style="margin:8px 0 0;opacity:0.95;font-size:1.05rem">Growth, decay, and compound interest</p>
</div>

<p>An exponential function has the form <code>f(x) = a &middot; b<sup>x</sup></code> where:</p>
<ul>
<li><strong>a</strong> = initial value (y-intercept when x = 0)</li>
<li><strong>b</strong> = base (growth or decay factor)</li>
</ul>

<div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<h3 style="color:#1d4ed8;margin:0 0 8px;font-size:1rem">&#x1F511; Key Concept</h3>
<p style="margin:0"><strong>Growth vs Decay:</strong></p>
<ul style="margin:8px 0 0;padding-left:20px">
<li><strong>b &gt; 1:</strong> Exponential growth (values increase rapidly)</li>
<li><strong>0 &lt; b &lt; 1:</strong> Exponential decay (values decrease toward zero)</li>
</ul>
</div>

<div style="display:flex;gap:12px;margin:16px 0;flex-wrap:wrap">
<div style="flex:1;min-width:200px;background:#dcfce7;border-radius:12px;padding:16px;text-align:center">
<div style="font-size:1.3rem;margin-bottom:4px">&#x1F4C8;</div>
<strong style="color:#166534">Growth</strong>
<p style="margin:4px 0;font-size:0.9rem;color:#15803d">f(x) = 100 &middot; 1.15<sup>x</sup></p>
<p style="margin:0;font-size:0.85rem">15% increase per period</p>
</div>
<div style="flex:1;min-width:200px;background:#fef2f2;border-radius:12px;padding:16px;text-align:center">
<div style="font-size:1.3rem;margin-bottom:4px">&#x1F4C9;</div>
<strong style="color:#991b1b">Decay</strong>
<p style="margin:4px 0;font-size:0.9rem;color:#b91c1c">f(x) = 100 &middot; 0.85<sup>x</sup></p>
<p style="margin:0;font-size:0.85rem">15% decrease per period</p>
</div>
</div>

<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;margin:16px 0">
<h3 style="color:#92400e;margin:0 0 8px;font-size:1rem">&#x1F4DD; Example</h3>
<p>A population of 100 doubles every year: <code>P(t) = 100 &middot; 2<sup>t</sup></code></p>
<p style="margin:4px 0">After 3 years: <code>P(3) = 100 &middot; 2&sup3; = 100 &middot; 8 = 800</code></p>
</div>

<div style="margin:20px 0;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0"><iframe src="https://www.desmos.com/calculator" width="100%" height="300" style="border:none" title="Desmos Calculator"></iframe></div>

<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-left:4px solid #10b981;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<strong style="color:#065f46">&#x1F4A1; Pro Tip:</strong> Compound interest uses the formula <code>A = P(1 + r)<sup>t</sup></code>. This is just an exponential growth function where the base is <code>(1 + r)</code>.
</div>

</div>""",
        [
            {
                "title": "Match Exponential Graph",
                "type": "function_graph",
                "config": {
                    "function_type": "exponential",
                    "target_params": {"a": 2, "base": 2, "c": 0},
                    "grid_range": 6,
                    "mode": "match_graph",
                    "show_target": True,
                    "tolerance": 0.3,
                    "explanation": "The function $y = 2 \\cdot 2^x$ is an exponential growth function that doubles with each unit increase in $x$."
                },
                "instructions": "Adjust the parameters to match the exponential growth curve."
            },
            {
                "title": "Doubling Population Table",
                "type": "table_pattern",
                "config": {
                    "x_values": [0, 1, 2, 3, 4],
                    "y_values": [100, None, 400, None, 1600],
                    "answers": {"1": 200, "3": 800},
                    "rule_label": "Formula",
                    "rule_answer": "100*2^x",
                    "tolerance": 1,
                    "x_header": "Year",
                    "y_header": "Population"
                },
                "instructions": "This population doubles every year, starting at 100. Fill in the missing values."
            },
            {
                "title": "Growth vs Decay",
                "type": "multiple_choice_math",
                "config": {
                    "question": "Which function represents exponential decay?",
                    "choices": [
                        {"text": "$f(x) = 100 \\cdot (0.85)^x$", "correct": True},
                        {"text": "$f(x) = 100 \\cdot (1.15)^x$", "correct": False},
                        {"text": "$f(x) = 100 \\cdot 2^x$", "correct": False},
                        {"text": "$f(x) = 100x$", "correct": False}
                    ],
                    "explanation": "When the base $b = 0.85 < 1$, the function decreases over time. This is exponential decay."
                },
            },
            {
                "title": "Compound Interest",
                "type": "numeric_input",
                "config": {
                    "question": "If 1000 dollars is invested at 5% annual interest compounded yearly, what is it worth after 2 years?",
                    "correct_answers": [1102.5],
                    "tolerance": 1,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "$A = 1000 \\times (1.05)^2 = 1000 \\times 1.1025 = 1102.50$."
                },
            },
        ]
    )

    # ── Lesson 3.5: Function Transformations ──────────────────────
    add_lesson_with_exercises(cid, mid, 4,
        "Function Transformations",
        """<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.8;color:#1e293b;max-width:680px;margin:0 auto">

<div style="background:linear-gradient(135deg,#4facfe 0%,#00f2fe 100%);border-radius:16px;padding:32px;margin-bottom:24px;color:white">
<h1 style="margin:0;font-size:1.8rem">Function Transformations</h1>
<p style="margin:8px 0 0;opacity:0.95;font-size:1.05rem">Shift, stretch, reflect, and compress any function</p>
</div>

<div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<h3 style="color:#1d4ed8;margin:0 0 8px;font-size:1rem">&#x1F511; Key Concept</h3>
<p style="margin:0">Given a parent function <code>f(x)</code>, here is how transformations work:</p>
</div>

<table style="width:100%;border-collapse:collapse;margin:16px 0;border-radius:12px;overflow:hidden">
<thead>
<tr style="background:#0284c7;color:white">
<th style="padding:12px 16px;text-align:left">Transformation</th>
<th style="padding:12px 16px;text-align:left">Notation</th>
<th style="padding:12px 16px;text-align:left">Effect</th>
</tr>
</thead>
<tbody>
<tr style="background:#f0f9ff">
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Shift up</td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><code>f(x) + k</code></td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Every point moves up k</td>
</tr>
<tr>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Shift down</td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><code>f(x) &minus; k</code></td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Every point moves down k</td>
</tr>
<tr style="background:#f0f9ff">
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Shift right</td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><code>f(x &minus; h)</code></td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Every point moves right h</td>
</tr>
<tr>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Shift left</td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><code>f(x + h)</code></td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Every point moves left h</td>
</tr>
<tr style="background:#f0f9ff">
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Reflect over x-axis</td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><code>&minus;f(x)</code></td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Flip upside down</td>
</tr>
<tr>
<td style="padding:10px 16px">Vertical stretch</td>
<td style="padding:10px 16px"><code>a &middot; f(x)</code></td>
<td style="padding:10px 16px">Stretch (a &gt; 1) or compress (0 &lt; a &lt; 1)</td>
</tr>
</tbody>
</table>

<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;margin:16px 0">
<h3 style="color:#92400e;margin:0 0 8px;font-size:1rem">&#x1F4DD; Example</h3>
<p>If <code>f(x) = x&sup2;</code> and <code>g(x) = (x &minus; 1)&sup2; + 5</code>, then g is f shifted right 1 and up 5.</p>
<p style="margin:4px 0">Original vertex: (0, 0) &rarr; New vertex: <strong>(1, 5)</strong></p>
</div>

<div style="margin:20px 0;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0"><iframe src="https://www.desmos.com/calculator" width="100%" height="300" style="border:none" title="Desmos Calculator"></iframe></div>

<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-left:4px solid #10b981;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<strong style="color:#065f46">&#x1F4A1; Pro Tip:</strong> Horizontal transformations work "opposite" to what you might expect: <code>f(x &minus; 3)</code> moves right (not left), and <code>f(x + 3)</code> moves left (not right).
</div>

</div>""",
        [
            {
                "title": "Shift Parabola Left & Up",
                "type": "graph_transform",
                "config": {
                    "parent": "x^2",
                    "target_h": -3,
                    "target_v": 2,
                    "target_a": 1,
                    "grid_range": 8,
                    "tolerance": 0.3,
                    "explanation": "Shifting $x^2$ left 3 and up 2 gives $y = (x+3)^2 + 2$. The vertex moves from $(0,0)$ to $(-3, 2)$."
                },
                "instructions": "Shift x^2 left 3 units and up 2 units."
            },
            {
                "title": "Stretch & Reflect Absolute Value",
                "type": "graph_transform",
                "config": {
                    "parent": "|x|",
                    "target_h": 0,
                    "target_v": 0,
                    "target_a": -2,
                    "grid_range": 6,
                    "tolerance": 0.3,
                    "explanation": "$y = -2|x|$ stretches by factor 2 and reflects over the x-axis. The V-shape opens downward."
                },
                "instructions": "Stretch |x| by a factor of 2 and reflect it over the x-axis."
            },
            {
                "title": "Classify Transformations",
                "type": "card_sort",
                "config": {
                    "categories": [
                        {"id": "horizontal", "label": "Horizontal Shift", "color": "#6366F1"},
                        {"id": "vertical", "label": "Vertical Shift", "color": "#F97316"},
                        {"id": "reflection", "label": "Reflection / Stretch", "color": "#EC4899"}
                    ],
                    "cards": [
                        {"id": "c1", "text": "f(x + 4)", "category": "horizontal"},
                        {"id": "c2", "text": "f(x) - 5", "category": "vertical"},
                        {"id": "c3", "text": "-f(x)", "category": "reflection"},
                        {"id": "c4", "text": "f(x - 2)", "category": "horizontal"},
                        {"id": "c5", "text": "3f(x)", "category": "reflection"},
                        {"id": "c6", "text": "f(x) + 1", "category": "vertical"}
                    ]
                },
                "instructions": "Classify each transformation type."
            },
            {
                "title": "New Vertex After Transformation",
                "type": "coordinate_plane",
                "config": {
                    "targets": [
                        {"x": 1, "y": 5}
                    ],
                    "grid_range": 8,
                    "tolerance": 0.5,
                    "labels": ["Vertex (1, 5)"],
                    "explanation": "$g(x) = (x-1)^2 + 5$ is $f(x) = x^2$ shifted right 1, up 5. New vertex: $(1, 5)$."
                },
                "instructions": "If f(x) = x^2 has vertex (0,0), plot the vertex of g(x) = (x-1)^2 + 5."
            },
        ]
    )


def create_module_4(cid):
    """Module 4: Additional Topics in Math (4 lessons)."""
    mid = create_module(cid, "Additional Topics in Math", 3)
    if not mid:
        return
    print(f"  Module 4: Additional Topics in Math")

    # ── Lesson 4.1: Geometry ──────────────────────────────────────
    add_lesson_with_exercises(cid, mid, 0,
        "Geometry Essentials",
        """<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.8;color:#1e293b;max-width:680px;margin:0 auto">

<div style="background:linear-gradient(135deg,#43e97b 0%,#38f9d7 100%);border-radius:16px;padding:32px;margin-bottom:24px;color:white">
<h1 style="margin:0;font-size:1.8rem">Geometry Essentials</h1>
<p style="margin:8px 0 0;opacity:0.95;font-size:1.05rem">Areas, perimeters, and the Pythagorean theorem</p>
</div>

<div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<h3 style="color:#1d4ed8;margin:0 0 8px;font-size:1rem">&#x1F511; Key Concept</h3>
<p style="margin:0"><strong>Essential Geometry Formulas:</strong></p>
</div>

<table style="width:100%;border-collapse:collapse;margin:16px 0;border-radius:12px;overflow:hidden">
<thead>
<tr style="background:#059669;color:white">
<th style="padding:12px 16px;text-align:left">Shape</th>
<th style="padding:12px 16px;text-align:left">Area</th>
<th style="padding:12px 16px;text-align:left">Perimeter</th>
</tr>
</thead>
<tbody>
<tr style="background:#f0fdf4">
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><strong>Rectangle</strong></td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><code>l &times; w</code></td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><code>2(l + w)</code></td>
</tr>
<tr>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><strong>Triangle</strong></td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><code>&frac12; &times; b &times; h</code></td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><code>a + b + c</code></td>
</tr>
<tr style="background:#f0fdf4">
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><strong>Circle</strong></td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><code>&pi;r&sup2;</code></td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><code>2&pi;r</code></td>
</tr>
<tr>
<td style="padding:10px 16px"><strong>Trapezoid</strong></td>
<td style="padding:10px 16px"><code>&frac12;(b&sub1; + b&sub2;)h</code></td>
<td style="padding:10px 16px"><code>sum of sides</code></td>
</tr>
</tbody>
</table>

<h3 style="color:#1e293b;margin-top:24px">Pythagorean Theorem</h3>
<p style="text-align:center;font-size:1.3rem;margin:12px 0;padding:12px;background:#f0fdf4;border-radius:12px"><code>a&sup2; + b&sup2; = c&sup2;</code></p>
<p>For any right triangle, the sum of the squares of the two legs equals the square of the hypotenuse.</p>

<div style="text-align:center;margin:20px 0">
<svg width="200" height="160" viewBox="0 0 200 160" style="max-width:100%">
<polygon points="20,140 180,140 180,20" fill="none" stroke="#059669" stroke-width="2.5"/>
<line x1="170" y1="140" x2="170" y2="130" stroke="#059669" stroke-width="2"/>
<line x1="170" y1="130" x2="180" y2="130" stroke="#059669" stroke-width="2"/>
<text x="100" y="158" text-anchor="middle" fill="#1e293b" font-size="14" font-family="system-ui">b = 12</text>
<text x="190" y="85" text-anchor="start" fill="#1e293b" font-size="14" font-family="system-ui">a = 5</text>
<text x="85" y="75" text-anchor="middle" fill="#059669" font-size="14" font-weight="bold" font-family="system-ui">c = 13</text>
</svg>
</div>

<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;margin:16px 0">
<h3 style="color:#92400e;margin:0 0 8px;font-size:1rem">&#x1F4DD; Example</h3>
<p>A right triangle has legs 5 and 12. Find the hypotenuse:</p>
<p style="margin:4px 0"><code>c&sup2; = 5&sup2; + 12&sup2; = 25 + 144 = 169</code></p>
<p style="margin:4px 0"><code>c = &radic;169 = <strong>13</strong></code></p>
</div>

<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-left:4px solid #10b981;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<strong style="color:#065f46">&#x1F4A1; Pro Tip:</strong> Memorize common Pythagorean triples: 3-4-5, 5-12-13, 8-15-17, and 7-24-25. The SAT loves these!
</div>

</div>""",
        [
            {
                "title": "Plot a Triangle",
                "type": "coordinate_plane",
                "config": {
                    "targets": [
                        {"x": 0, "y": 0},
                        {"x": 4, "y": 0},
                        {"x": 4, "y": 3}
                    ],
                    "grid_range": 6,
                    "tolerance": 0.5,
                    "labels": ["(0,0)", "(4,0)", "(4,3)"],
                    "explanation": "The three vertices form a right triangle with legs 4 and 3, and hypotenuse 5."
                },
                "instructions": "Plot the vertices of a right triangle at (0,0), (4,0), and (4,3)."
            },
            {
                "title": "Pythagorean Theorem",
                "type": "numeric_input",
                "config": {
                    "question": "A right triangle has legs of length 5 and 12. What is the hypotenuse?",
                    "correct_answers": [13],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "$c = \\sqrt{5^2 + 12^2} = \\sqrt{25 + 144} = \\sqrt{169} = 13$."
                },
            },
            {
                "title": "Circle Area",
                "type": "numeric_input",
                "config": {
                    "question": "What is the area of a circle with radius 7? Use pi = 3.14. Round to the nearest whole number.",
                    "correct_answers": [153.94, 154],
                    "tolerance": 1,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "$A = \\pi r^2 = 3.14 \\times 49 \\approx 153.86 \\approx 154$."
                },
            },
            {
                "title": "Supplementary Angles",
                "type": "multiple_choice_math",
                "config": {
                    "question": "Two angles are supplementary. One angle measures $70\\degree$. What is the other angle?",
                    "choices": [
                        {"text": "$110\\degree$", "correct": True},
                        {"text": "$20\\degree$", "correct": False},
                        {"text": "$90\\degree$", "correct": False},
                        {"text": "$290\\degree$", "correct": False}
                    ],
                    "explanation": "Supplementary angles add to $180\\degree$. $180 - 70 = 110$."
                },
            },
        ]
    )

    # ── Lesson 4.2: Circles ───────────────────────────────────────
    add_lesson_with_exercises(cid, mid, 1,
        "Circles",
        """<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.8;color:#1e293b;max-width:680px;margin:0 auto">

<div style="background:linear-gradient(135deg,#43e97b 0%,#38f9d7 100%);border-radius:16px;padding:32px;margin-bottom:24px;color:white">
<h1 style="margin:0;font-size:1.8rem">Circles</h1>
<p style="margin:8px 0 0;opacity:0.95;font-size:1.05rem">Area, circumference, arcs, and sectors</p>
</div>

<div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<h3 style="color:#1d4ed8;margin:0 0 8px;font-size:1rem">&#x1F511; Key Concept</h3>
<p style="margin:0"><strong>Circle Formulas:</strong></p>
<ul style="margin:8px 0 0;padding-left:20px">
<li><strong>Area:</strong> <code>A = &pi;r&sup2;</code></li>
<li><strong>Circumference:</strong> <code>C = 2&pi;r</code> or <code>C = &pi;d</code></li>
<li><strong>Arc length:</strong> <code>L = (&theta; / 360) &times; 2&pi;r</code></li>
<li><strong>Sector area:</strong> <code>A = (&theta; / 360) &times; &pi;r&sup2;</code></li>
</ul>
</div>

<h3 style="color:#1e293b;margin-top:24px">Parts of a Circle</h3>

<div style="text-align:center;margin:20px 0">
<svg width="220" height="220" viewBox="0 0 220 220" style="max-width:100%">
<circle cx="110" cy="110" r="80" fill="none" stroke="#059669" stroke-width="2.5"/>
<circle cx="110" cy="110" r="3" fill="#059669"/>
<line x1="110" y1="110" x2="190" y2="110" stroke="#059669" stroke-width="2" stroke-dasharray="5,3"/>
<text x="148" y="105" fill="#059669" font-size="13" font-family="system-ui" font-weight="bold">r</text>
<line x1="110" y1="110" x2="53" y2="70" stroke="#3b82f6" stroke-width="2"/>
<text x="70" y="82" fill="#3b82f6" font-size="13" font-family="system-ui" font-weight="bold">r</text>
<path d="M 190 110 A 80 80 0 0 1 53 70" fill="none" stroke="#f59e0b" stroke-width="3"/>
<text x="170" y="55" fill="#f59e0b" font-size="13" font-family="system-ui" font-weight="bold">arc</text>
<text x="105" y="128" fill="#1e293b" font-size="12" font-family="system-ui">center</text>
</svg>
</div>

<p>A <strong>sector</strong> is a "pizza slice" of a circle. A <strong>chord</strong> is a line segment connecting two points on the circle. The <strong>diameter</strong> is the longest chord, passing through the center.</p>

<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;margin:16px 0">
<h3 style="color:#92400e;margin:0 0 8px;font-size:1rem">&#x1F4DD; Example</h3>
<p>Circle with radius 7:</p>
<p style="margin:4px 0">Area = &pi; &times; 7&sup2; = 49&pi; &approx; <strong>153.94</strong></p>
<p style="margin:4px 0">Circumference = 2&pi; &times; 7 = 14&pi; &approx; <strong>43.98</strong></p>
</div>

<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-left:4px solid #10b981;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<strong style="color:#065f46">&#x1F4A1; Pro Tip:</strong> A sector with central angle &theta; is the fraction &theta;/360 of the whole circle. This applies to both arc length and sector area.
</div>

</div>""",
        [
            {
                "title": "Circle Area",
                "type": "numeric_input",
                "config": {
                    "question": "What is the area of a circle with radius 7? Use pi = 3.14 and round to the nearest hundredth.",
                    "correct_answers": [153.94, 153.86],
                    "tolerance": 1,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "$A = \\pi r^2 = 3.14 \\times 49 \\approx 153.86$."
                },
            },
            {
                "title": "Shade 3/4 of a Circle",
                "type": "visual_fractions",
                "config": {
                    "target_numerator": 3,
                    "target_denominator": 4,
                    "display_type": "pie",
                    "explanation": "3/4 means shade 3 out of 4 equal parts of the circle. This is the same as a 270-degree sector."
                },
                "instructions": "Shade exactly 3/4 of the circle."
            },
            {
                "title": "Shade 5/8 of a Bar",
                "type": "visual_fractions",
                "config": {
                    "target_numerator": 5,
                    "target_denominator": 8,
                    "display_type": "bar",
                    "explanation": "5/8 means shade 5 out of 8 equal sections."
                },
                "instructions": "Shade exactly 5/8 of the bar."
            },
            {
                "title": "Arc Length",
                "type": "multiple_choice_math",
                "config": {
                    "question": "A circle has radius 10. What is the arc length for a 90-degree central angle? (Use $\\pi \\approx 3.14$)",
                    "choices": [
                        {"text": "$15.7$", "correct": True},
                        {"text": "$31.4$", "correct": False},
                        {"text": "$78.5$", "correct": False},
                        {"text": "$10$", "correct": False}
                    ],
                    "explanation": "Arc length $= \\frac{90}{360} \\times 2\\pi(10) = \\frac{1}{4} \\times 62.8 = 15.7$."
                },
            },
        ]
    )

    # ── Lesson 4.3: Trigonometry ──────────────────────────────────
    add_lesson_with_exercises(cid, mid, 2,
        "Trigonometry Basics",
        """<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.8;color:#1e293b;max-width:680px;margin:0 auto">

<div style="background:linear-gradient(135deg,#43e97b 0%,#38f9d7 100%);border-radius:16px;padding:32px;margin-bottom:24px;color:white">
<h1 style="margin:0;font-size:1.8rem">Trigonometry Basics</h1>
<p style="margin:8px 0 0;opacity:0.95;font-size:1.05rem">SOH-CAH-TOA and special right triangles</p>
</div>

<div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<h3 style="color:#1d4ed8;margin:0 0 8px;font-size:1rem">&#x1F511; Key Concept</h3>
<p style="margin:0"><strong>SOH-CAH-TOA</strong> &mdash; the foundation of right-triangle trigonometry:</p>
</div>

<div style="display:flex;gap:12px;margin:16px 0;flex-wrap:wrap">
<div style="flex:1;min-width:150px;background:#eef2ff;border:2px solid #6366f1;border-radius:12px;padding:16px;text-align:center">
<div style="font-size:1.5rem;font-weight:bold;color:#4f46e5">SOH</div>
<p style="margin:8px 0 0;font-size:0.95rem"><strong>Sin</strong> = Opposite / Hypotenuse</p>
</div>
<div style="flex:1;min-width:150px;background:#fef3c7;border:2px solid #f59e0b;border-radius:12px;padding:16px;text-align:center">
<div style="font-size:1.5rem;font-weight:bold;color:#d97706">CAH</div>
<p style="margin:8px 0 0;font-size:0.95rem"><strong>Cos</strong> = Adjacent / Hypotenuse</p>
</div>
<div style="flex:1;min-width:150px;background:#dcfce7;border:2px solid #22c55e;border-radius:12px;padding:16px;text-align:center">
<div style="font-size:1.5rem;font-weight:bold;color:#16a34a">TOA</div>
<p style="margin:8px 0 0;font-size:0.95rem"><strong>Tan</strong> = Opposite / Adjacent</p>
</div>
</div>

<h3 style="color:#1e293b;margin-top:24px">Special Right Triangles</h3>

<table style="width:100%;border-collapse:collapse;margin:16px 0;border-radius:12px;overflow:hidden">
<thead>
<tr style="background:#059669;color:white">
<th style="padding:12px 16px;text-align:left">Triangle</th>
<th style="padding:12px 16px;text-align:left">Sides</th>
<th style="padding:12px 16px;text-align:left">Key Values</th>
</tr>
</thead>
<tbody>
<tr style="background:#f0fdf4">
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><strong>30-60-90</strong></td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><code>x : x&radic;3 : 2x</code></td>
<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">sin 30 = 1/2, cos 30 = &radic;3/2</td>
</tr>
<tr>
<td style="padding:10px 16px"><strong>45-45-90</strong></td>
<td style="padding:10px 16px"><code>x : x : x&radic;2</code></td>
<td style="padding:10px 16px">sin 45 = cos 45 = &radic;2/2, tan 45 = 1</td>
</tr>
</tbody>
</table>

<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;margin:16px 0">
<h3 style="color:#92400e;margin:0 0 8px;font-size:1rem">&#x1F4DD; Example</h3>
<p>In a right triangle with opposite = 3 and hypotenuse = 5:</p>
<p style="margin:4px 0">sin(&theta;) = 3/5 = 0.6</p>
<p style="margin:4px 0">adjacent = &radic;(25 &minus; 9) = 4, so cos(&theta;) = 4/5 = 0.8</p>
</div>

<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-left:4px solid #10b981;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<strong style="color:#065f46">&#x1F4A1; Pro Tip:</strong> On the SAT, most trig problems use special triangles or simple ratios. Memorize the 30-60-90 and 45-45-90 side relationships.
</div>

</div>""",
        [
            {
                "title": "Trig Ratios Sort",
                "type": "card_sort",
                "config": {
                    "categories": [
                        {"id": "sin", "label": "Sine", "color": "#6366F1"},
                        {"id": "cos", "label": "Cosine", "color": "#F59E0B"},
                        {"id": "tan", "label": "Tangent", "color": "#10B981"}
                    ],
                    "cards": [
                        {"id": "c1", "text": "Opp/Hyp", "category": "sin"},
                        {"id": "c2", "text": "Adj/Hyp", "category": "cos"},
                        {"id": "c3", "text": "Opp/Adj", "category": "tan"},
                        {"id": "c4", "text": "SOH", "category": "sin"},
                        {"id": "c5", "text": "CAH", "category": "cos"},
                        {"id": "c6", "text": "TOA", "category": "tan"}
                    ]
                },
                "instructions": "Match each description or mnemonic to the correct trig function."
            },
            {
                "title": "Place Trig Values on Number Line",
                "type": "number_line",
                "config": {
                    "range_min": 0,
                    "range_max": 1.5,
                    "targets": [0.5, 1.0],
                    "tick_interval": 0.25,
                    "tolerance": 0.1,
                    "labels": ["sin 30\u00b0 = 0.5", "tan 45\u00b0 = 1.0"]
                },
                "instructions": "Place sin(30\u00b0) = 0.5 and tan(45\u00b0) = 1.0 on the number line."
            },
            {
                "title": "30-60-90 Triangle",
                "type": "numeric_input",
                "config": {
                    "question": "In a 30-60-90 triangle, the side opposite the 30-degree angle is 5. What is the hypotenuse?",
                    "correct_answers": [10],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "In a 30-60-90 triangle, the hypotenuse is twice the short side: $2 \\times 5 = 10$."
                },
            },
            {
                "title": "Find Sine",
                "type": "multiple_choice_math",
                "config": {
                    "question": "In a right triangle where the opposite side is 3 and the hypotenuse is 5, what is $\\sin(\\theta)$?",
                    "choices": [
                        {"text": "$\\frac{3}{5}$", "correct": True},
                        {"text": "$\\frac{4}{5}$", "correct": False},
                        {"text": "$\\frac{3}{4}$", "correct": False},
                        {"text": "$\\frac{5}{3}$", "correct": False}
                    ],
                    "explanation": "$\\sin(\\theta) = \\frac{\\text{opposite}}{\\text{hypotenuse}} = \\frac{3}{5}$."
                },
            },
        ]
    )

    # ── Lesson 4.4: Complex Numbers ───────────────────────────────
    add_lesson_with_exercises(cid, mid, 3,
        "Complex Numbers",
        """<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.8;color:#1e293b;max-width:680px;margin:0 auto">

<div style="background:linear-gradient(135deg,#43e97b 0%,#38f9d7 100%);border-radius:16px;padding:32px;margin-bottom:24px;color:white">
<h1 style="margin:0;font-size:1.8rem">Complex Numbers</h1>
<p style="margin:8px 0 0;opacity:0.95;font-size:1.05rem">The imaginary unit i and operations on complex numbers</p>
</div>

<p>A <strong>complex number</strong> has the form <code>a + bi</code>, where <code>a</code> is the real part and <code>b</code> is the imaginary part. The imaginary unit <code>i</code> is defined as the square root of &minus;1.</p>

<div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<h3 style="color:#1d4ed8;margin:0 0 8px;font-size:1rem">&#x1F511; Key Concept</h3>
<p style="margin:0"><strong>Powers of i cycle every 4:</strong></p>
</div>

<table style="width:100%;border-collapse:collapse;margin:16px 0;border-radius:12px;overflow:hidden;max-width:400px">
<thead>
<tr style="background:#059669;color:white">
<th style="padding:10px 16px;text-align:center">Power</th>
<th style="padding:10px 16px;text-align:center">Value</th>
</tr>
</thead>
<tbody>
<tr style="background:#f0fdf4">
<td style="padding:8px 16px;text-align:center;border-bottom:1px solid #e2e8f0"><code>i&sup1;</code></td>
<td style="padding:8px 16px;text-align:center;border-bottom:1px solid #e2e8f0"><strong>i</strong></td>
</tr>
<tr>
<td style="padding:8px 16px;text-align:center;border-bottom:1px solid #e2e8f0"><code>i&sup2;</code></td>
<td style="padding:8px 16px;text-align:center;border-bottom:1px solid #e2e8f0"><strong>&minus;1</strong></td>
</tr>
<tr style="background:#f0fdf4">
<td style="padding:8px 16px;text-align:center;border-bottom:1px solid #e2e8f0"><code>i&sup3;</code></td>
<td style="padding:8px 16px;text-align:center;border-bottom:1px solid #e2e8f0"><strong>&minus;i</strong></td>
</tr>
<tr>
<td style="padding:8px 16px;text-align:center"><code>i&#x2074;</code></td>
<td style="padding:8px 16px;text-align:center"><strong>1</strong></td>
</tr>
</tbody>
</table>

<p>The cycle repeats: i&#x2075; = i, i&#x2076; = &minus;1, i&#x2077; = &minus;i, i&#x2078; = 1, and so on.</p>

<h3 style="color:#1e293b;margin-top:24px">Operations with Complex Numbers</h3>
<ul>
<li><strong>Add/Subtract:</strong> Combine real parts and imaginary parts separately</li>
<li><strong>Multiply:</strong> Use FOIL, then replace i&sup2; with &minus;1</li>
<li><strong>Conjugate:</strong> The conjugate of <code>a + bi</code> is <code>a &minus; bi</code></li>
</ul>

<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;margin:16px 0">
<h3 style="color:#92400e;margin:0 0 8px;font-size:1rem">&#x1F4DD; Example</h3>
<p><strong>Addition:</strong> (3 + 2i) + (1 &minus; 5i) = (3 + 1) + (2 &minus; 5)i = <strong>4 &minus; 3i</strong></p>
<p style="margin:8px 0 0"><strong>Multiplication:</strong> (2 + i)(2 &minus; i) = 4 &minus; i&sup2; = 4 &minus; (&minus;1) = <strong>5</strong></p>
</div>

<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-left:4px solid #10b981;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">
<strong style="color:#065f46">&#x1F4A1; Pro Tip:</strong> To find i<sup>n</sup>, divide n by 4 and use the remainder: remainder 0 &rarr; 1, remainder 1 &rarr; i, remainder 2 &rarr; &minus;1, remainder 3 &rarr; &minus;i.
</div>

</div>""",
        [
            {
                "title": "Place Real Parts on Number Line",
                "type": "number_line",
                "config": {
                    "range_min": -5,
                    "range_max": 6,
                    "targets": [4, -3],
                    "tick_interval": 1,
                    "tolerance": 0.5,
                    "labels": ["Real part of 4 + 2i", "Real part of -3 + i"]
                },
                "instructions": "Place the real parts of (4 + 2i) and (-3 + i) on the number line."
            },
            {
                "title": "Balance Complex Equation",
                "type": "equation_balance",
                "config": {
                    "left_fixed": [3, 2],
                    "right_fixed": [1],
                    "available_terms": [
                        {"value": 4, "label": "4"},
                        {"value": 2, "label": "2"},
                        {"value": 3, "label": "3"}
                    ],
                    "target_sum": 5,
                    "explanation": "Left side: 3 + 2 = 5. Right side: 1 + 4 = 5. Adding 4 to the right side balances the equation."
                },
                "instructions": "The left side sums to 5. Add a term to the right side so it also equals 5."
            },
            {
                "title": "Powers of i",
                "type": "multiple_choice_math",
                "config": {
                    "question": "What is $i^{10}$?",
                    "choices": [
                        {"text": "$-1$", "correct": True},
                        {"text": "$1$", "correct": False},
                        {"text": "$i$", "correct": False},
                        {"text": "$-i$", "correct": False}
                    ],
                    "explanation": "$i^{10}$: divide 10 by 4, remainder is 2. $i^2 = -1$."
                },
            },
            {
                "title": "Imaginary Part of Sum",
                "type": "numeric_input",
                "config": {
                    "question": "If $z = (3 + 2i) + (1 - 5i)$, what is the imaginary part of $z$? (Enter just the number, without $i$.)",
                    "correct_answers": [-3],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "$(3 + 2i) + (1 - 5i) = 4 - 3i$. The imaginary part is $-3$."
                },
            },
        ]
    )
