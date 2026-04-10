"""Module 6, Lesson 2: Working with JSON & CSV."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Working with JSON &amp; CSV",
            "Exchange data with APIs, spreadsheets, and other programs. JSON and CSV are the universal data formats.",
        ),

        why_it_matters(
            "<p>Almost every API returns JSON. Almost every business report is a CSV. "
            "If you can read and write these two formats, you can connect your Python code "
            "to virtually anything: web services, databases, Excel, Google Sheets, "
            "data science tools, and more.</p>"
        ),

        section("JSON: JavaScript Object Notation"),

        concept("What is JSON?",
            "<p>JSON is a text format for structured data. It looks almost exactly like Python "
            "dictionaries and lists:</p>"
            "<ul>"
            "<li><code>{\"key\": \"value\"}</code> &mdash; objects (like Python dicts)</li>"
            "<li><code>[1, 2, 3]</code> &mdash; arrays (like Python lists)</li>"
            "<li>Strings must use <strong>double quotes</strong></li>"
            "<li>Supports: strings, numbers, booleans (<code>true</code>/<code>false</code>), <code>null</code>, objects, arrays</li>"
            "</ul>"
        ),

        code_example("JSON basics: dumps and loads",
            'import json\n'
            '\n'
            '# Python dict -> JSON string (serialization):\n'
            'user = {\n'
            '    "name": "Alice",\n'
            '    "age": 30,\n'
            '    "email": "alice@example.com",\n'
            '    "is_active": True,\n'
            '    "roles": ["admin", "editor"],\n'
            '    "address": None,\n'
            '}\n'
            '\n'
            'json_string = json.dumps(user, indent=2)\n'
            'print("JSON string:")\n'
            'print(json_string)\n'
            '\n'
            '# JSON string -> Python dict (deserialization):\n'
            'parsed = json.loads(json_string)\n'
            'print(f"\\nParsed name: {parsed[\'name\']}")\n'
            'print(f"Roles: {parsed[\'roles\']}")\n'
            'print(f"Type: {type(parsed)}")',
            output='JSON string:\n{\n  "name": "Alice",\n  "age": 30,\n'
            '  "email": "alice@example.com",\n  "is_active": true,\n'
            '  "roles": [\n    "admin",\n    "editor"\n  ],\n'
            '  "address": null\n}\n\n'
            "Parsed name: Alice\nRoles: ['admin', 'editor']\nType: <class 'dict'>",
            explanation="<code>json.dumps()</code> converts Python to JSON string. "
            "<code>json.loads()</code> converts JSON string to Python. "
            "Notice: <code>True</code> becomes <code>true</code>, <code>None</code> becomes <code>null</code>."
        ),

        section("JSON with files"),

        code_example("Reading and writing JSON files",
            'import json\n'
            '\n'
            '# Write JSON to a file:\n'
            'config = {\n'
            '    "app_name": "MyApp",\n'
            '    "version": "2.1.0",\n'
            '    "database": {\n'
            '        "host": "localhost",\n'
            '        "port": 5432,\n'
            '        "name": "myapp_db",\n'
            '    },\n'
            '    "features": ["auth", "api", "dashboard"],\n'
            '}\n'
            '\n'
            'with open("config.json", "w") as f:\n'
            '    json.dump(config, f, indent=2)\n'
            'print("Config saved.")\n'
            '\n'
            '# Read JSON from a file:\n'
            'with open("config.json") as f:\n'
            '    loaded = json.load(f)\n'
            '\n'
            'print(f"App: {loaded[\'app_name\']} v{loaded[\'version\']}")\n'
            'print(f"DB: {loaded[\'database\'][\'host\']}:{loaded[\'database\'][\'port\']}")\n'
            'print(f"Features: {loaded[\'features\']}")',
            output="Config saved.\nApp: MyApp v2.1.0\n"
            "DB: localhost:5432\nFeatures: ['auth', 'api', 'dashboard']",
            explanation="<code>json.dump()</code> writes directly to a file. "
            "<code>json.load()</code> reads directly from a file. "
            "Note the difference: <code>dumps</code>/<code>loads</code> work with strings, "
            "<code>dump</code>/<code>load</code> work with files."
        ),

        section("Processing API-style JSON"),

        code_example("Working with nested JSON data",
            'import json\n'
            '\n'
            '# Simulate an API response:\n'
            'api_response = \'\'\'\n'
            '{\n'
            '    "status": "success",\n'
            '    "count": 3,\n'
            '    "data": [\n'
            '        {"id": 1, "name": "Alice", "department": "Engineering", "salary": 95000},\n'
            '        {"id": 2, "name": "Bob", "department": "Marketing", "salary": 75000},\n'
            '        {"id": 3, "name": "Charlie", "department": "Engineering", "salary": 110000}\n'
            '    ]\n'
            '}\n'
            '\'\'\'\n'
            '\n'
            'response = json.loads(api_response)\n'
            '\n'
            'if response["status"] == "success":\n'
            '    employees = response["data"]\n'
            '    print(f"Found {response[\'count\']} employees:\\n")\n'
            '\n'
            '    # Process the data:\n'
            '    for emp in employees:\n'
            '        print(f"  {emp[\'name\']} - {emp[\'department\']} - ${emp[\'salary\']:,}")\n'
            '\n'
            '    # Calculate stats:\n'
            '    avg_salary = sum(e["salary"] for e in employees) / len(employees)\n'
            '    eng_team = [e for e in employees if e["department"] == "Engineering"]\n'
            '    print(f"\\n  Average salary: ${avg_salary:,.0f}")\n'
            '    print(f"  Engineering team: {len(eng_team)} members")',
            output="Found 3 employees:\n\n"
            "  Alice - Engineering - $95,000\n"
            "  Bob - Marketing - $75,000\n"
            "  Charlie - Engineering - $110,000\n\n"
            "  Average salary: $93,333\n  Engineering team: 2 members",
        ),

        section("CSV: Comma-Separated Values"),

        concept("What is CSV?",
            "<p>CSV is the simplest tabular format &mdash; rows of values separated by commas. "
            "The first row is usually headers. Python's <code>csv</code> module handles the "
            "tricky parts (quoted fields, commas inside values, etc.):</p>"
        ),

        code_example("Reading CSV files",
            'import csv\n'
            '\n'
            '# Create a sample CSV:\n'
            'with open("employees.csv", "w", newline="") as f:\n'
            '    writer = csv.writer(f)\n'
            '    writer.writerow(["Name", "Department", "Salary", "City"])\n'
            '    writer.writerow(["Alice", "Engineering", "95000", "NYC"])\n'
            '    writer.writerow(["Bob", "Marketing", "75000", "London"])\n'
            '    writer.writerow(["Charlie", "Engineering", "110000", "Tokyo"])\n'
            '    writer.writerow(["Diana", "Sales", "82000", "NYC"])\n'
            '\n'
            '# Read with csv.reader (list-based):\n'
            'print("csv.reader:")\n'
            'with open("employees.csv", newline="") as f:\n'
            '    reader = csv.reader(f)\n'
            '    header = next(reader)    # skip/read header\n'
            '    print(f"  Columns: {header}")\n'
            '    for row in reader:\n'
            '        print(f"  {row[0]:10} {row[1]:12} ${int(row[2]):>8,}")\n'
            '\n'
            '# Read with csv.DictReader (dictionary-based):\n'
            'print("\\ncsv.DictReader:")\n'
            'with open("employees.csv", newline="") as f:\n'
            '    reader = csv.DictReader(f)\n'
            '    for row in reader:\n'
            '        print(f"  {row[\"Name\"]} works in {row[\"Department\"]} "\n'
            '              f"({row[\"City\"]})")',
            output="csv.reader:\n  Columns: ['Name', 'Department', 'Salary', 'City']\n"
            "  Alice      Engineering    $ 95,000\n"
            "  Bob        Marketing      $ 75,000\n"
            "  Charlie    Engineering    $110,000\n"
            "  Diana      Sales          $ 82,000\n\n"
            "csv.DictReader:\n"
            "  Alice works in Engineering (NYC)\n"
            "  Bob works in Marketing (London)\n"
            "  Charlie works in Engineering (Tokyo)\n"
            "  Diana works in Sales (NYC)",
            explanation="<code>csv.reader</code> gives you lists of strings. "
            "<code>csv.DictReader</code> gives you dictionaries keyed by header names &mdash; "
            "much more readable for named columns."
        ),

        section("Writing CSV files"),

        code_example("Generating CSV reports",
            'import csv\n'
            '\n'
            '# Data to export:\n'
            'products = [\n'
            '    {"name": "Keyboard", "price": 49.99, "stock": 150, "category": "Electronics"},\n'
            '    {"name": "Mouse", "price": 29.99, "stock": 300, "category": "Electronics"},\n'
            '    {"name": "Desk Lamp", "price": 35.50, "stock": 80, "category": "Office"},\n'
            '    {"name": "Notebook", "price": 12.99, "stock": 500, "category": "Stationery"},\n'
            ']\n'
            '\n'
            '# Write with DictWriter:\n'
            'fieldnames = ["name", "price", "stock", "category", "value"]\n'
            '\n'
            'with open("inventory.csv", "w", newline="") as f:\n'
            '    writer = csv.DictWriter(f, fieldnames=fieldnames)\n'
            '    writer.writeheader()\n'
            '    for p in products:\n'
            '        p["value"] = round(p["price"] * p["stock"], 2)\n'
            '        writer.writerow(p)\n'
            '\n'
            '# Verify:\n'
            'with open("inventory.csv") as f:\n'
            '    print(f.read())',
            output="name,price,stock,category,value\n"
            "Keyboard,49.99,150,Electronics,7498.5\n"
            "Mouse,29.99,300,Electronics,8997.0\n"
            "Desk Lamp,35.5,80,Office,2840.0\n"
            "Notebook,12.99,500,Stationery,6495.0\n",
        ),

        section("Converting between JSON and CSV"),

        code_example("JSON to CSV conversion",
            'import json\n'
            'import csv\n'
            '\n'
            '# JSON data (from an API):\n'
            'json_data = \'\'\'[\n'
            '    {"name": "Alice", "age": 30, "score": 92},\n'
            '    {"name": "Bob", "age": 25, "score": 85},\n'
            '    {"name": "Charlie", "age": 35, "score": 78}\n'
            ']\'\'\'\n'
            '\n'
            '# Parse JSON:\n'
            'records = json.loads(json_data)\n'
            '\n'
            '# Write as CSV:\n'
            'with open("scores.csv", "w", newline="") as f:\n'
            '    writer = csv.DictWriter(f, fieldnames=records[0].keys())\n'
            '    writer.writeheader()\n'
            '    writer.writerows(records)\n'
            '\n'
            'print("JSON -> CSV:")\n'
            'with open("scores.csv") as f:\n'
            '    print(f.read())\n'
            '\n'
            '# Read CSV back as JSON:\n'
            'with open("scores.csv", newline="") as f:\n'
            '    reader = csv.DictReader(f)\n'
            '    data = list(reader)\n'
            '\n'
            'json_output = json.dumps(data, indent=2)\n'
            'print("CSV -> JSON:")\n'
            'print(json_output)',
            output="JSON -> CSV:\nname,age,score\nAlice,30,92\nBob,25,85\nCharlie,35,78\n\n"
            "CSV -> JSON:\n[\n  {\n    \"name\": \"Alice\",\n    \"age\": \"30\",\n"
            "    \"score\": \"92\"\n  },\n  ...\n]",
            explanation="Note: CSV values are always strings. After reading CSV, you may need to "
            "convert numbers: <code>int(row[\"age\"])</code>."
        ),

        try_it("Create a JSON file with a list of 3 favorite books (title, author, year). Read it back, add a new book, and save it again."),

        section("Exercises"),

        exercise("starter", "Parse API response JSON",
            "Given a JSON string representing a weather API response with <code>city</code>, "
            "<code>temperature</code>, <code>conditions</code>, and <code>forecast</code> (a list of "
            "daily forecasts), parse it and print a formatted weather report. Save the parsed data "
            "to a file called <code>weather.json</code>.",
            hint="Use <code>json.loads()</code> to parse, then access fields with "
            "<code>data[\"city\"]</code>. Loop through <code>data[\"forecast\"]</code>. "
            "Save with <code>json.dump(data, f, indent=2)</code>."
        ),

        exercise("medium", "Generate CSV report",
            "Read the employees CSV from the examples above. Calculate the average salary per "
            "department and generate a new CSV file called <code>department_summary.csv</code> "
            "with columns: department, employee_count, avg_salary, total_salary. Sort by "
            "total_salary descending.",
            hint="Build a dict of department stats as you read: "
            "<code>dept_stats[dept] = {\"count\": 0, \"total\": 0}</code>. "
            "After reading, calculate averages and write with <code>DictWriter</code>."
        ),

        exercise("real-world", "Config file manager",
            "Build a <code>ConfigManager</code> class that supports both JSON and key=value config files. "
            "It should detect the format from the file extension (<code>.json</code> vs <code>.conf</code>). "
            "Methods: <code>load(filename)</code>, <code>save(filename)</code>, <code>get(key, default=None)</code>, "
            "<code>set(key, value)</code>. Support nested keys with dot notation: "
            "<code>config.get(\"database.host\")</code>.",
            hint="For dot notation, split on <code>\".\"</code> and traverse the dictionary: "
            "<code>keys = key.split(\".\")</code>, then loop through keys going deeper."
        ),

        mistakes([
            ("Forgetting <code>newline=\"\"</code> when opening CSV files",
             "On Windows, this prevents extra blank lines between rows. "
             "Always use <code>open(f, newline=\"\")</code> with the csv module."),
            ("Assuming CSV values are numbers",
             "All CSV values are strings. Use <code>int()</code> or <code>float()</code> to convert. "
             "<code>row[\"price\"]</code> is <code>\"29.99\"</code>, not <code>29.99</code>."),
            ("Not handling <code>json.JSONDecodeError</code>",
             "Invalid JSON crashes your program. Wrap <code>json.loads()</code> in try/except."),
            ("Pretty-printing JSON in production",
             "<code>indent=2</code> is great for debugging. For production/APIs, omit it to "
             "save bandwidth: <code>json.dumps(data)</code>."),
        ]),

        pro_tips([
            "<strong><code>json.dumps(data, indent=2, sort_keys=True)</code></strong> makes "
            "JSON files consistent and diff-friendly in version control.",
            "<strong>Use <code>csv.DictReader</code> over <code>csv.reader</code></strong> when "
            "your CSV has headers. Named columns are much less error-prone than indices.",
            "<strong>For complex data, prefer JSON over CSV.</strong> CSV cannot represent "
            "nested data or mixed types cleanly. JSON handles both naturally.",
            "<strong>Consider <code>json.dumps(data, default=str)</code></strong> to auto-convert "
            "datetime objects and other types that are not natively JSON-serializable.",
        ]),

        recap([
            "<code>json.dumps()</code> / <code>json.loads()</code> for strings",
            "<code>json.dump()</code> / <code>json.load()</code> for files",
            "<code>csv.reader</code> gives lists; <code>csv.DictReader</code> gives dicts",
            "<code>csv.writer</code> / <code>csv.DictWriter</code> for writing CSV",
            "Always use <code>newline=\"\"</code> when opening CSV files",
            "CSV values are always strings &mdash; convert as needed",
            "JSON supports nesting; CSV is flat and tabular",
        ]),
    ])
