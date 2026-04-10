"""Module 2, Lesson 3: For Loops & Range."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "For Loops &amp; Range",
            "Repeat actions automatically &mdash; the real power of programming.",
        ),

        why_it_matters(
            "<p>Imagine printing 1,000 user names, calculating totals for 500 orders, "
            "or checking every pixel in an image. Doing it line by line is impossible. "
            "Loops let you say \"do this for every item\" and the computer handles the "
            "repetition. Loops turn 1,000 lines into 3.</p>"
        ),

        section("The for loop"),

        concept("Iterating over a sequence",
            "<p>The <code>for</code> loop walks through a sequence (list, string, range, etc.) "
            "one item at a time. Each pass through the loop is called an <strong>iteration</strong>.</p>"
            "<p>Syntax: <code>for variable in sequence:</code></p>"
        ),

        code_example("Looping over a list",
            'fruits = ["apple", "banana", "cherry", "date"]\n'
            '\n'
            'for fruit in fruits:\n'
            '    print(f"I like {fruit}")',
            output="I like apple\nI like banana\nI like cherry\nI like date",
            explanation="The variable <code>fruit</code> takes on each value in the list, "
            "one at a time. After the last item, the loop ends."
        ),

        code_example("Looping over a string",
            'word = "Python"\n'
            '\n'
            'for char in word:\n'
            '    print(char, end=" ")\n'
            'print()   # newline at the end',
            output="P y t h o n",
            explanation="A string is a sequence of characters. The loop visits each character, "
            "one per iteration. The <code>end=\" \"</code> argument makes print use a space "
            "instead of a newline."
        ),

        section("The range() function"),

        concept("Generating number sequences",
            "<p><code>range()</code> produces a sequence of numbers. It does not create a list "
            "in memory &mdash; it generates numbers on demand, which is efficient even for "
            "millions of numbers.</p>"
            "<ul>"
            "<li><code>range(n)</code> &mdash; 0, 1, 2, ..., n-1</li>"
            "<li><code>range(start, stop)</code> &mdash; start, start+1, ..., stop-1</li>"
            "<li><code>range(start, stop, step)</code> &mdash; start, start+step, ..., up to (not including) stop</li>"
            "</ul>"
        ),

        code_example("range() basics",
            '# range(n) — 0 to n-1\n'
            'for i in range(5):\n'
            '    print(i, end=" ")\n'
            'print()   # 0 1 2 3 4\n'
            '\n'
            '# range(start, stop) — start to stop-1\n'
            'for i in range(2, 7):\n'
            '    print(i, end=" ")\n'
            'print()   # 2 3 4 5 6\n'
            '\n'
            '# range(start, stop, step)\n'
            'for i in range(0, 20, 5):\n'
            '    print(i, end=" ")\n'
            'print()   # 0 5 10 15',
            output="0 1 2 3 4\n2 3 4 5 6\n0 5 10 15",
            explanation="Notice that <code>range()</code> always stops <strong>before</strong> "
            "the stop value. This is consistent with how Python slicing works."
        ),

        code_example("Counting backwards",
            '# Countdown\n'
            'for i in range(5, 0, -1):\n'
            '    print(i, end=" ")\n'
            'print("Go!")',
            output="5 4 3 2 1 Go!",
            explanation="Use a negative step to count backwards. The stop value "
            "(0) is still excluded."
        ),

        section("enumerate() — index + value"),

        concept("When you need the position",
            "<p>Sometimes you need both the item <strong>and</strong> its index. "
            "Use <code>enumerate()</code> instead of manually tracking a counter.</p>"
        ),

        code_example("Using enumerate()",
            'colors = ["red", "green", "blue", "yellow"]\n'
            '\n'
            '# Without enumerate (clunky)\n'
            'i = 0\n'
            'for color in colors:\n'
            '    print(f"{i}: {color}")\n'
            '    i += 1\n'
            '\n'
            'print("---")\n'
            '\n'
            '# With enumerate (clean)\n'
            'for i, color in enumerate(colors):\n'
            '    print(f"{i}: {color}")\n'
            '\n'
            'print("---")\n'
            '\n'
            '# Start from 1 instead of 0\n'
            'for i, color in enumerate(colors, start=1):\n'
            '    print(f"{i}. {color}")',
            output="0: red\n1: green\n2: blue\n3: yellow\n---\n0: red\n1: green\n2: blue\n3: yellow\n---\n1. red\n2. green\n3. blue\n4. yellow",
            explanation="<code>enumerate()</code> returns pairs of (index, value). "
            "The <code>start</code> parameter changes the starting index number."
        ),

        section("The accumulator pattern"),

        concept("Building up a result",
            "<p>The <strong>accumulator pattern</strong> is one of the most important patterns "
            "in programming: start with an initial value, then update it in each iteration.</p>"
        ),

        code_example("Summing numbers",
            'numbers = [10, 25, 30, 15, 20]\n'
            '\n'
            '# Accumulator: start at 0, add each number\n'
            'total = 0\n'
            'for num in numbers:\n'
            '    total += num\n'
            '\n'
            'print(f"Sum: {total}")\n'
            'print(f"Average: {total / len(numbers)}")',
            output="Sum: 100\nAverage: 20.0",
            explanation="The accumulator <code>total</code> starts at 0 and grows with each iteration. "
            "Python has a built-in <code>sum()</code>, but understanding the pattern is essential."
        ),

        code_example("Counting with a condition",
            'grades = [88, 72, 95, 61, 84, 55, 91, 78]\n'
            '\n'
            '# Count how many students passed (>= 70)\n'
            'pass_count = 0\n'
            'fail_count = 0\n'
            '\n'
            'for grade in grades:\n'
            '    if grade >= 70:\n'
            '        pass_count += 1\n'
            '    else:\n'
            '        fail_count += 1\n'
            '\n'
            'print(f"Passed: {pass_count}")\n'
            'print(f"Failed: {fail_count}")',
            output="Passed: 6\nFailed: 2",
        ),

        code_example("Building a string",
            'words = ["Python", "is", "awesome"]\n'
            '\n'
            '# Build a sentence\n'
            'sentence = ""\n'
            'for word in words:\n'
            '    sentence += word + " "\n'
            '\n'
            'print(sentence.strip())\n'
            '\n'
            '# Better way: str.join()\n'
            'sentence = " ".join(words)\n'
            'print(sentence)',
            output="Python is awesome\nPython is awesome",
            explanation="The accumulator pattern works for strings too. But "
            "<code>\" \".join()</code> is more efficient and more Pythonic for "
            "combining strings."
        ),

        code_example("Finding min/max manually",
            'temperatures = [72, 68, 75, 81, 69, 77, 73]\n'
            '\n'
            'highest = temperatures[0]   # start with first value\n'
            'lowest = temperatures[0]\n'
            '\n'
            'for temp in temperatures:\n'
            '    if temp > highest:\n'
            '        highest = temp\n'
            '    if temp < lowest:\n'
            '        lowest = temp\n'
            '\n'
            'print(f"Highest: {highest}F")\n'
            'print(f"Lowest: {lowest}F")\n'
            'print(f"Range: {highest - lowest}F")',
            output="Highest: 81F\nLowest: 68F\nRange: 13F",
            explanation="Initialize the accumulator with the first element, not 0. "
            "Python has built-in <code>max()</code> and <code>min()</code>, but "
            "knowing the pattern helps you handle custom logic."
        ),

        section("Useful loop techniques"),

        code_example("Looping over a dictionary",
            'prices = {"apple": 1.20, "banana": 0.50, "cherry": 2.00}\n'
            '\n'
            'for fruit, price in prices.items():\n'
            '    print(f"{fruit}: ${price:.2f}")\n'
            '\n'
            '# Just keys\n'
            'for fruit in prices:\n'
            '    print(fruit)\n'
            '\n'
            '# Just values\n'
            'for price in prices.values():\n'
            '    print(price)',
            output="apple: $1.20\nbanana: $0.50\ncherry: $2.00\napple\nbanana\ncherry\n1.2\n0.5\n2.0",
        ),

        code_example("zip() — looping over parallel lists",
            'names = ["Alice", "Bob", "Charlie"]\n'
            'scores = [92, 85, 78]\n'
            '\n'
            'for name, score in zip(names, scores):\n'
            '    print(f"{name}: {score}")',
            output="Alice: 92\nBob: 85\nCharlie: 78",
            explanation="<code>zip()</code> pairs up elements from two or more sequences. "
            "It stops at the shortest sequence."
        ),

        try_it("Use a for loop to print the squares of numbers 1 through 10."),

        section("Exercises"),

        exercise("starter", "Multiplication table",
            "Ask the user for a number. Print its multiplication table from 1 to 12. "
            "Output should look like:<br>"
            "<code>7 x 1 = 7<br>7 x 2 = 14<br>...<br>7 x 12 = 84</code>",
            hint="Use <code>for i in range(1, 13)</code> and print "
            "<code>f\"{num} x {i} = {num * i}\"</code>."
        ),

        exercise("medium", "Star pattern printer",
            "Ask the user for a number <code>n</code>. Print these patterns:<br>"
            "<strong>Right triangle:</strong><br>"
            "<code>*<br>**<br>***<br>****<br>*****</code><br>"
            "<strong>Inverted triangle:</strong><br>"
            "<code>*****<br>****<br>***<br>**<br>*</code><br>"
            "<strong>Pyramid (centered):</strong><br>"
            "<code>&nbsp;&nbsp;&nbsp;&nbsp;*<br>&nbsp;&nbsp;&nbsp;***<br>&nbsp;&nbsp;*****<br>&nbsp;*******<br>*********</code>",
            hint="Right triangle: <code>print(\"*\" * i)</code> for i in 1..n. "
            "Inverted: same but reversed range. Pyramid: "
            "<code>print(\" \" * (n - i) + \"*\" * (2 * i - 1))</code>."
        ),

        exercise("real-world", "Shopping cart total calculator",
            "Create a list of items, each with a name, price, and quantity:<br>"
            "<code>cart = [(\"Laptop\", 999.99, 1), (\"Mouse\", 29.99, 2), "
            "(\"USB Cable\", 9.99, 3), (\"Monitor\", 349.99, 1)]</code><br>"
            "Loop through the cart and print a formatted receipt:<br>"
            "- Each line: item name (left-aligned), quantity, line total (right-aligned)<br>"
            "- Subtotal, tax (8.5%), and grand total at the bottom<br>"
            "- Use f-string alignment for clean columns.",
            hint="Unpack tuples: <code>for name, price, qty in cart</code>. "
            "Accumulate: <code>subtotal += price * qty</code>. "
            "Format: <code>f\"{name:<20} x{qty:<3} ${price * qty:>10.2f}\"</code>."
        ),

        mistakes([
            ("Off-by-one with range()",
             "<code>range(5)</code> gives 0-4, not 1-5. For 1-5 use <code>range(1, 6)</code>."),
            ("Modifying a list while looping over it",
             "Never add or remove items from a list you are looping over. "
             "Loop over a copy instead: <code>for item in items[:]:</code>."),
            ("Using <code>range(len(...))</code> when you do not need the index",
             "Write <code>for item in items</code> not <code>for i in range(len(items))</code>. "
             "If you need both, use <code>enumerate()</code>."),
            ("Initializing the accumulator inside the loop",
             "<code>total = 0</code> must be <strong>before</strong> the loop. "
             "Inside the loop, it resets every iteration."),
        ]),

        pro_tips([
            "<strong>Prefer <code>for</code> over <code>while</code></strong> when you know how many "
            "iterations you need. <code>for</code> loops cannot accidentally infinite-loop.",
            "<strong>Use <code>enumerate()</code></strong> instead of tracking a counter variable manually.",
            "<strong>Use <code>sum()</code>, <code>min()</code>, <code>max()</code></strong> for simple "
            "aggregations. The accumulator pattern is for custom logic.",
            "<strong>List comprehensions</strong> (coming in Module 3) can replace many simple for loops. "
            "For now, focus on the loop pattern.",
            "<strong>Use <code>zip()</code></strong> to loop over multiple sequences in parallel "
            "instead of indexing into each one.",
        ]),

        recap([
            "<code>for item in sequence:</code> loops through each item",
            "<code>range(n)</code> generates 0 to n-1; <code>range(start, stop, step)</code> for control",
            "<code>enumerate()</code> gives you (index, value) pairs",
            "Accumulator pattern: initialize before the loop, update inside",
            "Use <code>zip()</code> for parallel iteration",
            "Do not modify a list while iterating over it",
        ]),
    ])
