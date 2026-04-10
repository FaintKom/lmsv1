"""Module 6, Lesson 1: Reading & Writing Files."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Reading &amp; Writing Files",
            "Make your programs persistent. Read configuration, process log files, and save results to disk.",
        ),

        why_it_matters(
            "<p>Programs that only work with data in memory lose everything when they stop. "
            "Real applications read settings from config files, process uploaded documents, "
            "write logs for debugging, and save user data. File I/O is one of the most "
            "fundamental skills in programming &mdash; every backend developer uses it daily.</p>"
        ),

        section("Opening files"),

        concept("The <code>open()</code> function",
            "<p><code>open(filename, mode)</code> opens a file and returns a file object. "
            "The most common modes are:</p>"
            "<ul>"
            "<li><code>\"r\"</code> &mdash; read (default). File must exist.</li>"
            "<li><code>\"w\"</code> &mdash; write. Creates file or <strong>overwrites</strong> existing.</li>"
            "<li><code>\"a\"</code> &mdash; append. Creates file or adds to the end.</li>"
            "<li><code>\"r+\"</code> &mdash; read and write. File must exist.</li>"
            "</ul>"
        ),

        section("The <code>with</code> statement"),

        concept("Context managers for safe file handling",
            "<p>Always use <code>with</code> to open files. It guarantees the file is properly "
            "closed, even if an error occurs:</p>"
        ),

        code_example("Reading a file with <code>with</code>",
            '# Write a sample file first:\n'
            'with open("sample.txt", "w") as f:\n'
            '    f.write("Hello, World!\\n")\n'
            '    f.write("Python is great.\\n")\n'
            '    f.write("File I/O is essential.\\n")\n'
            '\n'
            '# Read the entire file at once:\n'
            'with open("sample.txt", "r") as f:\n'
            '    content = f.read()\n'
            'print(content)\n'
            'print(f"Length: {len(content)} characters")',
            output="Hello, World!\nPython is great.\nFile I/O is essential.\n\n"
            "Length: 56 characters",
            explanation="The <code>with</code> block ensures the file is closed when you leave "
            "the block, even if an exception is raised. <code>f.read()</code> reads the "
            "entire file into a string."
        ),

        section("Reading methods"),

        code_example("Different ways to read",
            '# Create a test file:\n'
            'with open("data.txt", "w") as f:\n'
            '    f.write("Line 1: Alice\\n")\n'
            '    f.write("Line 2: Bob\\n")\n'
            '    f.write("Line 3: Charlie\\n")\n'
            '    f.write("Line 4: Diana\\n")\n'
            '\n'
            '# Method 1: read() - entire file as one string\n'
            'with open("data.txt") as f:\n'
            '    all_text = f.read()\n'
            'print(f"read(): {repr(all_text[:30])}...")\n'
            '\n'
            '# Method 2: readline() - one line at a time\n'
            'with open("data.txt") as f:\n'
            '    first = f.readline()\n'
            '    second = f.readline()\n'
            'print(f"readline(): {repr(first.strip())}, {repr(second.strip())}")\n'
            '\n'
            '# Method 3: readlines() - list of all lines\n'
            'with open("data.txt") as f:\n'
            '    lines = f.readlines()\n'
            'print(f"readlines(): {len(lines)} lines")\n'
            'print(f"  First: {repr(lines[0])}")\n'
            '\n'
            '# Method 4: iterate directly (most Pythonic)\n'
            'print("\\nIterating:")\n'
            'with open("data.txt") as f:\n'
            '    for line in f:\n'
            '        print(f"  {line.strip()}")',
            output="read(): 'Line 1: Alice\\nLine 2: Bob\\n'...\n"
            "readline(): 'Line 1: Alice', 'Line 2: Bob'\n"
            "readlines(): 4 lines\n"
            "  First: 'Line 1: Alice\\n'\n\n"
            "Iterating:\n  Line 1: Alice\n  Line 2: Bob\n  Line 3: Charlie\n  Line 4: Diana",
            explanation="Iterating directly (<code>for line in f</code>) is the most memory-efficient "
            "and Pythonic way. It reads one line at a time instead of loading the whole file. "
            "Always <code>.strip()</code> lines to remove trailing newlines."
        ),

        section("Writing files"),

        code_example("Writing and appending",
            '# Write mode (creates or overwrites):\n'
            'with open("output.txt", "w") as f:\n'
            '    f.write("Report generated\\n")\n'
            '    f.write("=" * 30 + "\\n")\n'
            '    for i in range(1, 4):\n'
            '        f.write(f"Item {i}: ${i * 10.50:.2f}\\n")\n'
            '\n'
            '# Append mode (adds to end):\n'
            'with open("output.txt", "a") as f:\n'
            '    f.write("\\n--- Appended later ---\\n")\n'
            '    f.write("Total: $31.50\\n")\n'
            '\n'
            '# Read it back:\n'
            'with open("output.txt") as f:\n'
            '    print(f.read())',
            output="Report generated\n"
            "==============================\n"
            "Item 1: $10.50\nItem 2: $21.00\nItem 3: $31.50\n\n"
            "--- Appended later ---\nTotal: $31.50\n",
        ),

        code_example("Writing a list of lines",
            '# writelines() writes a list of strings (no newlines added!):\n'
            'lines = [\n'
            '    "Name,Age,City\\n",\n'
            '    "Alice,30,NYC\\n",\n'
            '    "Bob,25,London\\n",\n'
            '    "Charlie,35,Tokyo\\n",\n'
            ']\n'
            '\n'
            'with open("people.csv", "w") as f:\n'
            '    f.writelines(lines)\n'
            '\n'
            'with open("people.csv") as f:\n'
            '    print(f.read())',
            output="Name,Age,City\nAlice,30,NYC\nBob,25,London\nCharlie,35,Tokyo\n",
            explanation="<code>writelines()</code> does not add newlines. You must include "
            "<code>\\n</code> in each string yourself."
        ),

        section("Working with paths"),

        code_example("Using pathlib for paths",
            'from pathlib import Path\n'
            '\n'
            '# Create a path object:\n'
            'data_dir = Path("data")\n'
            'data_dir.mkdir(exist_ok=True)    # create directory if missing\n'
            '\n'
            '# Build file paths:\n'
            'file_path = data_dir / "config.txt"\n'
            'print(f"Path: {file_path}")\n'
            'print(f"Exists: {file_path.exists()}")\n'
            '\n'
            '# Write using pathlib:\n'
            'file_path.write_text("host=localhost\\nport=8080\\ndebug=true\\n")\n'
            'print(f"Exists now: {file_path.exists()}")\n'
            '\n'
            '# Read using pathlib:\n'
            'content = file_path.read_text()\n'
            'print(f"Content:\\n{content}")\n'
            '\n'
            '# Useful path properties:\n'
            'p = Path("data/reports/2024/report.pdf")\n'
            'print(f"Name: {p.name}")        # report.pdf\n'
            'print(f"Stem: {p.stem}")        # report\n'
            'print(f"Suffix: {p.suffix}")    # .pdf\n'
            'print(f"Parent: {p.parent}")    # data/reports/2024',
            output="Path: data/config.txt\nExists: False\nExists now: True\n"
            "Content:\nhost=localhost\nport=8080\ndebug=true\n\n"
            "Name: report.pdf\nStem: report\nSuffix: .pdf\nParent: data/reports/2024",
            explanation="<code>pathlib.Path</code> is the modern way to handle file paths in Python. "
            "The <code>/</code> operator joins path segments. It works correctly on every operating system."
        ),

        section("Practical example: Log file analyzer"),

        code_example("Analyzing a log file",
            '# Create a sample log file:\n'
            'log_lines = [\n'
            '    "2024-01-15 10:00:01 INFO  Server started on port 8080\\n",\n'
            '    "2024-01-15 10:00:05 INFO  Connected to database\\n",\n'
            '    "2024-01-15 10:01:23 WARN  High memory usage: 85%\\n",\n'
            '    "2024-01-15 10:02:45 ERROR Connection timeout to API\\n",\n'
            '    "2024-01-15 10:03:00 INFO  Retrying API connection\\n",\n'
            '    "2024-01-15 10:03:02 INFO  API connection restored\\n",\n'
            '    "2024-01-15 10:05:30 ERROR Disk space low: 5% remaining\\n",\n'
            '    "2024-01-15 10:10:00 WARN  Slow query: 3.2s\\n",\n'
            '    "2024-01-15 10:15:00 INFO  Backup completed\\n",\n'
            ']\n'
            '\n'
            'with open("server.log", "w") as f:\n'
            '    f.writelines(log_lines)\n'
            '\n'
            '# Analyze the log:\n'
            'def analyze_log(filename):\n'
            '    stats = {"INFO": 0, "WARN": 0, "ERROR": 0}\n'
            '    errors = []\n'
            '\n'
            '    with open(filename) as f:\n'
            '        for line in f:\n'
            '            line = line.strip()\n'
            '            for level in stats:\n'
            '                if level in line:\n'
            '                    stats[level] += 1\n'
            '                    if level == "ERROR":\n'
            '                        errors.append(line)\n'
            '                    break\n'
            '\n'
            '    print("=== Log Analysis ===")\n'
            '    total = sum(stats.values())\n'
            '    for level, count in stats.items():\n'
            '        pct = (count / total * 100) if total else 0\n'
            '        print(f"  {level}: {count} ({pct:.0f}%)")\n'
            '    print(f"  Total: {total} entries")\n'
            '\n'
            '    if errors:\n'
            '        print(f"\\n=== Errors ({len(errors)}) ===")\n'
            '        for err in errors:\n'
            '            print(f"  {err}")\n'
            '\n'
            'analyze_log("server.log")',
            output="=== Log Analysis ===\n"
            "  INFO: 5 (56%)\n  WARN: 2 (22%)\n  ERROR: 2 (22%)\n  Total: 9 entries\n\n"
            "=== Errors (2) ===\n"
            "  2024-01-15 10:02:45 ERROR Connection timeout to API\n"
            "  2024-01-15 10:05:30 ERROR Disk space low: 5% remaining",
        ),

        try_it("Create a file called <code>notes.txt</code>, write 3 lines to it, then read and print them back."),

        section("Exercises"),

        exercise("starter", "Log file analyzer",
            "Write a function <code>analyze_log(filename)</code> that reads a log file and returns "
            "a dictionary with counts of each log level (INFO, WARN, ERROR). Also track the "
            "timestamp of the first and last entries. Test with the sample log file above.",
            hint="Split each line: <code>parts = line.split()</code>. The date is <code>parts[0]</code>, "
            "time is <code>parts[1]</code>, level is <code>parts[2]</code>."
        ),

        exercise("medium", "Config file reader/writer",
            "Build a <code>read_config(filename)</code> function that reads a <code>key=value</code> "
            "config file and returns a dictionary. Build <code>write_config(filename, config_dict)</code> "
            "that saves a dictionary back. Handle comments (lines starting with <code>#</code>) "
            "and empty lines. Test by reading, modifying a value, and writing back.",
            hint="Skip lines where <code>line.strip().startswith(\"#\")</code> or <code>not line.strip()</code>. "
            "Split with <code>key, value = line.strip().split(\"=\", 1)</code>."
        ),

        exercise("real-world", "Word frequency counter",
            "Write a program that reads a text file, counts the frequency of every word "
            "(case-insensitive, stripped of punctuation), and writes a report file with the "
            "top 20 words sorted by frequency. Use <code>collections.Counter</code>. "
            "Handle the file-not-found case gracefully.",
            hint="Use <code>import string</code> and <code>word.strip(string.punctuation)</code> "
            "to clean words. <code>Counter(words).most_common(20)</code> gives the top 20."
        ),

        mistakes([
            ("Forgetting to close files",
             "Always use <code>with</code>. Without it, files may stay open and consume "
             "system resources, or data may not be flushed to disk."),
            ("Using <code>\"w\"</code> when you mean <code>\"a\"</code>",
             "Write mode <strong>erases</strong> the file first. If you want to add to an existing file, "
             "use append mode <code>\"a\"</code>."),
            ("Not handling <code>FileNotFoundError</code>",
             "Wrap file reads in <code>try/except FileNotFoundError</code>. Files might be "
             "missing, moved, or misspelled."),
            ("Forgetting <code>\\n</code> in write calls",
             "<code>f.write(\"hello\")</code> does not add a newline. Use <code>f.write(\"hello\\n\")</code> "
             "or <code>print(\"hello\", file=f)</code> which adds one automatically."),
        ]),

        pro_tips([
            "<strong>Use <code>pathlib.Path</code> for paths.</strong> "
            "<code>Path(\"data\") / \"file.txt\"</code> works on every OS and is more readable.",
            "<strong>Use <code>encoding=\"utf-8\"</code></strong> when opening files: "
            "<code>open(f, encoding=\"utf-8\")</code>. This prevents encoding errors with "
            "international characters.",
            "<strong>Use <code>print(data, file=f)</code></strong> instead of <code>f.write()</code> "
            "when you want automatic newlines and string conversion.",
            "<strong>For large files, iterate line by line.</strong> Never <code>.read()</code> "
            "a 10 GB file into memory. Use <code>for line in f:</code> instead.",
        ]),

        recap([
            "<code>open(file, mode)</code> opens files &mdash; always use <code>with</code>",
            "<code>\"r\"</code> reads, <code>\"w\"</code> writes (overwrites), <code>\"a\"</code> appends",
            "<code>f.read()</code>, <code>f.readline()</code>, <code>for line in f:</code> for reading",
            "<code>f.write()</code>, <code>f.writelines()</code> for writing",
            "<code>pathlib.Path</code> for modern, cross-platform path handling",
            "Always handle <code>FileNotFoundError</code> for reads",
            "Always specify <code>encoding=\"utf-8\"</code> for text files",
        ]),
    ])
