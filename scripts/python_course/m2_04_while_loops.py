"""Module 2, Lesson 4: While Loops & Break/Continue."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "While Loops &amp; Break/Continue",
            "Keep going until a condition changes &mdash; perfect for user input, retries, and games.",
        ),

        why_it_matters(
            "<p>For loops are great when you know how many iterations you need. "
            "But what about \"keep asking until the user types quit\"? "
            "Or \"retry the network request up to 3 times\"? Or \"run the game until "
            "someone wins\"? That is where <code>while</code> loops shine &mdash; "
            "they repeat as long as a condition is True.</p>"
        ),

        section("The while loop"),

        concept("Loop while a condition is True",
            "<p>A <code>while</code> loop checks a condition <strong>before each iteration</strong>. "
            "If the condition is True, the body runs. If False, the loop ends.</p>"
            "<p>Syntax: <code>while condition:</code></p>"
        ),

        code_example("Basic while loop",
            'count = 1\n'
            '\n'
            'while count <= 5:\n'
            '    print(f"Count: {count}")\n'
            '    count += 1\n'
            '\n'
            'print("Done!")',
            output="Count: 1\nCount: 2\nCount: 3\nCount: 4\nCount: 5\nDone!",
            explanation="The condition <code>count &lt;= 5</code> is checked before each pass. "
            "When <code>count</code> reaches 6, the condition is False and the loop stops. "
            "<strong>Always make sure the condition will eventually become False!</strong>"
        ),

        code_example("Countdown timer",
            'seconds = 5\n'
            '\n'
            'while seconds > 0:\n'
            '    print(f"{seconds}...")\n'
            '    seconds -= 1\n'
            '\n'
            'print("Liftoff!")',
            output="5...\n4...\n3...\n2...\n1...\nLiftoff!",
        ),

        section("Infinite loops and break"),

        concept("while True with break",
            "<p>A common pattern is <code>while True:</code> with a <code>break</code> "
            "statement inside. The loop runs forever <em>until</em> you explicitly "
            "<code>break</code> out of it. This is ideal when you do not know the "
            "stopping condition in advance.</p>"
        ),

        code_example("Input loop with break",
            'while True:\n'
            '    user_input = input("Enter a number (or \'quit\'): ")\n'
            '\n'
            '    if user_input.lower() == "quit":\n'
            '        print("Goodbye!")\n'
            '        break\n'
            '\n'
            '    try:\n'
            '        number = float(user_input)\n'
            '        print(f"Double: {number * 2}")\n'
            '    except ValueError:\n'
            '        print("That\'s not a number. Try again.")',
            explanation="This is the <strong>sentinel value pattern</strong>: the loop keeps "
            "running until a special value (the sentinel) is entered. Here, \"quit\" is "
            "the sentinel."
        ),

        section("The sentinel value pattern"),

        concept("Keep going until a signal",
            "<p>A <strong>sentinel value</strong> is a special input that tells the loop to stop. "
            "Common sentinels: \"quit\", \"exit\", \"done\", -1, empty string, etc.</p>"
        ),

        code_example("Collecting data until done",
            'print("Enter student scores. Type \'done\' when finished.")\n'
            '\n'
            'scores = []\n'
            '\n'
            'while True:\n'
            '    entry = input("Score: ").strip()\n'
            '\n'
            '    if entry.lower() == "done":\n'
            '        break\n'
            '\n'
            '    try:\n'
            '        score = float(entry)\n'
            '        if 0 <= score <= 100:\n'
            '            scores.append(score)\n'
            '            print(f"  Added. ({len(scores)} scores so far)")\n'
            '        else:\n'
            '            print("  Score must be 0-100.")\n'
            '    except ValueError:\n'
            '        print("  Invalid number.")\n'
            '\n'
            'if scores:\n'
            '    average = sum(scores) / len(scores)\n'
            '    print(f"\\nAverage: {average:.1f}")\n'
            '    print(f"Highest: {max(scores)}")\n'
            '    print(f"Lowest: {min(scores)}")\n'
            'else:\n'
            '    print("\\nNo scores entered.")',
            explanation="This pattern is everywhere in real programs: collect input until the user "
            "signals they are done, then process the collected data."
        ),

        section("continue — skip this iteration"),

        concept("Skipping ahead",
            "<p>The <code>continue</code> statement skips the rest of the current iteration "
            "and jumps back to the condition check. The loop does not end &mdash; it just "
            "moves on to the next pass.</p>"
        ),

        code_example("Using continue",
            '# Print only even numbers\n'
            'for i in range(1, 11):\n'
            '    if i % 2 != 0:\n'
            '        continue   # skip odd numbers\n'
            '    print(i, end=" ")\n'
            'print()',
            output="2 4 6 8 10",
            explanation="When <code>i</code> is odd, <code>continue</code> skips the "
            "<code>print()</code> and goes to the next iteration."
        ),

        code_example("Skipping invalid input in a loop",
            'raw_data = ["10", "abc", "25", "", "30", "xyz", "15"]\n'
            '\n'
            'total = 0\n'
            'valid_count = 0\n'
            '\n'
            'for item in raw_data:\n'
            '    if not item:             # skip empty strings\n'
            '        continue\n'
            '    try:\n'
            '        value = float(item)\n'
            '    except ValueError:\n'
            '        print(f"  Skipping invalid: {item}")\n'
            '        continue\n'
            '    total += value\n'
            '    valid_count += 1\n'
            '\n'
            'print(f"Sum of {valid_count} valid items: {total}")',
            output="  Skipping invalid: abc\n  Skipping invalid: xyz\nSum of 4 valid items: 80.0",
        ),

        section("Counter-controlled while loops"),

        concept("Limiting attempts",
            "<p>Combine a counter with a while loop to limit the number of tries. "
            "This is essential for security features like login attempts.</p>"
        ),

        code_example("Limited attempts pattern",
            'MAX_ATTEMPTS = 3\n'
            'correct_pin = "1234"\n'
            'attempts = 0\n'
            '\n'
            'while attempts < MAX_ATTEMPTS:\n'
            '    pin = input(f"Enter PIN (attempt {attempts + 1}/{MAX_ATTEMPTS}): ")\n'
            '    attempts += 1\n'
            '\n'
            '    if pin == correct_pin:\n'
            '        print("Access granted!")\n'
            '        break\n'
            '    else:\n'
            '        remaining = MAX_ATTEMPTS - attempts\n'
            '        if remaining > 0:\n'
            '            print(f"Wrong PIN. {remaining} attempts left.")\n'
            'else:\n'
            '    # This else belongs to the while loop, not the if!\n'
            '    print("Account locked. Too many failed attempts.")',
            explanation="The <code>else</code> on a <code>while</code> loop runs "
            "only if the loop completed normally (without <code>break</code>). "
            "If the user enters the correct PIN, <code>break</code> runs and the "
            "else is skipped."
        ),

        section("The do-while equivalent"),

        concept("Running at least once",
            "<p>Some languages have a <code>do-while</code> loop that runs the body first, "
            "then checks the condition. Python does not have this, but you can emulate it:</p>"
        ),

        code_example("Emulating do-while",
            '# Pattern 1: while True with break at the bottom\n'
            'while True:\n'
            '    number = input("Enter a positive number: ")\n'
            '    try:\n'
            '        number = int(number)\n'
            '        if number > 0:\n'
            '            break\n'
            '    except ValueError:\n'
            '        pass\n'
            '    print("Invalid. Try again.")\n'
            '\n'
            'print(f"You entered: {number}")\n'
            '\n'
            '# Pattern 2: flag variable\n'
            'valid = False\n'
            'while not valid:\n'
            '    age = input("Enter your age: ")\n'
            '    if age.isdigit() and 0 < int(age) < 150:\n'
            '        age = int(age)\n'
            '        valid = True\n'
            '    else:\n'
            '        print("Please enter a valid age.")\n'
            '\n'
            'print(f"Your age: {age}")',
            explanation="Both patterns guarantee the body runs at least once. "
            "Pattern 1 (<code>while True</code> + <code>break</code>) is more common."
        ),

        section("Loop patterns summary"),

        code_example("When to use which loop",
            '# FOR loop: when you know the number of iterations\n'
            'for i in range(10):\n'
            '    print(i)\n'
            '\n'
            '# WHILE loop: when you DON\'T know how many iterations\n'
            'user = ""\n'
            'while user != "quit":\n'
            '    user = input("Command: ")\n'
            '\n'
            '# WHILE TRUE + BREAK: for complex exit conditions\n'
            'while True:\n'
            '    data = get_data()    # hypothetical function\n'
            '    if data is None:\n'
            '        break\n'
            '    process(data)        # hypothetical function',
            explanation="Choose the right loop for the job. <code>for</code> when you iterate "
            "over something concrete. <code>while</code> when you wait for a condition change."
        ),

        try_it("Write a while loop that asks the user to guess a secret word. Give hints like 'too short' or 'wrong first letter'."),

        section("Exercises"),

        exercise("starter", "Number guessing game",
            "Generate a random number between 1 and 50 (<code>import random</code>, "
            "<code>secret = random.randint(1, 50)</code>). Ask the user to guess. "
            "After each guess, print \"Too high!\", \"Too low!\", or \"Correct!\". "
            "Count the number of guesses and print it when they win.",
            hint="Use <code>while True</code> with a <code>break</code> when they guess correctly. "
            "Increment a counter each loop."
        ),

        exercise("medium", "PIN entry with 3 attempts",
            "Create a PIN verification system. The correct PIN is \"2580\". "
            "The user gets 3 attempts. After each wrong attempt, show how many are left. "
            "After 3 failures, print \"Account locked for 30 minutes.\" "
            "If they succeed, print \"Welcome back!\" and show which attempt it was. "
            "Add a twist: also accept \"0000\" as a master override PIN.",
            hint="Use a counter and <code>while attempts &lt; 3</code>. "
            "Check <code>if pin == correct_pin or pin == \"0000\"</code>. "
            "Use the <code>while...else</code> pattern for the lock message."
        ),

        exercise("real-world", "Menu-driven calculator",
            "Build a calculator with a menu loop:<br>"
            "(1) Add, (2) Subtract, (3) Multiply, (4) Divide, "
            "(5) History, (6) Clear history, (7) Quit<br>"
            "After each operation, store the expression and result in a history list "
            "(e.g., <code>\"5 + 3 = 8\"</code>). For divide, handle division by zero. "
            "The History option shows all past calculations numbered. "
            "Use <code>while True</code> with <code>break</code> on quit.",
            hint="Use <code>history = []</code>. After each calculation, do "
            "<code>history.append(f\"{a} + {b} = {result}\")</code>. "
            "For history display, use <code>enumerate(history, 1)</code>."
        ),

        mistakes([
            ("Infinite loop: forgetting to update the condition variable",
             "<code>while count &lt; 10:</code> without <code>count += 1</code> "
             "runs forever. Always make sure something changes inside the loop."),
            ("Off-by-one: using <code>&lt;</code> vs <code>&lt;=</code>",
             "<code>while count &lt; 3</code> runs 3 times (0, 1, 2). "
             "<code>while count &lt;= 3</code> runs 4 times (0, 1, 2, 3). Be precise."),
            ("Using <code>break</code> when restructuring the condition would be cleaner",
             "If your loop is <code>while True: ... if done: break</code> "
             "and the check is simple, consider <code>while not done:</code> instead."),
            ("Confusing <code>break</code> and <code>continue</code>",
             "<code>break</code> exits the loop entirely. <code>continue</code> skips "
             "to the next iteration. They are very different."),
            ("Not understanding <code>while...else</code>",
             "The <code>else</code> runs when the <code>while</code> condition becomes False, "
             "NOT when the loop breaks. If <code>break</code> runs, the <code>else</code> is skipped."),
        ]),

        pro_tips([
            "<strong>Prefer <code>for</code> when possible.</strong> It is safer "
            "(no infinite loop risk) and more readable. Use <code>while</code> only "
            "when the number of iterations is truly unknown.",
            "<strong>Always ask:</strong> \"What makes this loop stop?\" If you cannot answer "
            "clearly, you have a potential infinite loop.",
            "<strong>Use <code>while True</code> + <code>break</code></strong> for user input loops. "
            "It is the most common and most readable pattern.",
            "<strong>Debug infinite loops</strong> by adding <code>print()</code> statements inside "
            "the loop to see what is happening. Press Ctrl+C to stop a runaway program.",
        ]),

        recap([
            "<code>while condition:</code> repeats as long as the condition is True",
            "<code>while True:</code> + <code>break</code> for complex exit conditions",
            "<code>break</code> exits the loop; <code>continue</code> skips to the next iteration",
            "Sentinel value pattern: loop until a special input is received",
            "Counter-controlled loops: limit attempts with a counter variable",
            "<code>while...else</code>: the else runs only if no <code>break</code> occurred",
        ]),
    ])
