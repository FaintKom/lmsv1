"""Math 7: Algebra Foundations.

Pre-algebra to linear equations for early secondary school. Variables,
expressions, solving for x, slope-intercept lines, simple word problems.
"""

COURSE = {
    "slug": "math-7-algebra",
    "title": "Math 7: Algebra Foundations",
    "description": (
        "From your first variable to confidently solving linear equations "
        "and plotting lines. Step-by-step problem solving, lots of worked "
        "examples, and quick checks after every concept."
    ),
    "category": "Mathematics",
    "modules": [
        {
            "slug": "m1-expressions",
            "title": "Expressions & Equations",
            "lessons": [
                {
                    "slug": "l1-variables",
                    "title": "Variables and expressions",
                    "duration": 12,
                    "text_md": (
                        "## What's a variable?\n\n"
                        "A **variable** is a letter that stands in for a number we don't know yet "
                        "(or that can change). We usually pick $x$, $y$, $a$, $b$ — but any symbol "
                        "works.\n\n"
                        "### Expressions vs. equations\n\n"
                        "| Term | Example | Has `=`? |\n"
                        "|---|---|---|\n"
                        "| Expression | $2x + 3$ | No |\n"
                        "| Equation | $2x + 3 = 11$ | Yes |\n\n"
                        "An expression *describes* a number. An equation *claims* two expressions "
                        "are equal.\n\n"
                        "### Evaluating an expression\n\n"
                        "Substitute the value and compute. If $x = 4$:\n\n"
                        "$$2x + 3 = 2 \\cdot 4 + 3 = 11$$\n\n"
                        "### Useful shorthand\n\n"
                        "- $2x$ means $2 \\times x$ (the multiply sign is dropped)\n"
                        "- $x^2$ means $x \\cdot x$\n"
                        "- $\\frac{x}{3}$ means $x \\div 3$"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-vars-quiz",
                            "type": "quiz",
                            "title": "Evaluate the expression",
                            "config": {"passing_score": 70},
                            "questions": [
                                {
                                    "text": "If $x = 5$, what is $3x + 2$?",
                                    "options": [
                                        {"text": "10", "is_correct": False},
                                        {"text": "17", "is_correct": True},
                                        {"text": "8", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "If $y = 4$, what is $y^2 - 1$?",
                                    "options": [
                                        {"text": "15", "is_correct": True},
                                        {"text": "7", "is_correct": False},
                                        {"text": "9", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "Which one is an **equation**?",
                                    "options": [
                                        {"text": "$3x + 2$", "is_correct": False},
                                        {"text": "$2x + 1 = 7$", "is_correct": True},
                                        {"text": "$x^2$", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                            ],
                        },
                    ],
                },
                {
                    "slug": "l2-solving-linear",
                    "title": "Solving linear equations",
                    "duration": 18,
                    "text_md": (
                        "## Goal: get $x$ alone\n\n"
                        "Whatever you do to one side, do to the other. Equality is preserved.\n\n"
                        "### Example 1 — one step\n\n"
                        "$$x + 3 = 10$$\n\n"
                        "Subtract 3 from both sides:\n\n"
                        "$$x = 7$$\n\n"
                        "### Example 2 — two steps\n\n"
                        "$$2x + 3 = 11$$\n\n"
                        "1. Subtract 3: $\\;2x = 8$\n"
                        "2. Divide by 2: $\\;x = 4$\n\n"
                        "### Checklist\n\n"
                        "- Move constants away from $x$ first.\n"
                        "- Then divide / multiply to get $x$ alone.\n"
                        "- Plug the answer back in to check."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-solve-step",
                            "type": "math_stepwise",
                            "title": "Solve: 2x + 3 = 11",
                            "config": {
                                "problem": "2x + 3 = 11",
                                "variable": "x",
                                "max_steps": 3,
                                "final_answer": "4",
                                "validate_steps": False,
                            },
                        },
                        {
                            "slug": "ex-solve-quiz",
                            "type": "quiz",
                            "title": "Solve for $x$",
                            "config": {"passing_score": 70},
                            "questions": [
                                {
                                    "text": "Solve: $x + 5 = 12$",
                                    "options": [
                                        {"text": "$x = 7$", "is_correct": True},
                                        {"text": "$x = 17$", "is_correct": False},
                                        {"text": "$x = -7$", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "Solve: $3x = 18$",
                                    "options": [
                                        {"text": "$x = 15$", "is_correct": False},
                                        {"text": "$x = 6$", "is_correct": True},
                                        {"text": "$x = 21$", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "Solve: $5x - 4 = 16$",
                                    "options": [
                                        {"text": "$x = 4$", "is_correct": True},
                                        {"text": "$x = 2.4$", "is_correct": False},
                                        {"text": "$x = 12$", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                            ],
                        },
                    ],
                },
                {
                    "slug": "l3-distributive",
                    "title": "The distributive property",
                    "duration": 14,
                    "text_md": (
                        "## Multiply through the parentheses\n\n"
                        "The **distributive property** says:\n\n"
                        "$$a(b + c) = ab + ac$$\n\n"
                        "Whatever sits in front of the parentheses multiplies *each* term inside.\n\n"
                        "### Worked example\n\n"
                        "$$3(x + 4) = 3x + 12$$\n\n"
                        "### Why it matters\n\n"
                        "Distributing lets you collapse messy expressions into a tidy linear form, "
                        "which you can then solve with the steps from the last lesson.\n\n"
                        "$$2(x + 5) = 16 \\;\\Rightarrow\\; 2x + 10 = 16 \\;\\Rightarrow\\; x = 3$$\n\n"
                        "### Watch out for negatives\n\n"
                        "$-2(x - 3) = -2x + 6$ — the minus sign distributes too."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-dist-fill",
                            "type": "fill_blanks",
                            "title": "Fill in the result",
                            "config": {
                                "text": "$3(x + 4) = 3x + {{blank}}$",
                                "blanks": ["12"],
                                "word_bank": ["12", "7", "3", "4"],
                            },
                        },
                        {
                            "slug": "ex-dist-quiz",
                            "type": "quiz",
                            "title": "Distribute and simplify",
                            "config": {"passing_score": 70},
                            "questions": [
                                {
                                    "text": "Expand: $5(x + 2)$",
                                    "options": [
                                        {"text": "$5x + 10$", "is_correct": True},
                                        {"text": "$5x + 2$", "is_correct": False},
                                        {"text": "$x + 10$", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "Expand: $-3(x - 4)$",
                                    "options": [
                                        {"text": "$-3x - 12$", "is_correct": False},
                                        {"text": "$-3x + 12$", "is_correct": True},
                                        {"text": "$3x + 12$", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                            ],
                        },
                    ],
                },
            ],
        },
        {
            "slug": "m2-lines",
            "title": "Lines & Slope",
            "lessons": [
                {
                    "slug": "l4-slope-intercept",
                    "title": "Slope-intercept form",
                    "duration": 14,
                    "text_md": (
                        "## $y = mx + b$\n\n"
                        "Every straight (non-vertical) line in the plane fits this template:\n\n"
                        "$$y = mx + b$$\n\n"
                        "- $m$ — the **slope** (how steep the line is)\n"
                        "- $b$ — the **y-intercept** (where the line crosses the y-axis)\n\n"
                        "### Reading slope\n\n"
                        "Slope = $\\dfrac{\\text{rise}}{\\text{run}}$ — go right one step, how far up do you go?\n\n"
                        "| Slope | Meaning |\n"
                        "|---|---|\n"
                        "| $m > 0$ | line goes **up** as you move right |\n"
                        "| $m < 0$ | line goes **down** as you move right |\n"
                        "| $m = 0$ | horizontal |\n\n"
                        "### Example\n\n"
                        "$y = 2x + 1$: starts at $(0, 1)$, goes up 2 every time you move right 1."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-slope-quiz",
                            "type": "quiz",
                            "title": "Identify slope and intercept",
                            "config": {"passing_score": 70},
                            "questions": [
                                {
                                    "text": "What is the slope of $y = 3x + 5$?",
                                    "options": [
                                        {"text": "3", "is_correct": True},
                                        {"text": "5", "is_correct": False},
                                        {"text": "8", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "What is the y-intercept of $y = -2x + 7$?",
                                    "options": [
                                        {"text": "$-2$", "is_correct": False},
                                        {"text": "7", "is_correct": True},
                                        {"text": "0", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "Which line is **horizontal**?",
                                    "options": [
                                        {"text": "$y = 4$", "is_correct": True},
                                        {"text": "$y = 4x$", "is_correct": False},
                                        {"text": "$y = x + 4$", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                            ],
                        },
                    ],
                },
                {
                    "slug": "l5-plotting",
                    "title": "From equation to points",
                    "duration": 14,
                    "text_md": (
                        "## Plug in $x$, get $y$\n\n"
                        "Given any line $y = mx + b$, you can find points on it by picking values of "
                        "$x$ and computing $y$.\n\n"
                        "### Worked example — $y = 2x + 1$\n\n"
                        "| $x$ | $y = 2x + 1$ | Point |\n"
                        "|---|---|---|\n"
                        "| 0 | 1 | (0, 1) |\n"
                        "| 1 | 3 | (1, 3) |\n"
                        "| 2 | 5 | (2, 5) |\n"
                        "| -1 | -1 | (-1, -1) |\n\n"
                        "Three points are enough to draw the line. (Two are technically enough — the "
                        "third is a sanity check.)\n\n"
                        "### Spotting the slope from two points\n\n"
                        "Given $(x_1, y_1)$ and $(x_2, y_2)$:\n\n"
                        "$$m = \\frac{y_2 - y_1}{x_2 - x_1}$$"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-plot-step",
                            "type": "math_stepwise",
                            "title": "Find y when x = 3 for y = 2x + 1",
                            "config": {
                                "problem": "y = 2(3) + 1",
                                "variable": "y",
                                "max_steps": 2,
                                "final_answer": "7",
                                "validate_steps": False,
                            },
                        },
                        {
                            "slug": "ex-plot-quiz",
                            "type": "quiz",
                            "title": "Points on a line",
                            "config": {"passing_score": 70},
                            "questions": [
                                {
                                    "text": "Which point lies on $y = 2x + 1$?",
                                    "options": [
                                        {"text": "(1, 3)", "is_correct": True},
                                        {"text": "(1, 2)", "is_correct": False},
                                        {"text": "(2, 3)", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "Slope of line through (0, 1) and (2, 5)?",
                                    "options": [
                                        {"text": "2", "is_correct": True},
                                        {"text": "1", "is_correct": False},
                                        {"text": "4", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                            ],
                        },
                    ],
                },
                {
                    "slug": "l6-word-linear",
                    "title": "Word problems with linear equations",
                    "duration": 18,
                    "text_md": (
                        "## Turn words into algebra\n\n"
                        "Most linear word problems follow a recipe:\n\n"
                        "1. **Read** the problem twice.\n"
                        "2. **Name the unknown** with a letter (e.g. $x$ = number of tickets).\n"
                        "3. **Translate** sentences into an equation.\n"
                        "4. **Solve** for the unknown.\n"
                        "5. **Sanity-check** in the original wording.\n\n"
                        "### Worked example\n\n"
                        "> *A movie ticket costs \\$8. Popcorn is \\$5. You paid \\$29 total. "
                        "> How many tickets did you buy?*\n\n"
                        "Let $x$ = number of tickets. Then $8x + 5 = 29$. Solving: $x = 3$. "
                        "Three tickets.\n\n"
                        "### Common phrases\n\n"
                        "| Words | Algebra |\n"
                        "|---|---|\n"
                        "| \"sum of\" | $+$ |\n"
                        "| \"difference\" | $-$ |\n"
                        "| \"times\" / \"of\" | $\\times$ |\n"
                        "| \"per\" / \"each\" | rate × quantity |\n"
                        "| \"in total\" | $=$ total |"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-word-linear-quiz",
                            "type": "quiz",
                            "title": "Word problems",
                            "config": {"passing_score": 60},
                            "questions": [
                                {
                                    "text": "Pens cost \\$2 each and a notebook costs \\$5. You spent \\$13. How many pens did you buy?",
                                    "options": [
                                        {"text": "3", "is_correct": False},
                                        {"text": "4", "is_correct": True},
                                        {"text": "5", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "Anna is 3 years older than Ben. Together they are 27. How old is Ben?",
                                    "options": [
                                        {"text": "12", "is_correct": True},
                                        {"text": "15", "is_correct": False},
                                        {"text": "9", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "A taxi charges \\$3 flat plus \\$2 per km. A ride costs \\$19. How long was it?",
                                    "options": [
                                        {"text": "6 km", "is_correct": False},
                                        {"text": "8 km", "is_correct": True},
                                        {"text": "10 km", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    ],
}
