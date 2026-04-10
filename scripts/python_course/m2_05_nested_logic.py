"""Module 2, Lesson 5: Nested Logic & Pattern Matching."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Nested Logic &amp; Pattern Matching",
            "Combine loops and conditionals to solve real problems &mdash; plus Python's modern match/case.",
        ),

        why_it_matters(
            "<p>Real programs rarely use a single loop or a single if statement. "
            "You need loops inside loops to process grids, tables, and nested data. "
            "You need conditionals inside loops to filter, search, and transform. "
            "Mastering these combinations is what separates beginners from confident "
            "programmers.</p>"
        ),

        section("If inside loops"),

        concept("Filtering while iterating",
            "<p>The most common pattern: loop through data and use an <code>if</code> "
            "statement to decide what to do with each item.</p>"
        ),

        code_example("Processing with conditions",
            'orders = [\n'
            '    ("Alice", 250.00, "shipped"),\n'
            '    ("Bob", 89.99, "pending"),\n'
            '    ("Charlie", 450.00, "shipped"),\n'
            '    ("Diana", 32.50, "cancelled"),\n'
            '    ("Eve", 199.99, "pending"),\n'
            ']\n'
            '\n'
            'print("=== Pending Orders ===")\n'
            'pending_total = 0\n'
            '\n'
            'for name, amount, status in orders:\n'
            '    if status == "pending":\n'
            '        print(f"  {name}: ${amount:.2f}")\n'
            '        pending_total += amount\n'
            '\n'
            'print(f"\\nTotal pending: ${pending_total:.2f}")',
            output="=== Pending Orders ===\n  Bob: $89.99\n  Eve: $199.99\n\nTotal pending: $289.98",
            explanation="This is the filter-and-accumulate pattern: loop through everything, "
            "use if to select what you want, and accumulate a result."
        ),

        section("Loops inside loops"),

        concept("Nested loops",
            "<p>A loop inside another loop runs its <strong>entire cycle</strong> "
            "for each iteration of the outer loop. If the outer loop runs 5 times "
            "and the inner loop runs 10 times, the inner body executes 50 times.</p>"
        ),

        code_example("Multiplication table",
            '# Print a 5x5 multiplication table\n'
            'print("    ", end="")\n'
            'for j in range(1, 6):\n'
            '    print(f"{j:>4}", end="")\n'
            'print()  # newline\n'
            'print("   " + "-" * 20)\n'
            '\n'
            'for i in range(1, 6):\n'
            '    print(f"{i:>2} |", end="")\n'
            '    for j in range(1, 6):\n'
            '        print(f"{i * j:>4}", end="")\n'
            '    print()   # newline after each row',
            output="       1   2   3   4   5\n   --------------------\n 1 |   1   2   3   4   5\n 2 |   2   4   6   8  10\n 3 |   3   6   9  12  15\n 4 |   4   8  12  16  20\n 5 |   5  10  15  20  25",
            explanation="The outer loop controls the row, the inner loop controls the column. "
            "This two-dimensional pattern is fundamental to working with tables, grids, and matrices."
        ),

        code_example("Finding pairs",
            '# Find all pairs of numbers that sum to 10\n'
            'numbers = [1, 3, 5, 7, 9, 2, 4, 6, 8]\n'
            '\n'
            'print("Pairs that sum to 10:")\n'
            'for i in range(len(numbers)):\n'
            '    for j in range(i + 1, len(numbers)):\n'
            '        if numbers[i] + numbers[j] == 10:\n'
            '            print(f"  {numbers[i]} + {numbers[j]} = 10")',
            output="Pairs that sum to 10:\n  1 + 9 = 10\n  3 + 7 = 10\n  2 + 8 = 10\n  4 + 6 = 10",
            explanation="The inner loop starts at <code>i + 1</code> to avoid checking "
            "the same pair twice and to avoid pairing a number with itself."
        ),

        section("match/case (Python 3.10+)"),

        concept("Structural pattern matching",
            "<p>Python 3.10 introduced <code>match/case</code>, similar to switch/case "
            "in other languages but much more powerful. It matches values against patterns.</p>"
        ),

        code_example("Basic match/case",
            'command = "start"\n'
            '\n'
            'match command:\n'
            '    case "start":\n'
            '        print("Starting the engine...")\n'
            '    case "stop":\n'
            '        print("Stopping the engine...")\n'
            '    case "status":\n'
            '        print("Engine is running.")\n'
            '    case _:\n'
            '        print(f"Unknown command: {command}")',
            output="Starting the engine...",
            explanation="The <code>_</code> wildcard matches anything &mdash; it is the default case. "
            "Each <code>case</code> is checked in order, and the first match runs."
        ),

        code_example("Match with patterns",
            '# Match with OR patterns\n'
            'day = "Saturday"\n'
            '\n'
            'match day:\n'
            '    case "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday":\n'
            '        print("Weekday")\n'
            '    case "Saturday" | "Sunday":\n'
            '        print("Weekend!")\n'
            '    case _:\n'
            '        print("Invalid day")',
            output="Weekend!",
            explanation="The <code>|</code> operator matches any of the listed values. "
            "This is cleaner than a long if-elif chain."
        ),

        code_example("Match with guards",
            '# Match with guard conditions\n'
            'score = 85\n'
            '\n'
            'match score:\n'
            '    case n if n >= 90:\n'
            '        print(f"{n}: A")\n'
            '    case n if n >= 80:\n'
            '        print(f"{n}: B")\n'
            '    case n if n >= 70:\n'
            '        print(f"{n}: C")\n'
            '    case n if n >= 60:\n'
            '        print(f"{n}: D")\n'
            '    case _:\n'
            '        print(f"{score}: F")',
            output="85: B",
            explanation="Guard clauses (<code>if</code> after the pattern) add conditions. "
            "The variable <code>n</code> captures the matched value."
        ),

        section("Combining loops with conditionals"),

        code_example("Search and report",
            'students = [\n'
            '    {"name": "Alice", "grade": 92, "status": "active"},\n'
            '    {"name": "Bob", "grade": 67, "status": "active"},\n'
            '    {"name": "Charlie", "grade": 85, "status": "inactive"},\n'
            '    {"name": "Diana", "grade": 78, "status": "active"},\n'
            '    {"name": "Eve", "grade": 55, "status": "active"},\n'
            ']\n'
            '\n'
            '# Find active students who are failing (grade < 70)\n'
            'at_risk = []\n'
            'for student in students:\n'
            '    if student["status"] == "active" and student["grade"] < 70:\n'
            '        at_risk.append(student["name"])\n'
            '\n'
            'if at_risk:\n'
            '    print(f"At-risk students: {\", \".join(at_risk)}")\n'
            'else:\n'
            '    print("No at-risk students found.")',
            output='At-risk students: Bob, Eve',
            explanation="Combining loops with conditionals lets you search, filter, "
            "and analyze data. This pattern is used constantly in real applications."
        ),

        section("Early exit pattern"),

        concept("Breaking out when you find what you need",
            "<p>When searching for something, there is no need to check every item "
            "once you have found it. Use <code>break</code> to exit early.</p>"
        ),

        code_example("Early exit with break",
            'users = [\n'
            '    {"id": 101, "name": "Alice", "email": "alice@example.com"},\n'
            '    {"id": 102, "name": "Bob", "email": "bob@example.com"},\n'
            '    {"id": 103, "name": "Charlie", "email": "charlie@example.com"},\n'
            ']\n'
            '\n'
            'search_id = 102\n'
            'found_user = None\n'
            '\n'
            'for user in users:\n'
            '    if user["id"] == search_id:\n'
            '        found_user = user\n'
            '        break   # no need to check the rest\n'
            '\n'
            'if found_user:\n'
            '    print(f"Found: {found_user[\'name\']} ({found_user[\'email\']})")\n'
            'else:\n'
            '    print(f"User {search_id} not found.")',
            output="Found: Bob (bob@example.com)",
            explanation="Without <code>break</code>, the loop would check all remaining users "
            "for no reason. In a list of 10,000 users, this matters."
        ),

        code_example("for...else — detecting not found",
            'numbers = [4, 8, 15, 16, 23, 42]\n'
            'target = 7\n'
            '\n'
            'for num in numbers:\n'
            '    if num == target:\n'
            '        print(f"Found {target}!")\n'
            '        break\n'
            'else:\n'
            '    # This runs only if the loop completed without break\n'
            '    print(f"{target} not found in the list.")',
            output="7 not found in the list.",
            explanation="The <code>for...else</code> pattern is Python-specific. The <code>else</code> "
            "block runs only if the loop finished without hitting <code>break</code>. "
            "It is a clean way to handle \"not found\" scenarios."
        ),

        section("Nested loop with break"),

        code_example("Breaking out of nested loops",
            '# Find the first pair that multiplies to 36\n'
            'found = False\n'
            '\n'
            'for i in range(1, 10):\n'
            '    for j in range(1, 10):\n'
            '        if i * j == 36:\n'
            '            print(f"Found: {i} x {j} = 36")\n'
            '            found = True\n'
            '            break     # breaks inner loop only\n'
            '    if found:\n'
            '        break         # breaks outer loop',
            output="Found: 4 x 9 = 36",
            explanation="<code>break</code> only exits the innermost loop. To break "
            "out of nested loops, use a flag variable or put the loops in a function "
            "and use <code>return</code> (covered in Module 3)."
        ),

        try_it("Write a nested loop that prints a chessboard pattern using # and spaces."),

        section("Exercises"),

        exercise("starter", "Prime number checker",
            "Write a program that asks for a number and determines if it is prime. "
            "A prime number is greater than 1 and divisible only by 1 and itself. "
            "Check divisibility from 2 up to the square root of the number. "
            "Print whether the number is prime and, if not, print its smallest factor.",
            hint="Use <code>import math</code> and loop <code>for i in range(2, int(math.sqrt(n)) + 1)</code>. "
            "If <code>n % i == 0</code>, it is not prime and <code>i</code> is a factor."
        ),

        exercise("medium", "Triangle type classifier",
            "Ask for three side lengths. First validate that they form a valid triangle "
            "(sum of any two sides must be greater than the third). Then classify:<br>"
            "- <strong>Equilateral</strong>: all sides equal<br>"
            "- <strong>Isosceles</strong>: exactly two sides equal<br>"
            "- <strong>Scalene</strong>: no sides equal<br>"
            "Also check if it is a right triangle (a<sup>2</sup> + b<sup>2</sup> = c<sup>2</sup>). "
            "Print all classifications that apply.",
            hint="Sort the sides: <code>sides = sorted([a, b, c])</code>. "
            "Valid triangle: <code>sides[0] + sides[1] > sides[2]</code>. "
            "Right triangle: <code>sides[0]**2 + sides[1]**2 == sides[2]**2</code> "
            "(use <code>abs(...) < 0.001</code> for float comparison)."
        ),

        exercise("real-world", "Simple ATM menu",
            "Build an ATM simulation with these features:<br>"
            "- Start with a balance of $1,000.00<br>"
            "- Menu: (1) Check Balance, (2) Deposit, (3) Withdraw, (4) Transaction History, (5) Exit<br>"
            "- Deposits must be positive. Withdrawals cannot exceed the balance<br>"
            "- Track all transactions in a list with type, amount, and resulting balance<br>"
            "- Transaction History shows all operations numbered with running balance<br>"
            "- Use match/case for the menu (or if/elif for Python &lt; 3.10)<br>"
            "- After 3 consecutive invalid menu choices, print a warning",
            hint="Structure: <code>while True</code> loop with <code>match choice</code>. "
            "Store history as <code>[(\"Deposit\", 200.00, 1200.00), ...]</code>. "
            "Track invalid attempts with a counter that resets on valid input."
        ),

        mistakes([
            ("Deeply nested code (arrow anti-pattern)",
             "If your code is indented 4+ levels, refactor. Extract conditions into variables: "
             "<code>is_valid = age > 0 and age < 150</code>, then <code>if is_valid:</code>."),
            ("<code>break</code> only exits the innermost loop",
             "In nested loops, <code>break</code> exits only the loop it is directly inside. "
             "Use a flag variable or a function to break out of multiple loops."),
            ("Forgetting that match/case requires Python 3.10+",
             "If your code needs to run on older Python versions, stick with if-elif-else. "
             "Check your version: <code>import sys; print(sys.version)</code>."),
            ("Using match/case without a wildcard default",
             "Always include <code>case _:</code> as the last case to handle unexpected values. "
             "Without it, unmatched values silently do nothing."),
        ]),

        pro_tips([
            "<strong>Keep nesting shallow.</strong> More than 3 levels of indentation is a code smell. "
            "Use guard clauses, helper variables, and functions to flatten.",
            "<strong>Use <code>for...else</code></strong> for search patterns. It eliminates the need "
            "for a separate <code>found</code> flag variable.",
            "<strong>match/case shines for command dispatching:</strong> menus, parsers, state machines, "
            "and handling API responses. Use it when you have 4+ branches on the same value.",
            "<strong>Name your complex conditions.</strong> Instead of <code>if a and b or c and not d:</code>, "
            "use <code>is_eligible = a and b or c and not d</code> then <code>if is_eligible:</code>.",
        ]),

        recap([
            "Combine <code>if</code> inside <code>for</code> to filter and process data",
            "Nested loops multiply: outer x inner = total iterations",
            "<code>match/case</code> (Python 3.10+) replaces long if-elif chains",
            "Use <code>|</code> for OR patterns and guards for conditions in match/case",
            "<code>break</code> exits only the innermost loop",
            "<code>for...else</code> runs the else block only if no <code>break</code> occurred",
        ]),
    ])
