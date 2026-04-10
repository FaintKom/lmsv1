"""Module 4, Lesson 6: Project — Password Strength Checker."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Project: Password Strength Checker",
            "Build a complete password validation module using functions, decorators, and lambdas. Real security, real code.",
        ),

        why_it_matters(
            "<p>Password validation is something every web application needs. This project "
            "combines everything from Module 4: defining functions, arguments, closures, "
            "lambda expressions, and decorators. You will build a modular, extensible system "
            "that could be dropped into a real project.</p>"
        ),

        section("What we are building"),

        concept("Password checker features",
            "<p>Our password strength checker will include:</p>"
            "<ul>"
            "<li><strong>Individual check functions</strong> &mdash; length, uppercase, digits, special characters</li>"
            "<li><strong>A scoring system</strong> &mdash; each check adds points</li>"
            "<li><strong>Strength rating</strong> &mdash; weak, medium, strong, very strong</li>"
            "<li><strong>A main function</strong> &mdash; combines all checks into a single report</li>"
            "<li><strong>Logging decorator</strong> &mdash; tracks which checks pass and fail</li>"
            "<li><strong>Lambda-based rules</strong> &mdash; flexible, configurable rules engine</li>"
            "</ul>"
        ),

        section("Step 1: Individual check functions"),

        code_example("Basic check functions",
            'def check_length(password, min_length=8):\n'
            '    """Check if password meets minimum length.\n'
            '\n'
            '    Args:\n'
            '        password: The password string to check.\n'
            '        min_length: Minimum acceptable length (default 8).\n'
            '\n'
            '    Returns:\n'
            '        Tuple of (passed: bool, message: str, points: int).\n'
            '    """\n'
            '    if len(password) >= min_length:\n'
            '        return True, f"Length OK ({len(password)} chars)", 2\n'
            '    return False, f"Too short ({len(password)}/{min_length} chars)", 0\n'
            '\n'
            '\n'
            'def check_uppercase(password):\n'
            '    """Check if password contains at least one uppercase letter."""\n'
            '    has_upper = any(c.isupper() for c in password)\n'
            '    if has_upper:\n'
            '        return True, "Has uppercase letter", 2\n'
            '    return False, "Missing uppercase letter", 0\n'
            '\n'
            '\n'
            'def check_lowercase(password):\n'
            '    """Check if password contains at least one lowercase letter."""\n'
            '    has_lower = any(c.islower() for c in password)\n'
            '    if has_lower:\n'
            '        return True, "Has lowercase letter", 2\n'
            '    return False, "Missing lowercase letter", 0\n'
            '\n'
            '\n'
            'def check_digits(password):\n'
            '    """Check if password contains at least one digit."""\n'
            '    has_digit = any(c.isdigit() for c in password)\n'
            '    if has_digit:\n'
            '        return True, "Has digit", 2\n'
            '    return False, "Missing digit", 0\n'
            '\n'
            '\n'
            'def check_special(password, special_chars="!@#$%^&*()_+-=[]{}|;:,.<>?"):\n'
            '    """Check if password contains at least one special character."""\n'
            '    has_special = any(c in special_chars for c in password)\n'
            '    if has_special:\n'
            '        return True, "Has special character", 2\n'
            '    return False, "Missing special character", 0\n'
            '\n'
            '\n'
            '# Test individual checks:\n'
            'print(check_length("MyP@ss1"))\n'
            'print(check_length("MyP@ss1word"))\n'
            'print(check_uppercase("hello123"))\n'
            'print(check_digits("HelloWorld"))',
            output="(False, 'Too short (7/8 chars)', 0)\n"
            "(True, 'Length OK (11 chars)', 2)\n"
            "(False, 'Missing uppercase letter', 0)\n"
            "(False, 'Missing digit', 0)",
            explanation="Each function returns a consistent tuple: <code>(passed, message, points)</code>. "
            "This uniform interface makes them easy to combine."
        ),

        section("Step 2: The logging decorator"),

        code_example("@log_check decorator",
            'import functools\n'
            '\n'
            'def log_check(func):\n'
            '    """Decorator that logs check results."""\n'
            '    @functools.wraps(func)\n'
            '    def wrapper(*args, **kwargs):\n'
            '        passed, message, points = func(*args, **kwargs)\n'
            '        icon = "PASS" if passed else "FAIL"\n'
            '        print(f"  [{icon}] {func.__name__}: {message} (+{points} pts)")\n'
            '        return passed, message, points\n'
            '    return wrapper\n'
            '\n'
            '# Apply the decorator:\n'
            '@log_check\n'
            'def check_length(password, min_length=8):\n'
            '    """Check if password meets minimum length."""\n'
            '    if len(password) >= min_length:\n'
            '        return True, f"Length OK ({len(password)} chars)", 2\n'
            '    return False, f"Too short ({len(password)}/{min_length} chars)", 0\n'
            '\n'
            'check_length("hello")\n'
            'check_length("MySecurePassword123")',
            output="  [FAIL] check_length: Too short (5/8 chars) (+0 pts)\n"
            "  [PASS] check_length: Length OK (19 chars) (+2 pts)",
            explanation="The decorator intercepts the result, logs it with a pass/fail indicator, "
            "and returns the original tuple unchanged. Adding logging to every check is now "
            "just a matter of putting <code>@log_check</code> above each function."
        ),

        section("Step 3: Lambda-based rules engine"),

        code_example("Configurable rules with lambdas",
            '# Define rules as a list of (name, checker, points) tuples:\n'
            'RULES = [\n'
            '    ("Length >= 8",      lambda p: len(p) >= 8,                               2),\n'
            '    ("Length >= 12",     lambda p: len(p) >= 12,                              1),\n'
            '    ("Has uppercase",   lambda p: any(c.isupper() for c in p),               2),\n'
            '    ("Has lowercase",   lambda p: any(c.islower() for c in p),               2),\n'
            '    ("Has digit",       lambda p: any(c.isdigit() for c in p),               2),\n'
            '    ("Has special",     lambda p: any(c in "!@#$%^&*" for c in p),           2),\n'
            '    ("No spaces",       lambda p: " " not in p,                              1),\n'
            '    ("No repeats x3",   lambda p: not any(p[i] == p[i+1] == p[i+2]\n'
            '                                          for i in range(len(p) - 2)),       1),\n'
            ']\n'
            '\n'
            'def evaluate_rules(password, rules):\n'
            '    """Run all rules against a password.\n'
            '\n'
            '    Returns:\n'
            '        List of (name, passed, points) tuples.\n'
            '    """\n'
            '    results = []\n'
            '    for name, checker, points in rules:\n'
            '        passed = checker(password)\n'
            '        earned = points if passed else 0\n'
            '        results.append((name, passed, earned))\n'
            '    return results\n'
            '\n'
            '# Test it:\n'
            'results = evaluate_rules("MyP@ss1", RULES)\n'
            'for name, passed, pts in results:\n'
            '    icon = "PASS" if passed else "FAIL"\n'
            '    print(f"  [{icon}] {name}: +{pts}")',
            output="  [FAIL] Length >= 8: +0\n"
            "  [FAIL] Length >= 12: +0\n"
            "  [PASS] Has uppercase: +2\n"
            "  [PASS] Has lowercase: +2\n"
            "  [PASS] Has digit: +2\n"
            "  [PASS] Has special: +2\n"
            "  [PASS] No spaces: +1\n"
            "  [PASS] No repeats x3: +1",
            explanation="The rules engine uses lambdas to define each check as a simple expression. "
            "Adding a new rule is just adding a tuple to the list &mdash; no new functions needed."
        ),

        section("Step 4: Scoring and rating"),

        code_example("Strength rating function",
            'def get_strength_rating(score, max_score):\n'
            '    """Convert a numeric score to a strength rating.\n'
            '\n'
            '    Returns:\n'
            '        Tuple of (rating: str, color: str).\n'
            '    """\n'
            '    percentage = (score / max_score) * 100 if max_score > 0 else 0\n'
            '    if percentage >= 90:\n'
            '        return "VERY STRONG", "green"\n'
            '    elif percentage >= 70:\n'
            '        return "STRONG", "blue"\n'
            '    elif percentage >= 50:\n'
            '        return "MEDIUM", "yellow"\n'
            '    else:\n'
            '        return "WEAK", "red"\n'
            '\n'
            'def make_progress_bar(score, max_score, width=20):\n'
            '    """Create a text-based progress bar."""\n'
            '    filled = int((score / max_score) * width) if max_score > 0 else 0\n'
            '    bar = "#" * filled + "-" * (width - filled)\n'
            '    return f"[{bar}] {score}/{max_score}"\n'
            '\n'
            'print(get_strength_rating(12, 13))\n'
            'print(get_strength_rating(8, 13))\n'
            'print(get_strength_rating(4, 13))\n'
            'print(make_progress_bar(10, 13))\n'
            'print(make_progress_bar(4, 13))',
            output="('VERY STRONG', 'green')\n"
            "('STRONG', 'blue')\n"
            "('WEAK', 'red')\n"
            "[############--------] 10/13\n"
            "[######--------------] 4/13",
        ),

        section("Step 5: The complete program"),

        code_example("Full password strength checker",
            'import functools\n'
            '\n'
            '# === Decorator ===\n'
            'def log_check(func):\n'
            '    @functools.wraps(func)\n'
            '    def wrapper(*args, **kwargs):\n'
            '        passed, message, points = func(*args, **kwargs)\n'
            '        icon = "PASS" if passed else "FAIL"\n'
            '        print(f"  [{icon}] {message} (+{points} pts)")\n'
            '        return passed, message, points\n'
            '    return wrapper\n'
            '\n'
            '# === Check Functions ===\n'
            '@log_check\n'
            'def check_length(pw, min_len=8):\n'
            '    ok = len(pw) >= min_len\n'
            '    msg = f"Length {len(pw)}/{min_len}"\n'
            '    return ok, msg, 2 if ok else 0\n'
            '\n'
            '@log_check\n'
            'def check_upper(pw):\n'
            '    ok = any(c.isupper() for c in pw)\n'
            '    return ok, "Uppercase letter", 2 if ok else 0\n'
            '\n'
            '@log_check\n'
            'def check_lower(pw):\n'
            '    ok = any(c.islower() for c in pw)\n'
            '    return ok, "Lowercase letter", 2 if ok else 0\n'
            '\n'
            '@log_check\n'
            'def check_digit(pw):\n'
            '    ok = any(c.isdigit() for c in pw)\n'
            '    return ok, "Contains digit", 2 if ok else 0\n'
            '\n'
            '@log_check\n'
            'def check_special(pw):\n'
            '    ok = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in pw)\n'
            '    return ok, "Special character", 2 if ok else 0\n'
            '\n'
            '# === Lambda-based bonus rules ===\n'
            'BONUS_RULES = [\n'
            '    ("Length >= 12",   lambda p: len(p) >= 12,   1),\n'
            '    ("No spaces",     lambda p: " " not in p,   1),\n'
            '    ("No triple repeat", lambda p: not any(\n'
            '        p[i] == p[i+1] == p[i+2] for i in range(len(p)-2)), 1),\n'
            ']\n'
            '\n'
            '# === Rating ===\n'
            'def get_rating(score, max_score):\n'
            '    pct = (score / max_score) * 100 if max_score else 0\n'
            '    if pct >= 90: return "VERY STRONG"\n'
            '    if pct >= 70: return "STRONG"\n'
            '    if pct >= 50: return "MEDIUM"\n'
            '    return "WEAK"\n'
            '\n'
            'def progress_bar(score, max_score, width=20):\n'
            '    filled = int((score / max_score) * width) if max_score else 0\n'
            '    return f"[{\"#\" * filled}{\"-\" * (width - filled)}] {score}/{max_score}"\n'
            '\n'
            '# === Main Function ===\n'
            'def check_password(password):\n'
            '    """Run all checks and return a full strength report."""\n'
            '    print(f"\\nChecking password: {\"*\" * len(password)} ({len(password)} chars)")\n'
            '    print("-" * 40)\n'
            '\n'
            '    # Run primary checks\n'
            '    checks = [check_length, check_upper, check_lower,\n'
            '              check_digit, check_special]\n'
            '    score = 0\n'
            '    passed = 0\n'
            '    for check in checks:\n'
            '        ok, msg, pts = check(password)\n'
            '        score += pts\n'
            '        passed += int(ok)\n'
            '\n'
            '    # Run bonus lambda rules\n'
            '    print("  --- Bonus ---")\n'
            '    for name, rule, pts in BONUS_RULES:\n'
            '        ok = rule(password)\n'
            '        earned = pts if ok else 0\n'
            '        score += earned\n'
            '        icon = "PASS" if ok else "FAIL"\n'
            '        print(f"  [{icon}] {name} (+{earned} pts)")\n'
            '\n'
            '    max_score = len(checks) * 2 + sum(pts for _, _, pts in BONUS_RULES)\n'
            '    rating = get_rating(score, max_score)\n'
            '\n'
            '    print("-" * 40)\n'
            '    print(f"  Score: {progress_bar(score, max_score)}")\n'
            '    print(f"  Rating: {rating}")\n'
            '    print(f"  Checks passed: {passed}/{len(checks)}")\n'
            '\n'
            '    return {"score": score, "max_score": max_score,\n'
            '            "rating": rating, "passed": passed}\n'
            '\n'
            '# === Run It ===\n'
            'check_password("password")\n'
            'check_password("MyP@ss1")\n'
            'check_password("Str0ng!P@ssw0rd")',
            output="Checking password: ******** (8 chars)\n"
            "----------------------------------------\n"
            "  [PASS] Length 8/8 (+2 pts)\n"
            "  [FAIL] Uppercase letter (+0 pts)\n"
            "  [PASS] Lowercase letter (+2 pts)\n"
            "  [FAIL] Contains digit (+0 pts)\n"
            "  [FAIL] Special character (+0 pts)\n"
            "  --- Bonus ---\n"
            "  [FAIL] Length >= 12 (+0 pts)\n"
            "  [PASS] No spaces (+1 pts)\n"
            "  [PASS] No triple repeat (+1 pts)\n"
            "----------------------------------------\n"
            "  Score: [########------------] 6/13\n"
            "  Rating: WEAK\n"
            "  Checks passed: 2/5",
            explanation="The complete program combines decorated check functions, "
            "a lambda-based rules engine, and a scoring system into one "
            "<code>check_password</code> function."
        ),

        try_it("Copy the complete program, run it, and test with different passwords. Try your own passwords and see how they score."),

        section("Extension ideas"),

        concept("Taking it further",
            "<ul>"
            "<li><strong>Common password check</strong> &mdash; add a list of the 100 most common passwords "
            "and reject matches</li>"
            "<li><strong>Pattern detection</strong> &mdash; detect keyboard patterns like <code>qwerty</code> "
            "or <code>12345</code></li>"
            "<li><strong>Password generator</strong> &mdash; add a function that generates a password "
            "meeting all criteria</li>"
            "<li><strong>Interactive mode</strong> &mdash; ask the user to input passwords and show "
            "real-time feedback</li>"
            "<li><strong>Entropy calculation</strong> &mdash; compute password entropy in bits for a "
            "more scientific strength measure</li>"
            "</ul>"
        ),

        section("Exercises"),

        exercise("starter", "Add a common password check",
            "Create a function <code>check_common(password)</code> that checks against a list "
            "of at least 10 common passwords (password, 123456, qwerty, etc.). If the password "
            "matches (case-insensitive), return <code>(False, \"Common password!\", 0)</code>. "
            "Add it to the check list and decorate with <code>@log_check</code>.",
            hint="Store commons as a set for fast lookup: "
            "<code>COMMON = {\"password\", \"123456\", \"qwerty\", ...}</code>. "
            "Check with <code>password.lower() in COMMON</code>."
        ),

        exercise("medium", "Password generator function",
            "Write a function <code>generate_password(length=16, require_upper=True, "
            "require_digit=True, require_special=True)</code> that generates a random password "
            "meeting all specified requirements. Use <code>import random</code> and "
            "<code>import string</code>. Verify your generated passwords pass all checks "
            "by running them through <code>check_password</code>.",
            hint="Start by picking one character from each required category. "
            "Fill remaining slots with random characters from the full set. "
            "Shuffle with <code>random.shuffle(chars)</code>."
        ),

        exercise("real-world", "Configurable password policy",
            "Create a <code>make_password_checker(**policy)</code> factory function that "
            "accepts configuration like <code>min_length=10, require_upper=True, "
            "require_digit=True, require_special=True, max_repeats=2</code>. "
            "It should return a <code>check(password)</code> function configured with those rules. "
            "This way, different parts of your application can have different password policies "
            "(admin vs regular user). Test with two different policies.",
            hint="Inside the factory, dynamically build the <code>RULES</code> list based on "
            "the policy keyword arguments. Return a closure that runs those rules."
        ),

        mistakes([
            ("Not normalizing before checking",
             "Decide whether checks are case-sensitive. Common password checks should "
             "be case-insensitive (<code>password.lower()</code>)."),
            ("Returning inconsistent types",
             "If all check functions return <code>(bool, str, int)</code>, keep that contract. "
             "Mixing formats breaks the combiner."),
            ("Hardcoding special characters",
             "Different systems allow different special characters. Make the allowed set a parameter."),
            ("Not masking the password in output",
             "Never print the actual password in logs. Use <code>\"*\" * len(password)</code> "
             "or show only the length."),
        ]),

        pro_tips([
            "<strong>Separate checking from reporting.</strong> Check functions should return data. "
            "Formatting and display is a separate concern.",
            "<strong>Use <code>any()</code> for character class checks.</strong> "
            "<code>any(c.isupper() for c in pw)</code> is clean and efficient &mdash; "
            "it stops at the first match.",
            "<strong>Lambda rules make policies configurable.</strong> Store rules in a config file "
            "or database, and load them at runtime for different user tiers.",
            "<strong>Module 4 complete.</strong> You now have functions, arguments, scope, closures, "
            "lambdas, and decorators. These are the tools professional Python developers use daily.",
        ]),

        recap([
            "Built a complete, modular password checker",
            "Used individual functions with a consistent return interface",
            "Applied a <code>@log_check</code> decorator for automatic logging",
            "Used lambdas for a flexible, data-driven rules engine",
            "Implemented a scoring system with ratings and a progress bar",
            "Combined all Module 4 concepts into one real-world project",
        ]),
    ])
