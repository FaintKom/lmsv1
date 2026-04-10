"""Module 6, Lesson 4: Modules, Packages & pip."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Modules, Packages &amp; pip",
            "Organize code into files, import from the standard library, and install third-party packages.",
        ),

        why_it_matters(
            "<p>No one writes everything from scratch. Python's standard library has 200+ modules "
            "for everything from dates to web servers. PyPI (Python Package Index) has 500,000+ "
            "third-party packages. Knowing how to organize your own code into modules, import "
            "what you need, and install packages with pip is essential for every Python developer.</p>"
        ),

        section("Importing modules"),

        concept("Three ways to import",
            "<p>Python provides three import styles, each with trade-offs:</p>"
        ),

        code_example("Import styles",
            'import math\n'
            'print(math.sqrt(16))      # 4.0\n'
            'print(math.pi)            # 3.141592653589793\n'
            '\n'
            '# Import specific names:\n'
            'from datetime import datetime, timedelta\n'
            'now = datetime.now()\n'
            'tomorrow = now + timedelta(days=1)\n'
            'print(f"Now: {now.strftime(\"%Y-%m-%d %H:%M\")}")\n'
            'print(f"Tomorrow: {tomorrow.strftime(\"%Y-%m-%d\")}")\n'
            '\n'
            '# Import with alias:\n'
            'import json as j\n'
            'data = j.dumps({"name": "Alice"}, indent=2)\n'
            'print(data)',
            output="4.0\n3.141592653589793\n"
            "Now: 2024-01-15 14:30\nTomorrow: 2024-01-16\n"
            "{\n  \"name\": \"Alice\"\n}",
            explanation="<code>import math</code> imports the whole module (access with <code>math.func</code>). "
            "<code>from X import Y</code> imports specific names. "
            "<code>import X as alias</code> gives it a shorter name."
        ),

        section("Useful standard library modules"),

        code_example("os and pathlib: file system operations",
            'import os\n'
            'from pathlib import Path\n'
            '\n'
            '# Current directory:\n'
            'print(f"CWD: {os.getcwd()}")\n'
            '\n'
            '# Environment variables:\n'
            'home = os.environ.get("HOME", os.environ.get("USERPROFILE", "unknown"))\n'
            'print(f"Home: {home}")\n'
            '\n'
            '# List directory contents:\n'
            'p = Path(".")\n'
            'py_files = list(p.glob("*.py"))\n'
            'print(f"Python files: {len(py_files)}")\n'
            '\n'
            '# Check if path exists:\n'
            'print(f"data/ exists: {Path(\'data\').exists()}")',
            output="CWD: /home/user/project\nHome: /home/user\n"
            "Python files: 3\ndata/ exists: True",
        ),

        code_example("collections: specialized containers",
            'from collections import Counter, defaultdict, namedtuple\n'
            '\n'
            '# Counter: count occurrences\n'
            'words = "the cat sat on the mat the cat".split()\n'
            'word_count = Counter(words)\n'
            'print(f"Word counts: {word_count}")\n'
            'print(f"Most common: {word_count.most_common(2)}")\n'
            '\n'
            '# defaultdict: auto-create missing keys\n'
            'groups = defaultdict(list)\n'
            'for name, dept in [(\"Alice\", \"Eng\"), (\"Bob\", \"Sales\"), (\"Charlie\", \"Eng\")]:\n'
            '    groups[dept].append(name)\n'
            'print(f"Groups: {dict(groups)}")\n'
            '\n'
            '# namedtuple: lightweight data class\n'
            'Point = namedtuple("Point", ["x", "y"])\n'
            'p = Point(3, 4)\n'
            'print(f"Point: {p}, x={p.x}, y={p.y}")',
            output="Word counts: Counter({'the': 3, 'cat': 2, 'sat': 1, 'on': 1, 'mat': 1})\n"
            "Most common: [('the', 3), ('cat', 2)]\n"
            "Groups: {'Eng': ['Alice', 'Charlie'], 'Sales': ['Bob']}\n"
            "Point: Point(x=3, y=4), x=3, y=4",
        ),

        code_example("datetime: dates and times",
            'from datetime import datetime, timedelta, date\n'
            '\n'
            'now = datetime.now()\n'
            'print(f"Now: {now}")\n'
            'print(f"Formatted: {now.strftime(\"%B %d, %Y at %I:%M %p\")}")\n'
            '\n'
            '# Date arithmetic:\n'
            'due_date = now + timedelta(days=14)\n'
            'print(f"Due in 14 days: {due_date.strftime(\"%Y-%m-%d\")}")\n'
            '\n'
            '# Parse a date string:\n'
            'birthday = datetime.strptime("1990-06-15", "%Y-%m-%d")\n'
            'age_days = (datetime.now() - birthday).days\n'
            'print(f"Age in days: {age_days:,}")\n'
            '\n'
            '# Compare dates:\n'
            'deadline = datetime(2024, 12, 31)\n'
            'if now < deadline:\n'
            '    days_left = (deadline - now).days\n'
            '    print(f"Days until deadline: {days_left}")',
            output="Now: 2024-01-15 14:30:00.123456\n"
            "Formatted: January 15, 2024 at 02:30 PM\n"
            "Due in 14 days: 2024-01-29\n"
            "Age in days: 12,267\n"
            "Days until deadline: 351",
        ),

        section("Creating your own modules"),

        concept("A module is just a Python file",
            "<p>Any <code>.py</code> file is a module. Other files can import from it. "
            "Here is how to structure a utility module:</p>"
        ),

        code_example("Creating utils.py",
            '# ===== File: utils.py =====\n'
            '\n'
            '"""Utility functions for the project."""\n'
            '\n'
            'def clean_string(s):\n'
            '    """Strip whitespace and convert to lowercase."""\n'
            '    return s.strip().lower()\n'
            '\n'
            'def is_valid_email(email):\n'
            '    """Basic email validation."""\n'
            '    email = clean_string(email)\n'
            '    return "@" in email and "." in email.split("@")[-1]\n'
            '\n'
            'def format_currency(amount, symbol="$"):\n'
            '    """Format a number as currency."""\n'
            '    return f"{symbol}{amount:,.2f}"\n'
            '\n'
            'def clamp(value, minimum, maximum):\n'
            '    """Keep a value within a range."""\n'
            '    return max(minimum, min(maximum, value))\n'
            '\n'
            '\n'
            '# ===== File: main.py =====\n'
            '\n'
            '# Import and use:\n'
            '# from utils import is_valid_email, format_currency\n'
            '#\n'
            '# print(is_valid_email("alice@co.com"))    # True\n'
            '# print(format_currency(1234.56))          # $1,234.56',
            explanation="Place related functions in a module. Import only what you need. "
            "The module's docstring at the top describes its purpose."
        ),

        section("The <code>__name__</code> guard"),

        concept("<code>if __name__ == \"__main__\"</code>",
            "<p>This pattern lets a file work both as a module (importable) and as a script "
            "(runnable directly):</p>"
        ),

        code_example("The name guard pattern",
            '# ===== File: calculator.py =====\n'
            '\n'
            '"""A calculator module with CLI interface."""\n'
            '\n'
            'def add(a, b):\n'
            '    return a + b\n'
            '\n'
            'def multiply(a, b):\n'
            '    return a * b\n'
            '\n'
            'def main():\n'
            '    """CLI interface for the calculator."""\n'
            '    print("Calculator Demo")\n'
            '    print(f"2 + 3 = {add(2, 3)}")\n'
            '    print(f"4 * 5 = {multiply(4, 5)}")\n'
            '\n'
            'if __name__ == "__main__":\n'
            '    # Only runs when executing this file directly:\n'
            '    # python calculator.py\n'
            '    main()\n'
            '\n'
            '# When imported: from calculator import add, multiply\n'
            '# The main() function does NOT run on import.\n'
            '\n'
            'print(f"__name__ = {__name__}")',
            output="__name__ = __main__",
            explanation="When you run a file directly, <code>__name__</code> is <code>\"__main__\"</code>. "
            "When it is imported, <code>__name__</code> is the module name (e.g., <code>\"calculator\"</code>). "
            "This guard prevents test/demo code from running on import."
        ),

        section("Packages"),

        concept("Organizing modules into packages",
            "<p>A <strong>package</strong> is a directory containing an <code>__init__.py</code> file "
            "and one or more modules:</p>"
            "<pre style=\"background:#0f172a;color:#e2e8f0;padding:14px;font-family:monospace;font-size:0.88rem;border-radius:8px;margin:8px 0\">"
            "my_project/\n"
            "    __init__.py        # makes this a package\n"
            "    models.py          # data classes\n"
            "    utils.py           # helper functions\n"
            "    api/\n"
            "        __init__.py    # sub-package\n"
            "        client.py\n"
            "        auth.py</pre>"
            "<p>Import from packages with dot notation:</p>"
            "<pre style=\"background:#0f172a;color:#e2e8f0;padding:14px;font-family:monospace;font-size:0.88rem;border-radius:8px;margin:8px 0\">"
            "from my_project.models import User\n"
            "from my_project.api.client import APIClient\n"
            "from my_project.utils import format_currency</pre>"
        ),

        section("pip and virtual environments"),

        concept("Installing packages",
            "<p><code>pip</code> is Python's package installer. <strong>Always</strong> use a "
            "virtual environment to isolate project dependencies:</p>"
        ),

        code_example("Virtual environment and pip workflow",
            '# Create a virtual environment:\n'
            '# python -m venv venv\n'
            '\n'
            '# Activate it:\n'
            '# Windows: venv\\Scripts\\activate\n'
            '# macOS/Linux: source venv/bin/activate\n'
            '\n'
            '# Install packages:\n'
            '# pip install requests\n'
            '# pip install flask==3.0.0        # specific version\n'
            '# pip install "pandas>=2.0,<3.0"  # version range\n'
            '\n'
            '# See what is installed:\n'
            '# pip list\n'
            '# pip freeze\n'
            '\n'
            '# Save dependencies:\n'
            '# pip freeze > requirements.txt\n'
            '\n'
            '# Install from requirements.txt (on another machine):\n'
            '# pip install -r requirements.txt\n'
            '\n'
            '# Example requirements.txt:\n'
            'requirements = """requests==2.31.0\n'
            'flask==3.0.0\n'
            'python-dotenv==1.0.0\n'
            'pytest==7.4.3"""\n'
            'print("Example requirements.txt:")\n'
            'print(requirements)',
            output="Example requirements.txt:\nrequests==2.31.0\n"
            "flask==3.0.0\npython-dotenv==1.0.0\npytest==7.4.3",
            explanation="Virtual environments keep each project's dependencies separate. "
            "Never install packages globally. <code>requirements.txt</code> lets anyone "
            "recreate your exact environment."
        ),

        section("Popular third-party packages"),

        concept("Packages you should know",
            "<ul>"
            "<li><code>requests</code> &mdash; HTTP requests (APIs, web scraping)</li>"
            "<li><code>flask</code> / <code>django</code> &mdash; web frameworks</li>"
            "<li><code>pytest</code> &mdash; testing framework</li>"
            "<li><code>python-dotenv</code> &mdash; environment variable management</li>"
            "<li><code>pandas</code> &mdash; data analysis and manipulation</li>"
            "<li><code>sqlalchemy</code> &mdash; database ORM</li>"
            "<li><code>pydantic</code> &mdash; data validation</li>"
            "<li><code>rich</code> &mdash; beautiful terminal output</li>"
            "</ul>"
        ),

        try_it("Create a simple module with two functions, import them in another file, and use them."),

        section("Exercises"),

        exercise("starter", "Utility module",
            "Create a file <code>string_utils.py</code> with functions: <code>slugify(text)</code> "
            "(convert to URL slug: lowercase, spaces to hyphens, no special chars), "
            "<code>truncate(text, max_len, suffix=\"...\")</code>, and <code>word_count(text)</code>. "
            "Add a <code>__name__</code> guard that runs demos. Import and use it from another file.",
            hint="For <code>slugify</code>: <code>text.lower().strip().replace(\" \", \"-\")</code>, "
            "then filter to keep only alphanumeric and hyphens."
        ),

        exercise("medium", "Package structure",
            "Create a mini-package called <code>datatools/</code> with three modules: "
            "<code>validators.py</code> (email, phone, age validation), "
            "<code>formatters.py</code> (currency, date, percentage formatting), "
            "<code>converters.py</code> (temperature, weight, distance conversion). "
            "Create an <code>__init__.py</code> that imports the most-used functions. "
            "Write a <code>main.py</code> that demonstrates all three modules.",
            hint="In <code>__init__.py</code>: <code>from .validators import validate_email</code> "
            "etc. This lets users do <code>from datatools import validate_email</code>."
        ),

        exercise("real-world", "Requirements.txt generator",
            "Write a script that scans all Python files in a directory, finds <code>import</code> "
            "statements, determines which are third-party packages (not standard library), "
            "and generates a <code>requirements.txt</code>. Use <code>sys.stdlib_module_names</code> "
            "(Python 3.10+) or a hardcoded set of standard library names to filter.",
            hint="Read each <code>.py</code> file, use <code>line.startswith(\"import \")</code> or "
            "<code>line.startswith(\"from \")</code>. Extract the top-level package name. "
            "Filter out known standard library modules."
        ),

        mistakes([
            ("Circular imports",
             "Module A imports from B, and B imports from A. Python gets confused. "
             "Restructure so dependencies go in one direction, or import inside functions."),
            ("<code>from module import *</code>",
             "Wildcard imports pollute your namespace and make it unclear where names come from. "
             "Always import specific names."),
            ("Installing packages globally",
             "Global installs conflict between projects. Always use virtual environments."),
            ("Forgetting <code>__init__.py</code>",
             "Without it (in Python 3.3+), the directory is a namespace package, which behaves "
             "differently. Include <code>__init__.py</code> for regular packages."),
        ]),

        pro_tips([
            "<strong>Import order convention (PEP 8):</strong> standard library first, "
            "then third-party packages, then your own modules. Separate each group with a blank line.",
            "<strong>Use <code>python -m venv venv</code></strong> at the start of every project. "
            "It takes 5 seconds and saves hours of dependency conflicts.",
            "<strong>Pin your dependencies.</strong> Use <code>requests==2.31.0</code> not just "
            "<code>requests</code>. Unpinned dependencies can break your project on update.",
            "<strong>Use <code>if __name__ == \"__main__\"</code></strong> in every module that "
            "has demo or test code. It costs nothing and makes your module import-safe.",
        ]),

        recap([
            "<code>import module</code>, <code>from module import name</code>, <code>import module as alias</code>",
            "Any <code>.py</code> file is a module; directories with <code>__init__.py</code> are packages",
            "<code>if __name__ == \"__main__\"</code> guards against code running on import",
            "<code>pip install</code> installs packages; always use virtual environments",
            "<code>pip freeze > requirements.txt</code> saves dependencies",
            "Standard library: <code>os</code>, <code>pathlib</code>, <code>datetime</code>, <code>collections</code>, <code>json</code>",
            "Follow PEP 8 import order: stdlib, third-party, local",
        ]),
    ])
