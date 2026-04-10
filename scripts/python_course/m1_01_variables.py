"""Module 1, Lesson 1: Variables & Data Types.

PEDAGOGICAL NOTES:
- This is the FIRST lesson. Student knows nothing about Python yet.
- Only use: print() with comma-separated values, =, basic types
- Do NOT use: f-strings (M1_02), if/else (M2), loops (M2), lists (M3)
- Do NOT say "open sandbox" without explaining what it is
- Exercises must be solvable with ONLY the concepts taught in THIS lesson
"""
from .helpers import (
    assemble, lesson_header, key_questions, section, subsection, text,
    code, note, try_it, exercise, mistakes, pro_tips, recap, whats_next,
)


def build() -> str:
    return assemble([
        lesson_header("1.1", "Variables &amp; Data Types",
            "In this lesson you will learn how to store data in Python using "
            "variables, and discover the four basic data types that every "
            "Python program uses."
        ),

        key_questions([
            "What is a variable and why do we need them?",
            "How do you create a variable in Python?",
            "What are the four basic data types?",
            "How do you check the type of a value?",
            "What are the rules for naming variables?",
        ]),

        section("What is a variable?"),

        text(
            "A <strong>variable</strong> is a name that refers to a value stored "
            "in your computer's memory. Think of it as a label on a box — the label "
            "is the variable name, and the contents of the box is the value."
        ),

        text(
            "To create a variable, you write the name, then <code>=</code>, then "
            "the value you want to store. This is called <strong>assignment</strong>:"
        ),

        code(
            'name = "Alice"\n'
            'age = 25\n'
            'is_student = True\n'
            'balance = 1049.99'
        ),

        text(
            "After these lines run, Python remembers four values. You can use "
            "these names later in your program instead of the raw values."
        ),

        section("Printing values"),

        text(
            "The <code>print()</code> function shows values on the screen. "
            "This is how your program communicates with the outside world."
        ),

        code(
            'print(name)\n'
            'print(age)\n'
            'print(balance)',
            output="Alice\n25\n1049.99"
        ),

        text(
            "You can print several values at once by separating them with commas. "
            "Python will put spaces between them automatically:"
        ),

        code(
            'print("Name:", name)\n'
            'print("Age:", age)\n'
            'print("Balance:", balance)',
            output="Name: Alice\nAge: 25\nBalance: 1049.99"
        ),

        text(
            "This pattern — <code>print(\"label:\", variable)</code> — is the "
            "simplest way to display values with descriptions. We will learn "
            "more powerful formatting in the next lesson."
        ),

        section("The four basic types"),

        text(
            "Every value in Python has a <strong>type</strong> that determines "
            "what you can do with it. There are four basic types:"
        ),

        text(
            "<ul>"
            "<li><code>str</code> — text (strings): <code>\"hello\"</code>, <code>'world'</code></li>"
            "<li><code>int</code> — whole numbers: <code>42</code>, <code>-7</code>, <code>0</code></li>"
            "<li><code>float</code> — decimal numbers: <code>3.14</code>, <code>-0.5</code></li>"
            "<li><code>bool</code> — logical values: <code>True</code>, <code>False</code></li>"
            "</ul>"
        ),

        text(
            "You can check any value's type with the <code>type()</code> function. "
            "It returns the type name in angle brackets:"
        ),

        code(
            'print(type("hello"))\n'
            'print(type(42))\n'
            'print(type(3.14))\n'
            'print(type(True))',
            output="<class 'str'>\n<class 'int'>\n<class 'float'>\n<class 'bool'>"
        ),

        text(
            "The output <code>&lt;class 'str'&gt;</code> means the value belongs "
            "to the <code>str</code> (string) type. Don't worry about the word "
            "\"class\" for now — we will explain it in Module 5."
        ),

        section("Using variables in calculations"),

        text(
            "Variables holding numbers can be used in arithmetic, "
            "just like the numbers themselves:"
        ),

        code(
            'price = 29.99\n'
            'quantity = 3\n'
            'total = price * quantity\n'
            'print("Total:", total)',
            output="Total: 89.97"
        ),

        text(
            "Here Python multiplied the values stored in <code>price</code> "
            "and <code>quantity</code>, and stored the result in a new variable "
            "<code>total</code>."
        ),

        section("Changing a variable's value"),

        text(
            "A variable can be reassigned at any time. The old value is "
            "simply replaced by the new one:"
        ),

        code(
            'score = 0\n'
            'print("Start:", score)\n'
            '\n'
            'score = score + 10\n'
            'print("After bonus:", score)\n'
            '\n'
            'score = score + 5\n'
            'print("Final:", score)',
            output="Start: 0\nAfter bonus: 10\nFinal: 15"
        ),

        text(
            "The expression <code>score = score + 10</code> means: take the "
            "current value of <code>score</code>, add 10, and store the result "
            "back in <code>score</code>. Python also has a shorthand for this:"
        ),

        code(
            'score = 0\n'
            'score += 10    # same as: score = score + 10\n'
            'score += 5     # same as: score = score + 5\n'
            'print(score)',
            output="15"
        ),

        note(
            "The <code>+=</code> operator adds to the existing value. "
            "Similarly: <code>-=</code> subtracts, <code>*=</code> multiplies, "
            "<code>/=</code> divides."
        ),

        section("Naming rules"),

        text(
            "Python has rules about what names are allowed for variables:"
        ),

        text(
            "<ul>"
            "<li>Must start with a letter or underscore: <code>name</code>, <code>_count</code></li>"
            "<li>Can contain letters, digits, and underscores: <code>user_age</code>, <code>item2</code></li>"
            "<li>Cannot start with a digit: <code>2fast</code> is invalid</li>"
            "<li>Cannot be a Python keyword: <code>if</code>, <code>class</code>, <code>return</code></li>"
            "<li>Are case-sensitive: <code>Name</code> and <code>name</code> are different variables</li>"
            "</ul>"
        ),

        subsection("Convention: snake_case"),

        text(
            "Python developers use <strong>snake_case</strong> for variable names — "
            "all lowercase, words separated by underscores:"
        ),

        code(
            '# Good — clear, descriptive\n'
            'user_email = "alice@example.com"\n'
            'items_in_cart = 5\n'
            'is_logged_in = True\n'
            '\n'
            '# Bad — unclear or wrong style\n'
            'x = "alice@example.com"    # what is x?\n'
            'ItemsInCart = 5            # this style is for classes, not variables\n'
            'a = True                   # meaningless name'
        ),

        text(
            "Good names make your code readable without additional comments. "
            "Someone reading <code>user_email</code> instantly knows what it holds."
        ),

        section("Multiple assignment"),

        text("Python lets you assign several variables at once on a single line:"),

        code(
            'x, y, z = 1, 2, 3\n'
            'print(x, y, z)',
            output="1 2 3"
        ),

        text(
            "A useful trick — you can swap two variables without a temporary one:"
        ),

        code(
            'a = 10\n'
            'b = 20\n'
            'a, b = b, a\n'
            'print("a:", a, "b:", b)',
            output="a: 20 b: 10"
        ),

        # --- Practice section ---
        section("Practice"),

        text(
            "Try the exercises below. Each one uses <strong>only</strong> the "
            "concepts from this lesson: variables, <code>print()</code>, basic "
            "types, and arithmetic. Click on the exercise to open the code editor."
        ),

        exercise("starter", "Tip calculator",
            "Create three variables: <code>meal_cost = 45.00</code>, "
            "<code>tip_percent = 0.18</code>, and <code>num_people = 3</code>. "
            "Calculate the tip, the total bill, and the cost per person. "
            "Print each result using <code>print()</code> with a label, like: "
            "<code>print(\"Tip:\", tip)</code>.",
            hint="<code>tip = meal_cost * tip_percent</code>, "
            "then <code>total = meal_cost + tip</code>, "
            "then <code>per_person = total / num_people</code>."
        ),

        exercise("medium", "Temperature converter",
            "Create a variable <code>celsius = 37.5</code>. "
            "Convert it to Fahrenheit: <code>fahrenheit = celsius * 9/5 + 32</code>. "
            "Print both values with labels: "
            "<code>print(\"Celsius:\", celsius)</code> and "
            "<code>print(\"Fahrenheit:\", fahrenheit)</code>.",
        ),

        exercise("real-world", "User profile",
            "Create six variables for a user profile: "
            "<code>username</code> (str), <code>email</code> (str), <code>age</code> (int), "
            "<code>balance</code> (float), <code>is_premium</code> (bool), <code>signup_year</code> (int). "
            "Give them realistic values. Then print each one with a label using "
            "<code>print()</code>. For example: <code>print(\"Username:\", username)</code>.",
        ),

        # --- Mistakes ---
        mistakes([
            ("Using <code>=</code> to compare instead of <code>==</code>",
             "<code>=</code> assigns a value. <code>==</code> checks equality "
             "(you'll learn about this in Module 2)."),
            ("Starting a variable name with a digit",
             "<code>2fast</code> is a syntax error. Use <code>fast2</code> or "
             "<code>two_fast</code> instead."),
            ("Confusing <code>int</code> and <code>str</code>",
             "<code>age = 25</code> is an integer. <code>age = \"25\"</code> is a "
             "string that looks like a number. They behave very differently."),
            ("Case sensitivity",
             "<code>Name</code> and <code>name</code> are two separate variables. "
             "Stick to <code>lowercase_with_underscores</code> and you won't "
             "run into this."),
        ]),

        pro_tips([
            "<strong>Descriptive names save time.</strong> <code>total_price</code> "
            "is always better than <code>tp</code>. Code is read 10x more often than it's written.",
            "<strong>Constants by convention:</strong> use <code>ALL_CAPS</code> "
            "for values that shouldn't change: <code>MAX_RETRIES = 3</code>.",
            "<strong><code>type()</code> is your first debugger.</strong> "
            "When something behaves unexpectedly, check the type: "
            "<code>print(type(x))</code>.",
        ]),

        recap([
            "A variable stores a value: <code>name = value</code>",
            "Four basic types: <code>str</code>, <code>int</code>, <code>float</code>, <code>bool</code>",
            "<code>print()</code> shows values on screen",
            "Check types with <code>type(x)</code>",
            "Use <code>snake_case</code> for variable names",
            "Variables can be reassigned: <code>x += 1</code>",
        ]),

        whats_next("Strings &amp; F-Strings",
            "you'll learn how to manipulate text: slicing, searching, replacing, "
            "and the powerful f-string syntax for embedding variables directly "
            "inside strings."
        ),
    ])
