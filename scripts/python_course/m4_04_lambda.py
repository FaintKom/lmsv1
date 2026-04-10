"""Module 4, Lesson 4: Lambda & Higher-Order Functions."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Lambda &amp; Higher-Order Functions",
            "Write concise anonymous functions and pass functions as arguments. Unlock map, filter, sorted, and functional programming patterns.",
        ),

        why_it_matters(
            "<p>Real Python code is full of patterns like <code>sorted(users, key=lambda u: u[\"age\"])</code> "
            "and <code>filter(lambda x: x > 0, numbers)</code>. Understanding lambdas and higher-order "
            "functions lets you write cleaner data processing code and work with frameworks that "
            "expect callback functions.</p>"
        ),

        section("Lambda expressions"),

        concept("Anonymous functions",
            "<p>A <strong>lambda</strong> is a small, one-expression function without a name. "
            "It is written on a single line:</p>"
            "<p><code>lambda parameters: expression</code></p>"
            "<p>The expression is automatically returned &mdash; no <code>return</code> keyword needed.</p>"
        ),

        code_example("Lambda basics",
            '# Regular function:\n'
            'def double(x):\n'
            '    return x * 2\n'
            '\n'
            '# Same thing as a lambda:\n'
            'double_lambda = lambda x: x * 2\n'
            '\n'
            'print(double(5))\n'
            'print(double_lambda(5))\n'
            '\n'
            '# Multi-parameter lambda:\n'
            'add = lambda a, b: a + b\n'
            'print(add(3, 7))\n'
            '\n'
            '# Lambda with a conditional:\n'
            'classify = lambda x: "positive" if x > 0 else "non-positive"\n'
            'print(classify(5))\n'
            'print(classify(-3))',
            output="10\n10\n10\npositive\nnon-positive",
            explanation="Lambdas are best for short, throwaway functions. "
            "If the logic needs more than one expression, use a regular <code>def</code>."
        ),

        section("Higher-order functions"),

        concept("Functions that take functions",
            "<p>A <strong>higher-order function</strong> is a function that takes another function "
            "as an argument or returns a function. Python treats functions as first-class objects &mdash; "
            "you can pass them around like any other value:</p>"
        ),

        code_example("Passing functions as arguments",
            'def apply_operation(x, y, operation):\n'
            '    """Apply any two-argument function to x and y."""\n'
            '    return operation(x, y)\n'
            '\n'
            'def add(a, b):\n'
            '    return a + b\n'
            '\n'
            'def multiply(a, b):\n'
            '    return a * b\n'
            '\n'
            '# Pass different functions:\n'
            'print(apply_operation(10, 3, add))\n'
            'print(apply_operation(10, 3, multiply))\n'
            'print(apply_operation(10, 3, lambda a, b: a ** b))',
            output="13\n30\n1000",
            explanation="Notice we pass <code>add</code> without parentheses. "
            "We are passing the function itself, not calling it."
        ),

        section("sorted() with key"),

        concept("Custom sorting with <code>key</code>",
            "<p>The <code>sorted()</code> function accepts a <code>key</code> parameter &mdash; "
            "a function that extracts the value to sort by. This is the most common use of lambdas:</p>"
        ),

        code_example("Sorting with lambda",
            '# Sort strings by length:\n'
            'words = ["python", "is", "a", "powerful", "language"]\n'
            'by_length = sorted(words, key=lambda w: len(w))\n'
            'print(by_length)\n'
            '\n'
            '# Sort dictionaries by a field:\n'
            'users = [\n'
            '    {"name": "Charlie", "age": 35},\n'
            '    {"name": "Alice", "age": 28},\n'
            '    {"name": "Bob", "age": 42},\n'
            ']\n'
            'by_age = sorted(users, key=lambda u: u["age"])\n'
            'for u in by_age:\n'
            '    print(f"  {u[\'name\']}: {u[\'age\']}")\n'
            '\n'
            '# Sort by multiple criteria (age, then name):\n'
            'employees = [\n'
            '    {"name": "Alice", "dept": "Eng", "salary": 95000},\n'
            '    {"name": "Bob", "dept": "Eng", "salary": 85000},\n'
            '    {"name": "Charlie", "dept": "Sales", "salary": 75000},\n'
            '    {"name": "Diana", "dept": "Eng", "salary": 95000},\n'
            ']\n'
            'by_salary_name = sorted(employees, key=lambda e: (-e["salary"], e["name"]))\n'
            'for e in by_salary_name:\n'
            '    print(f"  {e[\'name\']}: ${e[\'salary\']:,}")',
            output="['a', 'is', 'python', 'language', 'powerful']\n"
            "  Alice: 28\n  Charlie: 35\n  Bob: 42\n"
            "  Alice: $95,000\n  Diana: $95,000\n  Bob: $85,000\n  Charlie: $75,000",
            explanation="The <code>key</code> function is called on each element to extract a "
            "comparison value. Use a tuple for multi-criteria sorts. Negate numbers to reverse that field."
        ),

        section("map() and filter()"),

        concept("Transforming and filtering data",
            "<p><code>map(func, iterable)</code> applies a function to every element. "
            "<code>filter(func, iterable)</code> keeps only elements where the function returns True. "
            "Both return lazy iterators:</p>"
        ),

        code_example("map() transforms data",
            'prices = [19.99, 25.50, 7.99, 42.00, 13.75]\n'
            '\n'
            '# Apply 8% tax to every price:\n'
            'with_tax = list(map(lambda p: round(p * 1.08, 2), prices))\n'
            'print(f"With tax: {with_tax}")\n'
            '\n'
            '# Convert temperatures:\n'
            'celsius = [0, 20, 37, 100]\n'
            'fahrenheit = list(map(lambda c: c * 9/5 + 32, celsius))\n'
            'print(f"Fahrenheit: {fahrenheit}")\n'
            '\n'
            '# Clean user input:\n'
            'raw_emails = ["  Alice@CO.com ", "BOB@co.COM", "  charlie@co.com"]\n'
            'clean = list(map(lambda e: e.strip().lower(), raw_emails))\n'
            'print(f"Clean: {clean}")',
            output="With tax: [21.59, 27.54, 8.63, 45.36, 14.85]\n"
            "Fahrenheit: [32.0, 68.0, 98.6, 212.0]\n"
            "Clean: ['alice@co.com', 'bob@co.com', 'charlie@co.com']",
        ),

        code_example("filter() selects data",
            'numbers = [1, -2, 3, -4, 5, -6, 7, 0, 8]\n'
            '\n'
            '# Keep only positive numbers:\n'
            'positive = list(filter(lambda x: x > 0, numbers))\n'
            'print(f"Positive: {positive}")\n'
            '\n'
            '# Filter valid emails:\n'
            'emails = ["alice@co.com", "invalid", "bob@", "charlie@co.com", "@co.com"]\n'
            'valid = list(filter(lambda e: "@" in e and "." in e.split("@")[-1], emails))\n'
            'print(f"Valid: {valid}")\n'
            '\n'
            '# Combine map and filter (pipeline):\n'
            'scores = [85, 42, 91, 67, 73, 95, 58, 88]\n'
            'passing = list(filter(lambda s: s >= 70, scores))\n'
            'grades = list(map(lambda s: f"{s} (A)" if s >= 90 else f"{s} (B)" if s >= 80 else f"{s} (C)", passing))\n'
            'print(f"Passing grades: {grades}")',
            output="Positive: [1, 3, 5, 7, 8]\n"
            "Valid: ['alice@co.com', 'charlie@co.com']\n"
            "Passing grades: ['85 (B)', '91 (A)', '73 (C)', '95 (A)', '88 (B)']",
            explanation="Note: list comprehensions often replace <code>map</code> and "
            "<code>filter</code> in modern Python. <code>[x * 2 for x in nums if x > 0]</code> "
            "is more readable than chaining map/filter."
        ),

        section("Functions returning functions"),

        concept("Function factories",
            "<p>Higher-order functions can also <strong>return</strong> functions. "
            "This lets you create specialized functions on the fly:</p>"
        ),

        code_example("Creating function factories",
            'def make_formatter(prefix, suffix=""):\n'
            '    """Create a string formatter with fixed prefix/suffix."""\n'
            '    def format_value(value):\n'
            '        return f"{prefix}{value}{suffix}"\n'
            '    return format_value\n'
            '\n'
            '# Create specialized formatters:\n'
            'format_currency = make_formatter("$", "")\n'
            'format_percent = make_formatter("", "%")\n'
            'format_tag = make_formatter("<", ">")\n'
            '\n'
            'print(format_currency(29.99))\n'
            'print(format_percent(85))\n'
            'print(format_tag("html"))\n'
            '\n'
            '# Use with map:\n'
            'prices = [10, 25.5, 7.99]\n'
            'formatted = list(map(format_currency, prices))\n'
            'print(formatted)',
            output="$29.99\n85%\n<html>\n['$10', '$25.5', '$7.99']",
        ),

        code_example("Event handler registry",
            'def create_event_system():\n'
            '    """Create a simple event system."""\n'
            '    handlers = {}  # event_name -> list of handler functions\n'
            '\n'
            '    def on(event_name, handler):\n'
            '        if event_name not in handlers:\n'
            '            handlers[event_name] = []\n'
            '        handlers[event_name].append(handler)\n'
            '\n'
            '    def emit(event_name, *args):\n'
            '        for handler in handlers.get(event_name, []):\n'
            '            handler(*args)\n'
            '\n'
            '    return on, emit\n'
            '\n'
            '# Use the event system:\n'
            'on, emit = create_event_system()\n'
            '\n'
            'on("login", lambda user: print(f"Welcome, {user}!"))\n'
            'on("login", lambda user: print(f"[LOG] {user} logged in"))\n'
            'on("logout", lambda user: print(f"Goodbye, {user}"))\n'
            '\n'
            'emit("login", "Alice")\n'
            'emit("logout", "Alice")',
            output="Welcome, Alice!\n[LOG] Alice logged in\nGoodbye, Alice",
            explanation="Multiple handlers can subscribe to the same event. "
            "<code>emit</code> calls all of them. This pattern is used in GUIs, web frameworks, "
            "and game engines."
        ),

        try_it("Sort a list of tuples <code>[(\"banana\", 1.20), (\"apple\", 0.80), (\"cherry\", 2.50)]</code> by price using a lambda key function."),

        section("Exercises"),

        exercise("starter", "Sort by custom key",
            "Given a list of student dictionaries with <code>name</code>, <code>grade</code>, "
            "and <code>age</code> fields, write three sorted calls: "
            "(1) sort by grade descending, (2) sort by name alphabetically, "
            "(3) sort by age ascending then by name. Print each result.",
            hint="Use <code>sorted(students, key=lambda s: -s[\"grade\"])</code> for descending. "
            "For multi-criteria: <code>key=lambda s: (s[\"age\"], s[\"name\"])</code>."
        ),

        exercise("medium", "Data transformer pipeline",
            "Build a function <code>pipeline(*functions)</code> that returns a new function. "
            "When called, the returned function passes its argument through each function in order. "
            "Test with: <code>process = pipeline(str.strip, str.lower, lambda s: s.replace(\" \", \"_\"))</code>. "
            "Calling <code>process(\"  Hello World  \")</code> should return <code>\"hello_world\"</code>.",
            hint="The returned function starts with the input value, then loops: "
            "<code>for func in functions: value = func(value)</code>. Return the final value."
        ),

        exercise("real-world", "Event handler registry with priorities",
            "Extend the event system so handlers have a <code>priority</code> (lower number = runs first). "
            "Modify <code>on(event, handler, priority=10)</code> to store the priority. "
            "Modify <code>emit</code> to run handlers sorted by priority. "
            "Add an <code>off(event, handler)</code> function to remove a handler. "
            "Test by registering handlers with different priorities and verifying they run in order.",
            hint="Store handlers as a list of <code>(priority, handler)</code> tuples. "
            "In <code>emit</code>, sort by priority: <code>sorted(handlers[event], key=lambda h: h[0])</code>."
        ),

        mistakes([
            ("Assigning lambdas to variables",
             "PEP 8 says: do not assign a lambda to a variable. If you need a name, use <code>def</code>. "
             "Lambdas are for inline, throwaway use."),
            ("Multi-line logic in lambdas",
             "Lambdas can only contain one expression. If you need <code>if/else</code>, loops, "
             "or multiple statements, use a regular function."),
            ("Forgetting <code>list()</code> around <code>map()</code>/<code>filter()</code>",
             "These return lazy iterators, not lists. Wrap with <code>list()</code> to see the results "
             "or iterate more than once."),
            ("Using <code>map</code>/<code>filter</code> when comprehensions are clearer",
             "<code>[x*2 for x in nums if x > 0]</code> is usually more readable than "
             "<code>list(map(lambda x: x*2, filter(lambda x: x > 0, nums)))</code>."),
        ]),

        pro_tips([
            "<strong>Prefer comprehensions over map/filter.</strong> They are more Pythonic "
            "and easier to read for most cases.",
            "<strong>Use <code>operator</code> module instead of simple lambdas.</strong> "
            "<code>from operator import itemgetter</code> then <code>sorted(users, key=itemgetter(\"age\"))</code> "
            "is faster and clearer than a lambda.",
            "<strong>Functions are objects.</strong> Store them in lists, dictionaries, "
            "pass them as arguments. This is what makes Python flexible.",
            "<strong>Use <code>functools.reduce</code> sparingly.</strong> It is powerful but "
            "hard to read. A simple loop is almost always clearer.",
        ]),

        recap([
            "<code>lambda params: expression</code> creates an anonymous function",
            "Higher-order functions take or return other functions",
            "<code>sorted(data, key=func)</code> sorts by a custom criterion",
            "<code>map(func, data)</code> transforms every element",
            "<code>filter(func, data)</code> keeps elements where func returns True",
            "Function factories return pre-configured functions",
            "Prefer list comprehensions over map/filter for readability",
        ]),
    ])
