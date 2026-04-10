"""Module 3, Lesson 2: Dictionaries."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Dictionaries",
            "Key-value pairs &mdash; the data structure behind JSON, databases, and configuration files.",
        ),

        why_it_matters(
            "<p>Dictionaries are how real software stores structured data. "
            "User profiles, API responses, configuration files, database rows &mdash; "
            "they are all dictionaries under the hood. If lists are ordered sequences, "
            "dictionaries are labeled containers where you look things up by name instead of position.</p>"
        ),

        section("Creating dictionaries"),

        concept("What is a dictionary?",
            "<p>A dictionary (dict) stores <strong>key-value pairs</strong>. "
            "Each key maps to a value, like a real dictionary maps words to definitions:</p>"
        ),

        code_example("Basic dictionaries",
            '# A dictionary of a person\n'
            'person = {\n'
            '    "name": "Alice",\n'
            '    "age": 30,\n'
            '    "email": "alice@example.com",\n'
            '    "is_active": True,\n'
            '}\n'
            'print(person)\n'
            '\n'
            '# A simple mapping\n'
            'status_codes = {200: "OK", 404: "Not Found", 500: "Server Error"}\n'
            'print(status_codes)\n'
            '\n'
            '# Empty dict\n'
            'empty = {}\n'
            'print(empty)',
            output="{'name': 'Alice', 'age': 30, 'email': 'alice@example.com', 'is_active': True}\n"
            "{200: 'OK', 404: 'Not Found', 500: 'Server Error'}\n{}",
            explanation="Keys can be strings, numbers, or any immutable type. "
            "Values can be anything. Trailing commas after the last item are legal and encouraged."
        ),

        code_example("Other ways to create dicts",
            '# dict() with keyword arguments\n'
            'user = dict(name="Bob", age=25, city="NYC")\n'
            'print(user)\n'
            '\n'
            '# dict() from list of tuples\n'
            'pairs = [("a", 1), ("b", 2), ("c", 3)]\n'
            'mapping = dict(pairs)\n'
            'print(mapping)\n'
            '\n'
            '# dict.fromkeys() for default values\n'
            'keys = ["name", "email", "phone"]\n'
            'template = dict.fromkeys(keys, "unknown")\n'
            'print(template)',
            output="{'name': 'Bob', 'age': 25, 'city': 'NYC'}\n"
            "{'a': 1, 'b': 2, 'c': 3}\n"
            "{'name': 'unknown', 'email': 'unknown', 'phone': 'unknown'}",
            explanation="<code>dict()</code> is handy when keys are valid Python identifiers. "
            "<code>dict.fromkeys()</code> creates a dict with all keys set to the same default value."
        ),

        section("Accessing values"),

        code_example("Bracket access vs .get()",
            'person = {"name": "Alice", "age": 30, "city": "Portland"}\n'
            '\n'
            '# Bracket notation: raises KeyError if missing\n'
            'print(person["name"])       # Alice\n'
            'print(person["age"])        # 30\n'
            '\n'
            '# .get(): returns None (or a default) if missing\n'
            'print(person.get("city"))       # Portland\n'
            'print(person.get("phone"))      # None\n'
            'print(person.get("phone", "N/A"))  # N/A',
            output="Alice\n30\nPortland\nNone\nN/A",
            explanation="Use <code>[]</code> when you are certain the key exists. "
            "Use <code>.get()</code> when the key might be missing &mdash; "
            "it prevents <code>KeyError</code> crashes."
        ),

        code_example("Checking if a key exists",
            'config = {"debug": True, "port": 8080, "host": "localhost"}\n'
            '\n'
            '# Use \"in\" to check for a key\n'
            'print("debug" in config)      # True\n'
            'print("timeout" in config)    # False\n'
            '\n'
            '# Common pattern: check then access\n'
            'if "port" in config:\n'
            '    print(f"Running on port {config[\'port\']}")\n'
            'else:\n'
            '    print("Using default port 80")',
            output="True\nFalse\nRunning on port 8080",
            explanation="<code>in</code> checks keys, not values. "
            "To check values, use <code>value in config.values()</code>."
        ),

        section("Adding, updating, and deleting"),

        code_example("Modifying dictionaries",
            'user = {"name": "Alice", "age": 30}\n'
            '\n'
            '# Add a new key\n'
            'user["email"] = "alice@example.com"\n'
            'print(user)\n'
            '\n'
            '# Update an existing key\n'
            'user["age"] = 31\n'
            'print(user)\n'
            '\n'
            '# Update multiple keys at once\n'
            'user.update({"age": 32, "city": "Seattle", "role": "admin"})\n'
            'print(user)',
            output="{'name': 'Alice', 'age': 30, 'email': 'alice@example.com'}\n"
            "{'name': 'Alice', 'age': 31, 'email': 'alice@example.com'}\n"
            "{'name': 'Alice', 'age': 32, 'email': 'alice@example.com', 'city': 'Seattle', 'role': 'admin'}",
            explanation="Adding and updating use the same syntax: <code>dict[key] = value</code>. "
            "If the key exists, it updates. If not, it adds. "
            "<code>.update()</code> merges another dict in."
        ),

        code_example("Deleting keys",
            'user = {"name": "Alice", "age": 30, "email": "alice@dev.io", "temp": True}\n'
            '\n'
            '# del: remove a key (raises KeyError if missing)\n'
            'del user["temp"]\n'
            'print(user)\n'
            '\n'
            '# pop: remove and return the value\n'
            'email = user.pop("email")\n'
            'print(f"Removed: {email}")\n'
            'print(user)\n'
            '\n'
            '# pop with default: safe deletion\n'
            'phone = user.pop("phone", "not found")\n'
            'print(f"Phone: {phone}")\n'
            '\n'
            '# clear: remove all keys\n'
            'user.clear()\n'
            'print(user)',
            output="{'name': 'Alice', 'age': 30, 'email': 'alice@dev.io'}\n"
            "Removed: alice@dev.io\n{'name': 'Alice', 'age': 30}\nPhone: not found\n{}",
            explanation="<code>pop()</code> is the safest way to remove a key because "
            "you can provide a default value. <code>del</code> will crash if the key is missing."
        ),

        section("Iterating over dictionaries"),

        code_example(".keys(), .values(), .items()",
            'scores = {"Alice": 95, "Bob": 87, "Carol": 92}\n'
            '\n'
            '# Keys (default iteration)\n'
            'for name in scores:\n'
            '    print(name, end=" ")\n'
            'print()\n'
            '\n'
            '# Values\n'
            'for score in scores.values():\n'
            '    print(score, end=" ")\n'
            'print()\n'
            '\n'
            '# Both key and value (most common)\n'
            'for name, score in scores.items():\n'
            '    print(f"{name}: {score}")',
            output="Alice Bob Carol \n95 87 92 \nAlice: 95\nBob: 87\nCarol: 92",
            explanation="<code>.items()</code> is what you will use 90% of the time. "
            "It gives you both the key and value in each iteration."
        ),

        code_example("Practical iteration patterns",
            'inventory = {"apples": 50, "bananas": 12, "oranges": 0, "grapes": 35}\n'
            '\n'
            '# Find items that are out of stock\n'
            'out_of_stock = [item for item, qty in inventory.items() if qty == 0]\n'
            'print(f"Out of stock: {out_of_stock}")\n'
            '\n'
            '# Total inventory\n'
            'total = sum(inventory.values())\n'
            'print(f"Total items: {total}")\n'
            '\n'
            '# Find the item with the most stock\n'
            'most = max(inventory, key=inventory.get)\n'
            'print(f"Most in stock: {most} ({inventory[most]})")',
            output="Out of stock: ['oranges']\nTotal items: 97\nMost in stock: apples (50)",
            explanation="Combining dict methods with built-in functions like "
            "<code>sum()</code>, <code>max()</code>, and list comprehensions is powerful."
        ),

        try_it("Create a dictionary of 5 countries and their capitals. "
               "Iterate with .items() and print each pair."),

        section("Nested dictionaries"),

        concept("Dicts inside dicts",
            "<p>Dictionaries can contain other dictionaries. This is how you represent "
            "complex, structured data &mdash; like a database record or an API response:</p>"
        ),

        code_example("Nested dict structure",
            'students = {\n'
            '    "alice": {\n'
            '        "age": 20,\n'
            '        "grades": {"math": 95, "english": 88, "science": 92},\n'
            '        "active": True,\n'
            '    },\n'
            '    "bob": {\n'
            '        "age": 22,\n'
            '        "grades": {"math": 78, "english": 85, "science": 80},\n'
            '        "active": True,\n'
            '    },\n'
            '}\n'
            '\n'
            '# Access nested values\n'
            'print(students["alice"]["grades"]["math"])   # 95\n'
            '\n'
            '# Iterate nested dicts\n'
            'for name, info in students.items():\n'
            '    avg = sum(info["grades"].values()) / len(info["grades"])\n'
            '    print(f"{name}: average = {avg:.1f}")',
            output="95\nalice: average = 91.7\nbob: average = 81.0",
            explanation="Chain bracket notation to access deeply nested values: "
            "<code>dict[key1][key2][key3]</code>. Each bracket accesses the next level."
        ),

        code_example("Safely accessing nested values",
            'user = {"profile": {"address": {"city": "Portland"}}}\n'
            '\n'
            '# Risky: crashes if any key is missing\n'
            '# city = user["profile"]["address"]["city"]\n'
            '\n'
            '# Safe: chain .get() calls\n'
            'city = user.get("profile", {}).get("address", {}).get("city", "Unknown")\n'
            'print(city)    # Portland\n'
            '\n'
            '# Also safe: missing key returns default\n'
            'zip_code = user.get("profile", {}).get("address", {}).get("zip", "N/A")\n'
            'print(zip_code)    # N/A',
            output="Portland\nN/A",
            explanation="Chaining <code>.get()</code> with empty dict defaults prevents "
            "<code>KeyError</code> at any level. This is a defensive programming pattern."
        ),

        section("Exercises"),

        exercise("starter", "Student grade book",
            "Create a dictionary for a student with keys: <code>name</code>, <code>id</code>, "
            "and <code>grades</code> (a dict of subject to score, at least 4 subjects). "
            "Calculate and print the student's average grade, highest grade (and subject), "
            "and lowest grade (and subject). Use <code>.items()</code> to iterate.",
            hint="Use <code>max(grades, key=grades.get)</code> to find the subject with the "
            "highest grade. <code>sum(grades.values()) / len(grades)</code> for the average."
        ),

        exercise("medium", "Word frequency counter",
            "Given this text: <code>\"the cat sat on the mat the cat ate the rat on the mat\"</code>, "
            "split it into words and count how many times each word appears. "
            "Store the counts in a dictionary. Print the words sorted by frequency (highest first). "
            "Also print how many unique words there are.",
            hint="Loop through words: <code>counts[word] = counts.get(word, 0) + 1</code>. "
            "Sort with <code>sorted(counts.items(), key=lambda x: x[1], reverse=True)</code>."
        ),

        exercise("real-world", "Inventory tracker",
            "Build a simple inventory system using a dictionary of product dicts:<br>"
            "<code>{\"SKU001\": {\"name\": \"Widget\", \"price\": 9.99, \"stock\": 50}, ...}</code><br>"
            "Include at least 5 products. Implement these features:<br>"
            "(1) Print all products in a formatted table.<br>"
            "(2) Find the most expensive product.<br>"
            "(3) Find all products with stock below 10.<br>"
            "(4) Calculate total inventory value (price * stock for each).<br>"
            "(5) Add a new product and update stock for an existing one.",
            hint="Total value: <code>sum(p['price'] * p['stock'] for p in inventory.values())</code>. "
            "Low stock: <code>[p for p in inventory.values() if p['stock'] < 10]</code>."
        ),

        mistakes([
            ("Using <code>[]</code> on a missing key",
             "<code>dict['missing']</code> raises <code>KeyError</code>. "
             "Use <code>.get('missing', default)</code> or check with <code>'key' in dict</code>."),
            ("Using mutable objects as keys",
             "Lists cannot be dict keys because they are mutable. "
             "Use tuples instead: <code>{(1, 2): 'point'}</code> works, "
             "<code>{[1, 2]: 'point'}</code> does not."),
            ("Modifying a dict while iterating",
             "Adding or removing keys during iteration causes <code>RuntimeError</code>. "
             "Iterate over a copy: <code>for k in list(dict.keys()):</code>"),
            ("Assuming dictionaries are ordered by value",
             "Dicts maintain <strong>insertion order</strong> (Python 3.7+), not sorted order. "
             "If you need sorted output, use <code>sorted(dict.items())</code>."),
            ("Forgetting that <code>in</code> checks keys, not values",
             "<code>'Alice' in scores</code> checks if <code>'Alice'</code> is a <em>key</em>. "
             "To check values: <code>'Alice' in scores.values()</code>."),
        ]),

        pro_tips([
            "<strong>Use <code>.get()</code> with defaults liberally.</strong> "
            "<code>count = data.get('count', 0)</code> is safer than <code>count = data['count']</code>.",
            "<strong><code>.setdefault()</code> is underrated.</strong> "
            "<code>dict.setdefault('key', [])</code> returns the existing value or sets and returns "
            "the default. Great for building lists of grouped items.",
            "<strong>Dicts are O(1) for lookup.</strong> Checking <code>'key' in dict</code> is instant, "
            "no matter how big the dict. Checking <code>item in list</code> gets slower with size.",
            "<strong>JSON is just nested dicts and lists.</strong> When you parse JSON from an API, "
            "you get Python dicts. Mastering dicts means mastering API data.",
            "<strong>Use <code>collections.defaultdict</code> for counting.</strong> "
            "It auto-creates missing keys: <code>from collections import defaultdict; "
            "counts = defaultdict(int)</code>.",
        ]),

        recap([
            "Dictionaries store key-value pairs: <code>{\"key\": value}</code>",
            "Access with <code>dict[key]</code> or safely with <code>dict.get(key, default)</code>",
            "Add/update: <code>dict[key] = value</code> or <code>dict.update({...})</code>",
            "Delete: <code>del dict[key]</code>, <code>dict.pop(key)</code>, or <code>dict.clear()</code>",
            "Iterate with <code>.keys()</code>, <code>.values()</code>, or <code>.items()</code>",
            "Nest dicts for complex data structures",
            "Check membership with <code>key in dict</code>",
            "Dicts have O(1) lookup &mdash; fast at any size",
        ]),
    ])
