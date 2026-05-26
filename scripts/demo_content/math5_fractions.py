"""Math 5: Fractions & Decimals.

Grade-5 unit on fractions and decimals. Explainer text + visual examples
+ stepwise problems + quizzes. KaTeX math via $...$ and $$...$$.
"""

COURSE = {
    "slug": "math-5-fractions",
    "title": "Math 5: Fractions & Decimals",
    "description": (
        "A hands-on grade-5 unit on fractions and decimals. Short "
        "explainer videos, step-by-step problems, and quick quizzes — "
        "no calculator required."
    ),
    "category": "Mathematics",
    "modules": [
        {
            "slug": "m1-fractions",
            "title": "Fractions Basics",
            "lessons": [
                {
                    "slug": "l1-what-is-a-fraction",
                    "title": "What is a fraction?",
                    "duration": 12,
                    "text_md": (
                        "## What is a fraction?\n\n"
                        "A **fraction** is a way of writing *part of a whole*. The whole could be a "
                        "pizza, a chocolate bar, or even a length of time.\n\n"
                        "We write a fraction as $\\frac{a}{b}$ where:\n\n"
                        "- $a$ is the **numerator** — how many parts you have\n"
                        "- $b$ is the **denominator** — how many equal parts the whole is split into\n\n"
                        ":::example Pizza slices\n"
                        "A pizza is cut into 8 equal slices. You eat 3. You've eaten "
                        "$\\frac{3}{8}$ of the pizza — 3 slices out of 8.\n"
                        ":::\n\n"
                        "### Names you should know\n\n"
                        "| Type | Example | Meaning |\n"
                        "|---|---|---|\n"
                        "| Proper | $\\frac{2}{3}$ | numerator < denominator |\n"
                        "| Improper | $\\frac{7}{4}$ | numerator ≥ denominator |\n"
                        "| Mixed | $1\\frac{3}{4}$ | a whole number + a proper fraction |\n\n"
                        ":::note Two names, same amount\n"
                        "Improper fractions and mixed numbers describe the **same amount**. "
                        "$\\frac{7}{4}$ and $1\\frac{3}{4}$ are different ways of saying the same thing.\n"
                        ":::"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-fraction-quiz",
                            "type": "quiz",
                            "title": "Quick fraction check",
                            "config": {"passing_score": 70},
                            "questions": [
                                {
                                    "text": "What is the numerator of $\\frac{3}{8}$?",
                                    "options": [
                                        {"text": "3", "is_correct": True},
                                        {"text": "8", "is_correct": False},
                                        {"text": "11", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "Which fraction is a **proper** fraction?",
                                    "options": [
                                        {"text": "$\\frac{7}{4}$", "is_correct": False},
                                        {"text": "$\\frac{2}{5}$", "is_correct": True},
                                        {"text": "$\\frac{9}{9}$", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "A cake is cut into 6 equal slices. You eat 2. What fraction did you eat?",
                                    "options": [
                                        {"text": "$\\frac{2}{6}$", "is_correct": True},
                                        {"text": "$\\frac{4}{6}$", "is_correct": False},
                                        {"text": "$\\frac{2}{8}$", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                            ],
                        },
                    ],
                },
                {
                    "slug": "l2-adding-fractions",
                    "title": "Adding fractions (same denominator)",
                    "duration": 15,
                    "text_md": (
                        "## Adding fractions when denominators match\n\n"
                        "If two fractions share a denominator, the rule is short:\n\n"
                        "> **Add the numerators. Keep the denominator.**\n\n"
                        "$$\\frac{a}{c} + \\frac{b}{c} = \\frac{a+b}{c}$$\n\n"
                        ":::example Worked example\n"
                        "$$\\frac{2}{7} + \\frac{3}{7} = \\frac{2+3}{7} = \\frac{5}{7}$$\n"
                        ":::\n\n"
                        "### Why it works\n\n"
                        "Imagine a pizza cut into 7 equal slices. $\\frac{2}{7}$ means *2 slices*. "
                        "$\\frac{3}{7}$ means *3 more slices*. Together that's 5 slices out of 7 — "
                        "or $\\frac{5}{7}$. We didn't change the *size* of a slice (the denominator), "
                        "we only counted more of them.\n\n"
                        "Try the step-by-step exercise below. Type your answer at each step."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-add-fractions-step",
                            "type": "math_stepwise",
                            "title": "Solve: 1/4 + 2/4",
                            "config": {
                                "problem": "1/4 + 2/4",
                                "variable": "x",
                                "max_steps": 3,
                                "final_answer": "3/4",
                                "validate_steps": False,
                            },
                        },
                        {
                            "slug": "ex-add-quiz",
                            "type": "quiz",
                            "title": "Quick check",
                            "config": {"passing_score": 70},
                            "questions": [
                                {
                                    "text": "$\\frac{1}{5} + \\frac{3}{5} = $ ?",
                                    "options": [
                                        {"text": "$\\frac{4}{5}$", "is_correct": True},
                                        {"text": "$\\frac{4}{10}$", "is_correct": False},
                                        {"text": "$\\frac{3}{25}$", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "$\\frac{2}{9} + \\frac{4}{9} = $ ?",
                                    "options": [
                                        {"text": "$\\frac{6}{9}$", "is_correct": True},
                                        {"text": "$\\frac{6}{18}$", "is_correct": False},
                                        {"text": "$\\frac{8}{9}$", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                            ],
                        },
                    ],
                },
                {
                    "slug": "l3-comparing-fractions",
                    "title": "Comparing fractions",
                    "duration": 10,
                    "text_md": (
                        "## Which fraction is bigger?\n\n"
                        "Three quick rules cover most cases.\n\n"
                        "### Rule 1 — Same denominator\n\n"
                        "Bigger numerator wins: $\\frac{3}{5} > \\frac{2}{5}$.\n\n"
                        "### Rule 2 — Same numerator\n\n"
                        "*Smaller* denominator wins — you're cutting the whole into fewer, larger pieces.\n\n"
                        "$$\\frac{1}{3} > \\frac{1}{5}$$\n\n"
                        "Think of pizza: 1 slice out of 3 is bigger than 1 slice out of 5.\n\n"
                        "### Rule 3 — Neither matches\n\n"
                        "Find a **common denominator** by multiplying. To compare $\\frac{1}{3}$ and "
                        "$\\frac{2}{5}$:\n\n"
                        "$$\\frac{1}{3} = \\frac{5}{15}, \\qquad \\frac{2}{5} = \\frac{6}{15}$$\n\n"
                        "Now you can see $\\frac{2}{5}$ is bigger."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-compare-truefalse",
                            "type": "true_false",
                            "title": "True or false",
                            "config": {
                                "statement": "$\\frac{1}{3}$ is greater than $\\frac{1}{4}$.",
                                "correct_answer": True,
                            },
                        },
                        {
                            "slug": "ex-compare-match",
                            "type": "matching",
                            "title": "Match each fraction to its decimal",
                            "config": {
                                "pairs": [
                                    {"left": "1/2", "right": "0.5"},
                                    {"left": "1/4", "right": "0.25"},
                                    {"left": "3/4", "right": "0.75"},
                                    {"left": "1/5", "right": "0.2"},
                                ],
                                "shuffle": True,
                            },
                        },
                    ],
                },
            ],
        },
        {
            "slug": "m2-decimals",
            "title": "Decimals",
            "lessons": [
                {
                    "slug": "l4-fraction-to-decimal",
                    "title": "From fractions to decimals",
                    "duration": 12,
                    "text_md": (
                        "## Converting fractions to decimals\n\n"
                        "Every fraction can be written as a decimal — you just divide the numerator "
                        "by the denominator.\n\n"
                        "### Common ones to memorise\n\n"
                        "| Fraction | Decimal |\n"
                        "|---|---|\n"
                        "| 1/2 | 0.5 |\n"
                        "| 1/4 | 0.25 |\n"
                        "| 3/4 | 0.75 |\n"
                        "| 1/5 | 0.2 |\n"
                        "| 3/8 | 0.375 |\n"
                        "| 1/3 | 0.333… |\n\n"
                        "### The trick with 1/3\n\n"
                        "$1 \\div 3 = 0.333\\ldots$ — the 3s never stop. We call this a "
                        "**repeating decimal** and write it as $0.\\overline{3}$.\n\n"
                        ":::tip Try it on paper\n"
                        "Divide 1 by 8 by hand. You should get exactly $0.125$. Long division "
                        "stops cleanly when the denominator is built from $2$s and $5$s.\n"
                        ":::"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-fill-decimal",
                            "type": "fill_blanks",
                            "title": "Complete the decimal",
                            "config": {
                                "text": "The fraction 1/2 written as a decimal is {{blank}}.",
                                "blanks": ["0.5"],
                                "word_bank": ["0.5", "0.25", "0.75", "0.2"],
                            },
                        },
                        {
                            "slug": "ex-dec-quiz",
                            "type": "quiz",
                            "title": "Pick the matching decimal",
                            "config": {"passing_score": 70},
                            "questions": [
                                {
                                    "text": "$\\frac{3}{4}$ as a decimal is…",
                                    "options": [
                                        {"text": "0.75", "is_correct": True},
                                        {"text": "0.34", "is_correct": False},
                                        {"text": "0.43", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "$\\frac{1}{5}$ as a decimal is…",
                                    "options": [
                                        {"text": "0.5", "is_correct": False},
                                        {"text": "0.2", "is_correct": True},
                                        {"text": "0.15", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                            ],
                        },
                    ],
                },
                {
                    "slug": "l5-decimal-arithmetic",
                    "title": "Decimal arithmetic",
                    "duration": 14,
                    "text_md": (
                        "## Adding and subtracting decimals\n\n"
                        "The only rule: **line up the decimal points**, then add column by column "
                        "just like with whole numbers.\n\n"
                        "```\n"
                        "  2.50\n"
                        "+ 1.70\n"
                        "------\n"
                        "  4.20\n"
                        "```\n\n"
                        "### Trailing zeros are free\n\n"
                        "$2.5$ is the same as $2.50$ — pad with zeros to make the columns match up.\n\n"
                        "### Multiplying by 10, 100, 1000\n\n"
                        "Shift the decimal point right by 1, 2 or 3 places:\n\n"
                        "$$0.42 \\times 10 = 4.2, \\qquad 0.42 \\times 100 = 42$$\n\n"
                        "Dividing? Shift left."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-decimal-add-step",
                            "type": "math_stepwise",
                            "title": "Solve: 2.5 + 1.7",
                            "config": {
                                "problem": "2.5 + 1.7",
                                "variable": "x",
                                "max_steps": 2,
                                "final_answer": "4.2",
                                "validate_steps": False,
                            },
                        },
                        {
                            "slug": "ex-decimal-quiz",
                            "type": "quiz",
                            "title": "Decimal mental maths",
                            "config": {"passing_score": 70},
                            "questions": [
                                {
                                    "text": "$0.7 + 0.4 = $ ?",
                                    "options": [
                                        {"text": "0.11", "is_correct": False},
                                        {"text": "1.1", "is_correct": True},
                                        {"text": "11", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "$0.42 \\times 100 = $ ?",
                                    "options": [
                                        {"text": "4.2", "is_correct": False},
                                        {"text": "42", "is_correct": True},
                                        {"text": "420", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                            ],
                        },
                    ],
                },
                {
                    "slug": "l6-word-problems",
                    "title": "Word problems",
                    "duration": 18,
                    "text_md": (
                        "## Real-world fractions\n\n"
                        "Word problems hide a fraction or decimal behind everyday words. The trick "
                        "is to find the **whole** first, then the **part**.\n\n"
                        "### Worked example\n\n"
                        "> *A bottle holds 0.75 litres of juice.*\n"
                        "> *What fraction of a litre is that?*\n\n"
                        "0.75 is the same as $\\frac{75}{100}$ — and $\\frac{75}{100}$ simplifies to "
                        "$\\frac{3}{4}$.\n\n"
                        "### Strategy\n\n"
                        "1. Re-read the question — what is the whole?\n"
                        "2. What part is named?\n"
                        "3. Write the part over the whole. Simplify if possible."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-word-quiz",
                            "type": "quiz",
                            "title": "Word-problem mini-quiz",
                            "config": {"passing_score": 60},
                            "questions": [
                                {
                                    "text": "A pizza is cut into 8 equal slices. You eat 3. What fraction did you eat?",
                                    "options": [
                                        {"text": "3/8", "is_correct": True},
                                        {"text": "5/8", "is_correct": False},
                                        {"text": "3/11", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "A bottle holds 0.75 litres. How much is that as a fraction of a litre?",
                                    "options": [
                                        {"text": "3/4", "is_correct": True},
                                        {"text": "7/5", "is_correct": False},
                                        {"text": "75/10", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "Ana ran 0.6 km. Beto ran 3/4 km. Who ran further?",
                                    "options": [
                                        {"text": "Ana", "is_correct": False},
                                        {"text": "Beto", "is_correct": True},
                                        {"text": "They ran the same", "is_correct": False},
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
