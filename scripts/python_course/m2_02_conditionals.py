"""Module 2, Lesson 2: If, Elif, Else."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "If, Elif, Else",
            "Give your programs the power to choose different paths based on conditions.",
        ),

        why_it_matters(
            "<p>Almost every program you will ever write needs to make decisions. "
            "Should we show the admin panel? Is the coupon valid? Did the user enter "
            "the right password? Conditional statements are how your code makes "
            "choices instead of blindly running every line.</p>"
        ),

        section("The if statement"),

        concept("Basic if",
            "<p>The <code>if</code> statement runs a block of code <strong>only when</strong> "
            "the condition is <code>True</code>. If the condition is <code>False</code>, "
            "the block is skipped entirely.</p>"
        ),

        code_example("Simple if",
            'temperature = 95\n'
            '\n'
            'if temperature > 90:\n'
            '    print("It\'s really hot outside!")\n'
            '    print("Stay hydrated!")\n'
            '\n'
            'print("Have a nice day.")   # Always runs',
            output="It's really hot outside!\nStay hydrated!\nHave a nice day.",
            explanation="The indented lines only run when the condition is True. "
            "The unindented line runs regardless. <strong>Indentation matters</strong> in Python."
        ),

        section("if-else"),

        concept("Two-way decisions",
            "<p>Use <code>else</code> to run code when the condition is <code>False</code>. "
            "Exactly one of the two blocks will always execute.</p>"
        ),

        code_example("if-else",
            'age = 16\n'
            '\n'
            'if age >= 18:\n'
            '    print("You can vote!")\n'
            'else:\n'
            '    print("Sorry, too young to vote.")\n'
            '    years_left = 18 - age\n'
            '    print(f"Come back in {years_left} years.")',
            output="Sorry, too young to vote.\nCome back in 2 years.",
            explanation="The <code>else</code> block catches everything that "
            "the <code>if</code> condition did not."
        ),

        section("if-elif-else chains"),

        concept("Multiple conditions",
            "<p>When you have more than two options, use <code>elif</code> (short for \"else if\"). "
            "Python checks each condition top to bottom and runs the <strong>first one</strong> "
            "that is True. If none match, the <code>else</code> block runs.</p>"
        ),

        code_example("Grade calculator",
            'score = 85\n'
            '\n'
            'if score >= 90:\n'
            '    grade = "A"\n'
            'elif score >= 80:\n'
            '    grade = "B"\n'
            'elif score >= 70:\n'
            '    grade = "C"\n'
            'elif score >= 60:\n'
            '    grade = "D"\n'
            'else:\n'
            '    grade = "F"\n'
            '\n'
            'print(f"Score: {score} -> Grade: {grade}")',
            output="Score: 85 -> Grade: B",
            explanation="Order matters! If score is 85, the first check (<code>score >= 90</code>) "
            "is False, but the second (<code>score >= 80</code>) is True, so we get \"B\" "
            "and skip the rest."
        ),

        code_example("Multiple elif branches",
            'day = "Wednesday"\n'
            '\n'
            'if day == "Monday":\n'
            '    print("Start of the work week")\n'
            'elif day == "Friday":\n'
            '    print("TGIF!")\n'
            'elif day == "Saturday" or day == "Sunday":\n'
            '    print("Weekend!")\n'
            'else:\n'
            '    print(f"Just a regular {day}")',
            output="Just a regular Wednesday",
            explanation="You can use as many <code>elif</code> branches as you need. "
            "The <code>else</code> at the end is optional but recommended for catching "
            "unexpected values."
        ),

        section("Nesting conditionals"),

        concept("If inside if",
            "<p>You can put an <code>if</code> statement inside another <code>if</code> block. "
            "This is called <strong>nesting</strong>. Each level adds one more indent.</p>"
        ),

        code_example("Nested if example",
            'has_ticket = True\n'
            'age = 15\n'
            '\n'
            'if has_ticket:\n'
            '    if age >= 18:\n'
            '        print("Welcome to the R-rated movie!")\n'
            '    elif age >= 13:\n'
            '        print("Welcome to the PG-13 movie!")\n'
            '    else:\n'
            '        print("Sorry, you need a parent.")\n'
            'else:\n'
            '    print("Please buy a ticket first.")',
            output="Welcome to the PG-13 movie!",
            explanation="We first check the ticket, then check the age. "
            "Nesting is useful, but more than 2-3 levels deep becomes hard to read. "
            "Consider refactoring deep nests."
        ),

        section("The ternary expression"),

        concept("One-line conditionals",
            "<p>For simple if-else assignments, Python has a compact one-line form called "
            "the <strong>ternary expression</strong> (also called conditional expression):</p>"
            "<p><code>value = result_if_true if condition else result_if_false</code></p>"
        ),

        code_example("Ternary expressions",
            'age = 20\n'
            '\n'
            '# Ternary expression\n'
            'status = "adult" if age >= 18 else "minor"\n'
            'print(status)   # adult\n'
            '\n'
            '# Useful in f-strings\n'
            'score = 45\n'
            'result = "PASS" if score >= 50 else "FAIL"\n'
            'print(f"Result: {result}")   # Result: FAIL\n'
            '\n'
            '# Useful for default values\n'
            'user_input = ""\n'
            'name = user_input if user_input else "Anonymous"\n'
            'print(f"Hello, {name}!")   # Hello, Anonymous!',
            output="adult\nResult: FAIL\nHello, Anonymous!",
            explanation="Use ternary expressions when you need a simple either/or assignment. "
            "If the logic is complex, use a regular if-else for readability."
        ),

        section("Input validation pattern"),

        concept("Validating user input",
            "<p>One of the most common uses of conditionals is validating user input. "
            "Check if the input is valid <strong>before</strong> processing it.</p>"
        ),

        code_example("Input validation",
            '# Get user input\n'
            'user_input = input("Enter your age: ").strip()\n'
            '\n'
            '# Validate: is it a number?\n'
            'if not user_input.isdigit():\n'
            '    print("Error: Please enter a valid number.")\n'
            'else:\n'
            '    age = int(user_input)\n'
            '    # Validate: is it in a reasonable range?\n'
            '    if 0 < age < 150:\n'
            '        print(f"You are {age} years old.")\n'
            '    else:\n'
            '        print("Error: Age must be between 1 and 149.")',
            explanation="Always validate input in two stages: first check the format "
            "(is it a number?), then check the value (is it in range?). "
            "This prevents crashes and gives clear error messages."
        ),

        code_example("Guard clause pattern",
            '# Guard clauses: handle errors first, then do the work\n'
            'email = input("Enter your email: ").strip()\n'
            '\n'
            'if not email:\n'
            '    print("Error: Email cannot be empty.")\n'
            'elif "@" not in email:\n'
            '    print("Error: Invalid email (missing @).")\n'
            'elif "." not in email.split("@")[-1]:\n'
            '    print("Error: Invalid domain.")\n'
            'else:\n'
            '    print(f"Email accepted: {email}")',
            explanation="Guard clauses check for errors one at a time. Each invalid case "
            "is handled early, and the success case is at the bottom. This avoids "
            "deeply nested if statements."
        ),

        try_it("Write a program that asks for a number and tells the user if it is positive, negative, or zero."),

        section("Exercises"),

        exercise("starter", "Grade calculator",
            "Write a program that takes a numeric score (0-100) and prints the letter grade:<br>"
            "90-100 = A, 80-89 = B, 70-79 = C, 60-69 = D, below 60 = F.<br>"
            "Also print \"Excellent!\" for A, \"Good job!\" for B, and \"You passed.\" for C/D. "
            "For F, print \"See me after class.\"",
            hint="Use <code>if score >= 90: ... elif score >= 80: ...</code> etc. "
            "After determining the grade, you can add a message inside each block."
        ),

        exercise("medium", "Tax bracket calculator",
            "Build a simple US federal tax calculator for a single filer (2024 brackets):<br>"
            "- 0 to $11,600: 10%<br>"
            "- $11,601 to $47,150: 12%<br>"
            "- $47,151 to $100,525: 22%<br>"
            "- $100,526 to $191,950: 24%<br>"
            "- above $191,950: 32% (simplified)<br>"
            "Ask for income, calculate total tax using marginal brackets "
            "(not flat rate!), and print the effective tax rate.",
            hint="Marginal means each bracket only applies to income IN that bracket. "
            "Start from the bottom: <code>tax = 0</code>, then add "
            "<code>min(income, 11600) * 0.10</code>, then for the next bracket "
            "<code>max(0, min(income, 47150) - 11600) * 0.12</code>, etc."
        ),

        exercise("real-world", "Movie ticket pricing",
            "Write a ticket pricing system with these rules:<br>"
            "- <strong>Base price:</strong> $12.00<br>"
            "- <strong>Age discount:</strong> Children (under 13): 50% off. Seniors (65+): 30% off<br>"
            "- <strong>Day discount:</strong> Tuesday is discount day: $2 off after age discount<br>"
            "- <strong>Time discount:</strong> Matinee (before 5 PM): $1.50 off after other discounts<br>"
            "- <strong>3D surcharge:</strong> +$3.00<br>"
            "- <strong>Minimum price:</strong> $5.00 (no ticket can cost less)<br>"
            "Ask for age, day, showtime (24h), and 3D (yes/no). Show original price, "
            "each discount applied, and final price.",
            hint="Apply discounts in order: age first, then day, then matinee. "
            "Use <code>price = max(price, 5.00)</code> at the end to enforce minimum."
        ),

        mistakes([
            ("Forgetting the colon",
             "<code>if age >= 18</code> is a SyntaxError. You need <code>if age >= 18:</code> "
             "with a colon at the end."),
            ("Wrong indentation",
             "All lines in an if/elif/else block must be indented the same amount. "
             "Mixing tabs and spaces will cause <code>IndentationError</code>."),
            ("Overlapping conditions in elif",
             "If you write <code>if score >= 80</code> then <code>elif score >= 90</code>, "
             "the elif never runs because 90 is already caught by 80. "
             "Go from highest to lowest."),
            ("Using <code>elif</code> after <code>else</code>",
             "<code>else</code> must be the last branch. "
             "You cannot put <code>elif</code> after <code>else</code>."),
            ("Unnecessary nesting",
             "Instead of <code>if x: if y: ...</code>, consider <code>if x and y: ...</code>. "
             "Flatten when possible."),
        ]),

        pro_tips([
            "<strong>Guard clauses reduce nesting.</strong> Handle invalid cases first with early returns "
            "or early prints, so the main logic sits at the top level.",
            "<strong>Ternary for simple assignments only.</strong> If the expression gets long or has "
            "side effects, use a regular if-else.",
            "<strong>Always include else.</strong> Even if you think it is impossible to reach, "
            "add an <code>else</code> that prints an error. Future-you will thank present-you.",
            "<strong>Keep it flat.</strong> If you have more than 3 levels of nesting, refactor. "
            "In Module 3, you will learn functions to break up complex logic.",
        ]),

        recap([
            "<code>if</code> runs code when a condition is True",
            "<code>if-else</code> handles two-way decisions",
            "<code>if-elif-else</code> handles multiple options (first match wins)",
            "Nesting puts conditionals inside conditionals (keep it shallow)",
            "Ternary: <code>x = val_a if condition else val_b</code>",
            "Validate input: check format first, then value range",
        ]),
    ])
