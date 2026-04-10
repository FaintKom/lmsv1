"""Module 1, Lesson 5: Your First Real Program."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Your First Real Program",
            "Combine variables, strings, numbers, and input into programs that actually do something useful.",
        ),

        why_it_matters(
            "<p>Knowing individual concepts is like knowing words in a language &mdash; "
            "useful, but not enough. This lesson is about writing <strong>complete programs</strong> "
            "with a clear structure: get input, process it, produce output. "
            "This is the pattern behind every application ever built.</p>"
        ),

        section("Program structure: Input &rarr; Process &rarr; Output"),

        concept("The universal program pattern",
            "<p>Almost every program follows this three-step pattern:</p>"
            "<ol>"
            "<li><strong>Input</strong> &mdash; gather data (from the user, a file, an API, etc.)</li>"
            "<li><strong>Process</strong> &mdash; do something with that data (calculate, transform, filter)</li>"
            "<li><strong>Output</strong> &mdash; present the results (print, save, send)</li>"
            "</ol>"
            "<p>Even complex apps like Google Maps follow this: "
            "input an address, calculate a route, display the map.</p>"
        ),

        code_example("A complete mini-program",
            '# === Tip Calculator ===\n'
            '\n'
            '# 1. INPUT\n'
            'meal_cost = float(input("Meal cost: $"))\n'
            'tip_percent = int(input("Tip percentage: "))\n'
            'num_people = int(input("Split between how many people? "))\n'
            '\n'
            '# 2. PROCESS\n'
            'tip_amount = meal_cost * tip_percent / 100\n'
            'total = meal_cost + tip_amount\n'
            'per_person = total / num_people\n'
            '\n'
            '# 3. OUTPUT\n'
            'print(f"\\nTip amount:  ${tip_amount:.2f}")\n'
            'print(f"Total bill:  ${total:.2f}")\n'
            'print(f"Per person:  ${per_person:.2f}")',
            explanation="Clean, readable, and organized. Even a stranger can understand this code. "
            "Notice how comments separate the three phases."
        ),

        section("Comments and documentation"),

        concept("Writing good comments",
            "<p>Comments explain <strong>why</strong>, not <strong>what</strong>. "
            "The code already says what it does. Comments should explain the reasoning:</p>"
        ),

        code_example("Good vs bad comments",
            '# ❌ Bad comments (state the obvious)\n'
            'x = 5  # set x to 5\n'
            'total = price * qty  # multiply price by quantity\n'
            '\n'
            '# ✅ Good comments (explain WHY)\n'
            '# Tax is calculated on subtotal before discount (state law)\n'
            'tax = subtotal * tax_rate\n'
            '\n'
            '# Round up to nearest cent to avoid undercharging\n'
            'import math\n'
            'total = math.ceil(raw_total * 100) / 100\n'
            '\n'
            '# Retry limit prevents infinite loops on network failure\n'
            'MAX_RETRIES = 3',
            explanation="Good comments save hours of debugging. Bad comments add clutter "
            "and often become outdated lies."
        ),

        code_example("Docstrings for functions",
            'def calculate_bmi(weight_kg, height_m):\n'
            '    """Calculate Body Mass Index.\n'
            '\n'
            '    Args:\n'
            '        weight_kg: Body weight in kilograms.\n'
            '        height_m: Height in meters.\n'
            '\n'
            '    Returns:\n'
            '        BMI as a float, rounded to 1 decimal.\n'
            '    """\n'
            '    bmi = weight_kg / height_m ** 2\n'
            '    return round(bmi, 1)',
            explanation="Triple-quoted strings right after a function definition are called docstrings. "
            "They show up in <code>help(calculate_bmi)</code> and in your editor's tooltips."
        ),

        section("The print() function in depth"),

        code_example("print() is more powerful than you think",
            '# Basic print\n'
            'print("Hello, world!")\n'
            '\n'
            '# Multiple arguments (separated by space by default)\n'
            'print("Alice", "Bob", "Charlie")\n'
            '\n'
            '# Custom separator\n'
            'print("2026", "04", "10", sep="-")\n'
            'print("alice", "example.com", sep="@")\n'
            '\n'
            '# Custom ending (default is newline)\n'
            'print("Loading", end="")\n'
            'print(".", end="")\n'
            'print(".", end="")\n'
            'print(".")   # final newline\n'
            '\n'
            '# Print an empty line\n'
            'print()',
            output="Hello, world!\nAlice Bob Charlie\n2026-04-10\nalice@example.com\nLoading...\n",
        ),

        code_example("Formatting output with f-strings and print()",
            '# Build a formatted table\n'
            'products = [\n'
            '    ("Widget A", 3, 12.99),\n'
            '    ("Gadget Pro", 1, 89.50),\n'
            '    ("Cable USB-C", 5, 7.25),\n'
            ']\n'
            '\n'
            'print(f"{\'Item\':<20} {\'Qty\':>5} {\'Price\':>10} {\'Total\':>10}")\n'
            'print("-" * 47)\n'
            '\n'
            'grand_total = 0\n'
            'for name, qty, price in products:\n'
            '    total = qty * price\n'
            '    grand_total += total\n'
            '    print(f"{name:<20} {qty:>5} ${price:>9.2f} ${total:>9.2f}")\n'
            '\n'
            'print("-" * 47)\n'
            'print(f"{\'TOTAL\':<20} {\'\':>5} {\'\':>10} ${grand_total:>9.2f}")',
            output="Item                   Qty      Price      Total\n-----------------------------------------------\nWidget A                 3 $    12.99 $    38.97\nGadget Pro               1 $    89.50 $    89.50\nCable USB-C              5 $     7.25 $    36.25\n-----------------------------------------------\nTOTAL                                 $   164.72",
            explanation="F-string alignment: <code>&lt;</code> = left-align, <code>&gt;</code> = right-align, "
            "followed by the width in characters. This is how you make clean tables."
        ),

        section("Putting it all together"),

        code_example("Complete program: Password strength checker",
            '# === Password Strength Checker ===\n'
            '\n'
            'password = input("Enter a password to check: ")\n'
            '\n'
            '# Calculate strength score\n'
            'score = 0\n'
            'feedback = []\n'
            '\n'
            'if len(password) >= 8:\n'
            '    score += 1\n'
            'else:\n'
            '    feedback.append("Use at least 8 characters")\n'
            '\n'
            'if len(password) >= 12:\n'
            '    score += 1\n'
            '\n'
            'has_upper = any(c.isupper() for c in password)\n'
            'has_lower = any(c.islower() for c in password)\n'
            'has_digit = any(c.isdigit() for c in password)\n'
            'has_special = any(c in "!@#$%^&*()_+-=" for c in password)\n'
            '\n'
            'if has_upper:\n'
            '    score += 1\n'
            'else:\n'
            '    feedback.append("Add uppercase letters")\n'
            '\n'
            'if has_lower:\n'
            '    score += 1\n'
            'else:\n'
            '    feedback.append("Add lowercase letters")\n'
            '\n'
            'if has_digit:\n'
            '    score += 1\n'
            'else:\n'
            '    feedback.append("Add numbers")\n'
            '\n'
            'if has_special:\n'
            '    score += 1\n'
            'else:\n'
            '    feedback.append("Add special characters (!@#$%...)")\n'
            '\n'
            '# Determine rating\n'
            'if score >= 5:\n'
            '    rating = "STRONG"\n'
            'elif score >= 3:\n'
            '    rating = "MEDIUM"\n'
            'else:\n'
            '    rating = "WEAK"\n'
            '\n'
            '# Display results\n'
            'print(f"\\nPassword: {\'*\' * len(password)}")\n'
            'print(f"Length: {len(password)} characters")\n'
            'print(f"Strength: {rating} ({score}/6)")\n'
            '\n'
            'if feedback:\n'
            '    print("\\nSuggestions:")\n'
            '    for tip in feedback:\n'
            '        print(f"  - {tip}")',
            explanation="This program uses everything we've learned: string methods, "
            "len(), conditionals, lists, f-strings, and structured output. "
            "It follows the Input &rarr; Process &rarr; Output pattern."
        ),

        try_it("Try running the password checker with different passwords to see how the scoring works."),

        section("Exercises"),

        exercise("starter", "Mad Libs game",
            "Build a Mad Libs game that asks the user for:<br>"
            "&bull; A name<br>"
            "&bull; An adjective<br>"
            "&bull; A noun<br>"
            "&bull; A verb (past tense)<br>"
            "&bull; A place<br>"
            "Then print a funny story using their words. For example:<br>"
            "<em>One day, Alice found a shiny elephant that danced in the library.</em>",
            hint="Use <code>input()</code> for each word, then build the story with an f-string. "
            "Make the story entertaining!"
        ),

        exercise("medium", "Fortune teller",
            "Build a fortune teller that asks for the user's name and birth month (1-12). "
            "Use the birth month to select a fortune from a list of 12 fortunes. "
            "Print the result in a decorative box:<br>"
            "<code>+========================+<br>"
            "|   FORTUNE TELLER 3000  |<br>"
            "+========================+<br>"
            "| Dear Alice,            |<br>"
            "| Great success awaits   |<br>"
            "| you this month!        |<br>"
            "+========================+</code>",
            hint="Store fortunes in a list: <code>fortunes = [\"...\", \"...\", ...]</code>. "
            "Access with <code>fortunes[month - 1]</code> (since lists are 0-indexed)."
        ),

        exercise("medium", "Unit conversion tool",
            "Build a multi-unit converter. Show a menu:<br>"
            "<code>1. km &rarr; miles<br>"
            "2. kg &rarr; lbs<br>"
            "3. Celsius &rarr; Fahrenheit<br>"
            "4. Liters &rarr; gallons</code><br>"
            "Ask the user to pick an option and enter a value. "
            "Display the converted result with proper formatting. "
            "Handle invalid menu choices with a friendly error message.",
            hint="Read the menu choice with <code>int(input(...))</code>, "
            "use <code>if/elif/else</code> to pick the right conversion formula."
        ),

        exercise("real-world", "Business card generator",
            "Build a program that asks for:<br>"
            "&bull; Full name<br>"
            "&bull; Job title<br>"
            "&bull; Email address<br>"
            "&bull; Phone number<br>"
            "Then print a formatted business card like:<br>"
            "<code>+--------------------------------+<br>"
            "|                                |<br>"
            "|   ALICE SMITH                  |<br>"
            "|   Senior Developer             |<br>"
            "|                                |<br>"
            "|   alice@company.com            |<br>"
            "|   +1 (555) 123-4567           |<br>"
            "|                                |<br>"
            "+--------------------------------+</code><br>"
            "Use f-string alignment to make text fit within the box. "
            "The card should be exactly 34 characters wide.",
            hint="Use <code>f\"| {name.upper():<30} |\"</code> to left-align text within "
            "a 30-character field inside the border."
        ),

        mistakes([
            ("No clear program structure",
             "Mixing input, processing, and output randomly makes code hard to follow. "
             "Separate your code into the three phases, even in small programs."),
            ("Comments that describe the obvious",
             "Don't write <code># add 1 to x</code> above <code>x += 1</code>. "
             "Instead, explain WHY you're adding 1."),
            ("Printing raw data without formatting",
             "<code>print(total)</code> might show <code>149.97000000000003</code>. "
             "Always format numbers: <code>print(f\"${total:.2f}\")</code>."),
            ("Forgetting to test edge cases",
             "What happens if the user enters 0 people to split a bill? "
             "Your program crashes with <code>ZeroDivisionError</code>. Always think about edge cases."),
        ]),

        pro_tips([
            "<strong>Plan before coding.</strong> Write down the inputs, the processing steps, "
            "and the expected output before writing a single line of code.",
            "<strong>Use <code>sep</code> and <code>end</code></strong> in <code>print()</code> "
            "instead of string concatenation. <code>print(year, month, day, sep=\"-\")</code> "
            "is cleaner than building the string yourself.",
            "<strong>Build incrementally.</strong> Write the input section first and print the raw values. "
            "Then add the processing. Then add the formatted output. Test at each step.",
            "<strong>Use blank lines to organize.</strong> Group related lines together and separate "
            "sections with blank lines. Your future self will thank you.",
            "<strong>Avoid magic numbers.</strong> Instead of <code>total * 0.08</code>, write "
            "<code>TAX_RATE = 0.08</code> and use <code>total * TAX_RATE</code>.",
        ]),

        recap([
            "Programs follow Input &rarr; Process &rarr; Output",
            "Comments explain <strong>why</strong>, not <strong>what</strong>",
            "Docstrings document functions with triple quotes",
            "<code>print()</code> supports <code>sep</code> and <code>end</code> parameters",
            "F-string alignment: <code>&lt;</code> left, <code>&gt;</code> right, <code>^</code> center",
            "Test your programs with normal, edge-case, and invalid inputs",
        ]),
    ])
