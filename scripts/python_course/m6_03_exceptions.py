"""Module 6, Lesson 3: Error Handling & Exceptions."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Error Handling &amp; Exceptions",
            "Write code that fails gracefully. Try, except, raise, and custom exceptions for robust programs.",
        ),

        why_it_matters(
            "<p>In the real world, things go wrong constantly. Files are missing, networks time out, "
            "users enter garbage data, APIs return errors. Code that does not handle errors crashes "
            "without explanation. Code that handles errors gracefully logs the problem, recovers "
            "when possible, and gives users clear feedback. This is what separates professional "
            "code from scripts that break.</p>"
        ),

        section("try / except basics"),

        concept("Catching exceptions",
            "<p>The <code>try/except</code> block lets you handle errors without crashing:</p>"
        ),

        code_example("Basic try/except",
            '# Without error handling (crashes):\n'
            '# result = 10 / 0    # ZeroDivisionError!\n'
            '\n'
            '# With error handling (graceful):\n'
            'try:\n'
            '    result = 10 / 0\n'
            'except ZeroDivisionError:\n'
            '    print("Cannot divide by zero!")\n'
            '    result = 0\n'
            '\n'
            'print(f"Result: {result}")\n'
            '\n'
            '# Catching the error object:\n'
            'try:\n'
            '    number = int("hello")\n'
            'except ValueError as e:\n'
            '    print(f"Conversion failed: {e}")',
            output="Cannot divide by zero!\nResult: 0\n"
            "Conversion failed: invalid literal for int() with base 10: 'hello'",
            explanation="The code in <code>try</code> runs normally. If an exception occurs, "
            "Python jumps to the matching <code>except</code> block. The <code>as e</code> "
            "syntax captures the exception object for inspection."
        ),

        section("Multiple except blocks"),

        code_example("Handling different error types",
            'def safe_divide(a, b):\n'
            '    """Divide with comprehensive error handling."""\n'
            '    try:\n'
            '        result = a / b\n'
            '    except ZeroDivisionError:\n'
            '        print("Error: Division by zero")\n'
            '        return None\n'
            '    except TypeError as e:\n'
            '        print(f"Error: Wrong types - {e}")\n'
            '        return None\n'
            '    else:\n'
            '        # Runs only if NO exception occurred:\n'
            '        print(f"{a} / {b} = {result:.4f}")\n'
            '        return result\n'
            '    finally:\n'
            '        # Runs ALWAYS, even after return:\n'
            '        print("--- Division attempt complete ---")\n'
            '\n'
            'safe_divide(10, 3)\n'
            'print()\n'
            'safe_divide(10, 0)\n'
            'print()\n'
            'safe_divide("10", 3)',
            output="10 / 3 = 3.3333\n--- Division attempt complete ---\n\n"
            "Error: Division by zero\n--- Division attempt complete ---\n\n"
            "Error: Wrong types - unsupported operand type(s) for /: 'str' and 'int'\n"
            "--- Division attempt complete ---",
            explanation="<code>else</code> runs when NO exception occurs &mdash; use it for success logic. "
            "<code>finally</code> runs ALWAYS &mdash; use it for cleanup (closing files, releasing resources)."
        ),

        section("The full try/except/else/finally"),

        concept("When each block runs",
            "<ul>"
            "<li><code>try</code> &mdash; the code that might fail</li>"
            "<li><code>except</code> &mdash; runs when a specific exception occurs</li>"
            "<li><code>else</code> &mdash; runs only if no exception occurred (success path)</li>"
            "<li><code>finally</code> &mdash; runs always, even after return or exception</li>"
            "</ul>"
        ),

        code_example("File reading with full error handling",
            'def read_config(filename):\n'
            '    """Read a config file with robust error handling."""\n'
            '    config = {}\n'
            '    try:\n'
            '        with open(filename) as f:\n'
            '            for line_num, line in enumerate(f, 1):\n'
            '                line = line.strip()\n'
            '                if not line or line.startswith("#"):\n'
            '                    continue\n'
            '                key, value = line.split("=", 1)\n'
            '                config[key.strip()] = value.strip()\n'
            '    except FileNotFoundError:\n'
            '        print(f"Config file \'{filename}\' not found. Using defaults.")\n'
            '    except ValueError:\n'
            '        print(f"Parse error on line {line_num}: \'{line}\'")\n'
            '    except PermissionError:\n'
            '        print(f"No permission to read \'{filename}\'")\n'
            '    else:\n'
            '        print(f"Loaded {len(config)} settings from \'{filename}\'")\n'
            '    finally:\n'
            '        return config\n'
            '\n'
            '# Test with missing file:\n'
            'cfg = read_config("missing.conf")\n'
            'print(f"Config: {cfg}")\n'
            '\n'
            '# Test with valid file:\n'
            'with open("app.conf", "w") as f:\n'
            '    f.write("# App config\\n")\n'
            '    f.write("host=localhost\\n")\n'
            '    f.write("port=8080\\n")\n'
            '    f.write("debug=true\\n")\n'
            '\n'
            'cfg = read_config("app.conf")\n'
            'print(f"Config: {cfg}")',
            output="Config file 'missing.conf' not found. Using defaults.\n"
            "Config: {}\n"
            "Loaded 3 settings from 'app.conf'\n"
            "Config: {'host': 'localhost', 'port': '8080', 'debug': 'true'}",
        ),

        section("Raising exceptions"),

        concept("Throwing your own errors",
            "<p>Use <code>raise</code> to throw exceptions when something is wrong. "
            "This is how you enforce rules and signal errors to callers:</p>"
        ),

        code_example("Raising exceptions",
            'def withdraw(balance, amount):\n'
            '    """Withdraw money with validation."""\n'
            '    if not isinstance(amount, (int, float)):\n'
            '        raise TypeError(f"Amount must be a number, got {type(amount).__name__}")\n'
            '    if amount <= 0:\n'
            '        raise ValueError(f"Amount must be positive, got {amount}")\n'
            '    if amount > balance:\n'
            '        raise ValueError(f"Insufficient funds: balance={balance}, requested={amount}")\n'
            '    return balance - amount\n'
            '\n'
            '# Valid:\n'
            'print(f"Balance: {withdraw(100, 30)}")\n'
            '\n'
            '# Invalid:\n'
            'for args in [(100, -10), (100, 200), (100, "ten")]:\n'
            '    try:\n'
            '        withdraw(*args)\n'
            '    except (ValueError, TypeError) as e:\n'
            '        print(f"Error: {e}")',
            output="Balance: 70\n"
            "Error: Amount must be positive, got -10\n"
            "Error: Insufficient funds: balance=100, requested=200\n"
            "Error: Amount must be a number, got str",
        ),

        section("Custom exception classes"),

        code_example("Defining custom exceptions",
            'class AppError(Exception):\n'
            '    """Base exception for our application."""\n'
            '    pass\n'
            '\n'
            'class ValidationError(AppError):\n'
            '    """Raised when input validation fails."""\n'
            '    def __init__(self, field, message):\n'
            '        self.field = field\n'
            '        self.message = message\n'
            '        super().__init__(f"{field}: {message}")\n'
            '\n'
            'class NotFoundError(AppError):\n'
            '    """Raised when a resource is not found."""\n'
            '    def __init__(self, resource, identifier):\n'
            '        self.resource = resource\n'
            '        self.identifier = identifier\n'
            '        super().__init__(f"{resource} \'{identifier}\' not found")\n'
            '\n'
            'class AuthenticationError(AppError):\n'
            '    """Raised when authentication fails."""\n'
            '    pass\n'
            '\n'
            '\n'
            '# Using custom exceptions:\n'
            'def get_user(user_id):\n'
            '    users = {"alice": "Alice Smith", "bob": "Bob Jones"}\n'
            '    if user_id not in users:\n'
            '        raise NotFoundError("User", user_id)\n'
            '    return users[user_id]\n'
            '\n'
            'def validate_email(email):\n'
            '    if "@" not in email:\n'
            '        raise ValidationError("email", "Must contain @")\n'
            '    if "." not in email.split("@")[-1]:\n'
            '        raise ValidationError("email", "Domain must have a dot")\n'
            '    return True\n'
            '\n'
            '\n'
            '# Catching custom exceptions:\n'
            'for test in ["alice", "charlie"]:\n'
            '    try:\n'
            '        print(f"Found: {get_user(test)}")\n'
            '    except NotFoundError as e:\n'
            '        print(f"Not found: {e.resource} \'{e.identifier}\'")\n'
            '\n'
            'for email in ["alice@co.com", "invalid", "no-dot@co"]:\n'
            '    try:\n'
            '        validate_email(email)\n'
            '        print(f"Valid: {email}")\n'
            '    except ValidationError as e:\n'
            '        print(f"Invalid ({e.field}): {e.message}")',
            output="Found: Alice Smith\nNot found: User 'charlie'\n"
            "Valid: alice@co.com\nInvalid (email): Must contain @\n"
            "Invalid (email): Domain must have a dot",
            explanation="Custom exceptions carry extra data (field name, resource type) that makes "
            "error handling more precise. Use a base class (AppError) so callers can catch all "
            "application errors with one except block."
        ),

        section("Exception chaining"),

        code_example("Chaining exceptions with <code>from</code>",
            'import json\n'
            '\n'
            'class ConfigError(Exception):\n'
            '    pass\n'
            '\n'
            'def load_config(filename):\n'
            '    try:\n'
            '        with open(filename) as f:\n'
            '            return json.load(f)\n'
            '    except FileNotFoundError as e:\n'
            '        raise ConfigError(f"Config file missing: {filename}") from e\n'
            '    except json.JSONDecodeError as e:\n'
            '        raise ConfigError(f"Invalid JSON in {filename}") from e\n'
            '\n'
            'try:\n'
            '    config = load_config("nonexistent.json")\n'
            'except ConfigError as e:\n'
            '    print(f"Config error: {e}")\n'
            '    print(f"Caused by: {e.__cause__}")',
            output="Config error: Config file missing: nonexistent.json\n"
            "Caused by: [Errno 2] No such file or directory: 'nonexistent.json'",
            explanation="<code>raise ... from e</code> chains exceptions. The original error is preserved "
            "in <code>__cause__</code>. This provides full context while presenting a clean error "
            "to the caller."
        ),

        section("Practical patterns"),

        code_example("Retry pattern with exceptions",
            'import random\n'
            '\n'
            'def retry(func, max_attempts=3, exceptions=(Exception,)):\n'
            '    """Retry a function on failure."""\n'
            '    for attempt in range(1, max_attempts + 1):\n'
            '        try:\n'
            '            return func()\n'
            '        except exceptions as e:\n'
            '            if attempt == max_attempts:\n'
            '                print(f"Failed after {max_attempts} attempts")\n'
            '                raise\n'
            '            print(f"Attempt {attempt} failed: {e}. Retrying...")\n'
            '\n'
            '# Simulate a flaky operation:\n'
            'def flaky_api_call():\n'
            '    if random.random() < 0.6:\n'
            '        raise ConnectionError("Server timeout")\n'
            '    return {"status": "ok", "data": [1, 2, 3]}\n'
            '\n'
            'try:\n'
            '    result = retry(flaky_api_call, max_attempts=5,\n'
            '                   exceptions=(ConnectionError,))\n'
            '    print(f"Success: {result}")\n'
            'except ConnectionError:\n'
            '    print("Giving up.")',
            output="Attempt 1 failed: Server timeout. Retrying...\n"
            "Attempt 2 failed: Server timeout. Retrying...\n"
            "Success: {'status': 'ok', 'data': [1, 2, 3]}",
        ),

        try_it("Write a function that asks the user for a number, validates it, and keeps asking until they enter a valid integer."),

        section("Exercises"),

        exercise("starter", "Safe division function",
            "Write <code>safe_divide(a, b)</code> that handles <code>ZeroDivisionError</code> "
            "and <code>TypeError</code>. Return <code>None</code> on error with a descriptive "
            "message. Also write <code>safe_int(value)</code> that converts any value to int "
            "or returns a default. Test with various edge cases.",
            hint="<code>safe_int(value, default=0)</code> wraps <code>int(value)</code> in "
            "try/except, returning <code>default</code> on <code>ValueError</code> or <code>TypeError</code>."
        ),

        exercise("medium", "File reader with fallback",
            "Write <code>read_data(primary, fallback, default)</code> that tries to read "
            "<code>primary</code> file. If it fails, tries <code>fallback</code>. If both fail, "
            "returns <code>default</code>. Log each attempt. Support both JSON and plain text "
            "files (detect from extension). Test with missing files, invalid JSON, and valid files.",
            hint="Chain try/except blocks. Check extension with <code>filename.endswith(\".json\")</code>. "
            "Return the default value in the outer except block."
        ),

        exercise("real-world", "Input validator with retries",
            "Build an <code>InputValidator</code> class with custom exceptions: "
            "<code>EmptyInputError</code>, <code>InvalidFormatError</code>, <code>OutOfRangeError</code>. "
            "Add methods: <code>validate_email(input)</code>, <code>validate_age(input)</code>, "
            "<code>validate_phone(input)</code>. Write a <code>get_valid_input(prompt, validator, max_retries=3)</code> "
            "function that retries on validation failure. Test the full flow.",
            hint="Each validator raises a custom exception with a message. "
            "<code>get_valid_input</code> catches <code>AppError</code> (base class) in a retry loop."
        ),

        mistakes([
            ("Catching too broadly",
             "<code>except Exception:</code> catches everything, hiding real bugs. "
             "Catch specific exceptions: <code>except ValueError:</code>, <code>except FileNotFoundError:</code>."),
            ("Using exceptions for flow control",
             "Do not use try/except to check conditions that are expected. "
             "<code>if key in dict</code> is better than catching <code>KeyError</code> for normal lookups."),
            ("Silencing exceptions with empty <code>except</code>",
             "<code>except: pass</code> hides all errors. At minimum, log the error: "
             "<code>except Exception as e: print(f\"Error: {e}\")</code>."),
            ("Not re-raising after logging",
             "If you catch an error just to log it, re-raise with <code>raise</code>. "
             "Otherwise the caller never knows something went wrong."),
        ]),

        pro_tips([
            "<strong>Fail fast, fail loud.</strong> Raise exceptions as early as possible. "
            "Validate inputs at the top of functions, not after half the work is done.",
            "<strong>Create a custom exception hierarchy.</strong> Base class <code>AppError</code>, "
            "then <code>ValidationError</code>, <code>NotFoundError</code>, etc. "
            "Callers can catch broadly or specifically.",
            "<strong>Use <code>else</code> for the success path.</strong> Code in <code>else</code> "
            "only runs if no exception occurred &mdash; it keeps the try block small and focused.",
            "<strong>EAFP vs LBYL.</strong> Python prefers \"Easier to Ask Forgiveness than Permission\" "
            "(try/except) over \"Look Before You Leap\" (if/else checks). "
            "But use common sense &mdash; checking <code>if file.exists()</code> is fine.",
        ]),

        recap([
            "<code>try/except</code> catches and handles exceptions",
            "<code>else</code> runs on success; <code>finally</code> runs always",
            "<code>raise</code> throws exceptions; <code>raise ... from e</code> chains them",
            "Custom exceptions carry domain-specific data",
            "Catch specific exceptions, not bare <code>except:</code>",
            "Validate early, fail fast, provide clear error messages",
            "Use <code>finally</code> for cleanup (closing resources)",
        ]),
    ])
