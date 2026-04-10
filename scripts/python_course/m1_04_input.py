"""Module 1, Lesson 4: User Input & Type Conversion."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "User Input &amp; Type Conversion",
            "Make your programs interactive &mdash; ask questions, read answers, and convert between types.",
        ),

        why_it_matters(
            "<p>Static programs are boring. Real software responds to users: "
            "login forms, search bars, checkout pages, command-line tools. "
            "The <code>input()</code> function is your first step toward "
            "building interactive programs.</p>"
        ),

        section("The input() function"),

        concept("input() always returns a string",
            "<p>The <code>input()</code> function pauses the program, shows a prompt, "
            "waits for the user to type something, and returns it as a <strong>string</strong>. "
            "Always a string &mdash; even if the user types a number.</p>"
        ),

        code_example("Basic input",
            'name = input("What is your name? ")\n'
            'print(f"Hello, {name}!")\n'
            '\n'
            '# What the user sees:\n'
            '# What is your name? Alice\n'
            '# Hello, Alice!',
            explanation="Notice the space after the <code>?</code> in the prompt. Without it, "
            "the user's cursor would be right against the question mark."
        ),

        code_example("input() returns a string, always",
            'age = input("Enter your age: ")\n'
            'print(type(age))    # <class \'str\'> NOT int!\n'
            'print(age + 10)     # TypeError!',
            output="<class 'str'>\nTypeError: can only concatenate str (not \"int\") to str",
            explanation="Even if the user types <code>25</code>, Python stores it as the "
            "string <code>\"25\"</code>. You must convert it to a number before doing math."
        ),

        section("Type conversion functions"),

        concept("Converting between types",
            "<p>Python provides built-in functions to convert between types:</p>"
            "<ul>"
            "<li><code>int()</code> &mdash; converts to integer: <code>int(\"42\")</code> gives <code>42</code></li>"
            "<li><code>float()</code> &mdash; converts to float: <code>float(\"3.14\")</code> gives <code>3.14</code></li>"
            "<li><code>str()</code> &mdash; converts to string: <code>str(42)</code> gives <code>\"42\"</code></li>"
            "<li><code>bool()</code> &mdash; converts to boolean: <code>bool(1)</code> gives <code>True</code></li>"
            "</ul>"
        ),

        code_example("Common conversions",
            '# String to number\n'
            'age_str = "25"\n'
            'age = int(age_str)\n'
            'print(age + 10)        # 35\n'
            '\n'
            '# String to float\n'
            'price_str = "19.99"\n'
            'price = float(price_str)\n'
            'print(price * 2)       # 39.98\n'
            '\n'
            '# Number to string\n'
            'score = 95\n'
            'message = "You scored " + str(score) + " points"\n'
            'print(message)\n'
            '\n'
            '# Float to int (truncates, does NOT round)\n'
            'print(int(3.9))        # 3\n'
            'print(int(-3.9))       # -3',
            output="35\n39.98\nYou scored 95 points\n3\n-3",
        ),

        section("The essential pattern: input + convert"),

        code_example("Reading numbers from the user",
            '# The standard pattern\n'
            'age = int(input("Enter your age: "))\n'
            'height = float(input("Enter your height in meters: "))\n'
            '\n'
            '# Now you can do math with them\n'
            'years_to_100 = 100 - age\n'
            'print(f"You will be 100 in {years_to_100} years")\n'
            'print(f"Your height in cm: {height * 100:.0f} cm")',
            explanation="<code>int(input(...))</code> is a one-liner that reads input and converts "
            "in one step. This is the most common pattern in Python."
        ),

        code_example("Reading multiple values",
            'print("=== Trip Cost Calculator ===")\n'
            'distance = float(input("Distance in miles: "))\n'
            'mpg = float(input("Your car\'s MPG: "))\n'
            'gas_price = float(input("Gas price per gallon: $"))\n'
            '\n'
            'gallons_needed = distance / mpg\n'
            'trip_cost = gallons_needed * gas_price\n'
            '\n'
            'print(f"\\nTrip: {distance:.0f} miles")\n'
            'print(f"Fuel needed: {gallons_needed:.1f} gallons")\n'
            'print(f"Total cost: ${trip_cost:.2f}")',
            explanation="Each <code>input()</code> call pauses and waits. The program "
            "collects all the data, then calculates and displays results."
        ),

        section("What can go wrong: handling bad input"),

        concept("Invalid conversions crash your program",
            "<p>If a user types <code>\"hello\"</code> when you expect a number, "
            "<code>int(\"hello\")</code> raises a <code>ValueError</code> and your program crashes. "
            "The <code>try/except</code> pattern catches these errors gracefully.</p>"
        ),

        code_example("Basic error handling with try/except",
            'try:\n'
            '    age = int(input("Enter your age: "))\n'
            '    print(f"You entered: {age}")\n'
            'except ValueError:\n'
            '    print("That\'s not a valid number!")',
            explanation="If <code>int()</code> fails, Python jumps to the <code>except</code> block "
            "instead of crashing. We'll cover error handling in depth later &mdash; "
            "for now, this simple pattern is enough."
        ),

        code_example("Robust input with a retry loop",
            'while True:\n'
            '    try:\n'
            '        age = int(input("Enter your age: "))\n'
            '        break    # exit the loop if conversion worked\n'
            '    except ValueError:\n'
            '        print("Please enter a whole number.")\n'
            '\n'
            'print(f"Got it! You are {age} years old.")',
            explanation="This keeps asking until the user provides valid input. "
            "You'll see this pattern in every professional CLI tool."
        ),

        section("Bool conversion: truthy and falsy"),

        code_example("What Python considers True or False",
            '# Falsy values (these all convert to False)\n'
            'print(bool(0))        # False\n'
            'print(bool(0.0))      # False\n'
            'print(bool(""))       # False (empty string)\n'
            'print(bool(None))     # False\n'
            '\n'
            '# Truthy values (everything else is True)\n'
            'print(bool(1))        # True\n'
            'print(bool(-5))       # True\n'
            'print(bool("hello"))  # True\n'
            'print(bool(0.001))    # True',
            output="False\nFalse\nFalse\nFalse\nTrue\nTrue\nTrue\nTrue",
            explanation="This matters because Python uses truthiness in <code>if</code> statements: "
            "<code>if name:</code> is the same as <code>if name != \"\":</code>."
        ),

        try_it("Build a small interactive program that asks for two numbers and prints their sum."),

        section("Real-world pattern: Simple order form"),

        code_example("Interactive order form",
            'print("=" * 40)\n'
            'print("     SIMPLE ORDER FORM")\n'
            'print("=" * 40)\n'
            '\n'
            'item_name = input("Item name: ").strip()\n'
            'quantity = int(input("Quantity: "))\n'
            'unit_price = float(input("Unit price: $"))\n'
            'tax_rate = 0.08    # 8% sales tax\n'
            '\n'
            'subtotal = quantity * unit_price\n'
            'tax = subtotal * tax_rate\n'
            'total = subtotal + tax\n'
            '\n'
            'print(f"\\n{\'─\' * 40}")\n'
            'print(f"Item:     {item_name}")\n'
            'print(f"Qty:      {quantity}")\n'
            'print(f"Price:    ${unit_price:.2f} each")\n'
            'print(f"{\'─\' * 40}")\n'
            'print(f"Subtotal: ${subtotal:.2f}")\n'
            'print(f"Tax (8%): ${tax:.2f}")\n'
            'print(f"TOTAL:    ${total:.2f}")\n'
            'print(f"{\'─\' * 40}")',
            explanation="This combines everything from Module 1: variables, strings, numbers, "
            "f-strings, and input. Notice how <code>.strip()</code> cleans the item name."
        ),

        section("Exercises"),

        exercise("starter", "Interactive greeting",
            "Ask the user for their name and birth year. "
            "Calculate their approximate age (current year minus birth year) and print: "
            "<em>Hello, Alice! You are approximately 28 years old.</em><br>"
            "Remember to convert the birth year to an integer.",
            hint="<code>birth_year = int(input(\"Birth year: \"))</code>, "
            "then <code>age = 2026 - birth_year</code>"
        ),

        exercise("medium", "Unit converter",
            "Build a mini unit converter that asks the user for:<br>"
            "1. A number<br>"
            "2. The source unit (km, miles, kg, lbs, C, F)<br>"
            "Then convert and display the result. Support at least three conversion pairs:<br>"
            "&bull; km to miles (divide by 1.60934)<br>"
            "&bull; kg to lbs (multiply by 2.20462)<br>"
            "&bull; Celsius to Fahrenheit (C * 9/5 + 32)",
            hint="Read the unit as a string with <code>input()</code>, then use "
            "<code>if/elif</code> to pick the right formula."
        ),

        exercise("medium", "Age calculator",
            "Ask the user for their birth year, birth month, and birth day (all as numbers). "
            "Given that today is April 10, 2026, calculate their exact age in years. "
            "If their birthday has not yet occurred this year, subtract one. "
            "Print: <em>You are X years old. Your birthday is in Y days.</em>",
            hint="Compare birth month/day to the current date. "
            "If birth_month &gt; 4 or (birth_month == 4 and birth_day &gt; 10), "
            "they haven't had their birthday yet this year."
        ),

        exercise("real-world", "Complete order form",
            "Expand the order form example to support multiple items. "
            "Ask the user how many items they want to order. "
            "For each item, ask for the name, quantity, and unit price. "
            "Print a formatted receipt showing each line item, subtotal, "
            "8% tax, and grand total. Use f-string alignment to make columns line up.",
            hint="Use a <code>for</code> loop (or a <code>while</code> loop) to collect items. "
            "Store a running subtotal: <code>subtotal += qty * price</code> for each item."
        ),

        mistakes([
            ("Forgetting that <code>input()</code> returns a string",
             "<code>age = input(\"Age: \")</code> gives you <code>\"25\"</code> not <code>25</code>. "
             "You must wrap with <code>int()</code> or <code>float()</code> before math."),
            ("Using <code>int()</code> on a decimal string",
             "<code>int(\"3.14\")</code> raises <code>ValueError</code>. "
             "Use <code>float(\"3.14\")</code> first, or <code>int(float(\"3.14\"))</code> to truncate."),
            ("No space in the prompt string",
             "<code>input(\"Name:\")</code> shows <code>Name:Alice</code> with no space. "
             "Always add a trailing space: <code>input(\"Name: \")</code>."),
            ("Crashing on invalid input without try/except",
             "Always assume users will type garbage. Even a simple <code>try/except ValueError</code> "
             "makes your program dramatically more robust."),
        ]),

        pro_tips([
            "<strong>Always <code>.strip()</code> text input:</strong> "
            "<code>name = input(\"Name: \").strip()</code> removes accidental whitespace.",
            "<strong>Validate early.</strong> Convert and check input right after reading it. "
            "Don't let bad data flow through your program.",
            "<strong>Use descriptive prompts.</strong> <code>input(\"Enter weight in kg: \")</code> "
            "is better than <code>input(\"Weight: \")</code> &mdash; users should never have to guess the format.",
            "<strong>The <code>int(input())</code> one-liner</strong> is idiomatic Python. "
            "You'll see it everywhere. But in production code, always add error handling.",
            "<strong>Test with edge cases:</strong> empty input, zero, negative numbers, "
            "extremely large numbers, and non-numeric text.",
        ]),

        recap([
            "<code>input(prompt)</code> always returns a string",
            "Convert with <code>int()</code>, <code>float()</code>, <code>str()</code>, <code>bool()</code>",
            "Pattern: <code>age = int(input(\"Age: \"))</code>",
            "<code>try/except ValueError</code> catches bad conversions",
            "Falsy values: <code>0</code>, <code>0.0</code>, <code>\"\"</code>, <code>None</code>",
            "Always <code>.strip()</code> text input from users",
        ]),
    ])
