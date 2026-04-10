"""Module 4, Lesson 2: Arguments & Return Values."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Arguments &amp; Return Values",
            "Master the ways Python passes data into and out of functions. Positional, keyword, default, *args, **kwargs, and multiple returns.",
        ),

        why_it_matters(
            "<p>Real functions need flexibility. A logging function might accept any number of messages. "
            "A price calculator might have optional tax and discount parameters. Understanding how "
            "Python handles arguments lets you write functions that are both powerful and easy to use.</p>"
        ),

        section("Positional arguments"),

        concept("Order matters",
            "<p>By default, arguments are matched by <strong>position</strong>. The first argument "
            "goes to the first parameter, the second to the second, and so on:</p>"
        ),

        code_example("Positional arguments",
            'def power(base, exponent):\n'
            '    return base ** exponent\n'
            '\n'
            'print(power(2, 10))    # 2^10\n'
            'print(power(10, 2))    # 10^2 -- different!',
            output="1024\n100",
            explanation="Swapping the order changes the result because <code>base</code> and "
            "<code>exponent</code> are assigned by position."
        ),

        section("Keyword arguments"),

        concept("Name your arguments",
            "<p>You can pass arguments by <strong>name</strong> to make calls clearer and "
            "order-independent:</p>"
        ),

        code_example("Using keyword arguments",
            'def create_user(name, email, role):\n'
            '    return f"{name} ({email}) - {role}"\n'
            '\n'
            '# Positional -- you have to remember the order:\n'
            'print(create_user("Alice", "alice@co.com", "admin"))\n'
            '\n'
            '# Keyword -- clear and order doesn\'t matter:\n'
            'print(create_user(role="editor", name="Bob", email="bob@co.com"))',
            output='Alice (alice@co.com) - admin\nBob (bob@co.com) - editor',
            explanation="Keyword arguments make function calls self-documenting. Anyone reading "
            "<code>role=\"editor\"</code> knows exactly what that argument is for."
        ),

        section("Default values"),

        concept("Parameters with defaults",
            "<p>Give parameters a default value so callers can omit them. "
            "Parameters with defaults must come <strong>after</strong> parameters without:</p>"
        ),

        code_example("Default argument values",
            'def send_email(to, subject, urgent=False, cc=None):\n'
            '    prefix = "[URGENT] " if urgent else ""\n'
            '    msg = f"To: {to}\\nSubject: {prefix}{subject}"\n'
            '    if cc:\n'
            '        msg += f"\\nCC: {cc}"\n'
            '    return msg\n'
            '\n'
            '# Use defaults:\n'
            'print(send_email("alice@co.com", "Meeting notes"))\n'
            'print()\n'
            '# Override defaults:\n'
            'print(send_email("bob@co.com", "Server down!", urgent=True, cc="team@co.com"))',
            output="To: alice@co.com\nSubject: Meeting notes\n\n"
            "To: bob@co.com\nSubject: [URGENT] Server down!\nCC: team@co.com",
            explanation="Defaults make functions easy to call in the common case, while "
            "still allowing full customization when needed."
        ),

        section("*args: variable positional arguments"),

        concept("Accept any number of arguments",
            "<p>Prefix a parameter with <code>*</code> to collect extra positional arguments "
            "into a <strong>tuple</strong>:</p>"
        ),

        code_example("Using *args",
            'def total(*amounts):\n'
            '    """Sum any number of values."""\n'
            '    return sum(amounts)\n'
            '\n'
            'print(total(10, 20, 30))\n'
            'print(total(5))\n'
            'print(total(1, 2, 3, 4, 5, 6, 7, 8, 9, 10))\n'
            '\n'
            '# What is *args inside the function?\n'
            'def show_args(*args):\n'
            '    print(f"Type: {type(args)}")\n'
            '    print(f"Value: {args}")\n'
            '\n'
            'show_args("a", "b", "c")',
            output="60\n5\n55\nType: <class 'tuple'>\nValue: ('a', 'b', 'c')",
            explanation="<code>*args</code> collects all extra positional arguments into a tuple. "
            "The name <code>args</code> is a convention &mdash; you could call it <code>*numbers</code> "
            "or <code>*items</code>."
        ),

        section("**kwargs: variable keyword arguments"),

        concept("Accept any number of named arguments",
            "<p>Prefix a parameter with <code>**</code> to collect extra keyword arguments "
            "into a <strong>dictionary</strong>:</p>"
        ),

        code_example("Using **kwargs",
            'def build_profile(name, **details):\n'
            '    """Build a user profile from arbitrary fields."""\n'
            '    profile = {"name": name}\n'
            '    profile.update(details)\n'
            '    return profile\n'
            '\n'
            'print(build_profile("Alice", age=30, city="NYC", role="engineer"))\n'
            'print(build_profile("Bob", company="Acme"))',
            output="{'name': 'Alice', 'age': 30, 'city': 'NYC', 'role': 'engineer'}\n"
            "{'name': 'Bob', 'company': 'Acme'}",
            explanation="<code>**kwargs</code> is perfect when you do not know in advance what "
            "named arguments a function will receive. Very common in configuration functions."
        ),

        section("Combining argument types"),

        concept("The full parameter order",
            "<p>When combining different parameter types, Python requires this order:</p>"
            "<ol>"
            "<li>Regular positional parameters</li>"
            "<li>Parameters with default values</li>"
            "<li><code>*args</code> (variable positional)</li>"
            "<li><code>**kwargs</code> (variable keyword)</li>"
            "</ol>"
        ),

        code_example("All argument types together",
            'def log(level, message, *tags, timestamp=None, **metadata):\n'
            '    parts = [f"[{level.upper()}]"]\n'
            '    if timestamp:\n'
            '        parts.append(f"({timestamp})")\n'
            '    parts.append(message)\n'
            '    if tags:\n'
            '        parts.append(f"tags={list(tags)}")\n'
            '    if metadata:\n'
            '        parts.append(f"meta={metadata}")\n'
            '    return " ".join(parts)\n'
            '\n'
            'print(log("info", "Server started"))\n'
            'print(log("warn", "High CPU", "perf", "system", node="web-01"))\n'
            'print(log("error", "Timeout", timestamp="14:30:00", service="api"))',
            output="[INFO] Server started\n"
            "[WARN] High CPU tags=['perf', 'system'] meta={'node': 'web-01'}\n"
            "[ERROR] (14:30:00) Timeout meta={'service': 'api'}",
            explanation="This single function handles every combination: simple messages, "
            "tagged messages, timestamped messages, and messages with arbitrary metadata."
        ),

        section("Multiple return values"),

        concept("Returning more than one thing",
            "<p>Python functions can return multiple values as a <strong>tuple</strong>. "
            "You unpack them on the other side:</p>"
        ),

        code_example("Multiple return values",
            'def analyze_text(text):\n'
            '    """Return word count, character count, and average word length."""\n'
            '    words = text.split()\n'
            '    word_count = len(words)\n'
            '    char_count = len(text)\n'
            '    avg_length = sum(len(w) for w in words) / word_count if word_count else 0\n'
            '    return word_count, char_count, round(avg_length, 1)\n'
            '\n'
            '# Unpack into separate variables:\n'
            'words, chars, avg = analyze_text("Python is a powerful programming language")\n'
            'print(f"Words: {words}, Chars: {chars}, Avg length: {avg}")\n'
            '\n'
            '# Or keep as a tuple:\n'
            'result = analyze_text("Hello world")\n'
            'print(f"Result tuple: {result}")',
            output="Words: 6, Chars: 42, Avg length: 6.0\nResult tuple: (2, 11, 5.0)",
            explanation="The <code>return a, b, c</code> syntax actually returns a tuple "
            "<code>(a, b, c)</code>. Python's tuple unpacking makes it look like three "
            "separate return values."
        ),

        code_example("Returning a dictionary for clarity",
            'def get_user_stats(user_id):\n'
            '    """Return stats as a dict when there are many values."""\n'
            '    # Simulated data\n'
            '    return {\n'
            '        "user_id": user_id,\n'
            '        "posts": 142,\n'
            '        "followers": 1089,\n'
            '        "following": 234,\n'
            '        "engagement_rate": 3.7,\n'
            '    }\n'
            '\n'
            'stats = get_user_stats("alice_dev")\n'
            'print(f"{stats[\"user_id\"]} has {stats[\"followers\"]} followers")\n'
            'print(f"Engagement: {stats[\"engagement_rate\"]}%")',
            output='alice_dev has 1089 followers\nEngagement: 3.7%',
            explanation="When returning more than 3 values, a dictionary is often clearer than "
            "a tuple. The caller does not need to memorize the order."
        ),

        try_it("Write a function that accepts <code>*args</code> of numbers and returns both the minimum and maximum as a tuple."),

        section("Exercises"),

        exercise("starter", "Price calculator with tax and discount",
            "Write a function <code>calculate_price(base_price, tax_rate=0.08, discount=0)</code> "
            "that returns the final price after applying discount first, then tax. "
            "Test with: <code>calculate_price(100)</code>, <code>calculate_price(100, discount=0.1)</code>, "
            "and <code>calculate_price(100, tax_rate=0.1, discount=0.2)</code>.",
            hint="<code>discounted = base_price * (1 - discount)</code>, then "
            "<code>final = discounted * (1 + tax_rate)</code>. Return <code>round(final, 2)</code>."
        ),

        exercise("medium", "Data validator",
            "Write a function <code>validate_user(**fields)</code> that checks user data. "
            "It should verify: <code>name</code> is not empty, <code>email</code> contains "
            "<code>@</code>, <code>age</code> is between 0 and 150. Return a dictionary with "
            "<code>\"valid\": True/False</code> and <code>\"errors\": [list of error messages]</code>. "
            "Test with valid data and with data that has multiple errors.",
            hint="Build an <code>errors = []</code> list. Check each field with "
            "<code>if \"name\" in fields and not fields[\"name\"]:</code>. "
            "Return <code>{\"valid\": len(errors) == 0, \"errors\": errors}</code>."
        ),

        exercise("real-world", "Flexible logger",
            "Build a <code>log(*messages, level=\"INFO\", timestamp=True, **context)</code> function "
            "that formats log entries. It should join all messages with spaces, prepend the level, "
            "optionally add a timestamp (use <code>\"2024-01-15 10:30:00\"</code> as a fake timestamp), "
            "and append any context as <code>key=value</code> pairs. "
            "Example output: <code>[INFO] 2024-01-15 10:30:00 Server started on port 8080 host=localhost env=prod</code>.",
            hint="Use <code>\" \".join(messages)</code> to combine messages. "
            "Build context string with <code>\" \".join(f\"{k}={v}\" for k, v in context.items())</code>."
        ),

        mistakes([
            ("Mutable default arguments",
             "Never use <code>def f(items=[])</code>. The list is shared across calls. "
             "Use <code>def f(items=None)</code> and <code>items = items or []</code> inside."),
            ("Mixing positional and keyword arguments incorrectly",
             "Once you use a keyword argument, all following arguments must also be keyword. "
             "<code>f(a=1, 2)</code> is a syntax error."),
            ("Ignoring return values",
             "Calling <code>sorted(my_list)</code> without capturing the result does nothing. "
             "<code>sorted()</code> returns a new list &mdash; it does not modify the original."),
            ("Too many parameters",
             "If a function takes more than 5 parameters, consider grouping them into a "
             "dictionary or a dataclass (Module 5)."),
        ]),

        pro_tips([
            "<strong>Use keyword arguments for clarity.</strong> <code>send(to=\"alice\", urgent=True)</code> "
            "is much clearer than <code>send(\"alice\", True)</code>.",
            "<strong>Default to <code>None</code> for mutable defaults.</strong> "
            "<code>def f(items=None): items = items or []</code> is a standard Python pattern.",
            "<strong>Use <code>*</code> to force keyword-only arguments:</strong> "
            "<code>def f(x, *, verbose=False)</code> means <code>verbose</code> must be passed by name.",
            "<strong>Unpack arguments with <code>*</code> and <code>**</code>:</strong> "
            "<code>f(*my_list)</code> unpacks a list into positional args. "
            "<code>f(**my_dict)</code> unpacks a dict into keyword args.",
        ]),

        recap([
            "Positional arguments are matched by order",
            "Keyword arguments are matched by name",
            "Default values make parameters optional",
            "<code>*args</code> collects extra positional args into a tuple",
            "<code>**kwargs</code> collects extra keyword args into a dict",
            "Return multiple values as a tuple or dictionary",
            "Never use mutable objects as default values",
        ]),
    ])
