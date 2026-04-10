"""Module 3, Lesson 4: List Comprehensions."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero("List Comprehensions",
             "Write in one line what used to take four &mdash; Python's most elegant feature"),

        why_it_matters(
            "<p>Comprehensions are everywhere in professional Python. They replace "
            "clunky for-loop-append patterns with clean, readable one-liners. "
            "Every Python job interview will test whether you can write them.</p>"
        ),

        section("The basic pattern"),

        concept("From loop to comprehension",
            "<p>A list comprehension builds a new list by transforming each item:</p>"
            "<p><code>[expression for item in iterable]</code></p>"
        ),

        code_example("Loop vs comprehension",
            '# The old way (4 lines)\n'
            'squares = []\n'
            'for x in range(6):\n'
            '    squares.append(x ** 2)\n'
            'print(squares)\n'
            '\n'
            '# Comprehension (1 line)\n'
            'squares = [x ** 2 for x in range(6)]\n'
            'print(squares)',
            output="[0, 1, 4, 9, 16, 25]\n[0, 1, 4, 9, 16, 25]",
            explanation="Same result, but the comprehension is shorter and more Pythonic."
        ),

        section("Adding conditions"),

        code_example("Filter with if",
            '# Only even numbers\n'
            'evens = [x for x in range(20) if x % 2 == 0]\n'
            'print(evens)\n'
            '\n'
            '# Words longer than 3 letters\n'
            'words = ["hi", "hello", "hey", "greetings", "yo"]\n'
            'long_words = [w for w in words if len(w) > 3]\n'
            'print(long_words)',
            output="[0, 2, 4, 6, 8, 10, 12, 14, 16, 18]\n['hello', 'greetings']",
        ),

        code_example("If-else in expression",
            '# Classify numbers\n'
            'labels = ["even" if x % 2 == 0 else "odd" for x in range(5)]\n'
            'print(labels)',
            output="['even', 'odd', 'even', 'odd', 'even']",
            explanation="When using if-else in the expression part, it goes BEFORE the for. "
            "When filtering, the if goes AFTER."
        ),

        section("Dict and set comprehensions"),

        code_example("Dict comprehension",
            'names = ["Alice", "Bob", "Charlie"]\n'
            'name_lengths = {name: len(name) for name in names}\n'
            'print(name_lengths)\n'
            '\n'
            '# Invert a dictionary\n'
            'rgb = {"red": "#ff0000", "green": "#00ff00", "blue": "#0000ff"}\n'
            'hex_to_name = {v: k for k, v in rgb.items()}\n'
            'print(hex_to_name)',
            output="{'Alice': 5, 'Bob': 3, 'Charlie': 7}\n{'#ff0000': 'red', '#00ff00': 'green', '#0000ff': 'blue'}",
        ),

        code_example("Set comprehension",
            '# Unique first letters\n'
            'cities = ["Paris", "Prague", "Portland", "Berlin", "Boston"]\n'
            'first_letters = {city[0] for city in cities}\n'
            'print(first_letters)',
            output="{'P', 'B'}",
            explanation="Set comprehension uses <code>{}</code> like dict but without key:value pairs."
        ),

        section("Nested comprehensions"),

        code_example("Flatten a matrix",
            'matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]\n'
            'flat = [num for row in matrix for num in row]\n'
            'print(flat)\n'
            '\n'
            '# Create a multiplication table\n'
            'table = [[i * j for j in range(1, 4)] for i in range(1, 4)]\n'
            'print(table)',
            output="[1, 2, 3, 4, 5, 6, 7, 8, 9]\n[[1, 2, 3], [2, 4, 6], [3, 6, 9]]",
            explanation="Read nested comprehensions left-to-right: outer loop first, then inner."
        ),

        try_it("Try building a list of squares of even numbers from 1 to 20 in one line."),

        section("Exercises"),

        exercise("starter", "Filter and transform",
            "Given <code>temps_f = [32, 68, 95, 104, 50, 77]</code> (Fahrenheit), "
            "create a list of only those temperatures converted to Celsius "
            "that are above 25°C. Formula: <code>C = (F - 32) * 5/9</code>.",
            hint="<code>[round((f-32)*5/9, 1) for f in temps_f if (f-32)*5/9 > 25]</code>"
        ),

        exercise("medium", "Word frequency dict",
            "Given a string <code>text = \"the cat sat on the mat the cat\"</code>, "
            "use <code>.split()</code> and a dict comprehension to create "
            "<code>{word: count}</code> where count is how many times each word appears.",
            hint="First get unique words with <code>set(text.split())</code>, "
            "then <code>{w: text.split().count(w) for w in set(text.split())}</code>"
        ),

        exercise("real-world", "Data cleanup pipeline",
            "You have raw user data: <code>raw = [\" Alice \", \"bob\", \"\", \"CHARLIE\", \" \", \"diana\"]</code>. "
            "In a single comprehension, produce a cleaned list: strip whitespace, "
            "capitalize each name, and exclude empty strings. "
            "Expected result: <code>[\"Alice\", \"Bob\", \"Charlie\", \"Diana\"]</code>.",
            hint="<code>[name.strip().capitalize() for name in raw if name.strip()]</code>"
        ),

        mistakes([
            ("Putting the if-else in the wrong place",
             "Filter: <code>[x for x in lst if x > 0]</code> (if after for). "
             "Transform: <code>[x if x > 0 else 0 for x in lst]</code> (if-else before for). "
             "Mixing these up is the #1 comprehension error."),
            ("Making comprehensions too complex",
             "If your comprehension needs 3+ conditions or nested logic, "
             "use a regular for loop instead. Readability beats cleverness."),
            ("Forgetting that dict comprehension needs curly braces",
             "<code>[k: v for k, v in items]</code> is a syntax error. "
             "Use <code>{k: v for k, v in items}</code>."),
        ]),

        pro_tips([
            "<strong>Generator expressions</strong> use <code>()</code> instead of <code>[]</code> "
            "and produce items lazily — great for huge datasets: "
            "<code>sum(x**2 for x in range(1000000))</code>.",
            "<strong>Keep it simple.</strong> If a comprehension doesn't fit on one line "
            "or takes more than 5 seconds to read, use a loop.",
            "<strong>Comprehensions are faster</strong> than equivalent for-loop-append "
            "patterns because Python optimizes them internally.",
        ]),

        recap([
            "List: <code>[expr for item in iterable]</code>",
            "Filter: <code>[expr for item in iterable if condition]</code>",
            "Transform: <code>[a if cond else b for item in iterable]</code>",
            "Dict: <code>{key: val for item in iterable}</code>",
            "Set: <code>{expr for item in iterable}</code>",
            "Keep comprehensions readable — no more than one level of nesting",
        ]),
    ])
