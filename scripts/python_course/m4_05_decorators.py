"""Module 4, Lesson 5: Decorators."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Decorators",
            "Add behavior to functions without changing their code. The @ syntax is one of Python's most elegant features.",
        ),

        why_it_matters(
            "<p>Decorators are everywhere in professional Python: <code>@app.route</code> in Flask, "
            "<code>@property</code> in classes, <code>@login_required</code> in Django, "
            "<code>@pytest.fixture</code> in testing. Understanding how they work lets you use "
            "frameworks effectively and write your own reusable patterns like timing, logging, "
            "caching, and access control.</p>"
        ),

        section("What is a decorator?"),

        concept("Wrapping functions",
            "<p>A decorator is a function that takes a function and returns a new function, "
            "usually adding some behavior before or after the original runs. The <code>@</code> syntax "
            "is just syntactic sugar:</p>"
        ),

        code_example("Decorators without @ syntax",
            'def loud(func):\n'
            '    """Make a function announce itself."""\n'
            '    def wrapper(*args, **kwargs):\n'
            '        print(f">>> Calling {func.__name__}()")\n'
            '        result = func(*args, **kwargs)\n'
            '        print(f"<<< {func.__name__}() returned {result}")\n'
            '        return result\n'
            '    return wrapper\n'
            '\n'
            'def add(a, b):\n'
            '    return a + b\n'
            '\n'
            '# Manual decoration:\n'
            'add = loud(add)\n'
            'print(add(3, 7))',
            output=">>> Calling add()\n<<< add() returned 10\n10",
            explanation="<code>loud</code> takes <code>add</code>, wraps it in a new function "
            "that prints before and after, and returns the wrapper. Now every call to "
            "<code>add</code> goes through the wrapper."
        ),

        code_example("The @ syntax (identical behavior)",
            'def loud(func):\n'
            '    def wrapper(*args, **kwargs):\n'
            '        print(f">>> Calling {func.__name__}()")\n'
            '        result = func(*args, **kwargs)\n'
            '        print(f"<<< {func.__name__}() returned {result}")\n'
            '        return result\n'
            '    return wrapper\n'
            '\n'
            '@loud\n'
            'def multiply(a, b):\n'
            '    return a * b\n'
            '\n'
            'print(multiply(4, 5))',
            output=">>> Calling multiply()\n<<< multiply() returned 20\n20",
            explanation="<code>@loud</code> above <code>def multiply</code> is exactly the same as "
            "<code>multiply = loud(multiply)</code>. The <code>@</code> syntax is cleaner."
        ),

        section("Preserving metadata with functools.wraps"),

        concept("The identity problem",
            "<p>When you wrap a function, the wrapper replaces its name and docstring. "
            "<code>functools.wraps</code> copies the original metadata to the wrapper:</p>"
        ),

        code_example("functools.wraps",
            'import functools\n'
            '\n'
            '# BAD: without @wraps\n'
            'def bad_decorator(func):\n'
            '    def wrapper(*args, **kwargs):\n'
            '        return func(*args, **kwargs)\n'
            '    return wrapper\n'
            '\n'
            '# GOOD: with @wraps\n'
            'def good_decorator(func):\n'
            '    @functools.wraps(func)\n'
            '    def wrapper(*args, **kwargs):\n'
            '        return func(*args, **kwargs)\n'
            '    return wrapper\n'
            '\n'
            '@bad_decorator\n'
            'def greet_bad(name):\n'
            '    """Say hello."""\n'
            '    return f"Hello, {name}!"\n'
            '\n'
            '@good_decorator\n'
            'def greet_good(name):\n'
            '    """Say hello."""\n'
            '    return f"Hello, {name}!"\n'
            '\n'
            'print(f"Bad:  name={greet_bad.__name__}, doc={greet_bad.__doc__}")\n'
            'print(f"Good: name={greet_good.__name__}, doc={greet_good.__doc__}")',
            output='Bad:  name=wrapper, doc=None\nGood: name=greet_good, doc=Say hello.',
            explanation="Always use <code>@functools.wraps(func)</code> in your decorators. "
            "Without it, debugging becomes harder because <code>help()</code> shows the "
            "wrapper's name instead of the original function's."
        ),

        section("The decorator template"),

        concept("Standard decorator pattern",
            "<p>Here is the template you will use for almost every decorator:</p>"
            "<pre style=\"background:#0f172a;color:#e2e8f0;padding:14px;font-family:monospace;font-size:0.88rem;border-radius:8px;margin:8px 0\">"
            "import functools\n\n"
            "def my_decorator(func):\n"
            "    @functools.wraps(func)\n"
            "    def wrapper(*args, **kwargs):\n"
            "        # ... do something before ...\n"
            "        result = func(*args, **kwargs)\n"
            "        # ... do something after ...\n"
            "        return result\n"
            "    return wrapper</pre>"
        ),

        section("Practical decorator: @timer"),

        code_example("Timing function execution",
            'import functools\n'
            'import time\n'
            '\n'
            'def timer(func):\n'
            '    """Measure and print execution time."""\n'
            '    @functools.wraps(func)\n'
            '    def wrapper(*args, **kwargs):\n'
            '        start = time.perf_counter()\n'
            '        result = func(*args, **kwargs)\n'
            '        elapsed = time.perf_counter() - start\n'
            '        print(f"[TIMER] {func.__name__} took {elapsed:.4f}s")\n'
            '        return result\n'
            '    return wrapper\n'
            '\n'
            '@timer\n'
            'def slow_sum(n):\n'
            '    """Sum numbers from 0 to n."""\n'
            '    return sum(range(n))\n'
            '\n'
            '@timer\n'
            'def fast_sum(n):\n'
            '    """Sum using the formula."""\n'
            '    return n * (n - 1) // 2\n'
            '\n'
            'print(slow_sum(1_000_000))\n'
            'print(fast_sum(1_000_000))',
            output="[TIMER] slow_sum took 0.0312s\n499999500000\n"
            "[TIMER] fast_sum took 0.0000s\n499999500000",
            explanation="The <code>@timer</code> decorator wraps any function to measure how "
            "long it takes. Incredibly useful for finding performance bottlenecks."
        ),

        section("Practical decorator: @retry"),

        code_example("Automatic retry on failure",
            'import functools\n'
            'import random\n'
            '\n'
            'def retry(max_attempts=3):\n'
            '    """Retry a function up to max_attempts times on exception."""\n'
            '    def decorator(func):\n'
            '        @functools.wraps(func)\n'
            '        def wrapper(*args, **kwargs):\n'
            '            for attempt in range(1, max_attempts + 1):\n'
            '                try:\n'
            '                    return func(*args, **kwargs)\n'
            '                except Exception as e:\n'
            '                    if attempt == max_attempts:\n'
            '                        print(f"[RETRY] {func.__name__} failed after {max_attempts} attempts")\n'
            '                        raise\n'
            '                    print(f"[RETRY] {func.__name__} attempt {attempt} failed: {e}")\n'
            '        return wrapper\n'
            '    return decorator\n'
            '\n'
            '@retry(max_attempts=5)\n'
            'def unreliable_api_call():\n'
            '    """Simulate a flaky API."""\n'
            '    if random.random() < 0.7:    # 70% failure rate\n'
            '        raise ConnectionError("Server timeout")\n'
            '    return {"status": "ok", "data": [1, 2, 3]}\n'
            '\n'
            'try:\n'
            '    result = unreliable_api_call()\n'
            '    print(f"Success: {result}")\n'
            'except ConnectionError:\n'
            '    print("All attempts failed.")',
            output="[RETRY] unreliable_api_call attempt 1 failed: Server timeout\n"
            "[RETRY] unreliable_api_call attempt 2 failed: Server timeout\n"
            "Success: {'status': 'ok', 'data': [1, 2, 3]}",
            explanation="Notice this is a <strong>decorator factory</strong> &mdash; "
            "<code>@retry(max_attempts=5)</code> calls <code>retry(5)</code> which returns "
            "the actual decorator. This extra layer lets you pass arguments to decorators."
        ),

        section("Decorators with arguments"),

        concept("Decorator factories",
            "<p>When a decorator needs arguments (like <code>@retry(max_attempts=5)</code>), "
            "you add an extra layer of nesting. The outer function takes the arguments, "
            "the middle function takes the function, and the inner function is the wrapper:</p>"
        ),

        code_example("Decorator with arguments pattern",
            'import functools\n'
            '\n'
            'def log_calls(level="INFO", include_args=True):\n'
            '    """Log function calls at a specified level."""\n'
            '    def decorator(func):\n'
            '        @functools.wraps(func)\n'
            '        def wrapper(*args, **kwargs):\n'
            '            if include_args:\n'
            '                print(f"[{level}] Calling {func.__name__}(args={args}, kwargs={kwargs})")\n'
            '            else:\n'
            '                print(f"[{level}] Calling {func.__name__}()")\n'
            '            result = func(*args, **kwargs)\n'
            '            print(f"[{level}] {func.__name__} returned {result}")\n'
            '            return result\n'
            '        return wrapper\n'
            '    return decorator\n'
            '\n'
            '@log_calls(level="DEBUG", include_args=True)\n'
            'def add(a, b):\n'
            '    return a + b\n'
            '\n'
            '@log_calls(level="WARN", include_args=False)\n'
            'def divide(a, b):\n'
            '    return a / b\n'
            '\n'
            'add(3, 7)\n'
            'divide(10, 3)',
            output="[DEBUG] Calling add(args=(3, 7), kwargs={})\n"
            "[DEBUG] add returned 10\n"
            "[WARN] Calling divide()\n"
            "[WARN] divide returned 3.3333333333333335",
        ),

        section("Practical decorator: @cache_result"),

        code_example("Simple memoization cache",
            'import functools\n'
            '\n'
            'def cache_result(func):\n'
            '    """Cache function results based on arguments."""\n'
            '    cache = {}\n'
            '\n'
            '    @functools.wraps(func)\n'
            '    def wrapper(*args):\n'
            '        if args in cache:\n'
            '            print(f"[CACHE HIT] {func.__name__}{args}")\n'
            '            return cache[args]\n'
            '        print(f"[CACHE MISS] {func.__name__}{args}")\n'
            '        result = func(*args)\n'
            '        cache[args] = result\n'
            '        return result\n'
            '\n'
            '    wrapper.cache = cache    # expose cache for inspection\n'
            '    return wrapper\n'
            '\n'
            '@cache_result\n'
            'def fibonacci(n):\n'
            '    """Calculate nth Fibonacci number recursively."""\n'
            '    if n < 2:\n'
            '        return n\n'
            '    return fibonacci(n - 1) + fibonacci(n - 2)\n'
            '\n'
            'print(fibonacci(10))\n'
            'print(f"Cache size: {len(fibonacci.cache)}")\n'
            'print(fibonacci(10))    # instant from cache',
            output="[CACHE MISS] fibonacci(10,)\n"
            "[CACHE MISS] fibonacci(9,)\n"
            "[CACHE MISS] fibonacci(8,)\n"
            "[CACHE MISS] fibonacci(7,)\n"
            "[CACHE MISS] fibonacci(6,)\n"
            "[CACHE MISS] fibonacci(5,)\n"
            "[CACHE MISS] fibonacci(4,)\n"
            "[CACHE MISS] fibonacci(3,)\n"
            "[CACHE MISS] fibonacci(2,)\n"
            "[CACHE MISS] fibonacci(1,)\n"
            "[CACHE MISS] fibonacci(0,)\n"
            "[CACHE HIT] fibonacci(1,)\n"
            "[CACHE HIT] fibonacci(2,)\n"
            "[CACHE HIT] fibonacci(3,)\n"
            "[CACHE HIT] fibonacci(4,)\n"
            "[CACHE HIT] fibonacci(5,)\n"
            "[CACHE HIT] fibonacci(6,)\n"
            "[CACHE HIT] fibonacci(7,)\n"
            "[CACHE HIT] fibonacci(8,)\n"
            "55\nCache size: 11\n"
            "[CACHE HIT] fibonacci(10,)\n55",
            explanation="Without caching, <code>fibonacci(10)</code> makes 177 calls. "
            "With caching, only 11 unique calls happen. Python's standard library includes "
            "<code>@functools.lru_cache</code> which does the same thing (and more)."
        ),

        section("Stacking decorators"),

        code_example("Multiple decorators on one function",
            'import functools\n'
            'import time\n'
            '\n'
            'def timer(func):\n'
            '    @functools.wraps(func)\n'
            '    def wrapper(*args, **kwargs):\n'
            '        start = time.perf_counter()\n'
            '        result = func(*args, **kwargs)\n'
            '        print(f"[TIMER] {func.__name__}: {time.perf_counter() - start:.4f}s")\n'
            '        return result\n'
            '    return wrapper\n'
            '\n'
            'def log(func):\n'
            '    @functools.wraps(func)\n'
            '    def wrapper(*args, **kwargs):\n'
            '        print(f"[LOG] {func.__name__} called")\n'
            '        return func(*args, **kwargs)\n'
            '    return wrapper\n'
            '\n'
            '@timer\n'
            '@log\n'
            'def process_data(items):\n'
            '    return [x * 2 for x in items]\n'
            '\n'
            'result = process_data([1, 2, 3, 4, 5])\n'
            'print(f"Result: {result}")',
            output="[LOG] process_data called\n"
            "[TIMER] process_data: 0.0000s\n"
            "Result: [2, 4, 6, 8, 10]",
            explanation="Decorators stack from bottom to top. <code>@timer</code> wraps the "
            "result of <code>@log</code> wrapping <code>process_data</code>. So timer runs "
            "first (outer), then log, then the function."
        ),

        try_it("Write a <code>@count_calls</code> decorator that tracks how many times a function has been called. Store the count as <code>wrapper.call_count</code>."),

        section("Exercises"),

        exercise("starter", "Build @timer",
            "Write a <code>@timer</code> decorator that prints how long a function takes to execute. "
            "Use <code>time.perf_counter()</code> for accuracy. Apply it to a function that "
            "computes the sum of squares from 1 to n. Test with <code>n=1_000_000</code>.",
            hint="Capture <code>start = time.perf_counter()</code> before calling the function. "
            "After, <code>elapsed = time.perf_counter() - start</code>."
        ),

        exercise("medium", "Build @require_auth (simulated)",
            "Write a <code>@require_auth(role=\"admin\")</code> decorator factory that checks "
            "if a global <code>current_user</code> dictionary has a <code>role</code> field "
            "matching the required role. If not, print <code>\"Access denied\"</code> and return "
            "<code>None</code>. If yes, call the function normally. Test by changing "
            "<code>current_user</code> between calls.",
            hint="The decorator factory takes <code>role</code>. The wrapper checks "
            "<code>if current_user.get(\"role\") != role</code>. Use three nesting levels: "
            "factory, decorator, wrapper."
        ),

        exercise("real-world", "Build @cache_result with TTL",
            "Extend the cache decorator to accept a <code>ttl</code> (time to live) in seconds. "
            "If a cached result is older than <code>ttl</code> seconds, discard it and recompute. "
            "Store cache entries as <code>(timestamp, result)</code> tuples. Add a "
            "<code>wrapper.cache_clear()</code> method. Test by caching a function, waiting, "
            "and verifying the cache expires.",
            hint="Store <code>cache[args] = (time.time(), result)</code>. "
            "On lookup, check <code>if time.time() - timestamp > ttl</code>. "
            "Use <code>@cache_result(ttl=5)</code> syntax (decorator factory)."
        ),

        mistakes([
            ("Forgetting <code>@functools.wraps(func)</code>",
             "Without it, the decorated function loses its name, docstring, and other metadata. "
             "Always include it."),
            ("Forgetting to return the result",
             "If your wrapper does not <code>return func(*args, **kwargs)</code>, "
             "the decorated function silently returns <code>None</code>."),
            ("Missing parentheses on decorator factories",
             "<code>@retry</code> passes the function as <code>max_attempts</code>. "
             "You need <code>@retry()</code> with parentheses."),
            ("Decorating with side effects at import time",
             "Code in the decorator body (outside the wrapper) runs when the module is imported. "
             "Keep setup logic inside the wrapper."),
        ]),

        pro_tips([
            "<strong>Use <code>@functools.lru_cache</code></strong> for production caching. "
            "It handles size limits, thread safety, and typed arguments.",
            "<strong>Decorators are just closures.</strong> If you understand closures from "
            "the previous lesson, decorators are the same pattern with a specific use case.",
            "<strong>Stack decorators in order.</strong> The topmost decorator is the outermost "
            "wrapper. Put logging outside timing to measure the actual function, not the logging.",
            "<strong>Use <code>@wraps</code> even for simple decorators.</strong> Future you "
            "will thank present you when debugging.",
        ]),

        recap([
            "A decorator wraps a function to add behavior",
            "<code>@decorator</code> is shorthand for <code>func = decorator(func)</code>",
            "Always use <code>@functools.wraps(func)</code> to preserve metadata",
            "Common patterns: timing, logging, retrying, caching",
            "Decorator factories add an extra layer for passing arguments",
            "Decorators stack from bottom to top",
            "Python includes <code>@functools.lru_cache</code> for memoization",
        ]),
    ])
