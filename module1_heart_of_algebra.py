"""
Module 1: Heart of Algebra (6 lessons)
SAT Math Course - seed_sat_math_v3.py

Usage:
    from module1_heart_of_algebra import create_module_1
    create_module_1(cid)

Requires: create_module, add_lesson_with_exercises from the main seed script.
"""


def create_module_1(cid):
    """Create Module 1: Heart of Algebra with 6 lessons and all exercises."""

    mid = create_module(cid, "Heart of Algebra", 0)
    if not mid:
        print("  ERROR: Could not create Module 1")
        return
    print("  Module 1: Heart of Algebra")

    # ─── Lesson 1.1: Solving Linear Equations ─────────────────────────
    add_lesson_with_exercises(cid, mid, 0,
        "Solving Linear Equations",
        '<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.8;color:#1e293b;max-width:680px;margin:0 auto">'

            '<div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:16px;padding:32px;margin-bottom:24px;color:white">'
                '<h2 style="margin:0;font-size:1.5rem">Solving Linear Equations</h2>'
                '<p style="margin:8px 0 0;opacity:0.9">Master the fundamental skill of isolating variables</p>'
            '</div>'

            '<div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">'
                '<h3 style="color:#1d4ed8;margin:0 0 8px;font-size:1rem">&#x1F511; Key Concept</h3>'
                '<p style="margin:0">A <strong>linear equation</strong> has a variable with exponent 1. '
                'To solve, <strong>isolate the variable</strong> using inverse operations: '
                'undo addition with subtraction, undo multiplication with division.</p>'
            '</div>'

            '<p><strong>Steps to solve any linear equation:</strong></p>'
            '<ol>'
                '<li>Simplify each side (distribute, combine like terms)</li>'
                '<li>Move all variable terms to one side using addition/subtraction</li>'
                '<li>Move all constants to the other side</li>'
                '<li>Divide both sides by the coefficient of the variable</li>'
            '</ol>'

            '<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;margin:16px 0">'
                '<h3 style="color:#92400e;margin:0 0 8px;font-size:1rem">&#x1F4DD; Example</h3>'
                '<p style="margin:0 0 4px"><strong>Solve: 3x + 7 = 22</strong></p>'
                '<p style="margin:0 0 2px">Step 1: Subtract 7 from both sides: <code>3x = 15</code></p>'
                '<p style="margin:0 0 2px">Step 2: Divide both sides by 3: <code>x = 5</code></p>'
                '<p style="margin:4px 0 0">&#x2705; Check: 3(5) + 7 = 15 + 7 = 22 &#x2714;</p>'
            '</div>'

            '<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-left:4px solid #10b981;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">'
                '<strong style="color:#065f46">&#x1F4A1; Pro Tip:</strong> '
                'Always check your answer by substituting it back into the original equation. '
                'If both sides are equal, your answer is correct!'
            '</div>'

        '</div>',
        [
            {
                "title": "Solve 3x + 7 = 22 Step by Step",
                "type": "equation_solver",
                "config": {
                    "initial_left": "3x + 7",
                    "initial_right": "22",
                    "steps": [
                        {
                            "id": "s1",
                            "action": "sub7",
                            "actionLabel": "Subtract 7 from both sides",
                            "resultLeft": "3x",
                            "resultRight": "15"
                        },
                        {
                            "id": "s2",
                            "action": "div3",
                            "actionLabel": "Divide both sides by 3",
                            "resultLeft": "x",
                            "resultRight": "5"
                        }
                    ],
                    "final_answer": "x = 5"
                },
                "instructions": "Solve the equation 3x + 7 = 22 by applying inverse operations step by step."
            },
            {
                "title": "Two-Step Equation with Distribution",
                "type": "multiple_choice_math",
                "config": {
                    "question": "What is the value of x in $2(x - 3) + 4 = 16$?",
                    "choices": [
                        {"text": "$x = 9$", "correct": True},
                        {"text": "$x = 7$", "correct": False},
                        {"text": "$x = 11$", "correct": False},
                        {"text": "$x = 5$", "correct": False}
                    ],
                    "explanation": "Distribute: $2x - 6 + 4 = 16$. Combine: $2x - 2 = 16$. Add 2: $2x = 18$. Divide by 2: $x = 9$."
                },
            },
            {
                "title": "Variables on Both Sides",
                "type": "numeric_input",
                "config": {
                    "question": "Solve: $5x + 3 = 2x + 18$. Enter the value of $x$.",
                    "correct_answers": [5],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "Subtract $2x$ from both sides: $3x + 3 = 18$. Subtract 3: $3x = 15$. Divide by 3: $x = 5$."
                },
            },
            {
                "title": "Solve (x + 4) / 2 = 7 Step by Step",
                "type": "equation_solver",
                "config": {
                    "initial_left": "(x + 4) / 2",
                    "initial_right": "7",
                    "steps": [
                        {
                            "id": "s1",
                            "action": "mul2",
                            "actionLabel": "Multiply both sides by 2",
                            "resultLeft": "x + 4",
                            "resultRight": "14"
                        },
                        {
                            "id": "s2",
                            "action": "sub4",
                            "actionLabel": "Subtract 4 from both sides",
                            "resultLeft": "x",
                            "resultRight": "10"
                        }
                    ],
                    "final_answer": "x = 10"
                },
                "instructions": "Solve the equation (x + 4) / 2 = 7 by applying inverse operations step by step."
            },
        ]
    )

    # ─── Lesson 1.2: Linear Inequalities ──────────────────────────────
    add_lesson_with_exercises(cid, mid, 1,
        "Linear Inequalities",
        '<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.8;color:#1e293b;max-width:680px;margin:0 auto">'

            '<div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:16px;padding:32px;margin-bottom:24px;color:white">'
                '<h2 style="margin:0;font-size:1.5rem">Linear Inequalities</h2>'
                '<p style="margin:8px 0 0;opacity:0.9">Solve and graph inequalities on the number line</p>'
            '</div>'

            '<div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">'
                '<h3 style="color:#1d4ed8;margin:0 0 8px;font-size:1rem">&#x1F511; Key Concept</h3>'
                '<p style="margin:0">Inequalities are solved just like equations with <strong>one critical rule</strong>: '
                'when you <strong>multiply or divide both sides by a negative number</strong>, '
                'you must <strong>FLIP the inequality sign</strong>!</p>'
            '</div>'

            '<table style="width:100%;border-collapse:separate;border-spacing:0;border-radius:12px;overflow:hidden;margin:16px 0">'
                '<thead><tr style="background:linear-gradient(135deg,#667eea,#764ba2);color:white">'
                    '<th style="padding:12px 16px;text-align:left">Symbol</th>'
                    '<th style="padding:12px 16px;text-align:left">Meaning</th>'
                    '<th style="padding:12px 16px;text-align:left">Graph</th>'
                '</tr></thead>'
                '<tbody>'
                    '<tr style="background:#f8fafc"><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">&lt;</td>'
                        '<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Less than</td>'
                        '<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Open circle, arrow left</td></tr>'
                    '<tr style="background:#ffffff"><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">&gt;</td>'
                        '<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Greater than</td>'
                        '<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Open circle, arrow right</td></tr>'
                    '<tr style="background:#f8fafc"><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">&#x2264;</td>'
                        '<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Less than or equal</td>'
                        '<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Closed circle, arrow left</td></tr>'
                    '<tr style="background:#ffffff"><td style="padding:10px 16px">&#x2265;</td>'
                        '<td style="padding:10px 16px">Greater than or equal</td>'
                        '<td style="padding:10px 16px">Closed circle, arrow right</td></tr>'
                '</tbody>'
            '</table>'

            '<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;margin:16px 0">'
                '<h3 style="color:#92400e;margin:0 0 8px;font-size:1rem">&#x1F4DD; Example</h3>'
                '<p style="margin:0 0 4px"><strong>Solve: -2x + 6 &gt; 10</strong></p>'
                '<p style="margin:0 0 2px">Step 1: Subtract 6 from both sides: <code>-2x &gt; 4</code></p>'
                '<p style="margin:0 0 2px">Step 2: Divide by -2 and <strong>FLIP</strong> the sign: <code>x &lt; -2</code></p>'
                '<p style="margin:4px 0 0">The solution is all values less than -2.</p>'
            '</div>'

            '<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-left:4px solid #10b981;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">'
                '<strong style="color:#065f46">&#x1F4A1; Pro Tip:</strong> '
                'After solving, test a point in your solution region. If x &lt; -2, plug in x = -3: '
                '-2(-3) + 6 = 12 &gt; 10 &#x2714; It works!'
            '</div>'

        '</div>',
        [
            {
                "title": "Graph y >= 2x - 3",
                "type": "inequality_graph",
                "config": {
                    "slope": 2,
                    "intercept": -3,
                    "operator": ">=",
                    "grid_range": 6,
                    "tolerance": 0.4
                },
                "instructions": "Graph the inequality y >= 2x - 3 on the coordinate plane. Shade the correct region."
            },
            {
                "title": "Inequality Notation",
                "type": "multiple_choice_math",
                "config": {
                    "question": "Which inequality represents \"x is at most 5\"?",
                    "choices": [
                        {"text": "$x \\leq 5$", "correct": True},
                        {"text": "$x < 5$", "correct": False},
                        {"text": "$x \\geq 5$", "correct": False},
                        {"text": "$x > 5$", "correct": False}
                    ],
                    "explanation": "\"At most\" means the value can be equal to or less than 5. This is written as $x \\leq 5$."
                },
            },
            {
                "title": "Boundary on Number Line",
                "type": "number_line",
                "config": {
                    "range_min": -2,
                    "range_max": 8,
                    "targets": [3],
                    "tick_interval": 1,
                    "tolerance": 0.3
                },
                "instructions": "Solve -3x + 9 > 0 and place the boundary value on the number line."
            },
            {
                "title": "Solve Inequality for x",
                "type": "numeric_input",
                "config": {
                    "question": "Solve $-4x + 8 \\leq 0$. What is the minimum value of $x$?",
                    "correct_answers": [2],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "Subtract 8: $-4x \\leq -8$. Divide by $-4$ and flip: $x \\geq 2$. The minimum value is 2."
                },
            },
        ]
    )

    # ─── Lesson 1.3: Systems of Linear Equations ──────────────────────
    add_lesson_with_exercises(cid, mid, 2,
        "Systems of Linear Equations",
        '<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.8;color:#1e293b;max-width:680px;margin:0 auto">'

            '<div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:16px;padding:32px;margin-bottom:24px;color:white">'
                '<h2 style="margin:0;font-size:1.5rem">Systems of Linear Equations</h2>'
                '<p style="margin:8px 0 0;opacity:0.9">Two equations, two unknowns - find where the lines meet</p>'
            '</div>'

            '<div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">'
                '<h3 style="color:#1d4ed8;margin:0 0 8px;font-size:1rem">&#x1F511; Key Concept</h3>'
                '<p style="margin:0">A <strong>system of equations</strong> is two or more equations with the same variables. '
                'The solution is the point where the lines <strong>intersect</strong>.</p>'
            '</div>'

            '<table style="width:100%;border-collapse:separate;border-spacing:0;border-radius:12px;overflow:hidden;margin:16px 0">'
                '<thead><tr style="background:linear-gradient(135deg,#667eea,#764ba2);color:white">'
                    '<th style="padding:12px 16px;text-align:left">Method</th>'
                    '<th style="padding:12px 16px;text-align:left">When to Use</th>'
                    '<th style="padding:12px 16px;text-align:left">Steps</th>'
                '</tr></thead>'
                '<tbody>'
                    '<tr style="background:#f8fafc">'
                        '<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><strong>Substitution</strong></td>'
                        '<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">One variable is already isolated</td>'
                        '<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Solve for one var, plug into other equation</td></tr>'
                    '<tr style="background:#ffffff">'
                        '<td style="padding:10px 16px"><strong>Elimination</strong></td>'
                        '<td style="padding:10px 16px">Coefficients are easy to match</td>'
                        '<td style="padding:10px 16px">Add or subtract equations to cancel a variable</td></tr>'
                '</tbody>'
            '</table>'

            '<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;margin:16px 0">'
                '<h3 style="color:#92400e;margin:0 0 8px;font-size:1rem">&#x1F4DD; Example (Elimination)</h3>'
                '<p style="margin:0 0 4px"><strong>Solve: 2x + y = 7 and x - y = 2</strong></p>'
                '<p style="margin:0 0 2px">Add both equations: <code>(2x + y) + (x - y) = 7 + 2</code></p>'
                '<p style="margin:0 0 2px">Simplify: <code>3x = 9</code> &#x2192; <code>x = 3</code></p>'
                '<p style="margin:0 0 2px">Substitute x = 3 into x - y = 2: <code>3 - y = 2</code> &#x2192; <code>y = 1</code></p>'
                '<p style="margin:4px 0 0">&#x2705; Solution: (3, 1)</p>'
            '</div>'

            '<div style="margin:20px 0;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">'
                '<iframe src="https://www.desmos.com/calculator" width="100%" height="300" style="border:none" title="Desmos Calculator"></iframe>'
            '</div>'

        '</div>',
        [
            {
                "title": "Plot the Intersection Point",
                "type": "coordinate_plane",
                "config": {
                    "target_points": [{"x": 3, "y": 2}],
                    "grid_range": 6,
                    "tolerance": 0.5
                },
                "instructions": "The system x + y = 5 and x - y = 1 has one solution. Plot the intersection point on the coordinate plane."
            },
            {
                "title": "Find x in a System",
                "type": "numeric_input",
                "config": {
                    "question": "Solve the system: $3x + 2y = 16$ and $x + 2y = 8$. What is the value of $x$?",
                    "correct_answers": [4],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "Subtract the second from the first: $(3x + 2y) - (x + 2y) = 16 - 8$. This gives $2x = 8$, so $x = 4$."
                },
            },
            {
                "title": "Identifying No-Solution Systems",
                "type": "multiple_choice_math",
                "config": {
                    "question": "How many solutions does this system have? $2x + 4y = 10$ and $x + 2y = 3$",
                    "choices": [
                        {"text": "No solution", "correct": True},
                        {"text": "Exactly one solution", "correct": False},
                        {"text": "Infinitely many solutions", "correct": False},
                        {"text": "Two solutions", "correct": False}
                    ],
                    "explanation": "Multiply the second equation by 2: $2x + 4y = 6$. But the first says $2x + 4y = 10$. Since $6 \\neq 10$, there is no solution (parallel lines)."
                },
            },
            {
                "title": "Elimination Method Step by Step",
                "type": "equation_solver",
                "config": {
                    "initial_left": "2x + y = 7,  x - y = 2",
                    "initial_right": "Add equations",
                    "steps": [
                        {
                            "id": "s1",
                            "action": "add_equations",
                            "actionLabel": "Add both equations (y cancels)",
                            "resultLeft": "3x",
                            "resultRight": "9"
                        },
                        {
                            "id": "s2",
                            "action": "div3",
                            "actionLabel": "Divide both sides by 3",
                            "resultLeft": "x",
                            "resultRight": "3"
                        }
                    ],
                    "final_answer": "x = 3"
                },
                "instructions": "Use the elimination method to solve: 2x + y = 7 and x - y = 2. Find x by adding the equations."
            },
        ]
    )

    # ─── Lesson 1.4: Linear Functions & Slope ─────────────────────────
    add_lesson_with_exercises(cid, mid, 3,
        "Linear Functions & Slope",
        '<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.8;color:#1e293b;max-width:680px;margin:0 auto">'

            '<div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:16px;padding:32px;margin-bottom:24px;color:white">'
                '<h2 style="margin:0;font-size:1.5rem">Linear Functions &amp; Slope</h2>'
                '<p style="margin:8px 0 0;opacity:0.9">Understand the rate of change and slope-intercept form</p>'
            '</div>'

            '<div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">'
                '<h3 style="color:#1d4ed8;margin:0 0 8px;font-size:1rem">&#x1F511; Key Concept</h3>'
                '<p style="margin:0"><strong>Slope-intercept form:</strong> <code>y = mx + b</code><br>'
                '<strong>m</strong> = slope (rate of change) = rise / run<br>'
                '<strong>b</strong> = y-intercept (where the line crosses the y-axis)</p>'
            '</div>'

            '<table style="width:100%;border-collapse:separate;border-spacing:0;border-radius:12px;overflow:hidden;margin:16px 0">'
                '<thead><tr style="background:linear-gradient(135deg,#667eea,#764ba2);color:white">'
                    '<th style="padding:12px 16px;text-align:left">Formula</th>'
                    '<th style="padding:12px 16px;text-align:left">Use Case</th>'
                '</tr></thead>'
                '<tbody>'
                    '<tr style="background:#f8fafc">'
                        '<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><code>m = (y&#x2082; - y&#x2081;) / (x&#x2082; - x&#x2081;)</code></td>'
                        '<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Slope from two points</td></tr>'
                    '<tr style="background:#ffffff">'
                        '<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><code>y = mx + b</code></td>'
                        '<td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">Slope-intercept form</td></tr>'
                    '<tr style="background:#f8fafc">'
                        '<td style="padding:10px 16px"><code>y - y&#x2081; = m(x - x&#x2081;)</code></td>'
                        '<td style="padding:10px 16px">Point-slope form</td></tr>'
                '</tbody>'
            '</table>'

            '<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;margin:16px 0">'
                '<h3 style="color:#92400e;margin:0 0 8px;font-size:1rem">&#x1F4DD; Example</h3>'
                '<p style="margin:0 0 4px"><strong>Find the slope through (1, 3) and (4, 9):</strong></p>'
                '<p style="margin:0">m = (9 - 3) / (4 - 1) = 6 / 3 = <strong>2</strong></p>'
            '</div>'

            '<div style="margin:20px 0;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">'
                '<iframe src="https://www.desmos.com/calculator" width="100%" height="300" style="border:none" title="Desmos Calculator"></iframe>'
            '</div>'

            '<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-left:4px solid #10b981;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">'
                '<strong style="color:#065f46">&#x1F4A1; Pro Tip:</strong> '
                'Think of slope as "rise over run." From any point on the line, go up (rise) and right (run) '
                'by the slope ratio to find the next point. A slope of 2 means go up 2, right 1.'
            '</div>'

        '</div>',
        [
            {
                "title": "Match the Graph of y = 2x - 1",
                "type": "function_graph",
                "config": {
                    "function_type": "linear",
                    "target_params": {"m": 2, "b": -1},
                    "grid_range": 6,
                    "mode": "match_graph",
                    "show_target": True,
                    "tolerance": 0.3
                },
                "instructions": "Adjust the line to match y = 2x - 1. Set the slope to 2 and the y-intercept to -1."
            },
            {
                "title": "Function Table: f(x) = 2x + 3",
                "type": "table_pattern",
                "config": {
                    "x_values": [0, 1, 2, 3, 4],
                    "y_values": [3, None, 7, None, 11],
                    "answers": {"1": 5, "3": 9},
                    "rule_label": "Rule",
                    "rule_answer": "2x+3",
                    "tolerance": 0.1,
                    "x_header": "x",
                    "y_header": "f(x)"
                },
                "instructions": "Fill in the missing values in the table and determine the rule f(x)."
            },
            {
                "title": "Calculate Slope from Two Points",
                "type": "numeric_input",
                "config": {
                    "question": "What is the slope of the line passing through $(2, 1)$ and $(6, 9)$?",
                    "correct_answers": [2],
                    "tolerance": 0.01,
                    "allow_fraction": True,
                    "allow_decimal": True,
                    "explanation": "Slope $= \\frac{9 - 1}{6 - 2} = \\frac{8}{4} = 2$."
                },
            },
            {
                "title": "Identify Slope and Y-Intercept",
                "type": "multiple_choice_math",
                "config": {
                    "question": "What are the slope and y-intercept of $y = -3x + 7$?",
                    "choices": [
                        {"text": "slope $= -3$, y-intercept $= 7$", "correct": True},
                        {"text": "slope $= 3$, y-intercept $= 7$", "correct": False},
                        {"text": "slope $= 7$, y-intercept $= -3$", "correct": False},
                        {"text": "slope $= -3$, y-intercept $= -7$", "correct": False}
                    ],
                    "explanation": "In $y = mx + b$, the coefficient of $x$ is the slope ($m = -3$) and the constant is the y-intercept ($b = 7$)."
                },
            },
        ]
    )

    # ─── Lesson 1.5: Graphing Linear Equations ────────────────────────
    add_lesson_with_exercises(cid, mid, 4,
        "Graphing Linear Equations",
        '<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.8;color:#1e293b;max-width:680px;margin:0 auto">'

            '<div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:16px;padding:32px;margin-bottom:24px;color:white">'
                '<h2 style="margin:0;font-size:1.5rem">Graphing Linear Equations</h2>'
                '<p style="margin:8px 0 0;opacity:0.9">Plot lines using intercepts, slope, and tables of values</p>'
            '</div>'

            '<div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">'
                '<h3 style="color:#1d4ed8;margin:0 0 8px;font-size:1rem">&#x1F511; Key Concept</h3>'
                '<p style="margin:0">To graph a linear equation, you only need <strong>two points</strong>. '
                'Two reliable methods:</p>'
                '<ul style="margin:8px 0 0">'
                    '<li><strong>Intercept Method:</strong> Find where the line crosses the x-axis (set y = 0) and y-axis (set x = 0)</li>'
                    '<li><strong>Slope-Intercept Method:</strong> Plot the y-intercept, then use the slope to find the next point</li>'
                '</ul>'
            '</div>'

            '<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;margin:16px 0">'
                '<h3 style="color:#92400e;margin:0 0 8px;font-size:1rem">&#x1F4DD; Example: Graph y = x + 2</h3>'
                '<p style="margin:0 0 4px"><strong>Step 1:</strong> Find the y-intercept: when x = 0, y = 2 &#x2192; point (0, 2)</p>'
                '<p style="margin:0 0 4px"><strong>Step 2:</strong> Use slope (m = 1) to find more points:</p>'
                '<ul style="margin:0">'
                    '<li>From (0, 2), go right 1 and up 1 &#x2192; (1, 3)</li>'
                    '<li>From (1, 3), go right 1 and up 1 &#x2192; (2, 4)</li>'
                '</ul>'
                '<p style="margin:4px 0 0"><strong>Step 3:</strong> Connect the points with a straight line.</p>'
            '</div>'

            '<div style="margin:20px 0;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">'
                '<iframe src="https://www.desmos.com/calculator" width="100%" height="300" style="border:none" title="Desmos Calculator"></iframe>'
            '</div>'

            '<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-left:4px solid #10b981;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">'
                '<strong style="color:#065f46">&#x1F4A1; Pro Tip:</strong> '
                'Always plot at least 3 points to check your work. If all three are on the same line, '
                'you know you have graphed it correctly!'
            '</div>'

        '</div>',
        [
            {
                "title": "Plot Points on y = x + 2",
                "type": "coordinate_plane",
                "config": {
                    "target_points": [
                        {"x": 0, "y": 2},
                        {"x": 2, "y": 4},
                        {"x": -1, "y": 1}
                    ],
                    "grid_range": 6,
                    "tolerance": 0.5
                },
                "instructions": "Plot three points that lie on the line y = x + 2: (0, 2), (2, 4), and (-1, 1)."
            },
            {
                "title": "Match the Graph of y = -x + 4",
                "type": "function_graph",
                "config": {
                    "function_type": "linear",
                    "target_params": {"m": -1, "b": 4},
                    "grid_range": 6,
                    "mode": "match_graph",
                    "show_target": True,
                    "tolerance": 0.3
                },
                "instructions": "Adjust the line to match y = -x + 4. The slope is -1 and the y-intercept is 4."
            },
            {
                "title": "Best-Fit Line Through Data",
                "type": "scatter_plot",
                "config": {
                    "points": [
                        {"x": 1, "y": 2.5},
                        {"x": 2, "y": 4},
                        {"x": 3, "y": 5.5},
                        {"x": 4, "y": 7},
                        {"x": 5, "y": 9}
                    ],
                    "x_label": "x",
                    "y_label": "y",
                    "x_range": [0, 6],
                    "y_range": [0, 12],
                    "mode": "best_fit",
                    "target_slope": 1.6,
                    "target_intercept": 0.9,
                    "tolerance": 0.4
                },
                "instructions": "Draw the line of best fit through the data points. Estimate the slope and y-intercept."
            },
        ]
    )

    # ─── Lesson 1.6: Interpreting Linear Models ───────────────────────
    add_lesson_with_exercises(cid, mid, 5,
        "Interpreting Linear Models",
        '<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.8;color:#1e293b;max-width:680px;margin:0 auto">'

            '<div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:16px;padding:32px;margin-bottom:24px;color:white">'
                '<h2 style="margin:0;font-size:1.5rem">Interpreting Linear Models</h2>'
                '<p style="margin:8px 0 0;opacity:0.9">Connect algebra to real-world scenarios</p>'
            '</div>'

            '<div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">'
                '<h3 style="color:#1d4ed8;margin:0 0 8px;font-size:1rem">&#x1F511; Key Concept</h3>'
                '<p style="margin:0">In a real-world linear model <code>y = mx + b</code>:</p>'
                '<ul style="margin:8px 0 0">'
                    '<li><strong>Slope (m)</strong> = the rate of change (how fast y changes per unit of x)</li>'
                    '<li><strong>Y-intercept (b)</strong> = the initial or starting value (value of y when x = 0)</li>'
                '</ul>'
            '</div>'

            '<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;margin:16px 0">'
                '<h3 style="color:#92400e;margin:0 0 8px;font-size:1rem">&#x1F4DD; Example</h3>'
                '<p style="margin:0 0 4px"><strong>A plumber charges a 50-dollar house call fee plus 30 dollars per hour.</strong></p>'
                '<p style="margin:0 0 4px">Model: <code>C(h) = 30h + 50</code></p>'
                '<ul style="margin:0">'
                    '<li><strong>Slope = 30:</strong> The cost increases by 30 dollars for each additional hour of work</li>'
                    '<li><strong>Y-intercept = 50:</strong> The initial fee before any work begins (the house call charge)</li>'
                '</ul>'
                '<p style="margin:8px 0 0">For 3 hours: C(3) = 30(3) + 50 = 90 + 50 = <strong>140 dollars</strong></p>'
            '</div>'

            '<div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-left:4px solid #10b981;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0">'
                '<strong style="color:#065f46">&#x1F4A1; Pro Tip:</strong> '
                'Always pay attention to <strong>units</strong>! The slope has units like "dollars per hour" or '
                '"miles per gallon." The y-intercept has the same units as y (like "dollars" or "miles").'
            '</div>'

        '</div>',
        [
            {
                "title": "Study Hours vs Test Score",
                "type": "scatter_plot",
                "config": {
                    "points": [
                        {"x": 1, "y": 55},
                        {"x": 2, "y": 62},
                        {"x": 3, "y": 68},
                        {"x": 4, "y": 75},
                        {"x": 5, "y": 80},
                        {"x": 6, "y": 88}
                    ],
                    "x_label": "Hours Studied",
                    "y_label": "Test Score",
                    "x_range": [0, 8],
                    "y_range": [40, 100],
                    "mode": "best_fit",
                    "target_slope": 6.2,
                    "target_intercept": 49,
                    "tolerance": 1.5
                },
                "instructions": "Draw the line of best fit for the study hours vs test scores data. Estimate the slope and y-intercept."
            },
            {
                "title": "Plumber Cost Table",
                "type": "table_pattern",
                "config": {
                    "x_values": [0, 1, 2, 3, 4],
                    "y_values": [50, None, 110, None, 170],
                    "answers": {"1": 80, "3": 140},
                    "rule_label": "Cost formula",
                    "rule_answer": "30x+50",
                    "tolerance": 0.1,
                    "x_header": "Hours",
                    "y_header": "Cost"
                },
                "instructions": "A plumber charges 50 dollars for a house call plus 30 dollars per hour. Fill in the missing costs and find the cost formula."
            },
            {
                "title": "Interpret the Slope",
                "type": "multiple_choice_math",
                "config": {
                    "question": "A taxi ride costs according to the model $C = 2.5m + 3$, where $m$ is miles traveled. What does the 2.5 represent?",
                    "choices": [
                        {"text": "The cost per mile driven", "correct": True},
                        {"text": "The initial fare before driving", "correct": False},
                        {"text": "The total cost of the ride", "correct": False},
                        {"text": "The number of miles driven", "correct": False}
                    ],
                    "explanation": "In $C = 2.5m + 3$, the coefficient of $m$ (which is 2.5) is the slope. It represents the rate of change: 2.50 dollars per mile."
                },
            },
            {
                "title": "Predict the Cost",
                "type": "numeric_input",
                "config": {
                    "question": "A plumber charges 50 dollars for a house call plus 30 dollars per hour. What is the total cost for 6 hours of work?",
                    "correct_answers": [230],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "C(6) = 30(6) + 50 = 180 + 50 = 230 dollars."
                },
            },
        ]
    )

    print(f"  Module 1 complete: 6 lessons created")
