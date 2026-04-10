"""Module 4, Lesson 1: Defining Functions."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Defining Functions",
            "Functions let you write a block of code once and reuse it everywhere. They are the building blocks of clean, maintainable programs.",
        ),

        why_it_matters(
            "<p>Every professional codebase is built on functions. Without them, "
            "you would copy-paste the same logic hundreds of times. When a bug appears, "
            "you would have to fix it in every copy. Functions solve this with the "
            "<strong>DRY principle</strong>: Don't Repeat Yourself. Write it once, call it anywhere.</p>"
        ),

        section("Your first function"),

        concept("The <code>def</code> keyword",
            "<p>A function is a named block of code that runs only when you <strong>call</strong> it. "
            "You define one with the <code>def</code> keyword:</p>"
            "<ol>"
            "<li><code>def</code> &mdash; tells Python you are creating a function</li>"
            "<li><strong>Name</strong> &mdash; what you call it (use <code>snake_case</code>)</li>"
            "<li><strong>Parentheses</strong> &mdash; hold the parameters (inputs)</li>"
            "<li><strong>Colon</strong> &mdash; starts the indented body</li>"
            "</ol>"
        ),

        code_example("Defining and calling a function",
            'def greet():\n'
            '    print("Hello, world!")\n'
            '\n'
            '# Nothing happens until you call it:\n'
            'greet()\n'
            'greet()   # you can call it as many times as you want',
            output="Hello, world!\nHello, world!",
            explanation="The function body runs each time you call <code>greet()</code>. "
            "Without the call, the function just sits there doing nothing."
        ),

        code_example("Functions with parameters",
            'def greet(name):\n'
            '    print(f"Hello, {name}!")\n'
            '\n'
            'greet("Alice")\n'
            'greet("Bob")',
            output="Hello, Alice!\nHello, Bob!",
            explanation="The parameter <code>name</code> acts like a variable inside the function. "
            "Each call can pass a different value."
        ),

        section("The function body"),

        concept("Indentation matters",
            "<p>Everything indented under <code>def</code> is the function body. "
            "The function ends when the indentation returns to the original level:</p>"
        ),

        code_example("Multi-line function body",
            'def print_receipt(item, price):\n'
            '    print("=" * 30)\n'
            '    print(f"Item:  {item}")\n'
            '    print(f"Price: ${price:.2f}")\n'
            '    tax = price * 0.08\n'
            '    print(f"Tax:   ${tax:.2f}")\n'
            '    print(f"Total: ${price + tax:.2f}")\n'
            '    print("=" * 30)\n'
            '\n'
            'print_receipt("Keyboard", 49.99)\n'
            'print_receipt("Mouse", 29.99)',
            output="==============================\n"
            "Item:  Keyboard\n"
            "Price: $49.99\n"
            "Tax:   $4.00\n"
            "Total: $53.99\n"
            "==============================\n"
            "==============================\n"
            "Item:  Mouse\n"
            "Price: $29.99\n"
            "Tax:   $2.40\n"
            "Total: $32.39\n"
            "==============================",
        ),

        section("The <code>return</code> statement"),

        concept("Returning values",
            "<p>Most functions <strong>return</strong> a result instead of printing it. "
            "This makes them far more flexible &mdash; the caller decides what to do with the result:</p>"
        ),

        code_example("return vs print",
            '# Bad: prints directly (hard to reuse)\n'
            'def calculate_area_bad(width, height):\n'
            '    print(width * height)\n'
            '\n'
            '# Good: returns the value (flexible)\n'
            'def calculate_area(width, height):\n'
            '    return width * height\n'
            '\n'
            '# Now the caller can do anything with it:\n'
            'area = calculate_area(10, 5)\n'
            'print(f"Area: {area} sq ft")\n'
            'total = calculate_area(10, 5) + calculate_area(8, 3)\n'
            'print(f"Combined: {total} sq ft")',
            output="Area: 50 sq ft\nCombined: 74 sq ft",
            explanation="A function that returns a value can be used in expressions, "
            "stored in variables, or passed to other functions. A function that only "
            "prints is a dead end."
        ),

        code_example("return stops execution",
            'def check_age(age):\n'
            '    if age < 0:\n'
            '        return "Invalid age"\n'
            '    if age < 18:\n'
            '        return "Minor"\n'
            '    return "Adult"\n'
            '\n'
            'print(check_age(25))\n'
            'print(check_age(12))\n'
            'print(check_age(-3))',
            output="Adult\nMinor\nInvalid age",
            explanation="Once Python hits a <code>return</code>, the function exits immediately. "
            "No code after it runs. This is useful for early exits."
        ),

        section("Docstrings"),

        concept("Documenting your functions",
            "<p>A <strong>docstring</strong> is a string on the very first line of a function body. "
            "It explains what the function does. Tools like <code>help()</code> and IDEs read it automatically:</p>"
        ),

        code_example("Writing good docstrings",
            'def calculate_bmi(weight_kg, height_m):\n'
            '    """Calculate Body Mass Index.\n'
            '\n'
            '    Args:\n'
            '        weight_kg: Weight in kilograms.\n'
            '        height_m: Height in meters.\n'
            '\n'
            '    Returns:\n'
            '        BMI as a float, rounded to 1 decimal.\n'
            '    """\n'
            '    bmi = weight_kg / (height_m ** 2)\n'
            '    return round(bmi, 1)\n'
            '\n'
            'print(calculate_bmi(70, 1.75))\n'
            'help(calculate_bmi)',
            output="22.9\nHelp on function calculate_bmi in module __main__:\n\n"
            "calculate_bmi(weight_kg, height_m)\n"
            "    Calculate Body Mass Index.\n"
            "    ...",
            explanation="Triple-quoted strings right after <code>def</code> become the function's "
            "documentation. Use the <strong>Google style</strong>: one-line summary, then "
            "Args and Returns sections."
        ),

        section("Functions calling functions"),

        concept("Building with small functions",
            "<p>Good programs are built from many small functions, each doing one thing well. "
            "Functions call other functions to compose complex behavior:</p>"
        ),

        code_example("Composing functions",
            'def clean_email(email):\n'
            '    """Remove whitespace and convert to lowercase."""\n'
            '    return email.strip().lower()\n'
            '\n'
            'def is_valid_email(email):\n'
            '    """Check if email has @ and a dot after it."""\n'
            '    email = clean_email(email)\n'
            '    return "@" in email and "." in email.split("@")[-1]\n'
            '\n'
            'def format_user_email(name, domain):\n'
            '    """Create a formatted email from name and domain."""\n'
            '    email = f"{name}@{domain}"\n'
            '    email = clean_email(email)\n'
            '    if is_valid_email(email):\n'
            '        return email\n'
            '    return None\n'
            '\n'
            'print(format_user_email("Alice Smith", "company.com"))\n'
            'print(format_user_email("Bob", "company.com"))\n'
            'print(is_valid_email("  ALICE@EXAMPLE.COM  "))',
            output="alice smith@company.com\nbob@company.com\nTrue",
            explanation="Each function has one job. <code>format_user_email</code> uses the "
            "other two. This makes each piece easy to test and debug."
        ),

        section("Functions that return None"),

        code_example("Implicit None return",
            'def log_message(message):\n'
            '    print(f"[LOG] {message}")\n'
            '    # No return statement\n'
            '\n'
            'result = log_message("Server started")\n'
            'print(f"Return value: {result}")\n'
            'print(f"Type: {type(result)}")',
            output="[LOG] Server started\nReturn value: None\nType: <class 'NoneType'>",
            explanation="A function without a <code>return</code> statement (or with a bare "
            "<code>return</code>) returns <code>None</code>. This is fine for functions "
            "whose only job is to cause a side effect like printing or logging."
        ),

        try_it("Define a function called <code>double</code> that takes a number and returns it multiplied by 2. Call it with different values."),

        section("Exercises"),

        exercise("starter", "Greeting function",
            "Write a function <code>greeting(name, time_of_day)</code> that returns a greeting "
            "string. If <code>time_of_day</code> is <code>\"morning\"</code>, return "
            "<code>\"Good morning, Alice!\"</code>. If <code>\"evening\"</code>, return "
            "<code>\"Good evening, Alice!\"</code>. For anything else, return "
            "<code>\"Hello, Alice!\"</code>. Test it with different inputs.",
            hint="Use <code>if/elif/else</code> inside the function. "
            "Return an f-string: <code>return f\"Good {time_of_day}, {name}!\"</code>"
        ),

        exercise("medium", "Area calculator",
            "Write three functions: <code>circle_area(radius)</code>, "
            "<code>rectangle_area(width, height)</code>, and <code>triangle_area(base, height)</code>. "
            "Each should return the calculated area. Then write a function "
            "<code>print_areas()</code> that calls all three with sample values and prints "
            "a formatted report. Use <code>round()</code> for clean output. "
            "Remember: circle area = 3.14159 * radius ** 2, triangle area = 0.5 * base * height.",
            hint="Import <code>math</code> and use <code>math.pi</code> for accuracy. "
            "Each function is just one line: <code>return math.pi * radius ** 2</code>"
        ),

        exercise("real-world", "Email formatter",
            "Build an email formatting module with these functions:<br>"
            "<code>clean_name(name)</code> &mdash; strips whitespace, converts to title case<br>"
            "<code>make_username(first, last)</code> &mdash; returns <code>first.last</code> in lowercase<br>"
            "<code>make_email(first, last, domain)</code> &mdash; returns <code>first.last@domain</code><br>"
            "<code>format_email_line(name, email)</code> &mdash; returns <code>\"Alice Smith &lt;alice.smith@co.com&gt;\"</code><br>"
            "Test with a list of 3 employees, printing formatted email lines for each.",
            hint="Chain the functions: <code>make_email</code> calls <code>make_username</code>, "
            "which calls <code>clean_name</code>. Use <code>.strip().title()</code> and "
            "<code>.strip().lower()</code>."
        ),

        mistakes([
            ("Forgetting parentheses when calling a function",
             "<code>greet</code> is the function object. <code>greet()</code> calls it. "
             "Without <code>()</code>, nothing happens &mdash; you just reference the function."),
            ("Printing instead of returning",
             "If a function prints its result, you cannot use that result in expressions. "
             "Always <code>return</code> unless the function's purpose is to display output."),
            ("Defining a function but never calling it",
             "A function definition just stores the code. You must call the function for "
             "anything to happen."),
            ("Putting code after <code>return</code>",
             "Code after a <code>return</code> statement is <strong>unreachable</strong> and will "
             "never execute. Python may not warn you about this."),
        ]),

        pro_tips([
            "<strong>One function, one job.</strong> If you need to describe a function with "
            "\"and\" (\"it calculates the total AND sends the email\"), split it into two functions.",
            "<strong>Name functions as verbs.</strong> Functions do things: <code>calculate_total</code>, "
            "<code>send_email</code>, <code>validate_input</code>. Variables are nouns: <code>total</code>, "
            "<code>email</code>, <code>user_input</code>.",
            "<strong>Keep functions short.</strong> If a function is longer than 20 lines, it is probably "
            "doing too much. Break it up.",
            "<strong>Write the docstring first.</strong> Before writing the body, write the docstring. "
            "If you cannot explain what the function does in one sentence, rethink your design.",
        ]),

        recap([
            "Define functions with <code>def name(params):</code>",
            "Call functions with <code>name(args)</code>",
            "<code>return</code> sends a value back to the caller",
            "Functions without <code>return</code> return <code>None</code>",
            "Docstrings document what a function does",
            "Build programs by composing small, focused functions",
        ]),
    ])
