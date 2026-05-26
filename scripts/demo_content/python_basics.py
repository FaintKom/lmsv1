"""Python Basics.

A first programming course in Python. Pure Python — no HTML/JS detours.
Every coding lesson uses the in-browser sandbox with auto-graded test
cases.
"""

COURSE = {
    "slug": "python-basics",
    "title": "Python Basics",
    "description": (
        "Your first programming course, all in Python. Read short "
        "explanations, then write code straight in the browser — every "
        "challenge is auto-graded with hidden tests so you really know "
        "when you got it right."
    ),
    "category": "Programming",
    "modules": [
        {
            "slug": "m1-foundations",
            "title": "Foundations",
            "lessons": [
                {
                    "slug": "l1-variables-types",
                    "title": "Variables & types",
                    "duration": 12,
                    "text_md": (
                        "## Variables\n\n"
                        "A **variable** is a labelled box you put a value in. In Python you create one "
                        "by typing the name, `=`, and the value:\n\n"
                        "```python\n"
                        "name = \"Alex\"\n"
                        "age = 12\n"
                        "is_member = True\n"
                        "```\n\n"
                        "No type declaration — Python figures it out from the value.\n\n"
                        "### Core types\n\n"
                        "| Type | Example | Notes |\n"
                        "|---|---|---|\n"
                        "| `int` | `42` | whole numbers |\n"
                        "| `float` | `3.14` | decimals |\n"
                        "| `str` | `\"hello\"` | text, in quotes |\n"
                        "| `bool` | `True` / `False` | yes/no |\n"
                        "| `None` | `None` | nothing |\n\n"
                        "### Output and input\n\n"
                        "```python\n"
                        "name = input()\n"
                        "print(f\"Hello, {name}!\")\n"
                        "```\n\n"
                        "`f\"...\"` is an **f-string** — anything in `{}` is replaced by its value."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-types-quiz",
                            "type": "quiz",
                            "title": "Type check",
                            "config": {"passing_score": 70},
                            "questions": [
                                {
                                    "text": "What is the type of `True`?",
                                    "options": [
                                        {"text": "str", "is_correct": False},
                                        {"text": "bool", "is_correct": True},
                                        {"text": "int", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "Which one is a `float`?",
                                    "options": [
                                        {"text": "42", "is_correct": False},
                                        {"text": "\"42\"", "is_correct": False},
                                        {"text": "3.14", "is_correct": True},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "Pick the variable name that follows Python style.",
                                    "options": [
                                        {"text": "userName", "is_correct": False},
                                        {"text": "user_name", "is_correct": True},
                                        {"text": "UserName", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                            ],
                        },
                        {
                            "slug": "ex-hello-name",
                            "type": "code_challenge",
                            "title": "Greet by name",
                            "config": {
                                "language": "python",
                                "description": "Read a name from input and print `Hello, <name>!`.",
                                "starter_code": "name = input()\n# print the greeting here\n",
                                "solution_code": "name = input()\nprint(f\"Hello, {name}!\")\n",
                                "time_limit_seconds": 5,
                                "memory_limit_mb": 128,
                            },
                            "test_cases": [
                                {"input": "Alex", "expected_output": "Hello, Alex!", "is_hidden": False},
                                {"input": "Maria", "expected_output": "Hello, Maria!", "is_hidden": False},
                                {"input": "Yuki", "expected_output": "Hello, Yuki!", "is_hidden": True},
                            ],
                        },
                    ],
                },
                {
                    "slug": "l2-conditionals",
                    "title": "Conditionals: if / elif / else",
                    "duration": 14,
                    "text_md": (
                        "## Making decisions\n\n"
                        "`if` runs a block of code **only when** a condition is true.\n\n"
                        "```python\n"
                        "n = int(input())\n"
                        "if n > 0:\n"
                        "    print(\"positive\")\n"
                        "elif n == 0:\n"
                        "    print(\"zero\")\n"
                        "else:\n"
                        "    print(\"negative\")\n"
                        "```\n\n"
                        "### Indentation matters\n\n"
                        "Python uses indentation (4 spaces) to mark blocks. No `{}`.\n\n"
                        "### Comparison operators\n\n"
                        "`==` equal · `!=` not equal · `<` `>` `<=` `>=`\n\n"
                        "### Combining conditions\n\n"
                        "`and` · `or` · `not` — read them as English.\n\n"
                        "```python\n"
                        "if age >= 13 and age <= 19:\n"
                        "    print(\"teen\")\n"
                        "```"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-even-odd",
                            "type": "code_challenge",
                            "title": "Even or odd",
                            "config": {
                                "language": "python",
                                "description": "Read an integer. Print `even` or `odd`.",
                                "starter_code": "n = int(input())\n# your code here\n",
                                "solution_code": "n = int(input())\nprint(\"even\" if n % 2 == 0 else \"odd\")\n",
                                "time_limit_seconds": 5,
                                "memory_limit_mb": 128,
                            },
                            "test_cases": [
                                {"input": "4", "expected_output": "even", "is_hidden": False},
                                {"input": "7", "expected_output": "odd", "is_hidden": False},
                                {"input": "0", "expected_output": "even", "is_hidden": True},
                                {"input": "-3", "expected_output": "odd", "is_hidden": True},
                            ],
                        },
                    ],
                },
                {
                    "slug": "l3-loops",
                    "title": "Loops: while & for",
                    "duration": 16,
                    "text_md": (
                        "## Repeating yourself, properly\n\n"
                        "### `for` over a range\n\n"
                        "```python\n"
                        "for i in range(5):\n"
                        "    print(i)\n"
                        "# prints 0 1 2 3 4\n"
                        "```\n\n"
                        "`range(n)` yields 0, 1, 2, …, n-1. `range(a, b)` yields a, a+1, …, b-1.\n\n"
                        "### `while` until done\n\n"
                        "```python\n"
                        "n = 10\n"
                        "while n > 0:\n"
                        "    print(n)\n"
                        "    n -= 1\n"
                        "```\n\n"
                        "Stops when the condition becomes false.\n\n"
                        "### Common pattern — sum of 1..n\n\n"
                        "```python\n"
                        "n = int(input())\n"
                        "total = 0\n"
                        "for i in range(1, n + 1):\n"
                        "    total += i\n"
                        "print(total)\n"
                        "```"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-sum-1-to-n",
                            "type": "code_challenge",
                            "title": "Sum 1 to n",
                            "config": {
                                "language": "python",
                                "description": "Read an integer n. Print the sum 1 + 2 + ... + n.",
                                "starter_code": "n = int(input())\n# print the sum\n",
                                "solution_code": "n = int(input())\nprint(sum(range(1, n + 1)))\n",
                                "time_limit_seconds": 5,
                                "memory_limit_mb": 128,
                            },
                            "test_cases": [
                                {"input": "5", "expected_output": "15", "is_hidden": False},
                                {"input": "10", "expected_output": "55", "is_hidden": False},
                                {"input": "1", "expected_output": "1", "is_hidden": True},
                                {"input": "100", "expected_output": "5050", "is_hidden": True},
                            ],
                        },
                    ],
                },
            ],
        },
        {
            "slug": "m2-functions-data",
            "title": "Functions & Data",
            "lessons": [
                {
                    "slug": "l4-functions",
                    "title": "Defining functions",
                    "duration": 18,
                    "text_md": (
                        "## Functions\n\n"
                        "A function packages a piece of logic so you can reuse it without copy-pasting.\n\n"
                        "```python\n"
                        "def add(a, b):\n"
                        "    return a + b\n"
                        "\n"
                        "print(add(3, 4))  # 7\n"
                        "```\n\n"
                        "### Anatomy\n\n"
                        "- `def name(params):` — declaration\n"
                        "- indented body — what it does\n"
                        "- `return value` — what it gives back\n\n"
                        "### Default arguments\n\n"
                        "```python\n"
                        "def greet(name, polite=True):\n"
                        "    if polite:\n"
                        "        return f\"Hello, {name}\"\n"
                        "    return f\"Hi {name}\"\n"
                        "```\n\n"
                        "### Docstrings (optional but nice)\n\n"
                        "```python\n"
                        "def square(x):\n"
                        "    \"\"\"Return x squared.\"\"\"\n"
                        "    return x * x\n"
                        "```"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-add-fn",
                            "type": "code_challenge",
                            "title": "Write add(a, b)",
                            "config": {
                                "language": "python",
                                "description": "Complete the function `add(a, b)` so it returns the sum.",
                                "starter_code": (
                                    "def add(a, b):\n"
                                    "    # return the sum of a and b\n"
                                    "    pass\n"
                                    "\n"
                                    "if __name__ == '__main__':\n"
                                    "    a, b = map(int, input().split())\n"
                                    "    print(add(a, b))\n"
                                ),
                                "solution_code": (
                                    "def add(a, b):\n"
                                    "    return a + b\n"
                                    "\n"
                                    "if __name__ == '__main__':\n"
                                    "    a, b = map(int, input().split())\n"
                                    "    print(add(a, b))\n"
                                ),
                                "time_limit_seconds": 5,
                                "memory_limit_mb": 128,
                            },
                            "test_cases": [
                                {"input": "1 2", "expected_output": "3", "is_hidden": False},
                                {"input": "10 -3", "expected_output": "7", "is_hidden": False},
                                {"input": "0 0", "expected_output": "0", "is_hidden": True},
                                {"input": "-5 -5", "expected_output": "-10", "is_hidden": True},
                            ],
                        },
                    ],
                },
                {
                    "slug": "l5-lists",
                    "title": "Lists",
                    "duration": 16,
                    "text_md": (
                        "## Lists\n\n"
                        "A **list** is an ordered, mutable collection.\n\n"
                        "```python\n"
                        "nums = [3, 1, 4, 1, 5, 9, 2, 6]\n"
                        "print(len(nums))     # 8\n"
                        "print(nums[0])       # 3\n"
                        "print(nums[-1])      # 6 (last)\n"
                        "nums.append(5)\n"
                        "```\n\n"
                        "### Looping over a list\n\n"
                        "```python\n"
                        "for x in nums:\n"
                        "    print(x)\n"
                        "```\n\n"
                        "### Useful helpers\n\n"
                        "| Call | What it does |\n"
                        "|---|---|\n"
                        "| `sum(nums)` | total |\n"
                        "| `max(nums)` | largest |\n"
                        "| `min(nums)` | smallest |\n"
                        "| `len(nums)` | how many items |\n"
                        "| `sorted(nums)` | new sorted copy |"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-sum-list",
                            "type": "code_challenge",
                            "title": "sum_list(nums)",
                            "config": {
                                "language": "python",
                                "description": "Implement `sum_list(nums)` returning the sum of the list.",
                                "starter_code": (
                                    "def sum_list(nums):\n"
                                    "    # return the sum\n"
                                    "    pass\n"
                                    "\n"
                                    "if __name__ == '__main__':\n"
                                    "    nums = list(map(int, input().split()))\n"
                                    "    print(sum_list(nums))\n"
                                ),
                                "solution_code": (
                                    "def sum_list(nums):\n"
                                    "    return sum(nums)\n"
                                    "\n"
                                    "if __name__ == '__main__':\n"
                                    "    nums = list(map(int, input().split()))\n"
                                    "    print(sum_list(nums))\n"
                                ),
                                "time_limit_seconds": 5,
                                "memory_limit_mb": 128,
                            },
                            "test_cases": [
                                {"input": "1 2 3", "expected_output": "6", "is_hidden": False},
                                {"input": "10", "expected_output": "10", "is_hidden": False},
                                {"input": "-1 1 -2 2", "expected_output": "0", "is_hidden": True},
                                {"input": "5 5 5 5", "expected_output": "20", "is_hidden": True},
                            ],
                        },
                        {
                            "slug": "ex-find-max",
                            "type": "code_challenge",
                            "title": "Largest in list",
                            "config": {
                                "language": "python",
                                "description": "Read a space-separated list of integers. Print the largest.",
                                "starter_code": "nums = list(map(int, input().split()))\n# print the maximum\n",
                                "solution_code": "nums = list(map(int, input().split()))\nprint(max(nums))\n",
                                "time_limit_seconds": 5,
                                "memory_limit_mb": 128,
                            },
                            "test_cases": [
                                {"input": "3 7 2 9 4", "expected_output": "9", "is_hidden": False},
                                {"input": "10", "expected_output": "10", "is_hidden": False},
                                {"input": "-1 -5 -2 -9", "expected_output": "-1", "is_hidden": True},
                            ],
                        },
                    ],
                },
                {
                    "slug": "l6-strings",
                    "title": "Working with strings",
                    "duration": 16,
                    "text_md": (
                        "## Strings\n\n"
                        "Strings behave a lot like lists — index, slice, iterate.\n\n"
                        "```python\n"
                        "s = \"hello\"\n"
                        "print(len(s))     # 5\n"
                        "print(s[0])       # 'h'\n"
                        "print(s[-1])      # 'o'\n"
                        "print(s.upper())  # 'HELLO'\n"
                        "print(s[::-1])    # 'olleh' — reversed\n"
                        "```\n\n"
                        "### Useful string methods\n\n"
                        "| Call | Result on `s = \" Hello \"` |\n"
                        "|---|---|\n"
                        "| `s.strip()` | `'Hello'` |\n"
                        "| `s.lower()` | `' hello '` |\n"
                        "| `s.replace(\"l\", \"L\")` | `' HeLLo '` |\n"
                        "| `s.split()` | `['Hello']` |\n\n"
                        "### Slicing\n\n"
                        "`s[start:stop:step]` — step can be negative."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-reverse-string",
                            "type": "code_challenge",
                            "title": "Reverse a string",
                            "config": {
                                "language": "python",
                                "description": "Read a line of text. Print it reversed.",
                                "starter_code": "s = input()\n# print s reversed\n",
                                "solution_code": "s = input()\nprint(s[::-1])\n",
                                "time_limit_seconds": 5,
                                "memory_limit_mb": 128,
                            },
                            "test_cases": [
                                {"input": "hello", "expected_output": "olleh", "is_hidden": False},
                                {"input": "Python", "expected_output": "nohtyP", "is_hidden": False},
                                {"input": "a", "expected_output": "a", "is_hidden": True},
                                {"input": "ab cd", "expected_output": "dc ba", "is_hidden": True},
                            ],
                        },
                    ],
                },
            ],
        },
    ],
}
