"""Module 1, Lesson 1: Variables & Data Types."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Variables &amp; Data Types",
            "Every program stores data. Variables are the labels you put on that data.",
        ),

        why_it_matters(
            "<p>Every line of real code you'll ever write uses variables. "
            "User's name? Variable. Price of a product? Variable. "
            "Whether someone is logged in? Variable. This is the foundation "
            "of everything else in programming.</p>"
        ),

        section("What is a variable?"),

        concept("Variables = labeled boxes",
            "<p>A variable is a <strong>name</strong> that points to a <strong>value</strong> "
            "in memory. You create one with the <code>=</code> sign (assignment):</p>"
        ),

        code_example("Creating variables",
            'name = "Alice"\n'
            'age = 25\n'
            'is_student = True\n'
            'balance = 1049.99',
            explanation="No need to declare types — Python figures them out automatically. "
            "This is called <strong>dynamic typing</strong>."
        ),

        code_example("Using variables",
            'price = 29.99\n'
            'quantity = 3\n'
            'total = price * quantity\n'
            'print(total)',
            output="89.97",
            explanation="Variables can be used in expressions just like the values they hold."
        ),

        section("The four basic types"),

        concept("Python's core data types",
            "<ul>"
            "<li><code>str</code> — text: <code>\"hello\"</code>, <code>'world'</code></li>"
            "<li><code>int</code> — whole numbers: <code>42</code>, <code>-7</code>, <code>0</code></li>"
            "<li><code>float</code> — decimals: <code>3.14</code>, <code>-0.5</code></li>"
            "<li><code>bool</code> — True/False: <code>True</code>, <code>False</code></li>"
            "</ul>"
            "<p>Check any value's type with <code>type()</code>:</p>"
        ),

        code_example("Checking types",
            'print(type("hello"))    # <class \'str\'>\n'
            'print(type(42))         # <class \'int\'>\n'
            'print(type(3.14))       # <class \'float\'>\n'
            'print(type(True))       # <class \'bool\'>',
        ),

        section("Naming rules"),

        concept("How to name variables",
            "<ul>"
            "<li><strong>Must</strong> start with a letter or underscore: <code>name</code>, <code>_count</code></li>"
            "<li><strong>Can</strong> contain letters, digits, underscores: <code>user_age</code>, <code>item2</code></li>"
            "<li><strong>Cannot</strong> be a Python keyword: <code>if</code>, <code>class</code>, <code>return</code></li>"
            "<li><strong>Convention</strong>: use <code>snake_case</code> for variables: <code>first_name</code>, <code>total_price</code></li>"
            "</ul>"
        ),

        code_example("Good vs bad names",
            '# ✅ Good — descriptive, snake_case\n'
            'user_email = "alice@example.com"\n'
            'items_in_cart = 5\n'
            'is_logged_in = True\n'
            '\n'
            '# ❌ Bad — unclear, wrong style\n'
            'x = "alice@example.com"    # what is x?\n'
            'ItemsInCart = 5            # PascalCase is for classes\n'
            'a = True                   # meaningless name',
            explanation="Good names make your code readable without comments. "
            "Someone reading <code>user_email</code> instantly knows what it holds."
        ),

        section("Reassignment & mutability"),

        code_example("Variables can change",
            'score = 0\n'
            'print(score)    # 0\n'
            '\n'
            'score = score + 10\n'
            'print(score)    # 10\n'
            '\n'
            'score += 5      # shorthand for score = score + 5\n'
            'print(score)    # 15',
            output="0\n10\n15",
            explanation="The <code>+=</code> operator is a shorthand. "
            "Also works: <code>-=</code>, <code>*=</code>, <code>/=</code>."
        ),

        section("Multiple assignment"),

        code_example("Assign several at once",
            '# Multiple assignment\n'
            'x, y, z = 1, 2, 3\n'
            'print(x, y, z)    # 1 2 3\n'
            '\n'
            '# Swap two variables (Python trick!)\n'
            'a, b = 10, 20\n'
            'a, b = b, a\n'
            'print(a, b)        # 20 10',
            output="1 2 3\n20 10",
        ),

        try_it("Open the Python sandbox, create some variables, and print their types."),

        section("Exercises"),

        exercise("starter", "Tip calculator variables",
            "Create three variables: <code>meal_cost = 45.00</code>, "
            "<code>tip_percent = 0.18</code>, <code>num_people = 3</code>. "
            "Calculate the tip amount, total bill, and cost per person. "
            "Print all three results.",
            hint="<code>tip = meal_cost * tip_percent</code>, "
            "<code>total = meal_cost + tip</code>, "
            "<code>per_person = total / num_people</code>"
        ),

        exercise("medium", "Temperature converter",
            "Create a variable <code>celsius = 37.5</code>. "
            "Convert it to Fahrenheit using the formula: <code>F = C * 9/5 + 32</code>. "
            "Store the result in <code>fahrenheit</code> and print both values "
            "in a sentence like: <em>37.5°C is 99.5°F</em>.",
            hint="Use f-strings for formatting: <code>f\"{celsius}°C is {fahrenheit}°F\"</code>"
        ),

        exercise("real-world", "User profile data",
            "You're building a user profile system. Create variables for: "
            "username (string), email (string), age (int), account_balance (float), "
            "is_premium (bool), signup_year (int). "
            "Then print a summary like:<br>"
            "<code>User: alice_dev (alice@dev.io, 28 years old)<br>"
            "Premium: True | Balance: $149.99 | Member since: 2023</code>",
            hint="Use an f-string with all 6 variables. "
            "For the dollar sign in f-strings, just write <code>$</code> normally."
        ),

        mistakes([
            ("Using <code>=</code> to compare instead of <code>==</code>",
             "<code>=</code> assigns a value. <code>==</code> checks equality. "
             "<code>if x = 5</code> is a syntax error."),
            ("Starting a variable name with a digit",
             "<code>2fast</code> is invalid. Use <code>fast2</code> or <code>two_fast</code>."),
            ("Assuming Python variables have fixed types",
             "<code>x = 5</code> then <code>x = 'hello'</code> is perfectly legal. "
             "Python doesn't enforce types (unless you use type hints)."),
            ("Forgetting that variable names are case-sensitive",
             "<code>Name</code> and <code>name</code> are two different variables."),
        ]),

        pro_tips([
            "<strong>Use descriptive names.</strong> <code>total_price</code> beats <code>tp</code> every time. "
            "Code is read 10x more than it's written.",
            "<strong>Constants by convention:</strong> use <code>ALL_CAPS</code> for values that shouldn't change: "
            "<code>MAX_RETRIES = 3</code>, <code>API_URL = 'https://...'</code>.",
            "<strong><code>type()</code> is your debugger.</strong> When something behaves unexpectedly, "
            "print the type first: <code>print(type(x))</code>.",
            "<strong>Python has no <code>const</code> keyword.</strong> <code>ALL_CAPS</code> is just a convention — "
            "nothing stops you from changing it. It's a promise to other developers.",
        ]),

        recap([
            "Variables store data: <code>name = value</code>",
            "Four basic types: <code>str</code>, <code>int</code>, <code>float</code>, <code>bool</code>",
            "Check type with <code>type(x)</code>",
            "Use <code>snake_case</code> for variable names",
            "Variables can be reassigned: <code>x += 1</code>",
            "Python is dynamically typed — no type declarations needed",
        ]),
    ])
