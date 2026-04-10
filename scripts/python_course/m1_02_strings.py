"""Module 1, Lesson 2: Strings & F-Strings."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Strings &amp; F-Strings",
            "Text is everywhere in programming. Learn to create, manipulate, and format strings like a pro.",
        ),

        why_it_matters(
            "<p>Almost every program deals with text: usernames, emails, "
            "error messages, file paths, database queries, API responses. "
            "Mastering strings is not optional &mdash; it's a daily skill "
            "for every developer.</p>"
        ),

        section("Creating strings"),

        concept("Three ways to make a string",
            "<p>Python lets you create strings with single quotes, double quotes, "
            "or triple quotes. They all produce the same type: <code>str</code>.</p>"
        ),

        code_example("Single and double quotes",
            'name = \'Alice\'\n'
            'greeting = "Hello, world!"\n'
            'message = "It\'s a beautiful day"\n'
            'quote = \'She said "wow"\'',
            explanation="Use double quotes when your string contains an apostrophe, "
            "and single quotes when it contains double quotes. This avoids backslash escapes."
        ),

        code_example("Triple-quoted strings (multi-line)",
            'poem = """Roses are red,\n'
            'Violets are blue,\n'
            'Python is awesome,\n'
            'And so are you."""\n'
            '\n'
            'print(poem)',
            output="Roses are red,\nViolets are blue,\nPython is awesome,\nAnd so are you.",
            explanation="Triple quotes preserve line breaks. Great for multi-line text, "
            "docstrings, and templates."
        ),

        section("String indexing and slicing"),

        concept("Strings are sequences",
            "<p>Every character in a string has a position (index), starting at <code>0</code>. "
            "Negative indices count from the end: <code>-1</code> is the last character.</p>"
        ),

        code_example("Accessing characters",
            'word = "Python"\n'
            'print(word[0])     # first character\n'
            'print(word[5])     # sixth character\n'
            'print(word[-1])    # last character\n'
            'print(word[-2])    # second to last',
            output="P\nn\nn\no",
        ),

        code_example("Slicing: extracting substrings",
            'text = "Hello, World!"\n'
            'print(text[0:5])     # characters 0 through 4\n'
            'print(text[7:12])    # characters 7 through 11\n'
            'print(text[:5])      # from start to index 5\n'
            'print(text[7:])      # from index 7 to end\n'
            'print(text[::2])     # every 2nd character\n'
            'print(text[::-1])    # reversed string',
            output="Hello\nWorld\nHello\nWorld!\nHlo ol!\n!dlroW ,olleH",
            explanation="Slice syntax: <code>string[start:stop:step]</code>. "
            "The <code>stop</code> index is excluded. Omit values to use defaults."
        ),

        section("Essential string methods"),

        concept("Strings are immutable",
            "<p>String methods never change the original string. They return a <strong>new</strong> "
            "string. You must save the result if you want to keep it:</p>"
        ),

        code_example("Case methods",
            'name = "alice smith"\n'
            'print(name.upper())        # all caps\n'
            'print(name.lower())        # all lowercase\n'
            'print(name.title())        # Title Case\n'
            'print(name.capitalize())   # first letter only\n'
            'print(name)                # original unchanged!',
            output="ALICE SMITH\nalice smith\nAlice Smith\nAlice smith\nalice smith",
        ),

        code_example("Cleaning and replacing",
            'raw = "   hello@email.com   "\n'
            'print(raw.strip())            # remove whitespace\n'
            'print(raw.lstrip())           # left side only\n'
            'print(raw.rstrip())           # right side only\n'
            '\n'
            'url = "https://example.com/old-page"\n'
            'print(url.replace("old", "new"))',
            output="hello@email.com\nhello@email.com   \n   hello@email.com\nhttps://example.com/new-page",
            explanation="<code>.strip()</code> is essential when handling user input &mdash; "
            "users often accidentally add spaces."
        ),

        code_example("Splitting and joining",
            'csv_line = "Alice,28,Engineer,NYC"\n'
            'parts = csv_line.split(",")\n'
            'print(parts)\n'
            'print(parts[0])    # first field\n'
            'print(parts[2])    # third field\n'
            '\n'
            '# Joining a list back into a string\n'
            'words = ["Python", "is", "fun"]\n'
            'sentence = " ".join(words)\n'
            'print(sentence)',
            output="['Alice', '28', 'Engineer', 'NYC']\nAlice\nEngineer\nPython is fun",
            explanation="<code>.split()</code> breaks a string into a list. "
            "<code>.join()</code> does the reverse &mdash; glues a list into a string."
        ),

        code_example("Searching in strings",
            'email = "alice@company.com"\n'
            'print(email.startswith("alice"))   # True\n'
            'print(email.endswith(".com"))       # True\n'
            'print("@" in email)                 # True\n'
            'print(email.find("@"))              # index of @\n'
            'print(email.count("a"))             # how many a\'s',
            output="True\nTrue\nTrue\n5\n1",
        ),

        section("F-strings: the modern way to format"),

        concept("F-strings (formatted string literals)",
            "<p>Prefix a string with <code>f</code> and put expressions inside "
            "<code>{curly braces}</code>. Python evaluates them and inserts the result. "
            "This is the recommended way to build strings in Python 3.6+.</p>"
        ),

        code_example("Basic f-strings",
            'name = "Alice"\n'
            'age = 28\n'
            'city = "NYC"\n'
            '\n'
            'print(f"My name is {name}")\n'
            'print(f"{name} is {age} years old")\n'
            'print(f"{name} lives in {city} and is {age + 2} in two years")',
            output="My name is Alice\nAlice is 28 years old\nAlice lives in NYC and is 30 in two years",
            explanation="You can put any valid Python expression inside the braces, "
            "including math, function calls, and method calls."
        ),

        code_example("F-string formatting tricks",
            'price = 49.99\n'
            'quantity = 3\n'
            'total = price * quantity\n'
            '\n'
            '# Format as currency (2 decimal places)\n'
            'print(f"Total: ${total:.2f}")\n'
            '\n'
            '# Padding and alignment\n'
            'for item in ["Apples", "Bread", "Milk"]:\n'
            '    print(f"{item:<15} ${price:>8.2f}")\n'
            '\n'
            '# Thousands separator\n'
            'big_number = 1234567\n'
            'print(f"Population: {big_number:,}")',
            output="Total: $149.97\nApples          $   49.99\nBread           $   49.99\nMilk            $   49.99\nPopulation: 1,234,567",
            explanation="Format spec after the colon: <code>.2f</code> = 2 decimals, "
            "<code>&lt;15</code> = left-align in 15 chars, <code>&gt;8</code> = right-align in 8, "
            "<code>,</code> = thousands separator."
        ),

        code_example("Expressions inside f-strings",
            'name = "alice"\n'
            'scores = [85, 92, 78, 96]\n'
            '\n'
            'print(f"Name: {name.title()}")\n'
            'print(f"Average: {sum(scores) / len(scores):.1f}")\n'
            'print(f"Pass: {\'YES\' if sum(scores)/len(scores) >= 80 else \'NO\'}")',
            output="Name: Alice\nAverage: 87.8\nPass: YES",
        ),

        try_it("Use the code editor below to experiment with slicing and f-strings."),

        section("Real-world pattern: Markdown text formatter"),

        code_example("Building a Markdown formatter",
            'def format_heading(text, level=1):\n'
            '    """Convert text to a Markdown heading."""\n'
            '    return f"{\'#\' * level} {text}"\n'
            '\n'
            'def format_bold(text):\n'
            '    return f"**{text}**"\n'
            '\n'
            'def format_link(text, url):\n'
            '    return f"[{text}]({url})"\n'
            '\n'
            'def format_list(items):\n'
            '    lines = []\n'
            '    for item in items:\n'
            '        lines.append(f"- {item}")\n'
            '    return "\\n".join(lines)\n'
            '\n'
            '# Build a mini document\n'
            'doc = "\\n\\n".join([\n'
            '    format_heading("Shopping List"),\n'
            '    format_list(["Apples", "Bread", "Milk"]),\n'
            '    format_heading("Notes", level=2),\n'
            '    f"Check {format_bold(\'prices\')} at {format_link(\'Store\', \'https://store.com\')}",\n'
            '])\n'
            'print(doc)',
            output="# Shopping List\n\n- Apples\n- Bread\n- Milk\n\n## Notes\n\nCheck **prices** at [Store](https://store.com)",
            explanation="This pattern is used everywhere: email templates, report generators, "
            "static site builders, and documentation tools."
        ),

        section("Exercises"),

        exercise("starter", "Format a receipt",
            "Create variables for <code>item_name = \"Widget\"</code>, "
            "<code>quantity = 3</code>, <code>unit_price = 12.50</code>. "
            "Calculate the total and print a receipt like:<br>"
            "<code>Item: Widget x3<br>"
            "Unit price: $12.50<br>"
            "Total: $37.50</code><br>"
            "Use f-strings with <code>:.2f</code> for currency formatting.",
            hint="<code>total = quantity * unit_price</code>, then "
            "<code>f\"Total: ${total:.2f}\"</code>"
        ),

        exercise("medium", "Build an email template",
            "Write code that creates a personalized email. Given variables "
            "<code>recipient = \"Bob\"</code>, <code>sender = \"Alice\"</code>, "
            "<code>product = \"Python Course\"</code>, <code>price = 49.99</code>, "
            "build and print a multi-line string like:<br>"
            "<code>Hi Bob,<br><br>"
            "Thank you for purchasing Python Course!<br>"
            "Your total: $49.99<br><br>"
            "Best regards,<br>"
            "Alice</code><br>"
            "Use a triple-quoted f-string.",
            hint="Use <code>f\"\"\"...\"\"\"</code> with the variables inside curly braces."
        ),

        exercise("medium", "Parse a CSV line",
            "Given <code>csv_line = \"John,Doe,35,john@email.com,Engineer\"</code>, "
            "split it into parts and print:<br>"
            "<code>Name: John Doe<br>"
            "Age: 35<br>"
            "Email: john@email.com<br>"
            "Job: Engineer</code><br>"
            "Use <code>.split()</code> and f-strings.",
            hint="<code>parts = csv_line.split(\",\")</code>, then access "
            "<code>parts[0]</code>, <code>parts[1]</code>, etc."
        ),

        exercise("real-world", "Markdown text formatter",
            "Build a function <code>format_profile(name, title, skills)</code> that takes "
            "a name (string), job title (string), and skills (list of strings) and returns "
            "a formatted Markdown profile:<br>"
            "<code># Alice Smith<br>"
            "**Senior Developer**<br><br>"
            "Skills:<br>"
            "- Python<br>"
            "- JavaScript<br>"
            "- SQL</code><br>"
            "Test it with your own data.",
            hint="Use <code>f\"# {name}\"</code> for the heading, "
            "<code>f\"**{title}**\"</code> for bold, and "
            "<code>'\\n'.join(f\"- {s}\" for s in skills)</code> for the list."
        ),

        mistakes([
            ("Forgetting that strings are immutable",
             "<code>name.upper()</code> does NOT change <code>name</code>. "
             "You need <code>name = name.upper()</code> to save the result."),
            ("Off-by-one errors in slicing",
             "<code>text[0:5]</code> gives characters at index 0, 1, 2, 3, 4 &mdash; "
             "NOT index 5. The stop index is excluded."),
            ("Using <code>+</code> for complex string building",
             "Don't write <code>\"Hello \" + name + \", you are \" + str(age)</code>. "
             "Use f-strings instead: <code>f\"Hello {name}, you are {age}\"</code>."),
            ("Mixing up <code>.find()</code> and <code>in</code>",
             "<code>.find()</code> returns -1 if not found (not False). "
             "Use <code>in</code> for simple existence checks: <code>\"@\" in email</code>."),
        ]),

        pro_tips([
            "<strong>F-strings are fastest.</strong> They outperform <code>.format()</code> "
            "and <code>%</code> formatting in both speed and readability.",
            "<strong>Use <code>.strip()</code> on all user input.</strong> "
            "It prevents bugs from invisible whitespace: <code>username = input().strip()</code>.",
            "<strong><code>.split()</code> with no argument</strong> splits on any whitespace "
            "and removes empty strings. Perfect for parsing messy text.",
            "<strong>String multiplication</strong> is handy for separators: "
            "<code>\"-\" * 40</code> creates a 40-character line.",
            "<strong>Check before accessing indices.</strong> Use <code>len(s)</code> or "
            "<code>if s:</code> to avoid <code>IndexError</code> on empty strings.",
        ]),

        recap([
            "Create strings with single, double, or triple quotes",
            "Index with <code>s[0]</code>, slice with <code>s[1:4]</code>",
            "Key methods: <code>.upper()</code>, <code>.lower()</code>, <code>.strip()</code>, <code>.split()</code>, <code>.join()</code>, <code>.replace()</code>",
            "F-strings: <code>f\"Hello {name}\"</code> &mdash; the modern way to format",
            "Format specs: <code>:.2f</code> for decimals, <code>:,</code> for thousands, <code>:&lt;15</code> for alignment",
            "Strings are immutable &mdash; methods return new strings",
        ]),
    ])
