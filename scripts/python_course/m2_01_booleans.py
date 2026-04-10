"""Module 2, Lesson 1: Booleans & Comparisons."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Booleans &amp; Comparisons",
            "Every decision in code comes down to one question: True or False?",
        ),

        why_it_matters(
            "<p>Every time your code makes a decision &mdash; should I show this page? "
            "Is the password correct? Has the timer expired? &mdash; it evaluates "
            "a <strong>boolean expression</strong>. Booleans are the foundation of "
            "all control flow: if statements, loops, filters, and validations.</p>"
        ),

        section("True and False"),

        concept("The bool type",
            "<p>Python has exactly two boolean values: <code>True</code> and <code>False</code>. "
            "They are their own type: <code>bool</code>.</p>"
            "<p>Note the capitalization &mdash; <code>True</code> not <code>true</code>. "
            "Python is case-sensitive.</p>"
        ),

        code_example("Boolean basics",
            'is_logged_in = True\n'
            'has_paid = False\n'
            '\n'
            'print(is_logged_in)        # True\n'
            'print(type(is_logged_in))  # <class \'bool\'>\n'
            'print(type(has_paid))      # <class \'bool\'>',
            output="True\n<class 'bool'>\n<class 'bool'>",
        ),

        section("Comparison operators"),

        concept("Comparing values",
            "<p>Comparison operators compare two values and return <code>True</code> or <code>False</code>:</p>"
            "<ul>"
            "<li><code>==</code> &mdash; equal to</li>"
            "<li><code>!=</code> &mdash; not equal to</li>"
            "<li><code>&lt;</code> &mdash; less than</li>"
            "<li><code>&gt;</code> &mdash; greater than</li>"
            "<li><code>&lt;=</code> &mdash; less than or equal to</li>"
            "<li><code>&gt;=</code> &mdash; greater than or equal to</li>"
            "</ul>"
        ),

        code_example("Comparison examples",
            'age = 25\n'
            '\n'
            'print(age == 25)    # True\n'
            'print(age != 30)    # True\n'
            'print(age < 18)     # False\n'
            'print(age > 21)     # True\n'
            'print(age <= 25)    # True\n'
            'print(age >= 30)    # False',
            output="True\nTrue\nFalse\nTrue\nTrue\nFalse",
            explanation="Each expression evaluates to a boolean. "
            "These are the building blocks of every <code>if</code> statement."
        ),

        code_example("Comparing strings",
            'name = "Alice"\n'
            '\n'
            'print(name == "Alice")   # True\n'
            'print(name == "alice")   # False — case matters!\n'
            'print(name != "Bob")     # True\n'
            'print(name < "Bob")      # True — alphabetical order\n'
            'print("apple" < "banana")  # True',
            output="True\nFalse\nTrue\nTrue\nTrue",
            explanation="Strings are compared character by character using Unicode values. "
            "Uppercase letters come before lowercase (<code>\"A\" &lt; \"a\"</code>)."
        ),

        section("Logical operators"),

        concept("Combining conditions with and, or, not",
            "<p>Logical operators let you combine multiple boolean expressions:</p>"
            "<ul>"
            "<li><code>and</code> &mdash; both must be True</li>"
            "<li><code>or</code> &mdash; at least one must be True</li>"
            "<li><code>not</code> &mdash; flips True to False and vice versa</li>"
            "</ul>"
        ),

        code_example("Logical operators in action",
            'age = 25\n'
            'has_id = True\n'
            '\n'
            '# and — both conditions must be True\n'
            'can_enter_bar = age >= 21 and has_id\n'
            'print(can_enter_bar)   # True\n'
            '\n'
            '# or — at least one must be True\n'
            'is_weekend = False\n'
            'is_holiday = True\n'
            'day_off = is_weekend or is_holiday\n'
            'print(day_off)         # True\n'
            '\n'
            '# not — flips the value\n'
            'is_raining = False\n'
            'go_outside = not is_raining\n'
            'print(go_outside)      # True',
            output="True\nTrue\nTrue",
        ),

        code_example("Combining multiple conditions",
            'temperature = 72\n'
            'is_sunny = True\n'
            'is_weekend = True\n'
            '\n'
            '# Complex condition\n'
            'go_to_park = is_sunny and is_weekend and temperature > 60\n'
            'print(go_to_park)   # True\n'
            '\n'
            '# Precedence: not > and > or\n'
            'print(True or False and False)    # True  (and runs first)\n'
            'print((True or False) and False)  # False (parens override)',
            output="True\nTrue\nFalse",
            explanation="When mixing <code>and</code> and <code>or</code>, use parentheses "
            "to make your intent clear. Never rely on precedence for readability."
        ),

        section("Chained comparisons"),

        concept("Python's elegant range checks",
            "<p>Python lets you chain comparisons just like in math. "
            "Instead of <code>x &gt; 0 and x &lt; 100</code>, you can write "
            "<code>0 &lt; x &lt; 100</code>.</p>"
        ),

        code_example("Chained comparisons",
            'score = 85\n'
            '\n'
            '# Instead of: score >= 0 and score <= 100\n'
            'is_valid = 0 <= score <= 100\n'
            'print(is_valid)    # True\n'
            '\n'
            '# Range check\n'
            'age = 25\n'
            'is_young_adult = 18 <= age < 30\n'
            'print(is_young_adult)   # True\n'
            '\n'
            '# You can chain as many as you want\n'
            'x = 5\n'
            'print(1 < x < 10)       # True\n'
            'print(1 < x < 3)        # False',
            output="True\nTrue\nTrue\nFalse",
            explanation="Chained comparisons are more readable and more Pythonic "
            "than writing out <code>and</code> between each pair."
        ),

        section("Truthy and falsy values"),

        concept("Not just True and False",
            "<p>In Python, every value can be treated as a boolean. "
            "Values that act like <code>False</code> are called <strong>falsy</strong>. "
            "Everything else is <strong>truthy</strong>.</p>"
            "<p><strong>Falsy values:</strong></p>"
            "<ul>"
            "<li><code>False</code></li>"
            "<li><code>0</code>, <code>0.0</code></li>"
            "<li><code>\"\"</code> (empty string)</li>"
            "<li><code>None</code></li>"
            "<li><code>[]</code> (empty list)</li>"
            "<li><code>{}</code> (empty dict)</li>"
            "</ul>"
            "<p><strong>Everything else is truthy</strong>: non-zero numbers, "
            "non-empty strings, non-empty lists, etc.</p>"
        ),

        code_example("Truthy and falsy in practice",
            '# Falsy values\n'
            'print(bool(0))        # False\n'
            'print(bool(""))       # False\n'
            'print(bool(None))     # False\n'
            'print(bool([]))       # False\n'
            '\n'
            '# Truthy values\n'
            'print(bool(1))        # True\n'
            'print(bool("hello"))  # True\n'
            'print(bool([1, 2]))   # True\n'
            'print(bool(-5))       # True — any non-zero number!',
            output="False\nFalse\nFalse\nFalse\nTrue\nTrue\nTrue\nTrue",
        ),

        code_example("Practical use of truthiness",
            'username = ""\n'
            'items = []\n'
            '\n'
            '# Instead of: if username != ""\n'
            'if username:\n'
            '    print(f"Hello, {username}")\n'
            'else:\n'
            '    print("No username set")\n'
            '\n'
            '# Instead of: if len(items) > 0\n'
            'if items:\n'
            '    print(f"You have {len(items)} items")\n'
            'else:\n'
            '    print("Cart is empty")',
            output="No username set\nCart is empty",
            explanation="Checking truthiness directly is the Pythonic way to test for "
            "empty strings, empty lists, zero, and None."
        ),

        section("Identity and membership"),

        concept("is and in operators",
            "<p>Two more ways to get boolean results:</p>"
            "<ul>"
            "<li><code>is</code> &mdash; checks if two variables point to the <strong>same object</strong> in memory "
            "(most commonly used with <code>None</code>)</li>"
            "<li><code>in</code> &mdash; checks if a value exists <strong>inside</strong> a collection</li>"
            "</ul>"
        ),

        code_example("is and in",
            'result = None\n'
            '\n'
            '# Use "is" for None checks\n'
            'print(result is None)       # True\n'
            'print(result is not None)   # False\n'
            '\n'
            '# Use "in" for membership\n'
            'fruits = ["apple", "banana", "cherry"]\n'
            'print("banana" in fruits)       # True\n'
            'print("grape" in fruits)        # False\n'
            'print("grape" not in fruits)    # True\n'
            '\n'
            '# Works with strings too\n'
            'email = "user@example.com"\n'
            'print("@" in email)    # True',
            output="True\nFalse\nTrue\nFalse\nTrue\nTrue",
            explanation="Always use <code>is</code> (not <code>==</code>) when comparing to <code>None</code>. "
            "The <code>in</code> operator works with strings, lists, tuples, dicts, and sets."
        ),

        try_it("Open the sandbox and experiment with comparisons. Try chaining them!"),

        section("Exercises"),

        exercise("starter", "Age verification",
            "Create a variable <code>age = 22</code>. Write boolean expressions "
            "that check: (1) is the person old enough to vote (18+)? "
            "(2) old enough to drink in the US (21+)? "
            "(3) old enough to rent a car (25+)? "
            "Print each result with a label.",
            hint="<code>can_vote = age >= 18</code>, then <code>print(f\"Can vote: {can_vote}\")</code>"
        ),

        exercise("medium", "Password validation rules",
            "Create a variable <code>password = \"MyP@ss123\"</code>. "
            "Check these rules and print whether each passes:<br>"
            "(1) at least 8 characters: <code>len(password) >= 8</code><br>"
            "(2) contains a digit: <code>any(c.isdigit() for c in password)</code><br>"
            "(3) contains uppercase: <code>any(c.isupper() for c in password)</code><br>"
            "(4) contains lowercase: <code>any(c.islower() for c in password)</code><br>"
            "Then combine all four with <code>and</code> into <code>is_valid</code>.",
            hint="<code>has_length = len(password) >= 8</code>, etc. "
            "Then <code>is_valid = has_length and has_digit and has_upper and has_lower</code>."
        ),

        exercise("real-world", "Eligibility checker",
            "Build a scholarship eligibility checker. A student is eligible if they meet "
            "<strong>all</strong> of these criteria:<br>"
            "(1) GPA is 3.5 or higher<br>"
            "(2) Age is between 17 and 25 (inclusive)<br>"
            "(3) Is a citizen OR has a valid visa<br>"
            "(4) Has no disciplinary record (boolean)<br>"
            "Create variables for each field, compute <code>is_eligible</code>, "
            "and print a detailed breakdown showing which criteria passed and which failed.",
            hint="Use chained comparison for age: <code>17 &lt;= age &lt;= 25</code>. "
            "For citizenship: <code>(is_citizen or has_visa)</code>. "
            "Combine with <code>and</code>."
        ),

        mistakes([
            ("Using <code>=</code> instead of <code>==</code>",
             "<code>=</code> assigns a value. <code>==</code> checks equality. "
             "<code>if x = 5</code> is a <code>SyntaxError</code>."),
            ("Using <code>==</code> to compare with <code>None</code>",
             "Always use <code>is None</code> or <code>is not None</code>. "
             "Using <code>==</code> can give unexpected results with custom objects."),
            ("Writing <code>if x == True</code>",
             "Just write <code>if x</code>. Similarly, <code>if x == False</code> "
             "should be <code>if not x</code>."),
            ("Forgetting operator precedence",
             "<code>not</code> runs before <code>and</code>, which runs before <code>or</code>. "
             "When in doubt, add parentheses."),
            ("Confusing <code>and</code>/<code>or</code> logic",
             "\"age is 18 or 21\" in English becomes <code>age == 18 or age == 21</code> "
             "in Python, NOT <code>age == 18 or 21</code> (which is always truthy)."),
        ]),

        pro_tips([
            "<strong>Use truthiness.</strong> Write <code>if items:</code> not <code>if len(items) > 0:</code>. "
            "Write <code>if name:</code> not <code>if name != \"\":</code>.",
            "<strong>Chain comparisons.</strong> <code>0 < x < 100</code> is cleaner than "
            "<code>x > 0 and x < 100</code>.",
            "<strong>Short-circuit evaluation:</strong> <code>and</code> stops at the first False, "
            "<code>or</code> stops at the first True. This means <code>x != 0 and 10/x > 2</code> "
            "is safe &mdash; if <code>x</code> is 0, the division never runs.",
            "<strong>Name your booleans well.</strong> Prefix with <code>is_</code>, <code>has_</code>, "
            "<code>can_</code>, or <code>should_</code>: <code>is_valid</code>, <code>has_access</code>.",
        ]),

        recap([
            "<code>True</code> and <code>False</code> are Python's boolean values",
            "Comparison operators: <code>==</code>, <code>!=</code>, <code>&lt;</code>, <code>&gt;</code>, <code>&lt;=</code>, <code>&gt;=</code>",
            "Logical operators: <code>and</code>, <code>or</code>, <code>not</code>",
            "Chain comparisons: <code>1 &lt; x &lt; 10</code>",
            "Falsy values: <code>0</code>, <code>\"\"</code>, <code>None</code>, <code>[]</code>, <code>{}</code>",
            "Use <code>is</code> for <code>None</code> checks, <code>in</code> for membership",
        ]),
    ])
