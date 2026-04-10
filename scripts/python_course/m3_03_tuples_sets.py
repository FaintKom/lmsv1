"""Module 3, Lesson 3: Tuples & Sets."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Tuples &amp; Sets",
            "Immutable sequences for fixed data and unique collections for eliminating duplicates.",
        ),

        why_it_matters(
            "<p>Not every collection needs to be a list. Tuples protect data that should never change "
            "&mdash; coordinates, database rows, function return values. Sets give you instant "
            "duplicate removal and lightning-fast membership checks. Choosing the right collection "
            "type is a key skill that separates beginners from competent developers.</p>"
        ),

        # ---- TUPLES ----

        section("Tuples: immutable sequences"),

        concept("What is a tuple?",
            "<p>A tuple is like a list that <strong>cannot be changed</strong> after creation. "
            "Create one with parentheses <code>()</code> or just commas:</p>"
        ),

        code_example("Creating tuples",
            '# With parentheses\n'
            'point = (3, 7)\n'
            'print(point)           # (3, 7)\n'
            '\n'
            '# Without parentheses (comma is what makes a tuple)\n'
            'rgb = 255, 128, 0\n'
            'print(rgb)             # (255, 128, 0)\n'
            '\n'
            '# Single-item tuple needs a trailing comma\n'
            'single = (42,)\n'
            'not_a_tuple = (42)     # This is just the number 42!\n'
            'print(type(single))    # <class \'tuple\'>\n'
            'print(type(not_a_tuple))  # <class \'int\'>\n'
            '\n'
            '# Empty tuple\n'
            'empty = ()\n'
            '\n'
            '# tuple() constructor\n'
            'from_list = tuple([1, 2, 3])\n'
            'print(from_list)       # (1, 2, 3)',
            output="(3, 7)\n(255, 128, 0)\n<class 'tuple'>\n<class 'int'>\n(1, 2, 3)",
            explanation="The trailing comma for single-item tuples is a classic gotcha. "
            "<code>(42)</code> is just <code>42</code> in parentheses, not a tuple."
        ),

        code_example("Accessing tuple elements",
            'coordinates = (10, 20, 30)\n'
            '\n'
            '# Indexing and slicing work the same as lists\n'
            'print(coordinates[0])      # 10\n'
            'print(coordinates[-1])     # 30\n'
            'print(coordinates[0:2])    # (10, 20)\n'
            '\n'
            '# Length, membership, count\n'
            'print(len(coordinates))    # 3\n'
            'print(20 in coordinates)   # True\n'
            '\n'
            '# But you CANNOT modify\n'
            '# coordinates[0] = 99      # TypeError: tuple does not support item assignment',
            output="10\n30\n(10, 20)\n3\nTrue",
            explanation="Tuples support all the <em>read</em> operations of lists "
            "(indexing, slicing, <code>in</code>, <code>len()</code>). "
            "They just don't support any <em>write</em> operations."
        ),

        section("Tuple unpacking"),

        concept("Unpacking = extracting values into variables",
            "<p>Tuple unpacking is one of Python's most elegant features. "
            "It lets you assign multiple variables in a single line:</p>"
        ),

        code_example("Basic unpacking",
            '# Unpack a tuple into variables\n'
            'point = (5, 10)\n'
            'x, y = point\n'
            'print(f"x={x}, y={y}")    # x=5, y=10\n'
            '\n'
            '# Swap variables (uses tuple unpacking internally)\n'
            'a, b = 1, 2\n'
            'a, b = b, a\n'
            'print(f"a={a}, b={b}")    # a=2, b=1\n'
            '\n'
            '# Unpack from a function return\n'
            'def get_user():\n'
            '    return "Alice", 30, "alice@dev.io"\n'
            '\n'
            'name, age, email = get_user()\n'
            'print(f"{name}, {age}, {email}")',
            output="x=5, y=10\na=2, b=1\nAlice, 30, alice@dev.io",
            explanation="Functions that return multiple values actually return a tuple. "
            "Unpacking makes this natural and readable."
        ),

        code_example("Extended unpacking with *",
            '# Grab first and rest\n'
            'first, *rest = [1, 2, 3, 4, 5]\n'
            'print(first)    # 1\n'
            'print(rest)     # [2, 3, 4, 5]\n'
            '\n'
            '# Grab first, last, and middle\n'
            'first, *middle, last = [10, 20, 30, 40, 50]\n'
            'print(first)     # 10\n'
            'print(middle)    # [20, 30, 40]\n'
            'print(last)      # 50\n'
            '\n'
            '# Skip values with _\n'
            'name, _, email = ("Alice", 30, "alice@dev.io")\n'
            'print(f"{name}: {email}")',
            output="1\n[2, 3, 4, 5]\n10\n[20, 30, 40]\n50\nAlice: alice@dev.io",
            explanation="The <code>*</code> variable collects remaining items into a list. "
            "The <code>_</code> convention means \"I don't need this value.\""
        ),

        section("Tuples as dict keys and in named data"),

        code_example("Tuples as dictionary keys",
            '# Lists can\'t be dict keys, but tuples can\n'
            'grid = {}\n'
            'grid[(0, 0)] = "start"\n'
            'grid[(1, 0)] = "wall"\n'
            'grid[(0, 1)] = "path"\n'
            'grid[(1, 1)] = "goal"\n'
            '\n'
            'print(grid[(0, 0)])    # start\n'
            'print(grid[(1, 1)])    # goal\n'
            '\n'
            '# Common in game development, mapping, data science\n'
            'for coord, value in grid.items():\n'
            '    print(f"  {coord} -> {value}")',
            output="start\ngoal\n  (0, 0) -> start\n  (1, 0) -> wall\n  (0, 1) -> path\n  (1, 1) -> goal",
            explanation="Because tuples are immutable, they can be hashed and used as dictionary keys. "
            "This is perfect for coordinate systems, graph edges, and lookup tables."
        ),

        code_example("Named tuples for readable data",
            'from collections import namedtuple\n'
            '\n'
            '# Define a named tuple type\n'
            'Point = namedtuple("Point", ["x", "y"])\n'
            'Color = namedtuple("Color", ["red", "green", "blue"])\n'
            '\n'
            '# Create instances\n'
            'origin = Point(0, 0)\n'
            'p = Point(3, 7)\n'
            'sky = Color(135, 206, 235)\n'
            '\n'
            '# Access by name (readable) or index (compatible)\n'
            'print(f"Point: ({p.x}, {p.y})")        # Point: (3, 7)\n'
            'print(f"Point: ({p[0]}, {p[1]})")       # Point: (3, 7)\n'
            'print(f"Sky blue: R={sky.red}, G={sky.green}, B={sky.blue}")\n'
            '\n'
            '# Still a tuple: immutable, hashable\n'
            'print(isinstance(p, tuple))    # True',
            output="Point: (3, 7)\nPoint: (3, 7)\nSky blue: R=135, G=206, B=235\nTrue",
            explanation="Named tuples give you the readability of a class with the efficiency of a tuple. "
            "They are ideal for records and data that should not change."
        ),

        try_it("Create a named tuple for a Student with name, grade, and school. "
               "Make a few instances and print their attributes."),

        # ---- SETS ----

        section("Sets: unique collections"),

        concept("What is a set?",
            "<p>A set is an <strong>unordered collection of unique items</strong>. "
            "Sets automatically remove duplicates and provide fast membership checks:</p>"
        ),

        code_example("Creating sets",
            '# From a literal\n'
            'fruits = {"apple", "banana", "cherry"}\n'
            'print(fruits)    # order may vary\n'
            '\n'
            '# Duplicates are automatically removed\n'
            'nums = {1, 2, 2, 3, 3, 3, 4}\n'
            'print(nums)     # {1, 2, 3, 4}\n'
            '\n'
            '# From a list (great for removing duplicates)\n'
            'names = ["Alice", "Bob", "Alice", "Carol", "Bob"]\n'
            'unique = set(names)\n'
            'print(unique)    # {\'Alice\', \'Bob\', \'Carol\'}\n'
            '\n'
            '# Empty set (NOT {} which creates an empty dict!)\n'
            'empty = set()\n'
            'print(type(empty))    # <class \'set\'>',
            output="{\'apple\', \'cherry\', \'banana\'}\n{1, 2, 3, 4}\n{\'Carol\', \'Alice\', \'Bob\'}\n<class 'set'>",
            explanation="Sets are unordered &mdash; the print order may differ from insertion order. "
            "The critical trap: <code>{}</code> creates an empty <em>dict</em>, not a set. "
            "Use <code>set()</code> for an empty set."
        ),

        code_example("Adding and removing items",
            'skills = {"python", "html", "css"}\n'
            '\n'
            '# Add one item\n'
            'skills.add("javascript")\n'
            'print(skills)\n'
            '\n'
            '# Add multiple items\n'
            'skills.update(["react", "sql", "python"])    # python already exists, ignored\n'
            'print(skills)\n'
            '\n'
            '# Remove (raises KeyError if missing)\n'
            'skills.remove("html")\n'
            'print(skills)\n'
            '\n'
            '# Discard (safe: no error if missing)\n'
            'skills.discard("golang")    # no error\n'
            'skills.discard("css")\n'
            'print(skills)\n'
            '\n'
            '# Pop: remove and return an arbitrary item\n'
            'item = skills.pop()\n'
            'print(f"Removed: {item}")',
            output="{\'python\', \'css\', \'html\', \'javascript\'}\n"
            "{\'python\', \'css\', \'react\', \'html\', \'sql\', \'javascript\'}\n"
            "{\'python\', \'css\', \'react\', \'sql\', \'javascript\'}\n"
            "{\'python\', \'react\', \'sql\', \'javascript\'}\n"
            "Removed: python",
            explanation="<code>add()</code> for one item, <code>update()</code> for many. "
            "<code>discard()</code> is safer than <code>remove()</code> because it won't crash "
            "on missing items."
        ),

        section("Set operations"),

        concept("Mathematical set operations",
            "<p>Sets support union, intersection, difference, and symmetric difference &mdash; "
            "the same operations from math class. These are incredibly powerful for data analysis:</p>"
        ),

        code_example("Union, intersection, difference",
            'python_devs = {"Alice", "Bob", "Carol", "Dave"}\n'
            'js_devs = {"Bob", "Carol", "Eve", "Frank"}\n'
            '\n'
            '# Union: everyone (in either set)\n'
            'all_devs = python_devs | js_devs\n'
            'print(f"All devs: {all_devs}")\n'
            '\n'
            '# Intersection: in BOTH sets\n'
            'both = python_devs & js_devs\n'
            'print(f"Both: {both}")\n'
            '\n'
            '# Difference: in first but NOT second\n'
            'only_python = python_devs - js_devs\n'
            'only_js = js_devs - python_devs\n'
            'print(f"Python only: {only_python}")\n'
            'print(f"JS only: {only_js}")\n'
            '\n'
            '# Symmetric difference: in one OR the other but NOT both\n'
            'exclusive = python_devs ^ js_devs\n'
            'print(f"Exclusive: {exclusive}")',
            output="All devs: {'Eve', 'Carol', 'Frank', 'Alice', 'Dave', 'Bob'}\n"
            "Both: {'Carol', 'Bob'}\nPython only: {'Alice', 'Dave'}\n"
            "JS only: {'Eve', 'Frank'}\nExclusive: {'Eve', 'Alice', 'Frank', 'Dave'}",
            explanation="Operators: <code>|</code> = union, <code>&</code> = intersection, "
            "<code>-</code> = difference, <code>^</code> = symmetric difference. "
            "Method equivalents: <code>.union()</code>, <code>.intersection()</code>, "
            "<code>.difference()</code>, <code>.symmetric_difference()</code>."
        ),

        code_example("Subset and superset checks",
            'basics = {"python", "html"}\n'
            'full_stack = {"python", "html", "css", "javascript", "sql"}\n'
            '\n'
            'print(basics.issubset(full_stack))      # True\n'
            'print(full_stack.issuperset(basics))    # True\n'
            'print(basics.isdisjoint({"java", "c++"}))  # True (no overlap)',
            output="True\nTrue\nTrue",
            explanation="<code>issubset()</code> checks if all items in one set exist in another. "
            "These are useful for permission systems and feature checks."
        ),

        section("When to use which collection"),

        concept("Choosing the right type",
            "<ul>"
            "<li><strong>List</strong> &mdash; ordered, allows duplicates, items can change. "
            "Use for: sequences, ordered data, when position matters.</li>"
            "<li><strong>Tuple</strong> &mdash; ordered, allows duplicates, items CANNOT change. "
            "Use for: fixed data, dict keys, function returns, coordinates.</li>"
            "<li><strong>Set</strong> &mdash; unordered, NO duplicates, items can be added/removed. "
            "Use for: uniqueness, membership testing, set math (union, intersection).</li>"
            "<li><strong>Dict</strong> &mdash; key-value pairs, keys are unique. "
            "Use for: lookups by name, structured data, mappings.</li>"
            "</ul>"
        ),

        code_example("Performance comparison: list vs set membership",
            'import time\n'
            '\n'
            '# Create a large collection\n'
            'big_list = list(range(1_000_000))\n'
            'big_set = set(range(1_000_000))\n'
            '\n'
            '# Searching in a list: O(n) -- slow\n'
            'start = time.time()\n'
            '999_999 in big_list\n'
            'list_time = time.time() - start\n'
            '\n'
            '# Searching in a set: O(1) -- instant\n'
            'start = time.time()\n'
            '999_999 in big_set\n'
            'set_time = time.time() - start\n'
            '\n'
            'print(f"List lookup: {list_time:.6f}s")\n'
            'print(f"Set lookup:  {set_time:.6f}s")\n'
            'print(f"Set is ~{list_time / max(set_time, 0.000001):.0f}x faster")',
            output="List lookup: 0.012000s\nSet lookup:  0.000001s\nSet is ~12000x faster",
            explanation="For membership checks (<code>in</code>), sets are dramatically faster "
            "than lists. If you are checking membership frequently, convert to a set first."
        ),

        section("Exercises"),

        exercise("starter", "Coordinate system with tuples",
            "Create a list of 5 coordinate tuples: <code>[(0, 0), (3, 4), (1, 1), (6, 8), (3, 4)]</code>. "
            "Calculate the distance from the origin (0, 0) for each point using the formula "
            "<code>d = (x**2 + y**2) ** 0.5</code>. Print each point with its distance. "
            "Then find and print the point farthest from the origin.",
            hint="Use <code>max(points, key=lambda p: (p[0]**2 + p[1]**2) ** 0.5)</code> "
            "to find the farthest point."
        ),

        exercise("medium", "Remove duplicates while preserving order",
            "Given a list with duplicates: <code>[3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7]</code>, "
            "remove duplicates while preserving the original order of first appearance. "
            "<strong>Do not use</strong> <code>set()</code> alone (that loses order). "
            "Also count how many duplicates were removed, and print the unique list and the count.",
            hint="Use a set to track what you have seen: <code>seen = set()</code>. "
            "Loop through the list, add to result only if not in seen, then add to seen."
        ),

        exercise("real-world", "Find common friends",
            "Create dictionaries for 4 people where each person maps to a set of their friends:<br>"
            "<code>friends = {\"Alice\": {\"Bob\", \"Carol\", \"Dave\"}, "
            "\"Bob\": {\"Alice\", \"Carol\", \"Eve\"}, ...}</code><br>"
            "Implement these features:<br>"
            "(1) Find mutual friends between any two people.<br>"
            "(2) Find people who are friends with everyone in a given group.<br>"
            "(3) Suggest new friends for a person (friends of friends who are not already friends).<br>"
            "(4) Find the person with the most friends.",
            hint="Mutual friends: <code>friends['Alice'] & friends['Bob']</code>. "
            "Friends of friends: loop through each friend's friends, "
            "subtract the person's own friends and themselves."
        ),

        mistakes([
            ("Forgetting the comma in single-item tuples",
             "<code>t = (42)</code> is just <code>42</code>. "
             "You need <code>t = (42,)</code> to create a tuple."),
            ("Using <code>{}</code> for an empty set",
             "<code>{}</code> creates an empty <em>dict</em>. "
             "Use <code>set()</code> for an empty set."),
            ("Trying to modify a tuple",
             "Tuples are immutable. <code>t[0] = 99</code> raises <code>TypeError</code>. "
             "Create a new tuple instead: <code>t = (99,) + t[1:]</code>."),
            ("Expecting sets to maintain order",
             "Sets are unordered. If you need unique items in order, "
             "use a <code>dict.fromkeys()</code> trick: "
             "<code>list(dict.fromkeys(items))</code>."),
            ("Adding mutable items to a set",
             "Sets can only contain hashable (immutable) items. "
             "<code>{[1, 2]}</code> fails. Use tuples: <code>{(1, 2)}</code>."),
        ]),

        pro_tips([
            "<strong>Return tuples from functions.</strong> When a function needs to return "
            "multiple values, return a tuple: <code>return x, y, z</code>. "
            "The caller unpacks: <code>x, y, z = func()</code>.",
            "<strong>Use frozenset for immutable sets.</strong> If you need a set that cannot "
            "be changed (e.g., as a dict key), use <code>frozenset({1, 2, 3})</code>.",
            "<strong>Sets for fast deduplication.</strong> <code>unique = list(set(items))</code> "
            "removes duplicates instantly. If order matters, use <code>list(dict.fromkeys(items))</code>.",
            "<strong>Named tuples beat plain tuples.</strong> <code>point.x</code> is much more "
            "readable than <code>point[0]</code>. Use named tuples for any tuple with 3+ elements.",
            "<strong>Set operations replace complex loops.</strong> Instead of nested loops to "
            "find common elements, use <code>set_a & set_b</code>. It is both faster and more readable.",
        ]),

        recap([
            "Tuples are immutable sequences: <code>(1, 2, 3)</code>",
            "Unpack tuples: <code>x, y = point</code>, <code>first, *rest = items</code>",
            "Tuples can be dict keys; lists cannot",
            "Named tuples add readable attribute access to tuples",
            "Sets hold unique, unordered items: <code>{1, 2, 3}</code>",
            "Set operations: <code>|</code> union, <code>&</code> intersection, <code>-</code> difference",
            "Use <code>set()</code> for fast membership checks and deduplication",
            "Choose the right collection: list (ordered), tuple (fixed), set (unique), dict (mapped)",
        ]),
    ])
