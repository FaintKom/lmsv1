"""Module 3, Lesson 5: Sorting, Filtering, Mapping."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section, subsection, text, note,
)


def build() -> str:
    return assemble([
        hero("Sorting, Filtering, Mapping",
             "Transform data like a pro &mdash; the building blocks of data processing"),

        why_it_matters(
            "<p>Real-world data is messy. You'll constantly need to sort results, "
            "filter out invalid entries, and transform values into a different format. "
            "These three operations — sort, filter, map — are the backbone of data "
            "processing in every language, not just Python.</p>"
        ),

        section("Quick intro: lambda"),

        text(
            "This lesson uses small inline functions called <strong>lambdas</strong>. "
            "We will cover lambdas in depth in Module 4, but you need the basics now "
            "for sorting and filtering. Think of this as a just-in-time introduction."
        ),

        text(
            "A <code>lambda</code> is a tiny, anonymous (unnamed) function written on "
            "a single line. It takes one or more arguments and returns a single expression. "
            "The syntax is: <code>lambda arguments: expression</code>."
        ),

        code_example("Lambda basics",
            '# A regular function\n'
            'def double(x):\n'
            '    return x * 2\n'
            '\n'
            'print(double(5))        # 10\n'
            '\n'
            '# The same thing as a lambda\n'
            'double_lambda = lambda x: x * 2\n'
            '\n'
            'print(double_lambda(5)) # 10\n'
            '\n'
            '# Lambdas are most useful when passed directly\n'
            '# to functions like sorted(), filter(), and map()\n'
            'print(sorted([3, 1, 2], key=lambda x: -x))  # [3, 2, 1]',
            output="10\n10\n[3, 2, 1]",
            explanation="The lambda <code>lambda x: x * 2</code> is equivalent to a function "
            "that takes <code>x</code> and returns <code>x * 2</code>. You will almost never "
            "store a lambda in a variable &mdash; the real power is passing them directly "
            "as arguments."
        ),

        note(
            "You do not need to fully understand lambdas right now. Just know that "
            "<code>lambda x: x[\"name\"]</code> means \"a small function that takes "
            "<code>x</code> and returns <code>x[\"name\"]</code>\". "
            "Module 4 will explain closures, higher-order functions, and advanced lambda patterns."
        ),

        section("Sorting"),

        concept("sorted() vs .sort()",
            "<p><code>sorted(iterable)</code> returns a <strong>new</strong> sorted list. "
            "<code>list.sort()</code> sorts <strong>in place</strong> (modifies the original, returns None).</p>"
        ),

        code_example("Basic sorting",
            'numbers = [5, 2, 8, 1, 9, 3]\n'
            '\n'
            '# sorted() — new list, original unchanged\n'
            'result = sorted(numbers)\n'
            'print(result)       # [1, 2, 3, 5, 8, 9]\n'
            'print(numbers)      # [5, 2, 8, 1, 9, 3] — unchanged\n'
            '\n'
            '# .sort() — modifies in place\n'
            'numbers.sort()\n'
            'print(numbers)      # [1, 2, 3, 5, 8, 9] — changed',
            output="[1, 2, 3, 5, 8, 9]\n[5, 2, 8, 1, 9, 3]\n[1, 2, 3, 5, 8, 9]",
        ),

        code_example("Sort with key function",
            'students = [\n'
            '    {"name": "Alice", "grade": 92},\n'
            '    {"name": "Bob", "grade": 85},\n'
            '    {"name": "Charlie", "grade": 98},\n'
            ']\n'
            '\n'
            '# Sort by grade (ascending)\n'
            'by_grade = sorted(students, key=lambda s: s["grade"])\n'
            'print([s["name"] for s in by_grade])\n'
            '\n'
            '# Sort by grade (descending)\n'
            'top_first = sorted(students, key=lambda s: s["grade"], reverse=True)\n'
            'print([s["name"] for s in top_first])',
            output="['Bob', 'Alice', 'Charlie']\n['Charlie', 'Alice', 'Bob']",
            explanation="The <code>key</code> parameter takes a function that extracts "
            "the comparison value from each item."
        ),

        section("Filtering"),

        code_example("filter() function",
            'numbers = [1, -3, 5, -7, 9, -2, 4]\n'
            '\n'
            '# Keep only positive numbers\n'
            'positives = list(filter(lambda x: x > 0, numbers))\n'
            'print(positives)\n'
            '\n'
            '# Same thing with comprehension (more Pythonic)\n'
            'positives2 = [x for x in numbers if x > 0]\n'
            'print(positives2)',
            output="[1, 5, 9, 4]\n[1, 5, 9, 4]",
            explanation="Both approaches work. Most Python developers prefer comprehensions "
            "for simple filters, <code>filter()</code> for complex logic."
        ),

        section("Mapping (transforming)"),

        code_example("map() function",
            'prices = [10.99, 24.50, 5.75, 32.00]\n'
            '\n'
            '# Apply 20% discount to all prices\n'
            'discounted = list(map(lambda p: round(p * 0.8, 2), prices))\n'
            'print(discounted)\n'
            '\n'
            '# Same with comprehension\n'
            'discounted2 = [round(p * 0.8, 2) for p in prices]\n'
            'print(discounted2)',
            output="[8.79, 19.6, 4.6, 25.6]\n[8.79, 19.6, 4.6, 25.6]",
        ),

        section("Combining with zip()"),

        code_example("zip() — pair up lists",
            'names = ["Alice", "Bob", "Charlie"]\n'
            'scores = [92, 85, 98]\n'
            '\n'
            '# Combine into pairs\n'
            'pairs = list(zip(names, scores))\n'
            'print(pairs)\n'
            '\n'
            '# Create a dict from two lists\n'
            'grade_book = dict(zip(names, scores))\n'
            'print(grade_book)\n'
            '\n'
            '# Iterate together\n'
            'for name, score in zip(names, scores):\n'
            '    print(f"{name}: {score}")',
            output="[('Alice', 92), ('Bob', 85), ('Charlie', 98)]\n"
                   "{'Alice': 92, 'Bob': 85, 'Charlie': 98}\n"
                   "Alice: 92\nBob: 85\nCharlie: 98",
        ),

        section("Chaining operations"),

        code_example("Real-world data pipeline",
            'orders = [\n'
            '    {"product": "Laptop", "price": 999, "qty": 1},\n'
            '    {"product": "Mouse", "price": 25, "qty": 3},\n'
            '    {"product": "Monitor", "price": 450, "qty": 2},\n'
            '    {"product": "Cable", "price": 8, "qty": 5},\n'
            ']\n'
            '\n'
            '# Find orders over $50 total, sorted by total descending\n'
            'expensive = sorted(\n'
            '    [{"product": o["product"], "total": o["price"] * o["qty"]}\n'
            '     for o in orders\n'
            '     if o["price"] * o["qty"] > 50],\n'
            '    key=lambda o: o["total"],\n'
            '    reverse=True\n'
            ')\n'
            'for o in expensive:\n'
            '    print(f\'{o["product"]}: ${o["total"]}\')',
            output="Laptop: $999\nMonitor: $900\nMouse: $75",
            explanation="This is a real data pipeline: filter → transform → sort. "
            "You'll write code like this daily in backend development."
        ),

        try_it("Sort a list of words by their length, shortest first."),

        section("Exercises"),

        exercise("starter", "Sort students by name",
            "Given <code>students = [{\"name\": \"Zara\", \"grade\": 88}, "
            "{\"name\": \"Alex\", \"grade\": 95}, {\"name\": \"Maya\", \"grade\": 91}]</code>, "
            "sort them alphabetically by name and print each name + grade.",
            hint="<code>sorted(students, key=lambda s: s['name'])</code>"
        ),

        exercise("medium", "Filter valid emails",
            "Given <code>emails = [\"alice@dev.io\", \"invalid\", \"bob@work.com\", "
            "\"@broken\", \"clara@school.edu\", \"no-at-sign\"]</code>, "
            "filter to keep only emails that contain both <code>@</code> and <code>.</code> "
            "after the <code>@</code>. Print the valid ones.",
            hint="Check <code>'@' in e and '.' in e.split('@')[-1]</code>"
        ),

        exercise("real-world", "Sales report generator",
            "Given a list of sales: <code>sales = [(\"Jan\", 12000), (\"Feb\", 8500), "
            "(\"Mar\", 15000), (\"Apr\", 9200), (\"May\", 11000), (\"Jun\", 18000)]</code>. "
            "1) Filter months with sales over $10,000. "
            "2) Sort by sales amount descending. "
            "3) Print a formatted report with rank, month, and amount. "
            "4) Print the total of the filtered months.",
            hint="Chain: filter → sort → enumerate for ranking"
        ),

        mistakes([
            ("Using .sort() and expecting a return value",
             "<code>result = mylist.sort()</code> gives <code>None</code>! "
             "<code>.sort()</code> modifies in place. Use <code>sorted()</code> if you need a new list."),
            ("Forgetting that filter() and map() return iterators, not lists",
             "Wrap in <code>list()</code>: <code>list(filter(...))</code>. "
             "Otherwise you get a filter/map object, not a list."),
            ("Sorting a list with mixed types",
             "<code>sorted([1, 'two', 3])</code> raises TypeError in Python 3. "
             "All items must be comparable."),
        ]),

        pro_tips([
            "<strong>Use <code>operator.itemgetter</code></strong> for cleaner key functions: "
            "<code>from operator import itemgetter; sorted(data, key=itemgetter('name'))</code>.",
            "<strong><code>sorted()</code> is stable</strong> — items with equal keys "
            "keep their original order. Useful for multi-level sorting.",
            "<strong>For large datasets</strong>, prefer generator expressions with "
            "<code>itertools</code> over building intermediate lists.",
        ]),

        recap([
            "<code>sorted()</code> returns new list; <code>.sort()</code> modifies in place",
            "<code>key=lambda</code> extracts the comparison value",
            "<code>reverse=True</code> for descending order",
            "<code>filter(func, iterable)</code> keeps items where func returns True",
            "<code>map(func, iterable)</code> transforms each item",
            "<code>zip(a, b)</code> pairs items from two iterables",
        ]),
    ])
