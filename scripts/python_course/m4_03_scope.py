"""Module 4, Lesson 3: Scope & Closures."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Scope &amp; Closures",
            "Understand where variables live, how Python looks them up, and how closures let functions remember their environment.",
        ),

        why_it_matters(
            "<p>Scope bugs are some of the hardest to track down. You define a variable inside a function, "
            "then wonder why it does not exist outside. Or you accidentally modify a global variable "
            "and break something three files away. Understanding scope prevents these silent bugs "
            "and unlocks powerful patterns like closures and factories.</p>"
        ),

        section("Local scope"),

        concept("Variables inside functions are local",
            "<p>A variable created inside a function only exists inside that function. "
            "It is <strong>born</strong> when the function runs and <strong>dies</strong> when it returns:</p>"
        ),

        code_example("Local variables",
            'def calculate_tax(amount):\n'
            '    tax_rate = 0.08    # local variable\n'
            '    tax = amount * tax_rate\n'
            '    return tax\n'
            '\n'
            'print(calculate_tax(100))    # 8.0\n'
            '\n'
            '# This will cause an error:\n'
            'try:\n'
            '    print(tax_rate)\n'
            'except NameError as e:\n'
            '    print(f"Error: {e}")',
            output="8.0\nError: name 'tax_rate' is not defined",
            explanation="<code>tax_rate</code> only exists inside <code>calculate_tax</code>. "
            "Outside the function, Python has no idea what it is."
        ),

        section("Global scope"),

        concept("Module-level variables",
            "<p>Variables defined at the top level of a file (outside any function) are "
            "<strong>global</strong>. They can be <em>read</em> from inside functions, but "
            "not directly <em>modified</em>:</p>"
        ),

        code_example("Reading global variables",
            'APP_NAME = "MyApp"      # global\n'
            'MAX_RETRIES = 3         # global\n'
            '\n'
            'def get_header():\n'
            '    # Can READ globals without any special syntax:\n'
            '    return f"{APP_NAME} v1.0 (max retries: {MAX_RETRIES})"\n'
            '\n'
            'print(get_header())',
            output="MyApp v1.0 (max retries: 3)",
        ),

        code_example("The global keyword",
            'counter = 0\n'
            '\n'
            'def increment():\n'
            '    global counter    # tells Python to modify the global variable\n'
            '    counter += 1\n'
            '\n'
            'increment()\n'
            'increment()\n'
            'increment()\n'
            'print(f"Counter: {counter}")',
            output="Counter: 3",
            explanation="Without <code>global counter</code>, Python would create a new local "
            "variable named <code>counter</code> and you would get an <code>UnboundLocalError</code>. "
            "The <code>global</code> keyword says: use the one from the module level."
        ),

        section("The LEGB rule"),

        concept("How Python looks up names",
            "<p>When you use a variable, Python searches in this order (LEGB):</p>"
            "<ol>"
            "<li><strong>L</strong>ocal &mdash; inside the current function</li>"
            "<li><strong>E</strong>nclosing &mdash; inside any outer functions (closures)</li>"
            "<li><strong>G</strong>lobal &mdash; at the module (file) level</li>"
            "<li><strong>B</strong>uilt-in &mdash; Python's built-in names (<code>print</code>, <code>len</code>, etc.)</li>"
            "</ol>"
            "<p>Python stops at the first match. If no match is found, you get a <code>NameError</code>.</p>"
        ),

        code_example("LEGB in action",
            'x = "global"\n'
            '\n'
            'def outer():\n'
            '    x = "enclosing"\n'
            '\n'
            '    def inner():\n'
            '        x = "local"\n'
            '        print(f"inner sees: {x}")\n'
            '\n'
            '    inner()\n'
            '    print(f"outer sees: {x}")\n'
            '\n'
            'outer()\n'
            'print(f"module sees: {x}")',
            output="inner sees: local\nouter sees: enclosing\nmodule sees: global",
            explanation="Each level has its own <code>x</code>. Python always uses the most "
            "local one. Remove <code>x = \"local\"</code> from <code>inner</code> and it "
            "would see <code>\"enclosing\"</code>."
        ),

        section("Closures"),

        concept("Functions that remember their environment",
            "<p>A <strong>closure</strong> is a function that remembers variables from its "
            "enclosing scope, even after that scope has finished executing. This is one of "
            "the most powerful patterns in Python:</p>"
        ),

        code_example("Basic closure",
            'def make_greeting(greeting_word):\n'
            '    """Return a function that greets with a specific word."""\n'
            '    def greet(name):\n'
            '        return f"{greeting_word}, {name}!"\n'
            '    return greet\n'
            '\n'
            '# Create specialized greeting functions:\n'
            'say_hello = make_greeting("Hello")\n'
            'say_hi = make_greeting("Hi")\n'
            'say_hey = make_greeting("Hey")\n'
            '\n'
            'print(say_hello("Alice"))\n'
            'print(say_hi("Bob"))\n'
            'print(say_hey("Charlie"))',
            output="Hello, Alice!\nHi, Bob!\nHey, Charlie!",
            explanation="<code>make_greeting</code> returns a function. That returned function "
            "remembers <code>greeting_word</code> even though <code>make_greeting</code> has "
            "already finished executing. That is a closure."
        ),

        code_example("Counter factory with closures",
            'def make_counter(start=0):\n'
            '    """Create a counter that remembers its state."""\n'
            '    count = start\n'
            '\n'
            '    def increment():\n'
            '        nonlocal count    # modify the enclosing variable\n'
            '        count += 1\n'
            '        return count\n'
            '\n'
            '    def get_value():\n'
            '        return count\n'
            '\n'
            '    def reset():\n'
            '        nonlocal count\n'
            '        count = start\n'
            '\n'
            '    return increment, get_value, reset\n'
            '\n'
            '# Create two independent counters:\n'
            'inc_a, get_a, reset_a = make_counter()\n'
            'inc_b, get_b, reset_b = make_counter(100)\n'
            '\n'
            'inc_a()\n'
            'inc_a()\n'
            'inc_a()\n'
            'inc_b()\n'
            '\n'
            'print(f"Counter A: {get_a()}")\n'
            'print(f"Counter B: {get_b()}")\n'
            '\n'
            'reset_a()\n'
            'print(f"Counter A after reset: {get_a()}")',
            output="Counter A: 3\nCounter B: 101\nCounter A after reset: 0",
            explanation="Each call to <code>make_counter</code> creates a separate <code>count</code> "
            "variable. The <code>nonlocal</code> keyword lets the inner functions modify it. "
            "The counters are independent &mdash; incrementing A does not affect B."
        ),

        section("The <code>nonlocal</code> keyword"),

        concept("Modifying enclosing variables",
            "<p>Just like <code>global</code> lets you modify module-level variables, "
            "<code>nonlocal</code> lets you modify variables in an enclosing function's scope:</p>"
        ),

        code_example("nonlocal vs global",
            'total = 0    # global\n'
            '\n'
            'def outer():\n'
            '    total = 0    # enclosing (shadows the global)\n'
            '\n'
            '    def add(amount):\n'
            '        nonlocal total    # modifies outer\'s total, not global\n'
            '        total += amount\n'
            '        return total\n'
            '\n'
            '    add(10)\n'
            '    add(20)\n'
            '    print(f"Enclosing total: {total}")\n'
            '\n'
            'outer()\n'
            'print(f"Global total: {total}")',
            output="Enclosing total: 30\nGlobal total: 0",
            explanation="<code>nonlocal total</code> modifies the one inside <code>outer</code>, "
            "not the global <code>total</code>. The global remains unchanged."
        ),

        section("Practical closure patterns"),

        code_example("Configuration reader factory",
            'def make_config_reader(defaults):\n'
            '    """Create a config reader with default values."""\n'
            '    config = dict(defaults)    # copy the defaults\n'
            '\n'
            '    def get(key):\n'
            '        return config.get(key, None)\n'
            '\n'
            '    def set_value(key, value):\n'
            '        config[key] = value\n'
            '\n'
            '    def get_all():\n'
            '        return dict(config)    # return a copy\n'
            '\n'
            '    return get, set_value, get_all\n'
            '\n'
            'get, set_val, get_all = make_config_reader({\n'
            '    "host": "localhost",\n'
            '    "port": 8080,\n'
            '    "debug": False,\n'
            '})\n'
            '\n'
            'print(get("host"))\n'
            'print(get("port"))\n'
            'set_val("debug", True)\n'
            'set_val("workers", 4)\n'
            'print(get_all())',
            output='localhost\n8080\n'
            "{'host': 'localhost', 'port': 8080, 'debug': True, 'workers': 4}",
            explanation="The closure encapsulates state (the <code>config</code> dict) "
            "without using global variables or classes. This pattern is common in "
            "functional programming."
        ),

        code_example("Rate limiter",
            'import time\n'
            '\n'
            'def make_rate_limiter(max_calls, period_seconds):\n'
            '    """Allow max_calls within each period."""\n'
            '    calls = []\n'
            '\n'
            '    def allow():\n'
            '        now = time.time()\n'
            '        # Remove calls outside the current window\n'
            '        while calls and calls[0] < now - period_seconds:\n'
            '            calls.pop(0)\n'
            '        if len(calls) < max_calls:\n'
            '            calls.append(now)\n'
            '            return True\n'
            '        return False\n'
            '\n'
            '    return allow\n'
            '\n'
            '# Allow 3 calls per 10 seconds:\n'
            'can_proceed = make_rate_limiter(3, 10)\n'
            'for i in range(5):\n'
            '    result = "Allowed" if can_proceed() else "Rate limited"\n'
            '    print(f"Call {i + 1}: {result}")',
            output="Call 1: Allowed\nCall 2: Allowed\nCall 3: Allowed\n"
            "Call 4: Rate limited\nCall 5: Rate limited",
            explanation="The <code>calls</code> list persists between invocations of <code>allow()</code> "
            "because of the closure. Each rate limiter has its own independent call history."
        ),

        try_it("Create a <code>make_multiplier(factor)</code> closure that returns a function which multiplies its argument by <code>factor</code>."),

        section("Exercises"),

        exercise("starter", "Counter factory",
            "Write a function <code>make_counter(start=0, step=1)</code> that returns "
            "a function. Each time the returned function is called, it returns the next "
            "value in the sequence. Example: if <code>start=10, step=5</code>, calls return "
            "<code>10, 15, 20, 25, ...</code>. Create two counters with different settings "
            "and show they are independent.",
            hint="Use <code>nonlocal current</code> inside the inner function. "
            "Set <code>current = start - step</code> initially, then add <code>step</code> on each call."
        ),

        exercise("medium", "Rate limiter with reset",
            "Extend the rate limiter to return three functions: <code>allow()</code>, "
            "<code>remaining()</code>, and <code>reset()</code>. <code>remaining()</code> "
            "returns how many calls are left in the current window. <code>reset()</code> "
            "clears the call history. Test all three functions.",
            hint="<code>remaining</code> calculates <code>max_calls - len(active_calls)</code> "
            "where active calls are those within the time window. "
            "<code>reset</code> does <code>calls.clear()</code>."
        ),

        exercise("real-world", "Config reader with environment override",
            "Build a <code>make_config(defaults, env_prefix)</code> factory that returns "
            "<code>get</code>, <code>set_value</code>, and <code>get_all</code> functions. "
            "The <code>get</code> function should first check if an environment variable "
            "named <code>env_prefix + \"_\" + key.upper()</code> exists (use <code>os.environ.get</code>). "
            "If it does, return that. Otherwise return from the defaults. "
            "Test by setting <code>os.environ[\"APP_DEBUG\"] = \"true\"</code> before calling <code>get(\"debug\")</code>.",
            hint="<code>import os</code> at the top. In the <code>get</code> function: "
            "<code>env_key = f\"{env_prefix}_{key.upper()}\"</code>, then "
            "<code>return os.environ.get(env_key, config.get(key))</code>."
        ),

        mistakes([
            ("Modifying a global without <code>global</code>",
             "Python creates a local variable instead. You get <code>UnboundLocalError: "
             "local variable 'x' referenced before assignment</code>."),
            ("Overusing <code>global</code>",
             "Global state makes code hard to test and debug. Prefer passing values as "
             "arguments and returning results. Use closures for shared state."),
            ("Forgetting <code>nonlocal</code> in closures",
             "Without <code>nonlocal</code>, assignment creates a new local variable in "
             "the inner function instead of modifying the enclosing one."),
            ("Shadowing built-in names",
             "<code>list = [1, 2, 3]</code> shadows the built-in <code>list()</code> function. "
             "Now <code>list(\"abc\")</code> will fail. Avoid names like <code>list</code>, "
             "<code>dict</code>, <code>str</code>, <code>type</code>, <code>print</code>."),
        ]),

        pro_tips([
            "<strong>Closures replace simple classes.</strong> If a class only has <code>__init__</code> "
            "and one method, a closure is usually simpler and cleaner.",
            "<strong>Use closures for configuration.</strong> Factory functions that return "
            "pre-configured functions are a clean alternative to partial application.",
            "<strong>Minimize global state.</strong> Every global variable is a potential source "
            "of bugs. Pass data through function parameters instead.",
            "<strong><code>nonlocal</code> is rare in practice.</strong> If you find yourself using "
            "it frequently, you probably want a class instead. Closures are best for simple state.",
        ]),

        recap([
            "Local variables exist only inside their function",
            "Global variables live at the module level",
            "LEGB rule: Local, Enclosing, Global, Built-in",
            "<code>global</code> lets you modify module-level variables from inside a function",
            "<code>nonlocal</code> lets you modify enclosing function variables",
            "Closures are functions that remember their enclosing scope",
            "Factory functions create pre-configured closures",
        ]),
    ])
