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

        code_example("Multi-line comments with triple quotes",
            '"""This is a multi-line comment.\n'
            'It can span several lines.\n'
            'Useful for explaining a whole section of code."""\n'
            '\n'
            '# In Module 3, you will learn about functions.\n'
            '# Functions use these triple-quoted strings as\n'
            '# "docstrings" to document what the function does.',
            explanation="Triple-quoted strings (<code>\"\"\"...\"\"\"</code>) can span multiple lines. "
            "When used at the top of a file or after a function definition (Module 3), "
            "they are called docstrings."
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
            '# Build a formatted receipt\n'
            'item_1 = "Widget A"\n'
            'qty_1 = 3\n'
            'price_1 = 12.99\n'
            'total_1 = qty_1 * price_1\n'
            '\n'
            'item_2 = "Gadget Pro"\n'
            'qty_2 = 1\n'
            'price_2 = 89.50\n'
            'total_2 = qty_2 * price_2\n'
            '\n'
            'grand_total = total_1 + total_2\n'
            '\n'
            'print(f"{\'Item\':<20} {\'Qty\':>5} {\'Price\':>10} {\'Total\':>10}")\n'
            'print("-" * 47)\n'
            'print(f"{item_1:<20} {qty_1:>5} ${price_1:>9.2f} ${total_1:>9.2f}")\n'
            'print(f"{item_2:<20} {qty_2:>5} ${price_2:>9.2f} ${total_2:>9.2f}")\n'
            'print("-" * 47)\n'
            'print(f"{\'TOTAL\':<20} {\'\':>5} {\'\':>10} ${grand_total:>9.2f}")',
            output="Item                   Qty      Price      Total\n-----------------------------------------------\nWidget A                 3 $    12.99 $    38.97\nGadget Pro               1 $    89.50 $    89.50\n-----------------------------------------------\nTOTAL                                 $   128.47",
            explanation="F-string alignment: <code>&lt;</code> = left-align, <code>&gt;</code> = right-align, "
            "followed by the width in characters. This is how you make clean tables. "
            "In Module 2, you will learn loops to avoid repeating lines like this."
        ),

        section("Putting it all together"),

        code_example("Complete program: Personal profile card",
            '# === Personal Profile Card ===\n'
            '\n'
            '# 1. INPUT\n'
            'first_name = input("First name: ").strip()\n'
            'last_name = input("Last name: ").strip()\n'
            'birth_year = int(input("Birth year: "))\n'
            'height_cm = float(input("Height in cm: "))\n'
            '\n'
            '# 2. PROCESS\n'
            'full_name = first_name + " " + last_name\n'
            'age = 2026 - birth_year\n'
            'height_m = height_cm / 100\n'
            'height_ft = height_cm / 30.48\n'
            'initials = first_name[0] + last_name[0]\n'
            '\n'
            '# 3. OUTPUT\n'
            'print(f"\\n{\'=\' * 35}")\n'
            'print(f"  PROFILE CARD [{initials}]")\n'
            'print(f"{\'=\' * 35}")\n'
            'print(f"  Name:      {full_name}")\n'
            'print(f"  Age:       {age} years")\n'
            'print(f"  Height:    {height_m:.2f} m ({height_ft:.1f} ft)")\n'
            'print(f"  Born:      {birth_year}")\n'
            'print(f"{\'=\' * 35}")',
            explanation="This program uses everything from Module 1: variables, "
            "string concatenation, indexing, number arithmetic, f-string formatting, "
            "input with type conversion, and structured output. "
            "It follows the Input &rarr; Process &rarr; Output pattern."
        ),

        try_it("Use the code editor below the lesson to build your own profile card with extra fields."),

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

        exercise("medium", "Travel planner",
            "Build a trip summary that asks the user for:<br>"
            "&bull; Destination city (string)<br>"
            "&bull; Distance in km (float)<br>"
            "&bull; Travel speed in km/h (float)<br>"
            "&bull; Hotel cost per night (float)<br>"
            "&bull; Number of nights (int)<br>"
            "Calculate travel time in hours and minutes, total hotel cost, "
            "and display a formatted travel summary with all the details.",
            hint="<code>total_hours = distance / speed</code>, "
            "<code>hours = int(total_hours)</code>, "
            "<code>minutes = int((total_hours - hours) * 60)</code>."
        ),

        exercise("medium", "Receipt generator",
            "Build an interactive receipt. Ask the user for an item name, "
            "quantity (int), and unit price (float). Calculate the subtotal, "
            "tax (8%), and total. Display a formatted receipt using "
            "<code>print(\"=\" * 30)</code> for borders, f-strings for alignment, "
            "and <code>:.2f</code> for currency formatting.",
            hint="<code>subtotal = quantity * unit_price</code>, "
            "<code>tax = subtotal * 0.08</code>, <code>total = subtotal + tax</code>."
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
            "Triple-quoted strings (<code>\"\"\"...\"\"\"</code>) can span multiple lines",
            "<code>print()</code> supports <code>sep</code> and <code>end</code> parameters",
            "F-string alignment: <code>&lt;</code> left, <code>&gt;</code> right, <code>^</code> center",
            "Test your programs with normal, edge-case, and invalid inputs",
        ]),
    ])
