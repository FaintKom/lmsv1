"""Module 1, Lesson 6: Project — CLI Budget Tracker."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Project: CLI Budget Tracker",
            "Build a complete command-line budget tracker using everything you have learned in Module 1.",
        ),

        why_it_matters(
            "<p>This is your capstone project. You will combine variables, strings, "
            "numbers, input, and f-strings into a real program that you can actually use. "
            "Building something complete &mdash; even if small &mdash; is how you cement "
            "your skills and build confidence.</p>"
        ),

        section("What we are building"),

        concept("Budget tracker features",
            "<p>Our CLI budget tracker will support:</p>"
            "<ul>"
            "<li><strong>Add income</strong> &mdash; record money coming in</li>"
            "<li><strong>Add expense</strong> &mdash; record money going out</li>"
            "<li><strong>Show balance</strong> &mdash; see your current balance</li>"
            "<li><strong>Show summary</strong> &mdash; see a breakdown of all transactions</li>"
            "<li><strong>Quit</strong> &mdash; exit the program</li>"
            "</ul>"
            "<p>We will build it step by step, testing as we go.</p>"
        ),

        section("Step 1: The menu system"),

        code_example("A simple menu loop",
            'print("=" * 40)\n'
            'print("     BUDGET TRACKER v1.0")\n'
            'print("=" * 40)\n'
            '\n'
            'while True:\n'
            '    print("\\n--- Menu ---")\n'
            '    print("1. Add income")\n'
            '    print("2. Add expense")\n'
            '    print("3. Show balance")\n'
            '    print("4. Show summary")\n'
            '    print("5. Quit")\n'
            '\n'
            '    choice = input("\\nChoose an option (1-5): ").strip()\n'
            '\n'
            '    if choice == "1":\n'
            '        print("(Add income - coming next)")\n'
            '    elif choice == "2":\n'
            '        print("(Add expense - coming next)")\n'
            '    elif choice == "3":\n'
            '        print("(Show balance - coming next)")\n'
            '    elif choice == "4":\n'
            '        print("(Show summary - coming next)")\n'
            '    elif choice == "5":\n'
            '        print("Goodbye!")\n'
            '        break\n'
            '    else:\n'
            '        print("Invalid choice. Please enter 1-5.")',
            explanation="Start with the skeleton. The <code>while True</code> loop keeps the program "
            "running until the user types 5. Each option is a placeholder we will fill in."
        ),

        section("Step 2: Data storage with lists"),

        concept("Storing transactions",
            "<p>We need to keep track of every transaction. For now, we will use simple lists. "
            "Each transaction has a description, an amount, and a type (income or expense).</p>"
        ),

        code_example("Setting up storage variables",
            '# Storage: parallel lists\n'
            'descriptions = []    # ["Salary", "Groceries", ...]\n'
            'amounts = []         # [3000.00, -85.50, ...]\n'
            'types = []           # ["income", "expense", ...]\n'
            'balance = 0.0',
            explanation="We use negative amounts for expenses and positive for income. "
            "The <code>balance</code> variable tracks the running total."
        ),

        section("Step 3: Adding income"),

        code_example("The add income feature",
            '# Inside the choice == "1" block:\n'
            'description = input("Income description: ").strip()\n'
            'try:\n'
            '    amount = float(input("Amount: $"))\n'
            '    if amount <= 0:\n'
            '        print("Amount must be positive.")\n'
            '    else:\n'
            '        descriptions.append(description)\n'
            '        amounts.append(amount)\n'
            '        types.append("income")\n'
            '        balance += amount\n'
            '        print(f"Added income: {description} (${amount:.2f})")\n'
            '        print(f"New balance: ${balance:.2f}")\n'
            'except ValueError:\n'
            '    print("Invalid amount. Please enter a number.")',
            explanation="We validate the input: it must be a valid number and must be positive. "
            "The <code>.append()</code> method adds an item to the end of a list."
        ),

        section("Step 4: Adding expenses"),

        code_example("The add expense feature",
            '# Inside the choice == "2" block:\n'
            'description = input("Expense description: ").strip()\n'
            'try:\n'
            '    amount = float(input("Amount: $"))\n'
            '    if amount <= 0:\n'
            '        print("Amount must be positive.")\n'
            '    else:\n'
            '        descriptions.append(description)\n'
            '        amounts.append(-amount)   # negative for expenses\n'
            '        types.append("expense")\n'
            '        balance -= amount\n'
            '        print(f"Added expense: {description} (${amount:.2f})")\n'
            '        print(f"New balance: ${balance:.2f}")\n'
            'except ValueError:\n'
            '    print("Invalid amount. Please enter a number.")',
            explanation="Nearly identical to income, but the amount is stored as negative "
            "and subtracted from the balance."
        ),

        section("Step 5: Show balance"),

        code_example("Displaying the balance",
            '# Inside the choice == "3" block:\n'
            'print(f"\\nCurrent balance: ${balance:.2f}")\n'
            'if balance > 0:\n'
            '    print("You are in the green!")\n'
            'elif balance < 0:\n'
            '    print("Warning: You are in the red!")\n'
            'else:\n'
            '    print("Your balance is exactly zero.")',
            explanation="A simple feature, but the conditional messages make it more useful "
            "than just printing a number."
        ),

        section("Step 6: Show summary"),

        code_example("Formatted transaction summary",
            '# Inside the choice == "4" block:\n'
            'if not descriptions:\n'
            '    print("\\nNo transactions yet.")\n'
            'else:\n'
            '    total_income = sum(a for a in amounts if a > 0)\n'
            '    total_expenses = sum(a for a in amounts if a < 0)\n'
            '    num_transactions = len(descriptions)\n'
            '\n'
            '    print(f"\\n{\'=\' * 50}")\n'
            '    print(f"{\'BUDGET SUMMARY\':^50}")\n'
            '    print(f"{\'=\' * 50}")\n'
            '\n'
            '    print(f"\\n{\'#\':<5} {\'Type\':<10} {\'Description\':<20} {\'Amount\':>10}")\n'
            '    print(f"{\'-\' * 50}")\n'
            '\n'
            '    for i in range(num_transactions):\n'
            '        sign = "+" if amounts[i] > 0 else "-"\n'
            '        abs_amount = abs(amounts[i])\n'
            '        print(f"{i+1:<5} {types[i]:<10} {descriptions[i]:<20} "\n'
            '              f"{sign}${abs_amount:>8.2f}")\n'
            '\n'
            '    print(f"{\'-\' * 50}")\n'
            '    print(f"Total income:   ${total_income:>10.2f}")\n'
            '    print(f"Total expenses: ${abs(total_expenses):>10.2f}")\n'
            '    print(f"Net balance:    ${balance:>10.2f}")\n'
            '    print(f"Transactions:   {num_transactions:>10}")\n'
            '    print(f"{\'=\' * 50}")',
            explanation="This is the most complex part. We use f-string alignment to create "
            "a clean, readable table. The <code>sum()</code> with a generator expression "
            "calculates totals for income and expenses separately."
        ),

        section("Step 7: The complete program"),

        code_example("Full budget tracker",
            '# === CLI Budget Tracker ===\n'
            '\n'
            '# Storage\n'
            'descriptions = []\n'
            'amounts = []\n'
            'types = []\n'
            'balance = 0.0\n'
            '\n'
            'print("=" * 40)\n'
            'print("     BUDGET TRACKER v1.0")\n'
            'print("=" * 40)\n'
            '\n'
            'while True:\n'
            '    print("\\n--- Menu ---")\n'
            '    print("1. Add income")\n'
            '    print("2. Add expense")\n'
            '    print("3. Show balance")\n'
            '    print("4. Show summary")\n'
            '    print("5. Quit")\n'
            '\n'
            '    choice = input("\\nChoose (1-5): ").strip()\n'
            '\n'
            '    if choice == "1":\n'
            '        desc = input("Description: ").strip()\n'
            '        try:\n'
            '            amt = float(input("Amount: $"))\n'
            '            if amt <= 0:\n'
            '                print("Amount must be positive.")\n'
            '            else:\n'
            '                descriptions.append(desc)\n'
            '                amounts.append(amt)\n'
            '                types.append("income")\n'
            '                balance += amt\n'
            '                print(f"Added: {desc} (+${amt:.2f})")\n'
            '        except ValueError:\n'
            '            print("Invalid amount.")\n'
            '\n'
            '    elif choice == "2":\n'
            '        desc = input("Description: ").strip()\n'
            '        try:\n'
            '            amt = float(input("Amount: $"))\n'
            '            if amt <= 0:\n'
            '                print("Amount must be positive.")\n'
            '            else:\n'
            '                descriptions.append(desc)\n'
            '                amounts.append(-amt)\n'
            '                types.append("expense")\n'
            '                balance -= amt\n'
            '                print(f"Added: {desc} (-${amt:.2f})")\n'
            '        except ValueError:\n'
            '            print("Invalid amount.")\n'
            '\n'
            '    elif choice == "3":\n'
            '        print(f"\\nBalance: ${balance:.2f}")\n'
            '\n'
            '    elif choice == "4":\n'
            '        if not descriptions:\n'
            '            print("\\nNo transactions yet.")\n'
            '        else:\n'
            '            inc = sum(a for a in amounts if a > 0)\n'
            '            exp = sum(a for a in amounts if a < 0)\n'
            '            print(f"\\n{\'=\' * 48}")\n'
            '            print(f"{\'BUDGET SUMMARY\':^48}")\n'
            '            print(f"{\'=\' * 48}")\n'
            '            print(f"{\'#\':<4} {\'Type\':<9} {\'Description\':<18} {\'Amount\':>12}")\n'
            '            print(f"{\'-\' * 48}")\n'
            '            for i in range(len(descriptions)):\n'
            '                s = "+" if amounts[i] > 0 else "-"\n'
            '                a = abs(amounts[i])\n'
            '                print(f"{i+1:<4} {types[i]:<9} "\n'
            '                      f"{descriptions[i]:<18} {s}${a:>10.2f}")\n'
            '            print(f"{\'-\' * 48}")\n'
            '            print(f"Income:   ${inc:>10.2f}")\n'
            '            print(f"Expenses: ${abs(exp):>10.2f}")\n'
            '            print(f"Balance:  ${balance:>10.2f}")\n'
            '            print(f"{\'=\' * 48}")\n'
            '\n'
            '    elif choice == "5":\n'
            '        print("\\nGoodbye! Stay on budget!")\n'
            '        break\n'
            '\n'
            '    else:\n'
            '        print("Invalid choice. Enter 1-5.")',
            explanation="This is the complete, working budget tracker. Copy it, run it, "
            "and try adding a few transactions. Then look at the summary &mdash; "
            "it should feel like a real tool."
        ),

        section("Sample session"),

        code_example("What a session looks like",
            '# ========================================\n'
            '#      BUDGET TRACKER v1.0\n'
            '# ========================================\n'
            '#\n'
            '# --- Menu ---\n'
            '# 1. Add income\n'
            '# 2. Add expense\n'
            '# 3. Show balance\n'
            '# 4. Show summary\n'
            '# 5. Quit\n'
            '#\n'
            '# Choose (1-5): 1\n'
            '# Description: Salary\n'
            '# Amount: $3000\n'
            '# Added: Salary (+$3000.00)\n'
            '#\n'
            '# Choose (1-5): 2\n'
            '# Description: Rent\n'
            '# Amount: $1200\n'
            '# Added: Rent (-$1200.00)\n'
            '#\n'
            '# Choose (1-5): 2\n'
            '# Description: Groceries\n'
            '# Amount: $185.50\n'
            '# Added: Groceries (-$185.50)\n'
            '#\n'
            '# Choose (1-5): 4\n'
            '#\n'
            '# ================================================\n'
            '#                  BUDGET SUMMARY\n'
            '# ================================================\n'
            '# #    Type      Description        Amount\n'
            '# ------------------------------------------------\n'
            '# 1    income    Salary             +$   3000.00\n'
            '# 2    expense   Rent               -$   1200.00\n'
            '# 3    expense   Groceries          -$    185.50\n'
            '# ------------------------------------------------\n'
            '# Income:   $   3000.00\n'
            '# Expenses: $   1385.50\n'
            '# Balance:  $   1614.50\n'
            '# ================================================',
            explanation="This is what you should see when running the program. "
            "Try it yourself and add your own transactions."
        ),

        try_it("Copy the complete program above, run it, and track your spending for a day."),

        section("Extension ideas"),

        concept("Taking it further",
            "<p>Once the basic tracker works, here are ideas to make it more powerful. "
            "Some use concepts from future modules (marked with the module number):</p>"
            "<ul>"
            "<li><strong>Categories</strong> &mdash; add a category field (Food, Transport, Bills, etc.) "
            "and show spending by category in the summary</li>"
            "<li><strong>Date tracking</strong> &mdash; record the date for each transaction and show "
            "daily/weekly totals</li>"
            "<li><strong>Budget limits</strong> &mdash; set a monthly budget and warn when approaching the limit</li>"
            "<li><strong>Save to file</strong> (Module 3) &mdash; write transactions to a CSV file so they persist "
            "between program runs</li>"
            "<li><strong>Load from file</strong> (Module 3) &mdash; read previous transactions when the program starts</li>"
            "<li><strong>Data validation</strong> (Module 2) &mdash; use functions to validate all input fields</li>"
            "<li><strong>Statistics</strong> &mdash; average transaction size, largest expense, most common category</li>"
            "</ul>"
        ),

        section("Exercises"),

        exercise("starter", "Add a category field",
            "Modify the budget tracker to ask for a category when adding income or expenses. "
            "Store categories in a new list. Show the category in the summary table. "
            "Use categories like: Salary, Freelance, Food, Transport, Bills, Entertainment.",
            hint="Add <code>categories = []</code> to your storage variables. "
            "Ask <code>category = input(\"Category: \").strip()</code> and "
            "<code>categories.append(category)</code>."
        ),

        exercise("medium", "Spending by category",
            "After adding categories, create a new menu option (option 6) that shows "
            "total spending by category. Output should look like:<br>"
            "<code>Spending by Category:<br>"
            "  Food:          $285.50<br>"
            "  Transport:     $120.00<br>"
            "  Bills:         $1200.00<br>"
            "  Entertainment: $45.99</code><br>"
            "Use a loop to find unique categories and sum their amounts.",
            hint="Get unique categories with <code>unique = list(set(categories))</code>. "
            "Then for each unique category, sum the amounts where the category matches."
        ),

        exercise("medium", "Budget warning system",
            "Add a monthly budget limit. When the program starts, ask: "
            "<em>Set your monthly budget: $</em>. After each expense, check if total expenses "
            "exceed 80% of the budget (yellow warning) or 100% (red warning). "
            "Show the remaining budget in the balance display.",
            hint="Track <code>budget = float(input(...))</code>. After each expense, "
            "compare <code>abs(total_expenses)</code> to <code>budget * 0.8</code> and <code>budget</code>."
        ),

        exercise("real-world", "Enhanced budget tracker",
            "Combine all the extensions: categories, budget limits, and spending-by-category. "
            "Add a formatted header that shows the date and budget status. "
            "Make the summary show a simple bar chart for each category using "
            "repeated characters. For example:<br>"
            "<code>Food:   $285 |========        | 19%<br>"
            "Rent:  $1200 |================================| 80%</code>",
            hint="For the bar chart, calculate <code>pct = amount / budget</code>, "
            "then <code>bar_len = int(pct * 32)</code>, and use "
            "<code>f\"|{'=' * bar_len}{' ' * (32 - bar_len)}|\"</code>."
        ),

        mistakes([
            ("Not validating input",
             "Users will type letters when you expect numbers. Always wrap "
             "<code>float(input(...))</code> in a <code>try/except</code>."),
            ("Allowing negative amounts for income/expenses",
             "Check <code>if amount <= 0</code> and ask again. Negative income makes no sense."),
            ("Mixing up income and expense signs",
             "Pick a convention and stick to it. We store income as positive and expenses "
             "as negative. All display logic must handle the sign correctly."),
            ("Not handling the empty-list case",
             "Calling <code>sum()</code> on an empty list returns 0, which is fine. "
             "But displaying an empty table looks broken. Always check <code>if not descriptions</code>."),
        ]),

        pro_tips([
            "<strong>Build incrementally.</strong> Get the menu working first, then add one feature "
            "at a time. Test after every change.",
            "<strong>Use constants for formatting.</strong> Define <code>WIDTH = 48</code> once, then use "
            "<code>\"=\" * WIDTH</code> everywhere. Changing the width later takes one edit.",
            "<strong>Refactor when you see duplication.</strong> The income and expense handlers are almost "
            "identical. In Module 2, you will learn to extract them into a function.",
            "<strong>This is real code.</strong> Professional developers build CLI tools exactly like this. "
            "The only difference is they save data to files or databases instead of lists.",
            "<strong>Show your work.</strong> This project is portfolio-worthy. Add it to your GitHub "
            "with a README that explains what it does.",
        ]),

        recap([
            "Built a complete, interactive CLI program from scratch",
            "Used the Input &rarr; Process &rarr; Output pattern",
            "Combined variables, strings, numbers, input, and f-strings",
            "Validated user input with <code>try/except</code>",
            "Formatted output with f-string alignment into clean tables",
            "Module 1 is complete &mdash; you have all the building blocks",
        ]),
    ])
