"""Generate practice code challenges for Python course.

Each theory lesson gets a companion "Practice" lesson with 10 code
challenges. Challenges are graduated: #1-3 easy, #4-7 medium, #8-10 hard.

RULES:
- Each challenge uses ONLY concepts from the current lesson and prior ones
- Starter code must be valid Python (no SyntaxError on Run)
- Multiple test cases per challenge (at least 2, edge cases included)
- Description is clear and unambiguous
- Expected output matches exactly what Python would print

Usage:
    docker exec -e DB_URL=... lms-backend-1 python -m python_course.practice_challenges
"""
from __future__ import annotations

import json
import os
import sys
import uuid
from datetime import datetime, timezone

import psycopg


# ── Challenge definitions ────────────────────────────────────────────
# Key: theory lesson title substring
# Value: list of 10 challenges, each with:
#   title, description, starter_code, test_cases: [{input, expected_output}]
#
# test_cases.input is what gets piped to stdin (empty for no-input challenges)

PRACTICE = {
    "Variables & Data Types": [
        # --- Easy (1-3) ---
        {
            "title": "Hello Variable",
            "description": "Create a variable called `greeting` with the value \"Hello, World!\" and print it.",
            "starter_code": "# Create the variable and print it\n",
            "test_cases": [
                {"input": "", "expected_output": "Hello, World!"},
            ],
        },
        {
            "title": "Sum of Two",
            "description": "Create two variables: `a = 15` and `b = 27`. Create a third variable `total` that stores their sum. Print the value of `total`.",
            "starter_code": "# Create variables and calculate\n",
            "test_cases": [
                {"input": "", "expected_output": "42"},
            ],
        },
        {
            "title": "Type Check",
            "description": "Create a variable `x = 3.14`. Print its type using the `type()` function.",
            "starter_code": "# Create variable and print its type\n",
            "test_cases": [
                {"input": "", "expected_output": "<class 'float'>"},
            ],
        },
        # --- Medium (4-7) ---
        {
            "title": "Rectangle Area",
            "description": "Create variables `width = 8` and `height = 5`. Calculate the area and perimeter. Print them on separate lines:\n- First line: the area\n- Second line: the perimeter",
            "starter_code": "width = 8\nheight = 5\n\n# Calculate and print area, then perimeter\n",
            "test_cases": [
                {"input": "", "expected_output": "40\n26"},
            ],
        },
        {
            "title": "Temperature Display",
            "description": "Create a variable `celsius = 100`. Convert it to Fahrenheit using the formula: F = C * 9/5 + 32. Print both values with labels:\n`Celsius: 100`\n`Fahrenheit: 212.0`",
            "starter_code": "celsius = 100\n\n# Convert and print with labels\n",
            "test_cases": [
                {"input": "", "expected_output": "Celsius: 100\nFahrenheit: 212.0"},
            ],
        },
        {
            "title": "Swap Values",
            "description": "You have two variables: `x = 10` and `y = 20`. Swap their values so that x becomes 20 and y becomes 10. Then print x and y on separate lines.",
            "starter_code": "x = 10\ny = 20\n\n# Swap the values\n\nprint(x)\nprint(y)\n",
            "test_cases": [
                {"input": "", "expected_output": "20\n10"},
            ],
        },
        {
            "title": "Bill Splitter",
            "description": "Create variables: `bill = 84.60` and `people = 4`. Calculate how much each person pays (divide bill by people) and print the result rounded to 2 decimal places.",
            "starter_code": "bill = 84.60\npeople = 4\n\n# Calculate and print per person amount\n",
            "test_cases": [
                {"input": "", "expected_output": "21.15"},
            ],
        },
        # --- Hard (8-10) ---
        {
            "title": "Multiple Types",
            "description": "Create these variables:\n- `name = \"Python\"`\n- `version = 3`\n- `rating = 9.8`\n- `is_free = True`\n\nPrint each variable's type on a separate line (4 lines total).",
            "starter_code": "# Create all 4 variables\n\n# Print type of each\n",
            "test_cases": [
                {"input": "", "expected_output": "<class 'str'>\n<class 'int'>\n<class 'float'>\n<class 'bool'>"},
            ],
        },
        {
            "title": "Seconds Converter",
            "description": "Create a variable `total_seconds = 7384`. Calculate how many full hours, remaining minutes, and remaining seconds this represents. Print in the format:\n`2 hours, 3 minutes, 4 seconds`\n\nHint: use integer division `//` and modulo `%`.",
            "starter_code": "total_seconds = 7384\n\n# Calculate hours, minutes, seconds\n\n# Print in the required format\n",
            "test_cases": [
                {"input": "", "expected_output": "2 hours, 3 minutes, 4 seconds"},
            ],
        },
        {
            "title": "Distance Calculator",
            "description": "Two points are given: `x1, y1 = 1, 2` and `x2, y2 = 4, 6`. Calculate the distance between them using the formula:\n\ndistance = ((x2-x1)**2 + (y2-y1)**2) ** 0.5\n\nPrint the result rounded to 2 decimal places.",
            "starter_code": "x1, y1 = 1, 2\nx2, y2 = 4, 6\n\n# Calculate distance and print rounded to 2 decimals\n",
            "test_cases": [
                {"input": "", "expected_output": "5.0"},
            ],
        },
    ],

    "Strings & F-Strings": [
        {
            "title": "Reverse a String",
            "description": "Create a variable `text = \"Python\"`. Print the string reversed.",
            "starter_code": "text = \"Python\"\n\n# Print reversed\n",
            "test_cases": [{"input": "", "expected_output": "nohtyP"}],
        },
        {
            "title": "Count Vowels",
            "description": "Create `word = \"education\"`. Count how many vowels (a, e, i, o, u) it contains. Print just the count number.",
            "starter_code": "word = \"education\"\ncount = 0\n\n# Count vowels using a for loop\n\nprint(count)\n",
            "test_cases": [{"input": "", "expected_output": "5"}],
        },
        {
            "title": "Initials",
            "description": "Given `full_name = \"John Michael Smith\"`, extract and print the initials as \"J.M.S.\"",
            "starter_code": "full_name = \"John Michael Smith\"\n\n# Extract initials\n",
            "test_cases": [{"input": "", "expected_output": "J.M.S."}],
        },
        {
            "title": "Email Builder",
            "description": "Given `first = \"Alice\"` and `last = \"Johnson\"`, create an email address in the format `alice.johnson@company.com` (all lowercase) and print it.",
            "starter_code": "first = \"Alice\"\nlast = \"Johnson\"\n\n# Build email\n",
            "test_cases": [{"input": "", "expected_output": "alice.johnson@company.com"}],
        },
        {
            "title": "Word Replace",
            "description": "Given `sentence = \"I love Java programming\"`, replace \"Java\" with \"Python\" and print the result.",
            "starter_code": "sentence = \"I love Java programming\"\n\n# Replace and print\n",
            "test_cases": [{"input": "", "expected_output": "I love Python programming"}],
        },
        {
            "title": "String Stats",
            "description": "Given `text = \"Hello World\"`, print three lines:\n1. The length of the string\n2. The string in uppercase\n3. The string in lowercase",
            "starter_code": "text = \"Hello World\"\n\n# Print length, uppercase, lowercase\n",
            "test_cases": [{"input": "", "expected_output": "11\nHELLO WORLD\nhello world"}],
        },
        {
            "title": "Center Text",
            "description": "Given `title = \"MENU\"`, center it within 20 characters using dashes as fill. Print the result.\nExpected: `--------MENU--------`",
            "starter_code": "title = \"MENU\"\n\n# Center within 20 chars with dashes\n",
            "test_cases": [{"input": "", "expected_output": "--------MENU--------"}],
        },
        {
            "title": "Slice and Dice",
            "description": "Given `data = \"2026-04-10\"`, extract and print:\n1. The year (first 4 characters)\n2. The month (characters 5-6)\n3. The day (last 2 characters)\nEach on a separate line.",
            "starter_code": "data = \"2026-04-10\"\n\n# Extract and print year, month, day\n",
            "test_cases": [{"input": "", "expected_output": "2026\n04\n10"}],
        },
        {
            "title": "Password Mask",
            "description": "Given `password = \"secret123\"`, create a masked version that shows only the first and last characters, with asterisks in between. Print it.\nExpected: `s*******3`",
            "starter_code": "password = \"secret123\"\n\n# Create masked version\n",
            "test_cases": [{"input": "", "expected_output": "s*******3"}],
        },
        {
            "title": "CSV Line Parser",
            "description": "Given `csv_line = \"Alice,28,New York,Engineer\"`, split it by commas and print each field on a separate line with its position number:\n```\n1: Alice\n2: 28\n3: New York\n4: Engineer\n```",
            "starter_code": "csv_line = \"Alice,28,New York,Engineer\"\n\n# Split and print with position numbers\n",
            "test_cases": [{"input": "", "expected_output": "1: Alice\n2: 28\n3: New York\n4: Engineer"}],
        },
    ],

    # ── Module 1 (remaining) ────────────────────────────────────────

    "Numbers & Math": [
        # --- Easy (1-3) ---
        {
            "title": "Basic Addition",
            "description": "Create two variables `a = 17` and `b = 25`. Print their sum.",
            "starter_code": "a = 17\nb = 25\n\n# Print the sum\n",
            "test_cases": [{"input": "", "expected_output": "42"}],
        },
        {
            "title": "Integer Division",
            "description": "Create `x = 17` and `y = 5`. Print the result of integer division (floor division) of x by y.",
            "starter_code": "x = 17\ny = 5\n\n# Print integer division result\n",
            "test_cases": [{"input": "", "expected_output": "3"}],
        },
        {
            "title": "Remainder",
            "description": "Create `x = 17` and `y = 5`. Print the remainder when x is divided by y.",
            "starter_code": "x = 17\ny = 5\n\n# Print the remainder\n",
            "test_cases": [{"input": "", "expected_output": "2"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Power Calculator",
            "description": "Create `base = 2` and `exponent = 10`. Print the result of raising base to the power of exponent.",
            "starter_code": "base = 2\nexponent = 10\n\n# Print the result\n",
            "test_cases": [{"input": "", "expected_output": "1024"}],
        },
        {
            "title": "Circle Area",
            "description": "Create `radius = 7`. Calculate the area of a circle using pi = 3.14159. Print the result rounded to 2 decimal places.",
            "starter_code": "radius = 7\npi = 3.14159\n\n# Calculate area and print rounded to 2 decimals\n",
            "test_cases": [{"input": "", "expected_output": "153.94"}],
        },
        {
            "title": "Even or Odd Checker",
            "description": "Create `num = 42`. Use the modulo operator to determine if it is even or odd. Print \"even\" or \"odd\".",
            "starter_code": "num = 42\n\n# Check even or odd and print\n",
            "test_cases": [{"input": "", "expected_output": "even"}],
        },
        {
            "title": "Average of Three",
            "description": "Create `a = 85`, `b = 92`, `c = 78`. Calculate the average and print it rounded to 1 decimal place.",
            "starter_code": "a = 85\nb = 92\nc = 78\n\n# Calculate average and print rounded to 1 decimal\n",
            "test_cases": [{"input": "", "expected_output": "85.0"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Digit Sum",
            "description": "Create `number = 9473`. Calculate the sum of its digits (9+4+7+3) using math operations only (no string conversion). Print the sum.\n\nHint: use `%` to extract digits and `//` to remove them.",
            "starter_code": "number = 9473\n\n# Calculate sum of digits using math\n",
            "test_cases": [{"input": "", "expected_output": "23"}],
        },
        {
            "title": "Compound Interest",
            "description": "Create `principal = 1000`, `rate = 0.05`, `years = 3`. Calculate compound interest using the formula:\n\namount = principal * (1 + rate) ** years\n\nPrint the final amount rounded to 2 decimal places.",
            "starter_code": "principal = 1000\nrate = 0.05\nyears = 3\n\n# Calculate and print\n",
            "test_cases": [{"input": "", "expected_output": "1157.63"}],
        },
        {
            "title": "Number Properties",
            "description": "Create `n = 156`. Print four lines:\n1. The number of digits (3)\n2. The sum of digits (12)\n3. Whether it is divisible by 3 (True or False)\n4. The reversed number as an integer (651)\n\nUse only math operations, no string conversion.",
            "starter_code": "n = 156\n\n# Calculate and print each property\n",
            "test_cases": [{"input": "", "expected_output": "3\n12\nTrue\n651"}],
        },
    ],

    "User Input & Type Conversion": [
        # --- Easy (1-3) ---
        {
            "title": "Greeting",
            "description": "Read a name from input and print `Hello, <name>!`",
            "starter_code": "# Read name and greet\nname = input()\n",
            "test_cases": [{"input": "Alice", "expected_output": "Hello, Alice!"}],
        },
        {
            "title": "Echo Number",
            "description": "Read a number from input, convert it to an integer, and print it doubled.",
            "starter_code": "# Read number, convert, and print doubled\n",
            "test_cases": [{"input": "7", "expected_output": "14"}],
        },
        {
            "title": "Name and Age",
            "description": "Read a name (first line) and an age (second line) from input. Print `Hello, <name>! You are <age>.`",
            "starter_code": "# Read name and age, then print greeting\n",
            "test_cases": [{"input": "Alice\n25", "expected_output": "Hello, Alice! You are 25."}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Sum Two Inputs",
            "description": "Read two numbers from input (one per line), convert them to integers, and print their sum.",
            "starter_code": "# Read two numbers and print their sum\n",
            "test_cases": [{"input": "15\n27", "expected_output": "42"}],
        },
        {
            "title": "Float Average",
            "description": "Read three decimal numbers (one per line). Calculate and print their average rounded to 2 decimal places.",
            "starter_code": "# Read three floats and print average\n",
            "test_cases": [{"input": "3.5\n7.2\n4.8", "expected_output": "5.17"}],
        },
        {
            "title": "Temperature Converter",
            "description": "Read a Celsius temperature from input (can be decimal). Convert to Fahrenheit (F = C * 9/5 + 32) and print the result rounded to 1 decimal place.",
            "starter_code": "# Read Celsius and print Fahrenheit\n",
            "test_cases": [{"input": "37.5", "expected_output": "99.5"}],
        },
        {
            "title": "Type Reporter",
            "description": "Read a value from input. Print three lines:\n1. The value as a string\n2. The value converted to int\n3. The value converted to float",
            "starter_code": "# Read value and print in three types\n",
            "test_cases": [{"input": "42", "expected_output": "42\n42\n42.0"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Receipt Calculator",
            "description": "Read an item name (line 1), price (line 2, float), and quantity (line 3, int). Print:\n`<name> x<quantity> = $<total>`\nwhere total is rounded to 2 decimal places.",
            "starter_code": "# Read item info and print receipt line\n",
            "test_cases": [{"input": "Widget\n9.99\n3", "expected_output": "Widget x3 = $29.97"}],
        },
        {
            "title": "Minutes to Time",
            "description": "Read total minutes as an integer from input. Convert to hours and minutes and print in the format `Xh Ym`.",
            "starter_code": "# Read minutes and convert to hours and minutes\n",
            "test_cases": [{"input": "135", "expected_output": "2h 15m"}],
        },
        {
            "title": "BMI Calculator",
            "description": "Read weight in kg (float, line 1) and height in meters (float, line 2). Calculate BMI = weight / height**2. Print the BMI rounded to 1 decimal place, then on the next line print the category:\n- Below 18.5: Underweight\n- 18.5 to 24.9: Normal\n- 25.0 to 29.9: Overweight\n- 30.0 and above: Obese",
            "starter_code": "# Read weight and height, calculate BMI\n",
            "test_cases": [{"input": "70.0\n1.75", "expected_output": "22.9\nNormal"}],
        },
    ],

    "Your First Real Program": [
        # --- Easy (1-3) ---
        {
            "title": "Tip Calculator",
            "description": "Create `bill = 50.00` and `tip_rate = 0.18`. Calculate the tip and total. Print:\n`Tip: $9.00`\n`Total: $59.00`\nFormat amounts to 2 decimal places.",
            "starter_code": "bill = 50.00\ntip_rate = 0.18\n\n# Calculate and print\n",
            "test_cases": [{"input": "", "expected_output": "Tip: $9.00\nTotal: $59.00"}],
        },
        {
            "title": "Greeting Card",
            "description": "Create `name = \"Sam\"` and `age = 30`. Print a greeting card:\n```\n*****************\n  Happy Birthday!\n  Dear Sam\n  You are 30 today!\n*****************\n```",
            "starter_code": "name = \"Sam\"\nage = 30\n\n# Print the greeting card\n",
            "test_cases": [{"input": "", "expected_output": "*****************\n  Happy Birthday!\n  Dear Sam\n  You are 30 today!\n*****************"}],
        },
        {
            "title": "Unit Price",
            "description": "Create `total_cost = 23.94` and `quantity = 6`. Calculate the unit price and print it formatted to 2 decimal places.",
            "starter_code": "total_cost = 23.94\nquantity = 6\n\n# Calculate and print unit price\n",
            "test_cases": [{"input": "", "expected_output": "3.99"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Pay Calculator",
            "description": "Create `hours = 45` and `rate = 20.00`. Calculate pay with overtime: first 40 hours at normal rate, remaining hours at 1.5x rate. Print the total pay formatted to 2 decimal places.",
            "starter_code": "hours = 45\nrate = 20.00\n\n# Calculate pay with overtime\n",
            "test_cases": [{"input": "", "expected_output": "950.00"}],
        },
        {
            "title": "Savings Goal",
            "description": "Create `goal = 1000`, `saved = 350`, `monthly = 125`. Calculate how many full months are needed to reach the goal and print:\n`Months needed: 6`\n`Final amount: $1100`\n\nUse a variable to track the running total.",
            "starter_code": "goal = 1000\nsaved = 350\nmonthly = 125\n\n# Calculate months needed\n",
            "test_cases": [{"input": "", "expected_output": "Months needed: 6\nFinal amount: $1100"}],
        },
        {
            "title": "Score Report",
            "description": "Create `scores = [85, 92, 78, 95, 88]`. Calculate and print:\n`Count: 5`\n`Total: 438`\n`Average: 87.6`\n`Highest: 95`\n`Lowest: 78`",
            "starter_code": "scores = [85, 92, 78, 95, 88]\n\n# Calculate and print statistics\n",
            "test_cases": [{"input": "", "expected_output": "Count: 5\nTotal: 438\nAverage: 87.6\nHighest: 95\nLowest: 78"}],
        },
        {
            "title": "Shopping List",
            "description": "Create these variables:\n`items = [\"Apples\", \"Bread\", \"Milk\"]`\n`prices = [3.50, 2.75, 4.20]`\n\nPrint a formatted receipt:\n```\nApples     $3.50\nBread      $2.75\nMilk       $4.20\n-----------\nTotal:    $10.45\n```\nUse string formatting to align columns.",
            "starter_code": "items = [\"Apples\", \"Bread\", \"Milk\"]\nprices = [3.50, 2.75, 4.20]\n\n# Print formatted receipt\n",
            "test_cases": [{"input": "", "expected_output": "Apples     $3.50\nBread      $2.75\nMilk       $4.20\n-----------\nTotal:    $10.45"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "GPA Calculator",
            "description": "Create `grades = [\"A\", \"B+\", \"A-\", \"B\", \"A\"]` and `credits = [3, 4, 3, 3, 4]`.\nUse this scale: A=4.0, A-=3.7, B+=3.3, B=3.0.\nCalculate weighted GPA and print it rounded to 2 decimal places.",
            "starter_code": "grades = [\"A\", \"B+\", \"A-\", \"B\", \"A\"]\ncredits = [3, 4, 3, 3, 4]\nscale = {\"A\": 4.0, \"A-\": 3.7, \"B+\": 3.3, \"B\": 3.0}\n\n# Calculate weighted GPA\n",
            "test_cases": [{"input": "", "expected_output": "3.62"}],
        },
        {
            "title": "Loan Payment",
            "description": "Create `principal = 10000`, `annual_rate = 0.06`, `months = 36`.\nCalculate monthly payment using:\nM = P * (r*(1+r)^n) / ((1+r)^n - 1)\nwhere r = annual_rate/12, n = months.\nPrint the monthly payment rounded to 2 decimal places.",
            "starter_code": "principal = 10000\nannual_rate = 0.06\nmonths = 36\n\n# Calculate monthly payment\n",
            "test_cases": [{"input": "", "expected_output": "304.22"}],
        },
        {
            "title": "Multi-Item Receipt",
            "description": "Create:\n`items = [\"Coffee\", \"Sandwich\", \"Cookie\"]`\n`prices = [4.50, 8.75, 2.25]`\n`quantities = [2, 1, 3]`\n`tax_rate = 0.08`\n\nPrint:\n```\nCoffee x2        $9.00\nSandwich x1      $8.75\nCookie x3        $6.75\nSubtotal:       $24.50\nTax:             $1.96\nTotal:          $26.46\n```",
            "starter_code": "items = [\"Coffee\", \"Sandwich\", \"Cookie\"]\nprices = [4.50, 8.75, 2.25]\nquantities = [2, 1, 3]\ntax_rate = 0.08\n\n# Print formatted receipt\n",
            "test_cases": [{"input": "", "expected_output": "Coffee x2        $9.00\nSandwich x1      $8.75\nCookie x3        $6.75\nSubtotal:       $24.50\nTax:             $1.96\nTotal:          $26.46"}],
        },
    ],

    "CLI Budget Tracker": [
        # --- Easy (1-3) ---
        {
            "title": "Track One Expense",
            "description": "Create `budget = 500.00` and `expense = 75.50`. Subtract the expense and print:\n`Remaining: $424.50`",
            "starter_code": "budget = 500.00\nexpense = 75.50\n\n# Calculate and print remaining\n",
            "test_cases": [{"input": "", "expected_output": "Remaining: $424.50"}],
        },
        {
            "title": "Category Total",
            "description": "Create `food = [12.50, 8.75, 15.00, 6.25]`. Calculate the total and print:\n`Food: $42.50`",
            "starter_code": "food = [12.50, 8.75, 15.00, 6.25]\n\n# Calculate total and print\n",
            "test_cases": [{"input": "", "expected_output": "Food: $42.50"}],
        },
        {
            "title": "Budget Status",
            "description": "Create `budget = 200` and `spent = 150`. Calculate the percentage spent and print:\n`Spent: 75.0%`",
            "starter_code": "budget = 200\nspent = 150\n\n# Calculate percentage and print\n",
            "test_cases": [{"input": "", "expected_output": "Spent: 75.0%"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Expense Tracker",
            "description": "Create:\n`expenses = [45.00, 12.50, 67.80, 23.40, 8.90]`\n`budget = 200.00`\n\nPrint:\n`Total spent: $157.60`\n`Remaining: $42.40`\n`Average expense: $31.52`",
            "starter_code": "expenses = [45.00, 12.50, 67.80, 23.40, 8.90]\nbudget = 200.00\n\n# Calculate and print stats\n",
            "test_cases": [{"input": "", "expected_output": "Total spent: $157.60\nRemaining: $42.40\nAverage expense: $31.52"}],
        },
        {
            "title": "Category Breakdown",
            "description": "Create:\n`categories = {\"Food\": 120.50, \"Transport\": 45.00, \"Entertainment\": 35.75}`\n\nPrint each category and its percentage of total spending:\n```\nFood: $120.50 (59.9%)\nTransport: $45.00 (22.4%)\nEntertainment: $35.75 (17.8%)\nTotal: $201.25\n```",
            "starter_code": "categories = {\"Food\": 120.50, \"Transport\": 45.00, \"Entertainment\": 35.75}\n\n# Print breakdown\n",
            "test_cases": [{"input": "", "expected_output": "Food: $120.50 (59.9%)\nTransport: $45.00 (22.4%)\nEntertainment: $35.75 (17.8%)\nTotal: $201.25"}],
        },
        {
            "title": "Weekly Summary",
            "description": "Create `daily_spending = [25, 42, 18, 35, 60, 15, 30]`. Print:\n`Total: $225`\n`Daily average: $32.14`\n`Highest day: Day 5 ($60)`\n`Lowest day: Day 3 ($18)`\n\nDays are 1-indexed.",
            "starter_code": "daily_spending = [25, 42, 18, 35, 60, 15, 30]\n\n# Calculate and print summary\n",
            "test_cases": [{"input": "", "expected_output": "Total: $225\nDaily average: $32.14\nHighest day: Day 5 ($60)\nLowest day: Day 3 ($18)"}],
        },
        {
            "title": "Over Budget Alert",
            "description": "Create:\n`budgets = {\"Food\": 150, \"Transport\": 50, \"Fun\": 100}`\n`spending = {\"Food\": 175, \"Transport\": 30, \"Fun\": 100}`\n\nFor each category, print status:\n```\nFood: OVER by $25\nTransport: under by $20\nFun: exactly on budget\n```",
            "starter_code": "budgets = {\"Food\": 150, \"Transport\": 50, \"Fun\": 100}\nspending = {\"Food\": 175, \"Transport\": 30, \"Fun\": 100}\n\n# Print status for each category\n",
            "test_cases": [{"input": "", "expected_output": "Food: OVER by $25\nTransport: under by $20\nFun: exactly on budget"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Monthly Report",
            "description": "Create:\n`transactions = [\n    (\"Food\", 25.00),\n    (\"Transport\", 15.00),\n    (\"Food\", 32.50),\n    (\"Fun\", 45.00),\n    (\"Food\", 18.75),\n    (\"Transport\", 22.00),\n]`\n\nGroup by category and print sorted alphabetically:\n```\nFood: $76.25 (3 transactions)\nFun: $45.00 (1 transactions)\nTransport: $37.00 (2 transactions)\n```",
            "starter_code": "transactions = [\n    (\"Food\", 25.00),\n    (\"Transport\", 15.00),\n    (\"Food\", 32.50),\n    (\"Fun\", 45.00),\n    (\"Food\", 18.75),\n    (\"Transport\", 22.00),\n]\n\n# Group and print\n",
            "test_cases": [{"input": "", "expected_output": "Food: $76.25 (3 transactions)\nFun: $45.00 (1 transactions)\nTransport: $37.00 (2 transactions)"}],
        },
        {
            "title": "Savings Projection",
            "description": "Create `income = 3000`, `expenses = 2200`, `savings = 500`, `goal = 5000`.\nCalculate monthly surplus (income - expenses) and how many months to reach goal from current savings.\nPrint:\n`Monthly surplus: $800`\n`Months to goal: 6`\n`Final savings: $5300`",
            "starter_code": "income = 3000\nexpenses = 2200\nsavings = 500\ngoal = 5000\n\n# Calculate and print projection\n",
            "test_cases": [{"input": "", "expected_output": "Monthly surplus: $800\nMonths to goal: 6\nFinal savings: $5300"}],
        },
        {
            "title": "Budget Bar Chart",
            "description": "Create:\n`categories = {\"Food\": 150, \"Rent\": 800, \"Transport\": 100, \"Fun\": 50}`\n\nPrint a horizontal bar chart where each `#` represents $50:\n```\nFood      |###\nRent      |################\nTransport |##\nFun       |#\n```\nPad category names to 10 characters.",
            "starter_code": "categories = {\"Food\": 150, \"Rent\": 800, \"Transport\": 100, \"Fun\": 50}\n\n# Print bar chart\n",
            "test_cases": [{"input": "", "expected_output": "Food      |###\nRent      |################\nTransport |##\nFun       |#"}],
        },
    ],

    # ── Module 2 ────────────────────────────────────────────────────

    "Booleans & Comparisons": [
        # --- Easy (1-3) ---
        {
            "title": "Simple Compare",
            "description": "Create `a = 10` and `b = 20`. Print whether a is less than b.",
            "starter_code": "a = 10\nb = 20\n\n# Print comparison result\n",
            "test_cases": [{"input": "", "expected_output": "True"}],
        },
        {
            "title": "Equality Check",
            "description": "Create `x = 5` and `y = 5`. Print whether they are equal using `==`.",
            "starter_code": "x = 5\ny = 5\n\n# Print equality check\n",
            "test_cases": [{"input": "", "expected_output": "True"}],
        },
        {
            "title": "Not Equal",
            "description": "Create `name = \"Python\"` and `other = \"Java\"`. Print whether they are not equal.",
            "starter_code": "name = \"Python\"\nother = \"Java\"\n\n# Print not-equal check\n",
            "test_cases": [{"input": "", "expected_output": "True"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "And Logic",
            "description": "Create `age = 25` and `has_license = True`. Print whether both age >= 18 AND has_license is True.",
            "starter_code": "age = 25\nhas_license = True\n\n# Print result of AND logic\n",
            "test_cases": [{"input": "", "expected_output": "True"}],
        },
        {
            "title": "Or Logic",
            "description": "Create `is_student = False` and `is_senior = True`. Print whether either is True.",
            "starter_code": "is_student = False\nis_senior = True\n\n# Print result of OR logic\n",
            "test_cases": [{"input": "", "expected_output": "True"}],
        },
        {
            "title": "Range Check",
            "description": "Create `score = 85`. Print whether score is between 70 and 100 (inclusive) using chained comparison.",
            "starter_code": "score = 85\n\n# Print range check\n",
            "test_cases": [{"input": "", "expected_output": "True"}],
        },
        {
            "title": "Bool Arithmetic",
            "description": "Create a list `values = [True, False, True, True, False]`. Print the count of True values using `sum()`.",
            "starter_code": "values = [True, False, True, True, False]\n\n# Print count of True\n",
            "test_cases": [{"input": "", "expected_output": "3"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Leap Year Check",
            "description": "Create `year = 2024`. Determine if it is a leap year:\n- Divisible by 4 AND (not divisible by 100 OR divisible by 400)\nPrint True or False.",
            "starter_code": "year = 2024\n\n# Check leap year\n",
            "test_cases": [{"input": "", "expected_output": "True"}],
        },
        {
            "title": "Triangle Validator",
            "description": "Create `a = 3`, `b = 4`, `c = 5`. Check if these can form a valid triangle (sum of any two sides must be greater than the third). Print True or False.",
            "starter_code": "a = 3\nb = 4\nc = 5\n\n# Check triangle validity\n",
            "test_cases": [{"input": "", "expected_output": "True"}],
        },
        {
            "title": "Grade Boundaries",
            "description": "Create `score = 87`. Using boolean expressions, print on separate lines whether the score qualifies for each grade:\n`A (90+): False`\n`B (80-89): True`\n`C (70-79): False`\n`D (60-69): False`\n`F (<60): False`",
            "starter_code": "score = 87\n\n# Print grade qualifications\n",
            "test_cases": [{"input": "", "expected_output": "A (90+): False\nB (80-89): True\nC (70-79): False\nD (60-69): False\nF (<60): False"}],
        },
    ],

    "If, Elif, Else": [
        # --- Easy (1-3) ---
        {
            "title": "Positive or Negative",
            "description": "Create `num = -5`. Print \"positive\", \"negative\", or \"zero\".",
            "starter_code": "num = -5\n\n# Check and print\n",
            "test_cases": [{"input": "", "expected_output": "negative"}],
        },
        {
            "title": "Voting Age",
            "description": "Create `age = 17`. Print \"Can vote\" if 18 or older, otherwise \"Too young\".",
            "starter_code": "age = 17\n\n# Check voting eligibility\n",
            "test_cases": [{"input": "", "expected_output": "Too young"}],
        },
        {
            "title": "Max of Two",
            "description": "Create `a = 15` and `b = 23`. Print the larger value using an if/else.",
            "starter_code": "a = 15\nb = 23\n\n# Print the larger value\n",
            "test_cases": [{"input": "", "expected_output": "23"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Letter Grade",
            "description": "Create `score = 82`. Print the letter grade:\n- 90+: A\n- 80-89: B\n- 70-79: C\n- 60-69: D\n- Below 60: F",
            "starter_code": "score = 82\n\n# Determine and print grade\n",
            "test_cases": [{"input": "", "expected_output": "B"}],
        },
        {
            "title": "Ticket Price",
            "description": "Create `age = 65`. Determine ticket price:\n- Under 5: Free\n- 5-12: $5\n- 13-64: $10\n- 65+: $7\nPrint just the price description (e.g., \"$7\").",
            "starter_code": "age = 65\n\n# Determine and print ticket price\n",
            "test_cases": [{"input": "", "expected_output": "$7"}],
        },
        {
            "title": "Season Finder",
            "description": "Create `month = 11`. Print the season:\n- 3,4,5: Spring\n- 6,7,8: Summer\n- 9,10,11: Fall\n- 12,1,2: Winter",
            "starter_code": "month = 11\n\n# Determine and print season\n",
            "test_cases": [{"input": "", "expected_output": "Fall"}],
        },
        {
            "title": "BMI Category",
            "description": "Create `bmi = 26.5`. Print the category:\n- Below 18.5: Underweight\n- 18.5 to 24.9: Normal\n- 25.0 to 29.9: Overweight\n- 30.0+: Obese",
            "starter_code": "bmi = 26.5\n\n# Determine and print category\n",
            "test_cases": [{"input": "", "expected_output": "Overweight"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Tax Calculator",
            "description": "Create `income = 55000`. Calculate tax using brackets:\n- First $10,000: 10%\n- $10,001 - $40,000: 20%\n- Above $40,000: 30%\nPrint the total tax as an integer.",
            "starter_code": "income = 55000\n\n# Calculate tax using brackets\n",
            "test_cases": [{"input": "", "expected_output": "11500"}],
        },
        {
            "title": "Day Classifier",
            "description": "Create `day = \"Wednesday\"`. Print three lines:\n1. The type: \"Weekday\" or \"Weekend\"\n2. Position: \"Early week\", \"Mid week\", or \"Late week\" (or \"Weekend\" for Sat/Sun)\n3. Days until Friday (0 if Friday, \"Already past\" for Sat/Sun)\n\nAssume week starts Monday.",
            "starter_code": "day = \"Wednesday\"\n\n# Classify and print\n",
            "test_cases": [{"input": "", "expected_output": "Weekday\nMid week\n2"}],
        },
        {
            "title": "Shipping Cost",
            "description": "Create `weight = 7.5` (kg), `distance = 350` (km), `express = True`.\n\nBase rate: $5\nWeight surcharge: +$2 per kg over 5kg (round up to whole kg)\nDistance: +$1 per 100km (round up)\nExpress: doubles total\n\nPrint the total cost as a whole dollar amount.",
            "starter_code": "import math\nweight = 7.5\ndistance = 350\nexpress = True\n\n# Calculate shipping cost\n",
            "test_cases": [{"input": "", "expected_output": "$24"}],
        },
    ],

    "For Loops & Range": [
        # --- Easy (1-3) ---
        {
            "title": "Count to Five",
            "description": "Use a for loop with range to print numbers 1 through 5, each on a separate line.",
            "starter_code": "# Print 1 to 5\n",
            "test_cases": [{"input": "", "expected_output": "1\n2\n3\n4\n5"}],
        },
        {
            "title": "Sum 1 to 10",
            "description": "Use a for loop to calculate the sum of numbers 1 through 10. Print the result.",
            "starter_code": "# Calculate and print sum\n",
            "test_cases": [{"input": "", "expected_output": "55"}],
        },
        {
            "title": "Print List Items",
            "description": "Create `fruits = [\"apple\", \"banana\", \"cherry\"]`. Print each fruit on a separate line.",
            "starter_code": "fruits = [\"apple\", \"banana\", \"cherry\"]\n\n# Print each fruit\n",
            "test_cases": [{"input": "", "expected_output": "apple\nbanana\ncherry"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Even Numbers",
            "description": "Print all even numbers from 2 to 20 (inclusive), each on a separate line.",
            "starter_code": "# Print even numbers 2 to 20\n",
            "test_cases": [{"input": "", "expected_output": "2\n4\n6\n8\n10\n12\n14\n16\n18\n20"}],
        },
        {
            "title": "Enumerate Items",
            "description": "Create `colors = [\"red\", \"green\", \"blue\", \"yellow\"]`. Print each with its 1-based index:\n`1. red`\n`2. green`\n`3. blue`\n`4. yellow`",
            "starter_code": "colors = [\"red\", \"green\", \"blue\", \"yellow\"]\n\n# Print with index\n",
            "test_cases": [{"input": "", "expected_output": "1. red\n2. green\n3. blue\n4. yellow"}],
        },
        {
            "title": "Multiplication Table",
            "description": "Print the multiplication table for 7 (7x1 through 7x5):\n`7 x 1 = 7`\n`7 x 2 = 14`\n`7 x 3 = 21`\n`7 x 4 = 28`\n`7 x 5 = 35`",
            "starter_code": "# Print multiplication table for 7\n",
            "test_cases": [{"input": "", "expected_output": "7 x 1 = 7\n7 x 2 = 14\n7 x 3 = 21\n7 x 4 = 28\n7 x 5 = 35"}],
        },
        {
            "title": "Countdown",
            "description": "Print a countdown from 10 to 1, then print \"Go!\".",
            "starter_code": "# Print countdown\n",
            "test_cases": [{"input": "", "expected_output": "10\n9\n8\n7\n6\n5\n4\n3\n2\n1\nGo!"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Triangle Pattern",
            "description": "Print a right triangle of stars with 5 rows:\n```\n*\n**\n***\n****\n*****\n```",
            "starter_code": "# Print star triangle\n",
            "test_cases": [{"input": "", "expected_output": "*\n**\n***\n****\n*****"}],
        },
        {
            "title": "FizzBuzz 15",
            "description": "Print numbers 1 to 15. But for multiples of 3 print \"Fizz\", for multiples of 5 print \"Buzz\", and for multiples of both print \"FizzBuzz\".",
            "starter_code": "# FizzBuzz 1-15\n",
            "test_cases": [{"input": "", "expected_output": "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz"}],
        },
        {
            "title": "Nested Squares",
            "description": "Print a 5x5 grid where the border is `#` and the inside is `.`:\n```\n#####\n#...#\n#...#\n#...#\n#####\n```",
            "starter_code": "# Print bordered square\n",
            "test_cases": [{"input": "", "expected_output": "#####\n#...#\n#...#\n#...#\n#####"}],
        },
    ],

    "While Loops & Break/Continue": [
        # --- Easy (1-3) ---
        {
            "title": "Count Up",
            "description": "Use a while loop to print numbers 1 through 5.",
            "starter_code": "# While loop counting 1-5\n",
            "test_cases": [{"input": "", "expected_output": "1\n2\n3\n4\n5"}],
        },
        {
            "title": "Doubling",
            "description": "Start with `n = 1`. Use a while loop to keep doubling n and print each value. Stop when n exceeds 100.",
            "starter_code": "n = 1\n\n# Double and print until > 100\n",
            "test_cases": [{"input": "", "expected_output": "1\n2\n4\n8\n16\n32\n64\n128"}],
        },
        {
            "title": "Sum Until 100",
            "description": "Add numbers 1, 2, 3, ... in a while loop. Print the sum right when it first exceeds 100.",
            "starter_code": "# Sum until exceeding 100\n",
            "test_cases": [{"input": "", "expected_output": "105"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Skip Threes",
            "description": "Print numbers 1 to 10, but skip multiples of 3 using `continue`.",
            "starter_code": "# Print 1-10 skipping multiples of 3\n",
            "test_cases": [{"input": "", "expected_output": "1\n2\n4\n5\n7\n8\n10"}],
        },
        {
            "title": "Find First",
            "description": "Create `numbers = [4, 7, 2, 9, 1, 8, 3]`. Use a while loop with break to find and print the first number greater than 5.",
            "starter_code": "numbers = [4, 7, 2, 9, 1, 8, 3]\n\n# Find first > 5\n",
            "test_cases": [{"input": "", "expected_output": "7"}],
        },
        {
            "title": "Collatz Steps",
            "description": "Create `n = 12`. Apply the Collatz conjecture rules until n equals 1:\n- If even: n = n // 2\n- If odd: n = n * 3 + 1\nPrint each value of n on a separate line (including the starting value and 1).",
            "starter_code": "n = 12\n\n# Apply Collatz rules and print each step\n",
            "test_cases": [{"input": "", "expected_output": "12\n6\n3\n10\n5\n16\n8\n4\n2\n1"}],
        },
        {
            "title": "Password Attempts",
            "description": "Create `passwords = [\"abc\", \"letmein\", \"secret\", \"12345\"]` and `correct = \"secret\"`. Simulate checking passwords. For each wrong guess print `Wrong: <guess>`. When found, print `Access granted` and stop.",
            "starter_code": "passwords = [\"abc\", \"letmein\", \"secret\", \"12345\"]\ncorrect = \"secret\"\n\n# Check passwords\n",
            "test_cases": [{"input": "", "expected_output": "Wrong: abc\nWrong: letmein\nAccess granted"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Prime Checker",
            "description": "Create `num = 97`. Determine if it is prime using a while loop. Print \"prime\" or \"not prime\".",
            "starter_code": "num = 97\n\n# Check if prime\n",
            "test_cases": [{"input": "", "expected_output": "prime"}],
        },
        {
            "title": "GCD Calculator",
            "description": "Create `a = 48` and `b = 18`. Calculate the GCD using the Euclidean algorithm (while b != 0: a, b = b, a % b). Print the GCD.",
            "starter_code": "a = 48\nb = 18\n\n# Calculate GCD\n",
            "test_cases": [{"input": "", "expected_output": "6"}],
        },
        {
            "title": "Number Guesser Sim",
            "description": "Create `target = 42` and `guesses = [20, 50, 35, 42, 60]`. Simulate a guessing game. For each guess print:\n- \"Too low\" if guess < target\n- \"Too high\" if guess > target\n- \"Correct in X guesses!\" if equal (then stop)",
            "starter_code": "target = 42\nguesses = [20, 50, 35, 42, 60]\n\n# Simulate guessing game\n",
            "test_cases": [{"input": "", "expected_output": "Too low\nToo high\nToo low\nCorrect in 4 guesses!"}],
        },
    ],

    "Nested Logic": [
        # --- Easy (1-3) ---
        {
            "title": "Nested If",
            "description": "Create `x = 15`. If x > 10, check if x is even or odd. Print \"big even\" or \"big odd\". If x <= 10, print \"small\".",
            "starter_code": "x = 15\n\n# Nested check\n",
            "test_cases": [{"input": "", "expected_output": "big odd"}],
        },
        {
            "title": "Times Table Grid",
            "description": "Print a 3x3 multiplication grid (1-3 by 1-3). Each row on one line, values separated by tabs:\n```\n1\t2\t3\n2\t4\t6\n3\t6\t9\n```",
            "starter_code": "# Print 3x3 times table\n",
            "test_cases": [{"input": "", "expected_output": "1\t2\t3\n2\t4\t6\n3\t6\t9"}],
        },
        {
            "title": "Pair Finder",
            "description": "Create `numbers = [1, 2, 3, 4]`. Print all unique pairs (i, j) where i < j:\n```\n(1, 2)\n(1, 3)\n(1, 4)\n(2, 3)\n(2, 4)\n(3, 4)\n```",
            "starter_code": "numbers = [1, 2, 3, 4]\n\n# Print all unique pairs\n",
            "test_cases": [{"input": "", "expected_output": "(1, 2)\n(1, 3)\n(1, 4)\n(2, 3)\n(2, 4)\n(3, 4)"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Matrix Sum",
            "description": "Create:\n`matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]`\nCalculate and print the sum of all elements.",
            "starter_code": "matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]\n\n# Sum all elements\n",
            "test_cases": [{"input": "", "expected_output": "45"}],
        },
        {
            "title": "Flatten List",
            "description": "Create:\n`nested = [[1, 2], [3, 4, 5], [6]]`\nFlatten into a single list and print it.",
            "starter_code": "nested = [[1, 2], [3, 4, 5], [6]]\n\n# Flatten and print\n",
            "test_cases": [{"input": "", "expected_output": "[1, 2, 3, 4, 5, 6]"}],
        },
        {
            "title": "Grade Counter",
            "description": "Create `scores = [92, 85, 67, 73, 95, 88, 42, 78, 91, 55]`. Count how many fall into each grade category and print:\n`A: 3`\n`B: 2`\n`C: 2`\n`D: 1`\n`F: 2`",
            "starter_code": "scores = [92, 85, 67, 73, 95, 88, 42, 78, 91, 55]\n\n# Count grades\n",
            "test_cases": [{"input": "", "expected_output": "A: 3\nB: 2\nC: 2\nD: 1\nF: 2"}],
        },
        {
            "title": "Common Elements",
            "description": "Create:\n`list1 = [1, 2, 3, 4, 5]`\n`list2 = [3, 4, 5, 6, 7]`\nFind and print common elements, one per line, in sorted order.",
            "starter_code": "list1 = [1, 2, 3, 4, 5]\nlist2 = [3, 4, 5, 6, 7]\n\n# Find and print common elements\n",
            "test_cases": [{"input": "", "expected_output": "3\n4\n5"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Prime Sieve",
            "description": "Find and print all prime numbers from 2 to 30, separated by spaces on one line.",
            "starter_code": "# Find primes 2-30\n",
            "test_cases": [{"input": "", "expected_output": "2 3 5 7 11 13 17 19 23 29"}],
        },
        {
            "title": "Diagonal Sum",
            "description": "Create:\n`matrix = [[5, 1, 2], [3, 8, 4], [6, 7, 9]]`\nPrint the sum of the main diagonal (top-left to bottom-right) and the anti-diagonal on separate lines.",
            "starter_code": "matrix = [[5, 1, 2], [3, 8, 4], [6, 7, 9]]\n\n# Calculate diagonal sums\n",
            "test_cases": [{"input": "", "expected_output": "22\n16"}],
        },
        {
            "title": "Student Rankings",
            "description": "Create:\n`students = [(\"Alice\", [90, 85, 92]), (\"Bob\", [78, 88, 72]), (\"Carol\", [95, 91, 89])]`\n\nCalculate each student's average and print ranked from highest to lowest:\n```\n1. Carol: 91.67\n2. Alice: 89.0\n3. Bob: 79.33\n```\nRound averages to 2 decimal places.",
            "starter_code": "students = [(\"Alice\", [90, 85, 92]), (\"Bob\", [78, 88, 72]), (\"Carol\", [95, 91, 89])]\n\n# Rank students by average\n",
            "test_cases": [{"input": "", "expected_output": "1. Carol: 91.67\n2. Alice: 89.0\n3. Bob: 79.33"}],
        },
    ],

    "Rock-Paper-Scissors": [
        # --- Easy (1-3) ---
        {
            "title": "Move Validator",
            "description": "Create `move = \"rock\"`. Check if it is a valid move (rock, paper, or scissors). Print \"valid\" or \"invalid\".",
            "starter_code": "move = \"rock\"\n\n# Validate move\n",
            "test_cases": [{"input": "", "expected_output": "valid"}],
        },
        {
            "title": "Winner Check",
            "description": "Create `player = \"rock\"` and `computer = \"scissors\"`. Determine the winner. Print \"Player wins!\".",
            "starter_code": "player = \"rock\"\ncomputer = \"scissors\"\n\n# Determine winner\n",
            "test_cases": [{"input": "", "expected_output": "Player wins!"}],
        },
        {
            "title": "Tie Game",
            "description": "Create `p1 = \"paper\"` and `p2 = \"paper\"`. Check if it is a tie. Print \"Tie!\" or \"Not a tie\".",
            "starter_code": "p1 = \"paper\"\np2 = \"paper\"\n\n# Check for tie\n",
            "test_cases": [{"input": "", "expected_output": "Tie!"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Full Game Logic",
            "description": "Create `p1 = \"paper\"` and `p2 = \"rock\"`. Implement full RPS logic and print:\n`Player 1: paper`\n`Player 2: rock`\n`Player 1 wins!`",
            "starter_code": "p1 = \"paper\"\np2 = \"rock\"\n\n# Full game logic\n",
            "test_cases": [{"input": "", "expected_output": "Player 1: paper\nPlayer 2: rock\nPlayer 1 wins!"}],
        },
        {
            "title": "Win Counter",
            "description": "Create:\n`rounds = [(\"rock\", \"scissors\"), (\"paper\", \"paper\"), (\"scissors\", \"rock\"), (\"rock\", \"paper\"), (\"scissors\", \"paper\")]`\n\nCount wins for each player and ties. Print:\n`Player 1 wins: 2`\n`Player 2 wins: 1`\n`Ties: 2`",
            "starter_code": "rounds = [(\"rock\", \"scissors\"), (\"paper\", \"paper\"), (\"scissors\", \"rock\"), (\"rock\", \"paper\"), (\"scissors\", \"paper\")]\n\n# Count results\n",
            "test_cases": [{"input": "", "expected_output": "Player 1 wins: 2\nPlayer 2 wins: 1\nTies: 2"}],
        },
        {
            "title": "Move Frequency",
            "description": "Create `moves = [\"rock\", \"paper\", \"rock\", \"scissors\", \"rock\", \"paper\"]`. Count occurrences and print sorted alphabetically:\n`paper: 2`\n`rock: 3`\n`scissors: 1`",
            "starter_code": "moves = [\"rock\", \"paper\", \"rock\", \"scissors\", \"rock\", \"paper\"]\n\n# Count and print frequencies\n",
            "test_cases": [{"input": "", "expected_output": "paper: 2\nrock: 3\nscissors: 1"}],
        },
        {
            "title": "Best of Five",
            "description": "Create:\n`games = [(\"rock\", \"scissors\"), (\"scissors\", \"rock\"), (\"paper\", \"rock\"), (\"rock\", \"rock\"), (\"scissors\", \"paper\")]`\n\nPlay best-of-5. Print round results and final winner:\n```\nRound 1: P1 wins\nRound 2: P2 wins\nRound 3: P1 wins\nRound 4: Tie\nRound 5: P1 wins\nP1 wins the series 3-1!\n```\nTies don't count toward the score.",
            "starter_code": "games = [(\"rock\", \"scissors\"), (\"scissors\", \"rock\"), (\"paper\", \"rock\"), (\"rock\", \"rock\"), (\"scissors\", \"paper\")]\n\n# Play best of 5\n",
            "test_cases": [{"input": "", "expected_output": "Round 1: P1 wins\nRound 2: P2 wins\nRound 3: P1 wins\nRound 4: Tie\nRound 5: P1 wins\nP1 wins the series 3-1!"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Strategy Analyzer",
            "description": "Create:\n`history = [\"rock\", \"rock\", \"paper\", \"rock\", \"scissors\", \"rock\"]`\n\nFind the most common move and the best counter move. Print:\n`Most common: rock (4 times)`\n`Best counter: paper`",
            "starter_code": "history = [\"rock\", \"rock\", \"paper\", \"rock\", \"scissors\", \"rock\"]\n\n# Analyze strategy\n",
            "test_cases": [{"input": "", "expected_output": "Most common: rock (4 times)\nBest counter: paper"}],
        },
        {
            "title": "Win Streak",
            "description": "Create:\n`results = [\"win\", \"win\", \"loss\", \"win\", \"win\", \"win\", \"loss\", \"win\"]`\n\nFind the longest win streak. Print:\n`Longest win streak: 3`",
            "starter_code": "results = [\"win\", \"win\", \"loss\", \"win\", \"win\", \"win\", \"loss\", \"win\"]\n\n# Find longest win streak\n",
            "test_cases": [{"input": "", "expected_output": "Longest win streak: 3"}],
        },
        {
            "title": "Tournament Table",
            "description": "Create:\n`players = [\"Alice\", \"Bob\", \"Carol\"]`\n`matches = [(\"Alice\", \"rock\", \"Bob\", \"scissors\"), (\"Bob\", \"paper\", \"Carol\", \"rock\"), (\"Alice\", \"scissors\", \"Carol\", \"scissors\")]`\n\nTrack wins for each player and print standings sorted by wins (descending):\n```\nAlice: 1 win\nBob: 1 win\nCarol: 0 wins\n```",
            "starter_code": "players = [\"Alice\", \"Bob\", \"Carol\"]\nmatches = [(\"Alice\", \"rock\", \"Bob\", \"scissors\"), (\"Bob\", \"paper\", \"Carol\", \"rock\"), (\"Alice\", \"scissors\", \"Carol\", \"scissors\")]\n\n# Calculate standings\n",
            "test_cases": [{"input": "", "expected_output": "Alice: 1 win\nBob: 1 win\nCarol: 0 wins"}],
        },
    ],

    # ── Module 3 ────────────────────────────────────────────────────

    "Lists & Indexing": [
        # --- Easy (1-3) ---
        {
            "title": "First and Last",
            "description": "Create `items = [10, 20, 30, 40, 50]`. Print the first and last elements on separate lines.",
            "starter_code": "items = [10, 20, 30, 40, 50]\n\n# Print first and last\n",
            "test_cases": [{"input": "", "expected_output": "10\n50"}],
        },
        {
            "title": "List Length",
            "description": "Create `words = [\"hello\", \"world\", \"python\", \"code\"]`. Print the length of the list.",
            "starter_code": "words = [\"hello\", \"world\", \"python\", \"code\"]\n\n# Print length\n",
            "test_cases": [{"input": "", "expected_output": "4"}],
        },
        {
            "title": "Slice It",
            "description": "Create `nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]`. Print the slice from index 2 to 5 (exclusive).",
            "starter_code": "nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]\n\n# Print slice\n",
            "test_cases": [{"input": "", "expected_output": "[2, 3, 4]"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Append and Extend",
            "description": "Create `a = [1, 2, 3]`. Append 4 to it. Then extend it with `[5, 6]`. Print the final list.",
            "starter_code": "a = [1, 2, 3]\n\n# Append and extend\n",
            "test_cases": [{"input": "", "expected_output": "[1, 2, 3, 4, 5, 6]"}],
        },
        {
            "title": "Remove Duplicates",
            "description": "Create `items = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3]`. Remove duplicates while preserving order. Print the result as a list.",
            "starter_code": "items = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3]\n\n# Remove duplicates preserving order\n",
            "test_cases": [{"input": "", "expected_output": "[3, 1, 4, 5, 9, 2, 6]"}],
        },
        {
            "title": "Reverse List",
            "description": "Create `data = [5, 10, 15, 20, 25]`. Print the list reversed using slicing.",
            "starter_code": "data = [5, 10, 15, 20, 25]\n\n# Print reversed\n",
            "test_cases": [{"input": "", "expected_output": "[25, 20, 15, 10, 5]"}],
        },
        {
            "title": "Index Finder",
            "description": "Create `letters = [\"a\", \"b\", \"c\", \"d\", \"e\"]`. Find and print the index of \"c\".",
            "starter_code": "letters = [\"a\", \"b\", \"c\", \"d\", \"e\"]\n\n# Find index of 'c'\n",
            "test_cases": [{"input": "", "expected_output": "2"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Rotate List",
            "description": "Create `items = [1, 2, 3, 4, 5]` and `k = 2`. Rotate the list to the right by k positions. Print the result.\n\nExpected: `[4, 5, 1, 2, 3]`",
            "starter_code": "items = [1, 2, 3, 4, 5]\nk = 2\n\n# Rotate right by k\n",
            "test_cases": [{"input": "", "expected_output": "[4, 5, 1, 2, 3]"}],
        },
        {
            "title": "Chunk List",
            "description": "Create `data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]` and `size = 3`. Split into chunks of given size and print each chunk on a separate line.",
            "starter_code": "data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]\nsize = 3\n\n# Split into chunks\n",
            "test_cases": [{"input": "", "expected_output": "[1, 2, 3]\n[4, 5, 6]\n[7, 8, 9]\n[10]"}],
        },
        {
            "title": "Interleave Lists",
            "description": "Create `a = [1, 3, 5, 7]` and `b = [2, 4, 6]`. Interleave them (a[0], b[0], a[1], b[1], ...), appending remaining elements. Print the result.",
            "starter_code": "a = [1, 3, 5, 7]\nb = [2, 4, 6]\n\n# Interleave\n",
            "test_cases": [{"input": "", "expected_output": "[1, 2, 3, 4, 5, 6, 7]"}],
        },
    ],

    "Dictionaries": [
        # --- Easy (1-3) ---
        {
            "title": "Create and Access",
            "description": "Create `person = {\"name\": \"Alice\", \"age\": 30, \"city\": \"NYC\"}`. Print the name.",
            "starter_code": "person = {\"name\": \"Alice\", \"age\": 30, \"city\": \"NYC\"}\n\n# Print name\n",
            "test_cases": [{"input": "", "expected_output": "Alice"}],
        },
        {
            "title": "Add a Key",
            "description": "Create `data = {\"x\": 1, \"y\": 2}`. Add key \"z\" with value 3. Print the dictionary.",
            "starter_code": "data = {\"x\": 1, \"y\": 2}\n\n# Add z and print\n",
            "test_cases": [{"input": "", "expected_output": "{'x': 1, 'y': 2, 'z': 3}"}],
        },
        {
            "title": "Key Check",
            "description": "Create `d = {\"a\": 1, \"b\": 2, \"c\": 3}`. Print whether \"b\" is a key in the dictionary.",
            "starter_code": "d = {\"a\": 1, \"b\": 2, \"c\": 3}\n\n# Check if 'b' is a key\n",
            "test_cases": [{"input": "", "expected_output": "True"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Iterate Items",
            "description": "Create `prices = {\"apple\": 1.20, \"banana\": 0.50, \"cherry\": 2.00}`. Print each item as `<key>: $<value>`.",
            "starter_code": "prices = {\"apple\": 1.20, \"banana\": 0.50, \"cherry\": 2.00}\n\n# Print items\n",
            "test_cases": [{"input": "", "expected_output": "apple: $1.2\nbanana: $0.5\ncherry: $2.0"}],
        },
        {
            "title": "Word Counter",
            "description": "Create `words = [\"apple\", \"banana\", \"apple\", \"cherry\", \"banana\", \"apple\"]`. Count occurrences using a dictionary. Print each word and count sorted alphabetically.",
            "starter_code": "words = [\"apple\", \"banana\", \"apple\", \"cherry\", \"banana\", \"apple\"]\n\n# Count and print\n",
            "test_cases": [{"input": "", "expected_output": "apple: 3\nbanana: 2\ncherry: 1"}],
        },
        {
            "title": "Merge Dicts",
            "description": "Create:\n`d1 = {\"a\": 1, \"b\": 2}`\n`d2 = {\"b\": 3, \"c\": 4}`\nMerge them (d2 values override d1). Print the result.",
            "starter_code": "d1 = {\"a\": 1, \"b\": 2}\nd2 = {\"b\": 3, \"c\": 4}\n\n# Merge and print\n",
            "test_cases": [{"input": "", "expected_output": "{'a': 1, 'b': 3, 'c': 4}"}],
        },
        {
            "title": "Invert Dict",
            "description": "Create `d = {\"a\": 1, \"b\": 2, \"c\": 3}`. Create a new dict with keys and values swapped. Print it.",
            "starter_code": "d = {\"a\": 1, \"b\": 2, \"c\": 3}\n\n# Invert and print\n",
            "test_cases": [{"input": "", "expected_output": "{1: 'a', 2: 'b', 3: 'c'}"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Group By",
            "description": "Create:\n`students = [(\"Alice\", \"A\"), (\"Bob\", \"B\"), (\"Carol\", \"A\"), (\"Dave\", \"B\"), (\"Eve\", \"A\")]`\nGroup by grade. Print:\n`A: Alice, Carol, Eve`\n`B: Bob, Dave`",
            "starter_code": "students = [(\"Alice\", \"A\"), (\"Bob\", \"B\"), (\"Carol\", \"A\"), (\"Dave\", \"B\"), (\"Eve\", \"A\")]\n\n# Group by grade\n",
            "test_cases": [{"input": "", "expected_output": "A: Alice, Carol, Eve\nB: Bob, Dave"}],
        },
        {
            "title": "Nested Dict Access",
            "description": "Create:\n`company = {\"engineering\": {\"Alice\": 95000, \"Bob\": 88000}, \"marketing\": {\"Carol\": 72000, \"Dave\": 68000}}`\n\nPrint each department's average salary:\n`engineering: $91500.00`\n`marketing: $70000.00`",
            "starter_code": "company = {\"engineering\": {\"Alice\": 95000, \"Bob\": 88000}, \"marketing\": {\"Carol\": 72000, \"Dave\": 68000}}\n\n# Print average per department\n",
            "test_cases": [{"input": "", "expected_output": "engineering: $91500.00\nmarketing: $70000.00"}],
        },
        {
            "title": "Dict Difference",
            "description": "Create:\n`old = {\"a\": 1, \"b\": 2, \"c\": 3, \"d\": 4}`\n`new = {\"a\": 1, \"b\": 5, \"c\": 3, \"e\": 6}`\n\nPrint the differences:\n`Added: e`\n`Removed: d`\n`Changed: b (2 -> 5)`",
            "starter_code": "old = {\"a\": 1, \"b\": 2, \"c\": 3, \"d\": 4}\nnew = {\"a\": 1, \"b\": 5, \"c\": 3, \"e\": 6}\n\n# Find differences\n",
            "test_cases": [{"input": "", "expected_output": "Added: e\nRemoved: d\nChanged: b (2 -> 5)"}],
        },
    ],

    "Tuples & Sets": [
        # --- Easy (1-3) ---
        {
            "title": "Tuple Unpack",
            "description": "Create `point = (3, 7)`. Unpack into x and y. Print `x=3, y=7`.",
            "starter_code": "point = (3, 7)\n\n# Unpack and print\n",
            "test_cases": [{"input": "", "expected_output": "x=3, y=7"}],
        },
        {
            "title": "Set Basics",
            "description": "Create `s = {3, 1, 4, 1, 5, 9, 2, 6, 5}`. Print the length of the set.",
            "starter_code": "s = {3, 1, 4, 1, 5, 9, 2, 6, 5}\n\n# Print length\n",
            "test_cases": [{"input": "", "expected_output": "7"}],
        },
        {
            "title": "Membership Test",
            "description": "Create `allowed = {\"admin\", \"editor\", \"viewer\"}`. Check if \"editor\" is in the set. Print True or False.",
            "starter_code": "allowed = {\"admin\", \"editor\", \"viewer\"}\n\n# Check membership\n",
            "test_cases": [{"input": "", "expected_output": "True"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Set Operations",
            "description": "Create `a = {1, 2, 3, 4}` and `b = {3, 4, 5, 6}`. Print on separate lines:\n1. Union (sorted)\n2. Intersection (sorted)\n3. Difference a-b (sorted)",
            "starter_code": "a = {1, 2, 3, 4}\nb = {3, 4, 5, 6}\n\n# Print set operations\n",
            "test_cases": [{"input": "", "expected_output": "[1, 2, 3, 4, 5, 6]\n[3, 4]\n[1, 2]"}],
        },
        {
            "title": "Unique Words",
            "description": "Create `text = \"the cat sat on the mat the cat\"`. Find and print unique words sorted alphabetically, one per line.",
            "starter_code": "text = \"the cat sat on the mat the cat\"\n\n# Find unique words\n",
            "test_cases": [{"input": "", "expected_output": "cat\nmat\non\nsat\nthe"}],
        },
        {
            "title": "Tuple Sort",
            "description": "Create `students = [(\"Alice\", 85), (\"Bob\", 92), (\"Carol\", 78)]`. Sort by score descending and print each on a new line as `Name: Score`.",
            "starter_code": "students = [(\"Alice\", 85), (\"Bob\", 92), (\"Carol\", 78)]\n\n# Sort and print\n",
            "test_cases": [{"input": "", "expected_output": "Bob: 92\nAlice: 85\nCarol: 78"}],
        },
        {
            "title": "Named Tuple Style",
            "description": "Create a list of tuples:\n`records = [(\"Alice\", 30, \"NYC\"), (\"Bob\", 25, \"LA\"), (\"Carol\", 35, \"NYC\")]`\n\nFilter to those in NYC and print their names.",
            "starter_code": "records = [(\"Alice\", 30, \"NYC\"), (\"Bob\", 25, \"LA\"), (\"Carol\", 35, \"NYC\")]\n\n# Filter and print\n",
            "test_cases": [{"input": "", "expected_output": "Alice\nCarol"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Symmetric Difference",
            "description": "Create `s1 = {1, 2, 3, 4, 5}` and `s2 = {4, 5, 6, 7, 8}`. Print the symmetric difference as a sorted list.",
            "starter_code": "s1 = {1, 2, 3, 4, 5}\ns2 = {4, 5, 6, 7, 8}\n\n# Print symmetric difference\n",
            "test_cases": [{"input": "", "expected_output": "[1, 2, 3, 6, 7, 8]"}],
        },
        {
            "title": "Anagram Checker",
            "description": "Create `word1 = \"listen\"` and `word2 = \"silent\"`. Use sets or sorting to check if they are anagrams. Print True or False.",
            "starter_code": "word1 = \"listen\"\nword2 = \"silent\"\n\n# Check anagram\n",
            "test_cases": [{"input": "", "expected_output": "True"}],
        },
        {
            "title": "Frequency Set",
            "description": "Create `data = [1, 2, 2, 3, 3, 3, 4, 4, 4, 4]`. Find elements that appear more than twice using a dict and set. Print them as a sorted list.",
            "starter_code": "data = [1, 2, 2, 3, 3, 3, 4, 4, 4, 4]\n\n# Find frequent elements\n",
            "test_cases": [{"input": "", "expected_output": "[3, 4]"}],
        },
    ],

    "List Comprehensions": [
        # --- Easy (1-3) ---
        {
            "title": "Squares List",
            "description": "Use a list comprehension to create a list of squares of numbers 1-5. Print the list.",
            "starter_code": "# Create squares list\n",
            "test_cases": [{"input": "", "expected_output": "[1, 4, 9, 16, 25]"}],
        },
        {
            "title": "Uppercase All",
            "description": "Create `words = [\"hello\", \"world\", \"python\"]`. Use a list comprehension to uppercase all words. Print the result.",
            "starter_code": "words = [\"hello\", \"world\", \"python\"]\n\n# Uppercase with comprehension\n",
            "test_cases": [{"input": "", "expected_output": "['HELLO', 'WORLD', 'PYTHON']"}],
        },
        {
            "title": "Filter Evens",
            "description": "Create `nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]`. Use a list comprehension to filter only even numbers. Print the result.",
            "starter_code": "nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]\n\n# Filter evens\n",
            "test_cases": [{"input": "", "expected_output": "[2, 4, 6, 8, 10]"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Conditional Transform",
            "description": "Create `nums = [-3, -1, 0, 2, 5]`. Create a list where negative numbers become 0 and others stay. Print it.",
            "starter_code": "nums = [-3, -1, 0, 2, 5]\n\n# Replace negatives with 0\n",
            "test_cases": [{"input": "", "expected_output": "[0, 0, 0, 2, 5]"}],
        },
        {
            "title": "Flatten 2D",
            "description": "Create `matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]`. Flatten using a list comprehension. Print the result.",
            "starter_code": "matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]\n\n# Flatten\n",
            "test_cases": [{"input": "", "expected_output": "[1, 2, 3, 4, 5, 6, 7, 8, 9]"}],
        },
        {
            "title": "Dict Comprehension",
            "description": "Create `keys = [\"a\", \"b\", \"c\"]` and `values = [1, 2, 3]`. Use a dict comprehension with zip to create a dictionary. Print it.",
            "starter_code": "keys = [\"a\", \"b\", \"c\"]\nvalues = [1, 2, 3]\n\n# Create dict\n",
            "test_cases": [{"input": "", "expected_output": "{'a': 1, 'b': 2, 'c': 3}"}],
        },
        {
            "title": "String Filter",
            "description": "Create `words = [\"apple\", \"hi\", \"banana\", \"go\", \"cherry\", \"up\"]`. Use a comprehension to keep only words longer than 2 characters. Print the result.",
            "starter_code": "words = [\"apple\", \"hi\", \"banana\", \"go\", \"cherry\", \"up\"]\n\n# Filter long words\n",
            "test_cases": [{"input": "", "expected_output": "['apple', 'banana', 'cherry']"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Nested Comprehension",
            "description": "Create a 3x3 identity matrix using nested list comprehension (1 on diagonal, 0 elsewhere). Print each row on a separate line.",
            "starter_code": "# Create identity matrix\n",
            "test_cases": [{"input": "", "expected_output": "[1, 0, 0]\n[0, 1, 0]\n[0, 0, 1]"}],
        },
        {
            "title": "Prime Filter",
            "description": "Use a list comprehension with a helper condition to get all primes from 2 to 30. Print the list.",
            "starter_code": "# Find primes 2-30 with comprehension\n",
            "test_cases": [{"input": "", "expected_output": "[2, 3, 5, 7, 11, 13, 17, 19, 23, 29]"}],
        },
        {
            "title": "Transpose Matrix",
            "description": "Create `matrix = [[1, 2, 3], [4, 5, 6]]`. Transpose it using a list comprehension. Print each row of the result on a new line.",
            "starter_code": "matrix = [[1, 2, 3], [4, 5, 6]]\n\n# Transpose\n",
            "test_cases": [{"input": "", "expected_output": "[1, 4]\n[2, 5]\n[3, 6]"}],
        },
    ],

    "Sorting, Filtering, Mapping": [
        # --- Easy (1-3) ---
        {
            "title": "Sort Numbers",
            "description": "Create `nums = [5, 2, 8, 1, 9, 3]`. Print the sorted list.",
            "starter_code": "nums = [5, 2, 8, 1, 9, 3]\n\n# Sort and print\n",
            "test_cases": [{"input": "", "expected_output": "[1, 2, 3, 5, 8, 9]"}],
        },
        {
            "title": "Filter Positive",
            "description": "Create `nums = [-3, 5, -1, 8, -2, 4]`. Use `filter()` and a lambda to get positive numbers. Print as a list.",
            "starter_code": "nums = [-3, 5, -1, 8, -2, 4]\n\n# Filter positives\n",
            "test_cases": [{"input": "", "expected_output": "[5, 8, 4]"}],
        },
        {
            "title": "Map Double",
            "description": "Create `nums = [1, 2, 3, 4, 5]`. Use `map()` and a lambda to double each. Print as a list.",
            "starter_code": "nums = [1, 2, 3, 4, 5]\n\n# Map double\n",
            "test_cases": [{"input": "", "expected_output": "[2, 4, 6, 8, 10]"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Sort by Key",
            "description": "Create `words = [\"banana\", \"apple\", \"cherry\", \"date\"]`. Sort by word length. Print the sorted list.",
            "starter_code": "words = [\"banana\", \"apple\", \"cherry\", \"date\"]\n\n# Sort by length\n",
            "test_cases": [{"input": "", "expected_output": "['date', 'apple', 'banana', 'cherry']"}],
        },
        {
            "title": "Chain Operations",
            "description": "Create `nums = [1, -2, 3, -4, 5, -6, 7]`. Filter to keep positive numbers, then double them, then sort descending. Print the result as a list.",
            "starter_code": "nums = [1, -2, 3, -4, 5, -6, 7]\n\n# Filter, map, sort\n",
            "test_cases": [{"input": "", "expected_output": "[14, 10, 6, 2]"}],
        },
        {
            "title": "Sort Dicts",
            "description": "Create:\n`people = [{\"name\": \"Bob\", \"age\": 25}, {\"name\": \"Alice\", \"age\": 30}, {\"name\": \"Carol\", \"age\": 22}]`\nSort by age and print each name and age.",
            "starter_code": "people = [{\"name\": \"Bob\", \"age\": 25}, {\"name\": \"Alice\", \"age\": 30}, {\"name\": \"Carol\", \"age\": 22}]\n\n# Sort and print\n",
            "test_cases": [{"input": "", "expected_output": "Carol: 22\nBob: 25\nAlice: 30"}],
        },
        {
            "title": "Map with Index",
            "description": "Create `items = [\"apple\", \"banana\", \"cherry\"]`. Use enumerate and a comprehension to create `[\"1. apple\", \"2. banana\", \"3. cherry\"]`. Print the list.",
            "starter_code": "items = [\"apple\", \"banana\", \"cherry\"]\n\n# Number items\n",
            "test_cases": [{"input": "", "expected_output": "['1. apple', '2. banana', '3. cherry']"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Multi-Key Sort",
            "description": "Create:\n`data = [(\"Alice\", 85), (\"Bob\", 92), (\"Carol\", 85), (\"Dave\", 92)]`\nSort by score descending, then by name ascending for ties. Print each.",
            "starter_code": "data = [(\"Alice\", 85), (\"Bob\", 92), (\"Carol\", 85), (\"Dave\", 92)]\n\n# Sort and print\n",
            "test_cases": [{"input": "", "expected_output": "Bob: 92\nDave: 92\nAlice: 85\nCarol: 85"}],
        },
        {
            "title": "Pipeline Processor",
            "description": "Create `data = [\"  Hello  \", \"  WORLD \", \" Python \", \"  \", \" code \"]`. Build a processing pipeline:\n1. Strip whitespace\n2. Filter out empty strings\n3. Convert to lowercase\n4. Sort alphabetically\nPrint each result on a new line.",
            "starter_code": "data = [\"  Hello  \", \"  WORLD \", \" Python \", \"  \", \" code \"]\n\n# Process pipeline\n",
            "test_cases": [{"input": "", "expected_output": "code\nhello\npython\nworld"}],
        },
        {
            "title": "Partition",
            "description": "Create `nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]`. Partition into evens and odds using filter. Print both lists:\n`Evens: [2, 4, 6, 8, 10]`\n`Odds: [1, 3, 5, 7, 9]`",
            "starter_code": "nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]\n\n# Partition\n",
            "test_cases": [{"input": "", "expected_output": "Evens: [2, 4, 6, 8, 10]\nOdds: [1, 3, 5, 7, 9]"}],
        },
    ],

    "Contact Book": [
        # --- Easy (1-3) ---
        {
            "title": "Create Contact",
            "description": "Create a contact dict `contact = {\"name\": \"Alice\", \"phone\": \"555-1234\", \"email\": \"alice@example.com\"}`. Print each field on a separate line.",
            "starter_code": "contact = {\"name\": \"Alice\", \"phone\": \"555-1234\", \"email\": \"alice@example.com\"}\n\n# Print each field\n",
            "test_cases": [{"input": "", "expected_output": "Name: Alice\nPhone: 555-1234\nEmail: alice@example.com"}],
        },
        {
            "title": "Contact List",
            "description": "Create `contacts = [{\"name\": \"Alice\"}, {\"name\": \"Bob\"}, {\"name\": \"Carol\"}]`. Print all names, one per line.",
            "starter_code": "contacts = [{\"name\": \"Alice\"}, {\"name\": \"Bob\"}, {\"name\": \"Carol\"}]\n\n# Print names\n",
            "test_cases": [{"input": "", "expected_output": "Alice\nBob\nCarol"}],
        },
        {
            "title": "Search Contact",
            "description": "Create `contacts = [{\"name\": \"Alice\", \"phone\": \"111\"}, {\"name\": \"Bob\", \"phone\": \"222\"}]`. Search for \"Bob\" and print his phone number.",
            "starter_code": "contacts = [{\"name\": \"Alice\", \"phone\": \"111\"}, {\"name\": \"Bob\", \"phone\": \"222\"}]\n\n# Find Bob's phone\n",
            "test_cases": [{"input": "", "expected_output": "222"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Add Contact",
            "description": "Create `contacts = []`. Add two contacts with name, phone, email. Print the count: `Contacts: 2`.",
            "starter_code": "contacts = []\n\n# Add two contacts\ncontacts.append({\"name\": \"Alice\", \"phone\": \"111\", \"email\": \"a@b.com\"})\ncontacts.append({\"name\": \"Bob\", \"phone\": \"222\", \"email\": \"b@b.com\"})\n\n# Print count\n",
            "test_cases": [{"input": "", "expected_output": "Contacts: 2"}],
        },
        {
            "title": "Sorted Contacts",
            "description": "Create:\n`contacts = [{\"name\": \"Carol\"}, {\"name\": \"Alice\"}, {\"name\": \"Bob\"}]`\nSort by name and print each name.",
            "starter_code": "contacts = [{\"name\": \"Carol\"}, {\"name\": \"Alice\"}, {\"name\": \"Bob\"}]\n\n# Sort and print\n",
            "test_cases": [{"input": "", "expected_output": "Alice\nBob\nCarol"}],
        },
        {
            "title": "Filter by Domain",
            "description": "Create:\n`contacts = [\n    {\"name\": \"Alice\", \"email\": \"alice@gmail.com\"},\n    {\"name\": \"Bob\", \"email\": \"bob@work.com\"},\n    {\"name\": \"Carol\", \"email\": \"carol@gmail.com\"},\n]`\nFilter to gmail.com contacts and print their names.",
            "starter_code": "contacts = [\n    {\"name\": \"Alice\", \"email\": \"alice@gmail.com\"},\n    {\"name\": \"Bob\", \"email\": \"bob@work.com\"},\n    {\"name\": \"Carol\", \"email\": \"carol@gmail.com\"},\n]\n\n# Filter and print\n",
            "test_cases": [{"input": "", "expected_output": "Alice\nCarol"}],
        },
        {
            "title": "Update Contact",
            "description": "Create:\n`contacts = [{\"name\": \"Alice\", \"phone\": \"111\"}, {\"name\": \"Bob\", \"phone\": \"222\"}]`\nUpdate Bob's phone to \"999\". Print the updated contact list showing name and phone for each.",
            "starter_code": "contacts = [{\"name\": \"Alice\", \"phone\": \"111\"}, {\"name\": \"Bob\", \"phone\": \"222\"}]\n\n# Update Bob's phone and print all\n",
            "test_cases": [{"input": "", "expected_output": "Alice: 111\nBob: 999"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Contact Groups",
            "description": "Create:\n`contacts = [\n    {\"name\": \"Alice\", \"group\": \"work\"},\n    {\"name\": \"Bob\", \"group\": \"family\"},\n    {\"name\": \"Carol\", \"group\": \"work\"},\n    {\"name\": \"Dave\", \"group\": \"family\"},\n]`\nGroup by group and print:\n`family: Bob, Dave`\n`work: Alice, Carol`",
            "starter_code": "contacts = [\n    {\"name\": \"Alice\", \"group\": \"work\"},\n    {\"name\": \"Bob\", \"group\": \"family\"},\n    {\"name\": \"Carol\", \"group\": \"work\"},\n    {\"name\": \"Dave\", \"group\": \"family\"},\n]\n\n# Group and print\n",
            "test_cases": [{"input": "", "expected_output": "family: Bob, Dave\nwork: Alice, Carol"}],
        },
        {
            "title": "Duplicate Finder",
            "description": "Create:\n`contacts = [\n    {\"name\": \"Alice\", \"email\": \"alice@test.com\"},\n    {\"name\": \"Bob\", \"email\": \"bob@test.com\"},\n    {\"name\": \"Alice B\", \"email\": \"alice@test.com\"},\n]`\nFind contacts with duplicate emails. Print the duplicate email and the names.",
            "starter_code": "contacts = [\n    {\"name\": \"Alice\", \"email\": \"alice@test.com\"},\n    {\"name\": \"Bob\", \"email\": \"bob@test.com\"},\n    {\"name\": \"Alice B\", \"email\": \"alice@test.com\"},\n]\n\n# Find duplicates\n",
            "test_cases": [{"input": "", "expected_output": "alice@test.com: Alice, Alice B"}],
        },
        {
            "title": "Contact Export",
            "description": "Create:\n`contacts = [\n    {\"name\": \"Alice\", \"phone\": \"111\", \"email\": \"a@b.com\"},\n    {\"name\": \"Bob\", \"phone\": \"222\", \"email\": \"b@b.com\"},\n]`\nExport as CSV format (print header + rows):\n```\nname,phone,email\nAlice,111,a@b.com\nBob,222,b@b.com\n```",
            "starter_code": "contacts = [\n    {\"name\": \"Alice\", \"phone\": \"111\", \"email\": \"a@b.com\"},\n    {\"name\": \"Bob\", \"phone\": \"222\", \"email\": \"b@b.com\"},\n]\n\n# Export as CSV\n",
            "test_cases": [{"input": "", "expected_output": "name,phone,email\nAlice,111,a@b.com\nBob,222,b@b.com"}],
        },
    ],

    # ── Module 4 ────────────────────────────────────────────────────

    "Defining Functions": [
        # --- Easy (1-3) ---
        {
            "title": "Hello Function",
            "description": "Define a function `greet()` that prints \"Hello, World!\". Call it.",
            "starter_code": "# Define and call greet()\n",
            "test_cases": [{"input": "", "expected_output": "Hello, World!"}],
        },
        {
            "title": "Add Two",
            "description": "Define a function `add(a, b)` that returns the sum. Print the result of `add(3, 7)`.",
            "starter_code": "# Define add function\n",
            "test_cases": [{"input": "", "expected_output": "10"}],
        },
        {
            "title": "Is Even",
            "description": "Define a function `is_even(n)` that returns True if n is even, False otherwise. Print the results for 4 and 7.",
            "starter_code": "# Define is_even function\n",
            "test_cases": [{"input": "", "expected_output": "True\nFalse"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Max of Three",
            "description": "Define `max_of_three(a, b, c)` that returns the maximum. Print `max_of_three(5, 12, 8)`.",
            "starter_code": "# Define max_of_three\n",
            "test_cases": [{"input": "", "expected_output": "12"}],
        },
        {
            "title": "Factorial",
            "description": "Define `factorial(n)` that calculates n! using a loop. Print `factorial(6)`.",
            "starter_code": "# Define factorial\n",
            "test_cases": [{"input": "", "expected_output": "720"}],
        },
        {
            "title": "Count Char",
            "description": "Define `count_char(text, char)` that returns how many times char appears in text. Print `count_char(\"mississippi\", \"s\")`.",
            "starter_code": "# Define count_char\n",
            "test_cases": [{"input": "", "expected_output": "4"}],
        },
        {
            "title": "Celsius to Fahrenheit",
            "description": "Define `to_fahrenheit(celsius)` that converts C to F. Print results for 0, 100, and 37 on separate lines, each rounded to 1 decimal.",
            "starter_code": "# Define to_fahrenheit\n",
            "test_cases": [{"input": "", "expected_output": "32.0\n212.0\n98.6"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Palindrome Check",
            "description": "Define `is_palindrome(text)` that checks if text is a palindrome (ignore case and spaces). Print results for \"racecar\" and \"hello\".",
            "starter_code": "# Define is_palindrome\n",
            "test_cases": [{"input": "", "expected_output": "True\nFalse"}],
        },
        {
            "title": "Fibonacci",
            "description": "Define `fibonacci(n)` that returns a list of the first n Fibonacci numbers. Print `fibonacci(8)`.",
            "starter_code": "# Define fibonacci\n",
            "test_cases": [{"input": "", "expected_output": "[0, 1, 1, 2, 3, 5, 8, 13]"}],
        },
        {
            "title": "Flatten Nested",
            "description": "Define `flatten(lst)` that flattens arbitrarily nested lists using recursion. Print `flatten([1, [2, [3, 4], 5], [6, 7]])`.",
            "starter_code": "# Define flatten\n",
            "test_cases": [{"input": "", "expected_output": "[1, 2, 3, 4, 5, 6, 7]"}],
        },
    ],

    "Arguments & Return Values": [
        # --- Easy (1-3) ---
        {
            "title": "Default Argument",
            "description": "Define `greet(name, greeting=\"Hello\")` that returns `f\"{greeting}, {name}!\"`. Print results for `greet(\"Alice\")` and `greet(\"Bob\", \"Hi\")`.",
            "starter_code": "# Define greet with default\n",
            "test_cases": [{"input": "", "expected_output": "Hello, Alice!\nHi, Bob!"}],
        },
        {
            "title": "Multiple Returns",
            "description": "Define `min_max(lst)` that returns both the minimum and maximum. Call with `[3, 7, 1, 9, 4]` and print both values on separate lines.",
            "starter_code": "# Define min_max\n",
            "test_cases": [{"input": "", "expected_output": "1\n9"}],
        },
        {
            "title": "Keyword Arguments",
            "description": "Define `describe(name, age, city)` that prints `<name> is <age> from <city>`. Call using keyword arguments in a different order.",
            "starter_code": "# Define describe\n",
            "test_cases": [{"input": "", "expected_output": "Alice is 30 from NYC"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Flexible Args",
            "description": "Define `total(*args)` that returns the sum of all arguments. Print `total(1, 2, 3)` and `total(10, 20, 30, 40)` on separate lines.",
            "starter_code": "# Define total with *args\n",
            "test_cases": [{"input": "", "expected_output": "6\n100"}],
        },
        {
            "title": "Kwargs Printer",
            "description": "Define `show_info(**kwargs)` that prints each key-value pair sorted by key as `key: value`. Call with `show_info(age=30, city=\"NYC\", name=\"Alice\")`.",
            "starter_code": "# Define show_info\n",
            "test_cases": [{"input": "", "expected_output": "age: 30\ncity: NYC\nname: Alice"}],
        },
        {
            "title": "Return Dict",
            "description": "Define `stats(numbers)` that returns a dict with keys \"min\", \"max\", \"mean\". Call with `[10, 20, 30, 40, 50]` and print each stat on a new line.",
            "starter_code": "# Define stats\n",
            "test_cases": [{"input": "", "expected_output": "min: 10\nmax: 50\nmean: 30.0"}],
        },
        {
            "title": "Unpacking",
            "description": "Define `calculate(a, b, operation=\"add\")`. Supported operations: add, subtract, multiply. Return the result. Print results for all three operations with a=10, b=3.",
            "starter_code": "# Define calculate\n",
            "test_cases": [{"input": "", "expected_output": "13\n7\n30"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Retry Logic",
            "description": "Define `safe_divide(a, b, default=0)` that returns a/b, or default if b is 0. Print results for `safe_divide(10, 3)` rounded to 2 decimals and `safe_divide(5, 0)` on separate lines.",
            "starter_code": "# Define safe_divide\n",
            "test_cases": [{"input": "", "expected_output": "3.33\n0"}],
        },
        {
            "title": "Compose Functions",
            "description": "Define `apply_all(value, *functions)` that applies functions left-to-right. Create `double = lambda x: x * 2` and `add_one = lambda x: x + 1`. Print `apply_all(5, double, add_one)` and `apply_all(5, add_one, double)`.",
            "starter_code": "# Define apply_all and lambdas\n",
            "test_cases": [{"input": "", "expected_output": "11\n12"}],
        },
        {
            "title": "Validate and Process",
            "description": "Define `process_scores(*scores, passing=60)` that returns a dict with keys: \"passed\" (list of passing scores), \"failed\" (list), \"rate\" (pass percentage rounded to 1 decimal). Call with `process_scores(85, 42, 73, 58, 91)` and print each line.",
            "starter_code": "# Define process_scores\n",
            "test_cases": [{"input": "", "expected_output": "Passed: [85, 73, 91]\nFailed: [42, 58]\nRate: 60.0%"}],
        },
    ],

    "Scope & Closures": [
        # --- Easy (1-3) ---
        {
            "title": "Local Scope",
            "description": "Define a function that creates a local variable `x = 10` and prints it. Then print `x = 5` from the global scope. Show that they are different.\n\nExpected output:\n`10`\n`5`",
            "starter_code": "x = 5\n\ndef show_local():\n    # Create local x and print\n    pass\n\nshow_local()\nprint(x)\n",
            "test_cases": [{"input": "", "expected_output": "10\n5"}],
        },
        {
            "title": "Enclosing Scope",
            "description": "Define `outer()` that has a variable `msg = \"hello\"`. Inside, define `inner()` that prints msg. Call inner inside outer. Call outer.",
            "starter_code": "# Define outer with inner\n",
            "test_cases": [{"input": "", "expected_output": "hello"}],
        },
        {
            "title": "Global Keyword",
            "description": "Create `counter = 0`. Define `increment()` that uses `global counter` to add 1. Call it 3 times, then print counter.",
            "starter_code": "counter = 0\n\n# Define increment and call 3 times\n",
            "test_cases": [{"input": "", "expected_output": "3"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Simple Counter Closure",
            "description": "Define `make_counter()` that returns a function. Each call to the returned function increments and returns a count. Print three calls.",
            "starter_code": "# Define make_counter\n",
            "test_cases": [{"input": "", "expected_output": "1\n2\n3"}],
        },
        {
            "title": "Multiplier Factory",
            "description": "Define `make_multiplier(factor)` that returns a function multiplying its arg by factor. Create `double` and `triple`. Print `double(5)` and `triple(5)`.",
            "starter_code": "# Define make_multiplier\n",
            "test_cases": [{"input": "", "expected_output": "10\n15"}],
        },
        {
            "title": "Accumulator",
            "description": "Define `make_accumulator(initial=0)` that returns a function. Each call adds the argument to a running total and returns it. Start at 0, add 5, 10, 3. Print after each.",
            "starter_code": "# Define make_accumulator\n",
            "test_cases": [{"input": "", "expected_output": "5\n15\n18"}],
        },
        {
            "title": "Nonlocal Demo",
            "description": "Define `make_toggle()` that uses `nonlocal` to alternate between True and False on each call. Print 4 calls.",
            "starter_code": "# Define make_toggle\n",
            "test_cases": [{"input": "", "expected_output": "True\nFalse\nTrue\nFalse"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Memoizer",
            "description": "Define `memoize(func)` that caches results. Use it with a function that doubles its input. Call with 3, 5, 3 again. Print each result. (The third call should use cache but output is the same.)",
            "starter_code": "# Define memoize\n",
            "test_cases": [{"input": "", "expected_output": "6\n10\n6"}],
        },
        {
            "title": "Logger Closure",
            "description": "Define `make_logger(prefix)` returning a function that collects messages. The inner function should append `f\"{prefix}: {msg}\"` to a list and return the list length. Create a logger with prefix \"INFO\", log \"start\" and \"end\". Print length after each, then print all messages.",
            "starter_code": "# Define make_logger\n",
            "test_cases": [{"input": "", "expected_output": "1\n2\nINFO: start\nINFO: end"}],
        },
        {
            "title": "Rate Limiter",
            "description": "Define `make_limiter(max_calls)` returning a function. The inner function returns True if under the limit, False if at/over. Create limiter(3), call 5 times, print each result.",
            "starter_code": "# Define make_limiter\n",
            "test_cases": [{"input": "", "expected_output": "True\nTrue\nTrue\nFalse\nFalse"}],
        },
    ],

    "Lambda & Higher-Order": [
        # --- Easy (1-3) ---
        {
            "title": "Simple Lambda",
            "description": "Create a lambda `square` that takes x and returns x**2. Print `square(5)`.",
            "starter_code": "# Create square lambda\n",
            "test_cases": [{"input": "", "expected_output": "25"}],
        },
        {
            "title": "Lambda Sort",
            "description": "Create `pairs = [(1, 'b'), (3, 'a'), (2, 'c')]`. Sort by the second element using a lambda. Print the sorted list.",
            "starter_code": "pairs = [(1, 'b'), (3, 'a'), (2, 'c')]\n\n# Sort by second element\n",
            "test_cases": [{"input": "", "expected_output": "[(3, 'a'), (1, 'b'), (2, 'c')]"}],
        },
        {
            "title": "Map Lambda",
            "description": "Create `nums = [1, 2, 3, 4, 5]`. Use map with a lambda to cube each. Print as a list.",
            "starter_code": "nums = [1, 2, 3, 4, 5]\n\n# Map cube\n",
            "test_cases": [{"input": "", "expected_output": "[1, 8, 27, 64, 125]"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Apply Function",
            "description": "Define `apply(func, value)` that calls func(value). Use it with a lambda that adds 10. Print `apply(lambda x: x + 10, 5)`.",
            "starter_code": "# Define apply and use it\n",
            "test_cases": [{"input": "", "expected_output": "15"}],
        },
        {
            "title": "Filter and Map",
            "description": "Create `words = [\"hello\", \"hi\", \"hey\", \"world\", \"help\"]`. Filter words starting with 'h', then map to uppercase. Print as a list.",
            "starter_code": "words = [\"hello\", \"hi\", \"hey\", \"world\", \"help\"]\n\n# Filter and map\n",
            "test_cases": [{"input": "", "expected_output": "['HELLO', 'HI', 'HEY', 'HELP']"}],
        },
        {
            "title": "Reduce Sum",
            "description": "Import `reduce` from `functools`. Use it with a lambda to sum `[1, 2, 3, 4, 5]`. Print the result.",
            "starter_code": "from functools import reduce\n\nnums = [1, 2, 3, 4, 5]\n\n# Reduce to sum\n",
            "test_cases": [{"input": "", "expected_output": "15"}],
        },
        {
            "title": "Custom Key Sort",
            "description": "Create `data = [\"banana\", \"Apple\", \"cherry\", \"Date\"]`. Sort case-insensitively using a lambda key. Print the sorted list.",
            "starter_code": "data = [\"banana\", \"Apple\", \"cherry\", \"Date\"]\n\n# Sort case-insensitive\n",
            "test_cases": [{"input": "", "expected_output": "['Apple', 'banana', 'cherry', 'Date']"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Function Pipeline",
            "description": "Define `pipeline(*funcs)` that returns a function applying all funcs left-to-right. Create a pipeline: strip, lower, replace spaces with underscores. Apply to `\"  Hello World  \"` and print.",
            "starter_code": "# Define pipeline\n",
            "test_cases": [{"input": "", "expected_output": "hello_world"}],
        },
        {
            "title": "Partition By",
            "description": "Define `partition(pred, iterable)` that returns two lists: items where pred is True and items where it is False. Use with a lambda to partition `[1, 2, 3, 4, 5, 6]` into evens and odds. Print both.",
            "starter_code": "# Define partition\n",
            "test_cases": [{"input": "", "expected_output": "[2, 4, 6]\n[1, 3, 5]"}],
        },
        {
            "title": "Group By Key",
            "description": "Define `group_by(key_func, items)` that groups items by key_func result. Use with `lambda x: len(x)` on `[\"hi\", \"hey\", \"hello\", \"go\", \"bye\", \"good\"]`. Print groups sorted by key.",
            "starter_code": "# Define group_by\n",
            "test_cases": [{"input": "", "expected_output": "2: ['hi', 'go']\n3: ['hey', 'bye']\n4: ['good']\n5: ['hello']"}],
        },
    ],

    "Decorators": [
        # --- Easy (1-3) ---
        {
            "title": "Simple Decorator",
            "description": "Define a decorator `shout` that makes any function's return value uppercase. Decorate a function `greet()` that returns \"hello\". Print the result of calling greet().",
            "starter_code": "# Define shout decorator\n",
            "test_cases": [{"input": "", "expected_output": "HELLO"}],
        },
        {
            "title": "Before After",
            "description": "Define a decorator `wrap` that prints \"Before\" before calling the function and \"After\" after. Apply to a function that prints \"Running\". Call it.",
            "starter_code": "# Define wrap decorator\n",
            "test_cases": [{"input": "", "expected_output": "Before\nRunning\nAfter"}],
        },
        {
            "title": "Call Counter",
            "description": "Define a decorator `count_calls` that tracks how many times a function is called using a `calls` attribute. Decorate `say_hi` that prints \"hi\". Call it 3 times, then print the count.",
            "starter_code": "# Define count_calls decorator\n",
            "test_cases": [{"input": "", "expected_output": "hi\nhi\nhi\n3"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Timer Decorator",
            "description": "Define a decorator `timer` that prints how long a function takes. For testing, decorate a function `work()` that computes `sum(range(100000))` and prints the sum. The timer should print `Time: <seconds>s` (but we just check the sum output).\n\nNote: print only the sum for testing purposes.",
            "starter_code": "# Define timer decorator (simplified)\ndef timer(func):\n    def wrapper(*args, **kwargs):\n        result = func(*args, **kwargs)\n        return result\n    return wrapper\n\n@timer\ndef work():\n    print(sum(range(100000)))\n\nwork()\n",
            "test_cases": [{"input": "", "expected_output": "4999950000"}],
        },
        {
            "title": "Decorator with Args",
            "description": "Define a decorator `repeat(n)` that calls the decorated function n times. Decorate `say_hello` with `@repeat(3)`. It should print \"hello\" each time.",
            "starter_code": "# Define repeat decorator\n",
            "test_cases": [{"input": "", "expected_output": "hello\nhello\nhello"}],
        },
        {
            "title": "Validate Args",
            "description": "Define a decorator `positive_args` that checks all positional args are positive numbers before calling the function. If any are not, print \"Invalid input\". Apply to `add(a, b)`. Test with add(3, 5) and add(-1, 5).",
            "starter_code": "# Define positive_args decorator\n",
            "test_cases": [{"input": "", "expected_output": "8\nInvalid input"}],
        },
        {
            "title": "Cache Decorator",
            "description": "Define a `cache` decorator that memoizes results. Apply to `fib(n)` computing Fibonacci recursively. Print `fib(10)`.",
            "starter_code": "# Define cache decorator\n",
            "test_cases": [{"input": "", "expected_output": "55"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Retry Decorator",
            "description": "Define `retry(max_attempts)` decorator. Simulate a function `flaky()` that uses a counter and succeeds on the 3rd call (prints \"Success on attempt 3\"). Use `@retry(5)`.",
            "starter_code": "# Define retry decorator\nattempt_count = 0\n\ndef retry(max_attempts):\n    def decorator(func):\n        def wrapper(*args, **kwargs):\n            for i in range(1, max_attempts + 1):\n                result = func(i)\n                if result:\n                    return result\n        return wrapper\n    return decorator\n\n@retry(5)\ndef flaky(attempt):\n    if attempt >= 3:\n        print(f\"Success on attempt {attempt}\")\n        return True\n    return False\n\nflaky()\n",
            "test_cases": [{"input": "", "expected_output": "Success on attempt 3"}],
        },
        {
            "title": "Debug Decorator",
            "description": "Define a `debug` decorator that prints the function name and arguments when called, then prints the return value. Apply to `add(a, b)`. Call `add(3, 5)`.",
            "starter_code": "# Define debug decorator\n",
            "test_cases": [{"input": "", "expected_output": "Calling add(3, 5)\nReturned: 8"}],
        },
        {
            "title": "Access Control",
            "description": "Define `require_role(role)` decorator that checks a global `current_user` dict for the required role. Define `current_user = {\"name\": \"Alice\", \"role\": \"admin\"}`. Apply `@require_role(\"admin\")` to `delete_item()` that prints \"Item deleted\". Also apply `@require_role(\"superadmin\")` to `wipe_all()` that prints \"All wiped\". Call both.",
            "starter_code": "current_user = {\"name\": \"Alice\", \"role\": \"admin\"}\n\n# Define require_role decorator\n",
            "test_cases": [{"input": "", "expected_output": "Item deleted\nAccess denied"}],
        },
    ],

    "Password Strength": [
        # --- Easy (1-3) ---
        {
            "title": "Length Check",
            "description": "Define `check_length(password)` that returns True if password is 8+ characters. Print results for \"abc\" and \"strongpass\".",
            "starter_code": "# Define check_length\n",
            "test_cases": [{"input": "", "expected_output": "False\nTrue"}],
        },
        {
            "title": "Has Digit",
            "description": "Define `has_digit(password)` that returns True if password contains at least one digit. Print results for \"hello\" and \"hello1\".",
            "starter_code": "# Define has_digit\n",
            "test_cases": [{"input": "", "expected_output": "False\nTrue"}],
        },
        {
            "title": "Has Upper",
            "description": "Define `has_upper(password)` that returns True if it contains an uppercase letter. Print results for \"hello\" and \"Hello\".",
            "starter_code": "# Define has_upper\n",
            "test_cases": [{"input": "", "expected_output": "False\nTrue"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Strength Score",
            "description": "Define `strength_score(password)` that returns a score 0-4:\n+1 for length >= 8\n+1 for has uppercase\n+1 for has lowercase\n+1 for has digit\nPrint scores for \"ab\", \"abcdefgh\", \"Abcdefg1\".",
            "starter_code": "# Define strength_score\n",
            "test_cases": [{"input": "", "expected_output": "1\n2\n4"}],
        },
        {
            "title": "Label Strength",
            "description": "Define `label(password)` that returns:\n0-1: \"Weak\"\n2: \"Fair\"\n3: \"Good\"\n4: \"Strong\"\nPrint labels for \"ab\", \"abcdefgh\", \"Abcdefg1\".",
            "starter_code": "# Define strength scoring and labeling\n",
            "test_cases": [{"input": "", "expected_output": "Weak\nFair\nStrong"}],
        },
        {
            "title": "Special Chars",
            "description": "Define `has_special(password)` that checks for any of `!@#$%^&*`. Print results for \"hello\" and \"h@llo\".",
            "starter_code": "# Define has_special\n",
            "test_cases": [{"input": "", "expected_output": "False\nTrue"}],
        },
        {
            "title": "Feedback Messages",
            "description": "Define `feedback(password)` that returns a list of improvement suggestions. For \"abc\" print each suggestion:\n`Too short (need 8+ characters)`\n`Add an uppercase letter`\n`Add a digit`\n`Add a special character (!@#$%^&*)`",
            "starter_code": "# Define feedback\n",
            "test_cases": [{"input": "", "expected_output": "Too short (need 8+ characters)\nAdd an uppercase letter\nAdd a digit\nAdd a special character (!@#$%^&*)"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Common Password Check",
            "description": "Define `is_common(password)` with a list of common passwords: [\"password\", \"123456\", \"qwerty\", \"abc123\"]. Return True if password (case-insensitive) is common. Print results for \"Password\" and \"MyStr0ng!\".",
            "starter_code": "# Define is_common\n",
            "test_cases": [{"input": "", "expected_output": "True\nFalse"}],
        },
        {
            "title": "Full Validator",
            "description": "Define `validate(password)` combining all checks. For \"Str0ng!Pass\" print:\n`Length: PASS`\n`Uppercase: PASS`\n`Lowercase: PASS`\n`Digit: PASS`\n`Special: PASS`\n`Strength: Strong`",
            "starter_code": "# Define full validator\n",
            "test_cases": [{"input": "", "expected_output": "Length: PASS\nUppercase: PASS\nLowercase: PASS\nDigit: PASS\nSpecial: PASS\nStrength: Strong"}],
        },
        {
            "title": "Password Generator Hint",
            "description": "Define `suggest_improvement(password)` that takes a weak password and suggests a specific improvement. For \"hello\" print:\n`Current: hello (Weak)`\n`Suggestion: Add length, uppercase, digit, and special character`\n`Example fix: Hello123!xx`\nNote: The example fix should satisfy all criteria.",
            "starter_code": "# Define suggest_improvement\n",
            "test_cases": [{"input": "", "expected_output": "Current: hello (Weak)\nSuggestion: Add length, uppercase, digit, and special character\nExample fix: Hello123!xx"}],
        },
    ],

    # ── Module 5 ────────────────────────────────────────────────────

    "Classes & Objects": [
        # --- Easy (1-3) ---
        {
            "title": "First Class",
            "description": "Define a class `Dog` with `__init__(self, name)`. Create a dog named \"Rex\" and print `dog.name`.",
            "starter_code": "# Define Dog class\n",
            "test_cases": [{"input": "", "expected_output": "Rex"}],
        },
        {
            "title": "Method Call",
            "description": "Define a class `Dog` with `name` attribute and a `bark()` method that prints \"Woof!\". Create a Dog named \"Rex\" and call bark().",
            "starter_code": "# Define Dog class with bark\n",
            "test_cases": [{"input": "", "expected_output": "Woof!"}],
        },
        {
            "title": "Two Instances",
            "description": "Define class `Point` with x and y attributes. Create `p1 = Point(1, 2)` and `p2 = Point(3, 4)`. Print each point as `(x, y)`.",
            "starter_code": "# Define Point class\n",
            "test_cases": [{"input": "", "expected_output": "(1, 2)\n(3, 4)"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Counter Class",
            "description": "Define class `Counter` with methods `increment()`, `decrement()`, and `get_value()`. Start at 0, increment 3 times, decrement once, print value.",
            "starter_code": "# Define Counter class\n",
            "test_cases": [{"input": "", "expected_output": "2"}],
        },
        {
            "title": "Rectangle Class",
            "description": "Define `Rectangle` with width and height. Add `area()` and `perimeter()` methods. Create one 5x3. Print area and perimeter on separate lines.",
            "starter_code": "# Define Rectangle class\n",
            "test_cases": [{"input": "", "expected_output": "15\n16"}],
        },
        {
            "title": "BankAccount",
            "description": "Define `BankAccount` with owner and balance. Add `deposit(amount)` and `withdraw(amount)` methods (prevent overdraft). Create account for \"Alice\" with $100. Deposit $50, withdraw $30, try to withdraw $200. Print balance after each operation.",
            "starter_code": "# Define BankAccount class\n",
            "test_cases": [{"input": "", "expected_output": "150\n120\n120"}],
        },
        {
            "title": "Student Class",
            "description": "Define `Student` with name and a list of grades. Add `add_grade(grade)`, `average()`, and `highest()` methods. Create student \"Alice\", add grades 85, 92, 78. Print average rounded to 1 decimal and highest.",
            "starter_code": "# Define Student class\n",
            "test_cases": [{"input": "", "expected_output": "85.0\n92"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Inventory Item",
            "description": "Define `Item` with name, price, quantity. Add `total_value()` and `__str__()` returning `name: qty @ $price`. Create item \"Widget\", $9.99, qty 5. Print the item and total value.",
            "starter_code": "# Define Item class\n",
            "test_cases": [{"input": "", "expected_output": "Widget: 5 @ $9.99\n49.95"}],
        },
        {
            "title": "Linked List Node",
            "description": "Define `Node` with value and next. Create a chain: 1 -> 2 -> 3 -> None. Traverse and print each value.",
            "starter_code": "# Define Node class\n",
            "test_cases": [{"input": "", "expected_output": "1\n2\n3"}],
        },
        {
            "title": "Stack Class",
            "description": "Define `Stack` with push, pop, peek, is_empty, and size methods. Push 1, 2, 3. Pop once. Print peek, size, and is_empty on separate lines.",
            "starter_code": "# Define Stack class\n",
            "test_cases": [{"input": "", "expected_output": "2\n2\nFalse"}],
        },
    ],

    "Methods & Properties": [
        # --- Easy (1-3) ---
        {
            "title": "Property Getter",
            "description": "Define class `Circle` with radius. Add a `diameter` property (radius * 2). Create with radius=5, print diameter.",
            "starter_code": "# Define Circle with property\n",
            "test_cases": [{"input": "", "expected_output": "10"}],
        },
        {
            "title": "Read Only",
            "description": "Define class `Person` with `_name` set in __init__. Add a `name` property (getter only). Create Person(\"Alice\"), print name.",
            "starter_code": "# Define Person with read-only name\n",
            "test_cases": [{"input": "", "expected_output": "Alice"}],
        },
        {
            "title": "String Method",
            "description": "Define class `Color` with r, g, b. Add `__str__` returning `rgb(r, g, b)`. Print `Color(255, 128, 0)`.",
            "starter_code": "# Define Color class\n",
            "test_cases": [{"input": "", "expected_output": "rgb(255, 128, 0)"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Setter Validation",
            "description": "Define `Temperature` with a `celsius` property. The setter should reject values below -273.15, printing \"Invalid temperature\" instead. Set to 25 (print it), then try -300.",
            "starter_code": "# Define Temperature with validated setter\n",
            "test_cases": [{"input": "", "expected_output": "25\nInvalid temperature"}],
        },
        {
            "title": "Computed Property",
            "description": "Define `Rectangle` with width and height properties. Add read-only `area` property. Create 5x3, print area. Change width to 10, print area again.",
            "starter_code": "# Define Rectangle with computed area\n",
            "test_cases": [{"input": "", "expected_output": "15\n30"}],
        },
        {
            "title": "Class Method",
            "description": "Define `Date` with day, month, year. Add a classmethod `from_string(date_str)` parsing \"DD-MM-YYYY\". Create from \"25-12-2025\" and print `25/12/2025`.",
            "starter_code": "# Define Date with classmethod\n",
            "test_cases": [{"input": "", "expected_output": "25/12/2025"}],
        },
        {
            "title": "Static Method",
            "description": "Define `MathUtils` with a staticmethod `is_prime(n)`. Print results for 7 and 10.",
            "starter_code": "# Define MathUtils\n",
            "test_cases": [{"input": "", "expected_output": "True\nFalse"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Chainable Methods",
            "description": "Define `Builder` with methods `set_name(name)`, `set_age(age)`, `set_city(city)` that return `self`. Add `build()` returning a string. Chain: `Builder().set_name(\"Alice\").set_age(30).set_city(\"NYC\").build()`. Print it.",
            "starter_code": "# Define Builder\n",
            "test_cases": [{"input": "", "expected_output": "Alice, 30, NYC"}],
        },
        {
            "title": "Descriptor Protocol",
            "description": "Define `Positive` descriptor that only allows positive numbers. Use it in `Product` class for `price`. Create Product with price=10, print it. Try setting to -5, print the error message \"Price must be positive\".",
            "starter_code": "# Define Positive descriptor and Product\n",
            "test_cases": [{"input": "", "expected_output": "10\nPrice must be positive"}],
        },
        {
            "title": "Cached Property",
            "description": "Define class `DataSet` that takes a list of numbers. Add a property `stats` that computes min, max, mean (cached after first call). Create with [4, 8, 2, 6]. Print stats as `min=2, max=8, mean=5.0`.",
            "starter_code": "# Define DataSet with cached stats\n",
            "test_cases": [{"input": "", "expected_output": "min=2, max=8, mean=5.0"}],
        },
    ],

    "Inheritance & Polymorphism": [
        # --- Easy (1-3) ---
        {
            "title": "Basic Inheritance",
            "description": "Define `Animal` with `name` and `speak()` returning \"...\". Define `Dog(Animal)` overriding speak to return \"Woof!\". Create Dog(\"Rex\"), print name and speak().",
            "starter_code": "# Define Animal and Dog\n",
            "test_cases": [{"input": "", "expected_output": "Rex\nWoof!"}],
        },
        {
            "title": "Super Init",
            "description": "Define `Vehicle` with `make` and `year`. Define `Car(Vehicle)` adding `doors`. Use `super().__init__()`. Create Car(\"Toyota\", 2023, 4). Print make, year, doors on separate lines.",
            "starter_code": "# Define Vehicle and Car\n",
            "test_cases": [{"input": "", "expected_output": "Toyota\n2023\n4"}],
        },
        {
            "title": "Method Override",
            "description": "Define `Shape` with `area()` returning 0. Define `Square(Shape)` with side, overriding area. Create Square(5), print area.",
            "starter_code": "# Define Shape and Square\n",
            "test_cases": [{"input": "", "expected_output": "25"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Polymorphic Loop",
            "description": "Define `Shape` with `area()`. Define `Circle(Shape)` and `Rectangle(Shape)`. Create shapes list with Circle(r=5, pi=3.14159) and Rectangle(4, 6). Loop and print each area rounded to 2 decimals.",
            "starter_code": "# Define Shape hierarchy\n",
            "test_cases": [{"input": "", "expected_output": "78.54\n24"}],
        },
        {
            "title": "Isinstance Check",
            "description": "Define `Animal`, `Dog(Animal)`, `Cat(Animal)`. Create a list of 2 dogs and 1 cat. Count each type and print:\n`Dogs: 2`\n`Cats: 1`",
            "starter_code": "# Define classes and count\n",
            "test_cases": [{"input": "", "expected_output": "Dogs: 2\nCats: 1"}],
        },
        {
            "title": "Abstract Style",
            "description": "Define `Employee` with `name` and abstract-style `salary()` raising NotImplementedError. Define `FullTime(Employee)` (fixed salary) and `Contractor(Employee)` (hourly * hours). Print salaries for each.",
            "starter_code": "# Define Employee hierarchy\n",
            "test_cases": [{"input": "", "expected_output": "5000\n4800"}],
        },
        {
            "title": "Multi-Level",
            "description": "Define `A` with method `greet()` printing \"A\". Define `B(A)` overriding to print \"B\" then call super. Define `C(B)` overriding to print \"C\" then call super. Create C() and call greet().",
            "starter_code": "# Define A, B, C\n",
            "test_cases": [{"input": "", "expected_output": "C\nB\nA"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Mixin Pattern",
            "description": "Define `JsonMixin` with `to_json()` using `json.dumps()` on `__dict__`. Define `Person(JsonMixin)` with name and age. Create Person(\"Alice\", 30) and print to_json().",
            "starter_code": "import json\n\n# Define mixin and Person\n",
            "test_cases": [{"input": "", "expected_output": "{\"name\": \"Alice\", \"age\": 30}"}],
        },
        {
            "title": "Factory Pattern",
            "description": "Define `Shape` with classmethod `create(shape_type, **kwargs)` that returns Circle or Rectangle. Create both via factory and print areas.\n\nUse create(\"circle\", radius=5) and create(\"rectangle\", width=4, height=6).",
            "starter_code": "# Define Shape factory\n",
            "test_cases": [{"input": "", "expected_output": "78.54\n24"}],
        },
        {
            "title": "Plugin System",
            "description": "Define `Plugin` base with `name` and `execute()`. Define `UpperPlugin`, `ReversePlugin`. Create a `Pipeline` that chains plugins. Process \"hello\" through Upper then Reverse. Print result.",
            "starter_code": "# Define plugin system\n",
            "test_cases": [{"input": "", "expected_output": "OLLEH"}],
        },
    ],

    "Dunder Methods": [
        # --- Easy (1-3) ---
        {
            "title": "Str and Repr",
            "description": "Define `Point` with x, y. `__str__` returns `(x, y)` and `__repr__` returns `Point(x, y)`. Print both using print() and repr().",
            "starter_code": "# Define Point with __str__ and __repr__\n",
            "test_cases": [{"input": "", "expected_output": "(3, 4)\nPoint(3, 4)"}],
        },
        {
            "title": "Len Method",
            "description": "Define `Playlist` with a songs list. Implement `__len__`. Create with 3 songs, print len.",
            "starter_code": "# Define Playlist\n",
            "test_cases": [{"input": "", "expected_output": "3"}],
        },
        {
            "title": "Equality",
            "description": "Define `Color` with r, g, b. Implement `__eq__`. Print whether Color(255, 0, 0) == Color(255, 0, 0) and Color(255, 0, 0) == Color(0, 255, 0).",
            "starter_code": "# Define Color with __eq__\n",
            "test_cases": [{"input": "", "expected_output": "True\nFalse"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Add Operator",
            "description": "Define `Vector` with x, y. Implement `__add__` and `__str__`. Add Vector(1, 2) + Vector(3, 4). Print result.",
            "starter_code": "# Define Vector\n",
            "test_cases": [{"input": "", "expected_output": "Vector(4, 6)"}],
        },
        {
            "title": "Comparison",
            "description": "Define `Temperature` with celsius. Implement `__lt__`, `__le__`, `__gt__`, `__ge__`, `__eq__`. Compare 20C vs 30C. Print <, ==, > results.",
            "starter_code": "# Define Temperature with comparisons\n",
            "test_cases": [{"input": "", "expected_output": "True\nFalse\nFalse"}],
        },
        {
            "title": "Getitem",
            "description": "Define `Matrix` wrapping a 2D list. Implement `__getitem__` for row,col access. Create 3x3, print element at [1][2].",
            "starter_code": "# Define Matrix\n",
            "test_cases": [{"input": "", "expected_output": "6"}],
        },
        {
            "title": "Contains",
            "description": "Define `Bag` with items list. Implement `__contains__` and `__len__`. Create with [\"apple\", \"banana\"]. Print `\"apple\" in bag` and `\"cherry\" in bag`.",
            "starter_code": "# Define Bag\n",
            "test_cases": [{"input": "", "expected_output": "True\nFalse"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Iterator",
            "description": "Define `Countdown` that implements `__iter__` and `__next__` counting from n down to 1. Print Countdown(5) using a for loop.",
            "starter_code": "# Define Countdown iterator\n",
            "test_cases": [{"input": "", "expected_output": "5\n4\n3\n2\n1"}],
        },
        {
            "title": "Context Manager",
            "description": "Define `Indenter` context manager using `__enter__`/`__exit__`. It tracks indent level. Print indented text:\n```\nHello\n    World\n        Deep\n    World\nHello\n```\nUse nested with blocks.",
            "starter_code": "# Define Indenter\nclass Indenter:\n    def __init__(self):\n        self.level = 0\n    def __enter__(self):\n        self.level += 1\n        return self\n    def __exit__(self, *args):\n        self.level -= 1\n    def print(self, text):\n        print(\"    \" * self.level + text)\n\nind = Indenter()\nind.print(\"Hello\")\nwith ind:\n    ind.print(\"World\")\n    with ind:\n        ind.print(\"Deep\")\n    ind.print(\"World\")\nind.print(\"Hello\")\n",
            "test_cases": [{"input": "", "expected_output": "Hello\n    World\n        Deep\n    World\nHello"}],
        },
        {
            "title": "Callable Class",
            "description": "Define `Adder` with `__init__(self, n)` and `__call__(self, x)` returning x + n. Create adder5 = Adder(5). Print adder5(3) and adder5(10).",
            "starter_code": "# Define Adder\n",
            "test_cases": [{"input": "", "expected_output": "8\n15"}],
        },
    ],

    "Dataclasses": [
        # --- Easy (1-3) ---
        {
            "title": "Basic Dataclass",
            "description": "Define a dataclass `Point` with x and y (both int). Create Point(3, 4) and print it.",
            "starter_code": "from dataclasses import dataclass\n\n# Define Point dataclass\n",
            "test_cases": [{"input": "", "expected_output": "Point(x=3, y=4)"}],
        },
        {
            "title": "Default Values",
            "description": "Define dataclass `Config` with host (str, default \"localhost\") and port (int, default 8080). Create with defaults and print.",
            "starter_code": "from dataclasses import dataclass\n\n# Define Config\n",
            "test_cases": [{"input": "", "expected_output": "Config(host='localhost', port=8080)"}],
        },
        {
            "title": "Equality",
            "description": "Define dataclass `Color` with r, g, b. Create two identical colors and print whether they are equal.",
            "starter_code": "from dataclasses import dataclass\n\n# Define Color\n",
            "test_cases": [{"input": "", "expected_output": "True"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Post Init",
            "description": "Define dataclass `Rectangle` with width and height. Use `__post_init__` to compute `area`. Print the area for Rectangle(5, 3).",
            "starter_code": "from dataclasses import dataclass, field\n\n# Define Rectangle\n",
            "test_cases": [{"input": "", "expected_output": "15"}],
        },
        {
            "title": "Frozen Dataclass",
            "description": "Define a frozen dataclass `Coordinate` with lat and lon. Create one, print it. Try to modify lat and catch the error, printing \"Cannot modify frozen dataclass\".",
            "starter_code": "from dataclasses import dataclass\n\n# Define frozen Coordinate\n",
            "test_cases": [{"input": "", "expected_output": "Coordinate(lat=40.7, lon=-74.0)\nCannot modify frozen dataclass"}],
        },
        {
            "title": "Field with Factory",
            "description": "Define dataclass `Student` with name and grades (list, default_factory=list). Create student, add grades 85, 92. Print name and grades.",
            "starter_code": "from dataclasses import dataclass, field\n\n# Define Student\n",
            "test_cases": [{"input": "", "expected_output": "Alice\n[85, 92]"}],
        },
        {
            "title": "Ordering",
            "description": "Define dataclass with `order=True`. `Product` has name and price. Create 3 products, sort them by price, and print each name and price.",
            "starter_code": "from dataclasses import dataclass\n\n# Define Product with ordering\n",
            "test_cases": [{"input": "", "expected_output": "Pen: $1.50\nBook: $12.99\nLaptop: $999.99"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Nested Dataclass",
            "description": "Define `Address` dataclass (street, city) and `Person` dataclass (name, address: Address). Create and print the person's city.",
            "starter_code": "from dataclasses import dataclass\n\n# Define Address and Person\n",
            "test_cases": [{"input": "", "expected_output": "NYC"}],
        },
        {
            "title": "Dataclass to Dict",
            "description": "Define dataclass `User` with name, age, email. Use `dataclasses.asdict()` to convert to dict. Print the dict.",
            "starter_code": "from dataclasses import dataclass, asdict\n\n# Define User\n",
            "test_cases": [{"input": "", "expected_output": "{'name': 'Alice', 'age': 30, 'email': 'alice@test.com'}"}],
        },
        {
            "title": "Validated Dataclass",
            "description": "Define dataclass `Score` with value (int). Use `__post_init__` to validate value is 0-100, raising ValueError otherwise. Create Score(85) and print. Try Score(150) and catch error, printing \"Invalid score\".",
            "starter_code": "from dataclasses import dataclass\n\n# Define Score with validation\n",
            "test_cases": [{"input": "", "expected_output": "Score(value=85)\nInvalid score"}],
        },
    ],

    "Library Management": [
        # --- Easy (1-3) ---
        {
            "title": "Book Class",
            "description": "Define dataclass `Book` with title, author, isbn. Create a book and print its title.",
            "starter_code": "from dataclasses import dataclass\n\n# Define Book\n",
            "test_cases": [{"input": "", "expected_output": "Python Crash Course"}],
        },
        {
            "title": "Library Init",
            "description": "Define `Library` class with a `books` list. Add a method `add_book(book)`. Add 2 books and print the count.",
            "starter_code": "from dataclasses import dataclass\n\n# Define Book and Library\n",
            "test_cases": [{"input": "", "expected_output": "2"}],
        },
        {
            "title": "Find Book",
            "description": "Define a library with books. Add `find_by_title(title)` that returns the book or None. Search for \"Python\" and print its author.",
            "starter_code": "from dataclasses import dataclass\n\n# Define classes and search\n",
            "test_cases": [{"input": "", "expected_output": "Eric Matthes"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Checkout System",
            "description": "Add `is_checked_out` to Book (default False). Add `checkout()` and `return_book()` methods. Checkout a book, print status, return it, print status again.",
            "starter_code": "from dataclasses import dataclass, field\n\n# Define Book with checkout\n",
            "test_cases": [{"input": "", "expected_output": "True\nFalse"}],
        },
        {
            "title": "Search by Author",
            "description": "Define Library with `find_by_author(author)`. Add 3 books (2 by same author). Search and print titles found.",
            "starter_code": "from dataclasses import dataclass\n\n# Define and search\n",
            "test_cases": [{"input": "", "expected_output": "Book A\nBook B"}],
        },
        {
            "title": "Available Books",
            "description": "Define Library with `available_books()` returning non-checked-out books. Add 3 books, checkout 1. Print count of available.",
            "starter_code": "from dataclasses import dataclass, field\n\n# Define and test\n",
            "test_cases": [{"input": "", "expected_output": "2"}],
        },
        {
            "title": "Late Fee",
            "description": "Define `calculate_fee(days_late)` where fee is $0.50 per day, max $25. Print fees for 3 days and 60 days.",
            "starter_code": "# Define calculate_fee\n",
            "test_cases": [{"input": "", "expected_output": "$1.50\n$25.00"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Member System",
            "description": "Define `Member` with name and borrowed_books list. Add `borrow(book)` (max 3 books) and `return_book(book)`. Borrow 3, try 4th. Print count and error message.",
            "starter_code": "from dataclasses import dataclass, field\n\n# Define Member\n",
            "test_cases": [{"input": "", "expected_output": "3\nBorrow limit reached"}],
        },
        {
            "title": "Genre Stats",
            "description": "Define books with genre attribute. Create 5 books across 3 genres. Print genre counts sorted alphabetically:\n`Fiction: 2`\n`Science: 2`\n`Tech: 1`",
            "starter_code": "from dataclasses import dataclass\n\n# Define and count genres\n",
            "test_cases": [{"input": "", "expected_output": "Fiction: 2\nScience: 2\nTech: 1"}],
        },
        {
            "title": "Library Report",
            "description": "Create a library with 4 books, 2 checked out. Print a report:\n```\nTotal books: 4\nChecked out: 2\nAvailable: 2\nMost popular author: Smith (2 books)\n```",
            "starter_code": "from dataclasses import dataclass, field\n\n# Define classes and generate report\n",
            "test_cases": [{"input": "", "expected_output": "Total books: 4\nChecked out: 2\nAvailable: 2\nMost popular author: Smith (2 books)"}],
        },
    ],

    # ── Module 6 ────────────────────────────────────────────────────

    "Reading & Writing Files": [
        # --- Easy (1-3) ---
        {
            "title": "Write and Read",
            "description": "Write \"Hello, File!\" to a file, read it back, and print the contents. Use a temporary approach.",
            "starter_code": "import tempfile, os\n\npath = os.path.join(tempfile.gettempdir(), \"test_rw.txt\")\n\n# Write and read back\n",
            "test_cases": [{"input": "", "expected_output": "Hello, File!"}],
        },
        {
            "title": "Write Lines",
            "description": "Write three lines to a file, read them all, and print them.",
            "starter_code": "import tempfile, os\n\npath = os.path.join(tempfile.gettempdir(), \"test_lines.txt\")\nlines = [\"Line 1\", \"Line 2\", \"Line 3\"]\n\n# Write lines and read back\n",
            "test_cases": [{"input": "", "expected_output": "Line 1\nLine 2\nLine 3"}],
        },
        {
            "title": "Line Count",
            "description": "Write 5 lines to a file. Read and print the line count.",
            "starter_code": "import tempfile, os\n\npath = os.path.join(tempfile.gettempdir(), \"test_count.txt\")\n\nwith open(path, 'w') as f:\n    for i in range(5):\n        f.write(f\"Line {i+1}\\n\")\n\n# Count lines\n",
            "test_cases": [{"input": "", "expected_output": "5"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Append Mode",
            "description": "Write \"First\" to a file, then append \"Second\". Read and print all contents.",
            "starter_code": "import tempfile, os\n\npath = os.path.join(tempfile.gettempdir(), \"test_append.txt\")\n\n# Write, append, read\n",
            "test_cases": [{"input": "", "expected_output": "First\nSecond"}],
        },
        {
            "title": "Word Count",
            "description": "Write \"The quick brown fox jumps over the lazy dog\" to a file. Read it and print the word count.",
            "starter_code": "import tempfile, os\n\npath = os.path.join(tempfile.gettempdir(), \"test_wc.txt\")\n\n# Write, read, count words\n",
            "test_cases": [{"input": "", "expected_output": "9"}],
        },
        {
            "title": "Search in File",
            "description": "Write 3 lines to a file. Search for lines containing \"Python\" and print them.",
            "starter_code": "import tempfile, os\n\npath = os.path.join(tempfile.gettempdir(), \"test_search.txt\")\nlines = [\"I love Python\", \"Java is okay\", \"Python is great\"]\n\nwith open(path, 'w') as f:\n    f.write('\\n'.join(lines))\n\n# Search and print matching lines\n",
            "test_cases": [{"input": "", "expected_output": "I love Python\nPython is great"}],
        },
        {
            "title": "File Stats",
            "description": "Write some text to a file. Print the number of characters, words, and lines.",
            "starter_code": "import tempfile, os\n\npath = os.path.join(tempfile.gettempdir(), \"test_stats.txt\")\ntext = \"Hello World\\nPython is fun\\nBye\"\n\nwith open(path, 'w') as f:\n    f.write(text)\n\n# Read and print stats\n",
            "test_cases": [{"input": "", "expected_output": "Characters: 29\nWords: 6\nLines: 3"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Config Parser",
            "description": "Write a simple config file with key=value pairs. Parse it into a dict and print sorted keys and values.",
            "starter_code": "import tempfile, os\n\npath = os.path.join(tempfile.gettempdir(), \"test_config.txt\")\nconfig_text = \"host=localhost\\nport=8080\\ndebug=true\"\n\nwith open(path, 'w') as f:\n    f.write(config_text)\n\n# Parse and print\n",
            "test_cases": [{"input": "", "expected_output": "debug=true\nhost=localhost\nport=8080"}],
        },
        {
            "title": "Log Analyzer",
            "description": "Write log entries and analyze them. Print counts per level.",
            "starter_code": "import tempfile, os\n\npath = os.path.join(tempfile.gettempdir(), \"test_log.txt\")\nlogs = \"INFO: Started\\nERROR: Failed\\nINFO: Running\\nWARN: Slow\\nERROR: Crash\"\n\nwith open(path, 'w') as f:\n    f.write(logs)\n\n# Analyze logs\n",
            "test_cases": [{"input": "", "expected_output": "ERROR: 2\nINFO: 2\nWARN: 1"}],
        },
        {
            "title": "Merge Files",
            "description": "Write to two files, merge their sorted unique lines, and print the result.",
            "starter_code": "import tempfile, os\n\ndir = tempfile.gettempdir()\np1 = os.path.join(dir, \"merge1.txt\")\np2 = os.path.join(dir, \"merge2.txt\")\n\nwith open(p1, 'w') as f:\n    f.write(\"banana\\napple\\ncherry\")\nwith open(p2, 'w') as f:\n    f.write(\"date\\napple\\nfig\")\n\n# Merge sorted unique lines\n",
            "test_cases": [{"input": "", "expected_output": "apple\nbanana\ncherry\ndate\nfig"}],
        },
    ],

    "JSON & CSV": [
        # --- Easy (1-3) ---
        {
            "title": "Parse JSON",
            "description": "Parse a JSON string and print one field.",
            "starter_code": "import json\n\ndata = '{\"name\": \"Alice\", \"age\": 30}'\n\n# Parse and print name\n",
            "test_cases": [{"input": "", "expected_output": "Alice"}],
        },
        {
            "title": "Create JSON",
            "description": "Create a dict and convert to JSON string. Print it.",
            "starter_code": "import json\n\nperson = {\"name\": \"Bob\", \"age\": 25}\n\n# Convert and print\n",
            "test_cases": [{"input": "", "expected_output": "{\"name\": \"Bob\", \"age\": 25}"}],
        },
        {
            "title": "Parse CSV Line",
            "description": "Parse a CSV string manually (split by comma). Print each field.",
            "starter_code": "line = \"Alice,30,NYC\"\n\n# Split and print fields\n",
            "test_cases": [{"input": "", "expected_output": "Alice\n30\nNYC"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "JSON List",
            "description": "Parse a JSON array string and print the count and first item's name.",
            "starter_code": "import json\n\ndata = '[{\"name\": \"Alice\"}, {\"name\": \"Bob\"}, {\"name\": \"Carol\"}]'\n\n# Parse and print\n",
            "test_cases": [{"input": "", "expected_output": "3\nAlice"}],
        },
        {
            "title": "CSV to Dicts",
            "description": "Parse a CSV string (with header) into list of dicts. Print each person's name.",
            "starter_code": "import csv\nimport io\n\ncsv_data = \"name,age,city\\nAlice,30,NYC\\nBob,25,LA\"\n\n# Parse and print names\n",
            "test_cases": [{"input": "", "expected_output": "Alice\nBob"}],
        },
        {
            "title": "Nested JSON",
            "description": "Parse nested JSON and extract deep values.",
            "starter_code": "import json\n\ndata = '{\"company\": {\"name\": \"Acme\", \"employees\": [{\"name\": \"Alice\"}, {\"name\": \"Bob\"}]}}'\n\n# Print company name and employee count\n",
            "test_cases": [{"input": "", "expected_output": "Acme\n2"}],
        },
        {
            "title": "JSON Pretty Print",
            "description": "Create a dict and print it as formatted JSON with 2-space indent.",
            "starter_code": "import json\n\ndata = {\"name\": \"Alice\", \"scores\": [85, 92, 78]}\n\n# Pretty print\n",
            "test_cases": [{"input": "", "expected_output": "{\n  \"name\": \"Alice\",\n  \"scores\": [\n    85,\n    92,\n    78\n  ]\n}"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "CSV Aggregation",
            "description": "Parse CSV data and compute aggregates.",
            "starter_code": "import csv\nimport io\n\ncsv_data = \"product,price,qty\\nApple,1.50,10\\nBanana,0.75,20\\nApple,1.50,5\\nBanana,0.75,8\"\n\nreader = csv.DictReader(io.StringIO(csv_data))\ntotals = {}\nfor row in reader:\n    name = row[\"product\"]\n    value = float(row[\"price\"]) * int(row[\"qty\"])\n    totals[name] = totals.get(name, 0) + value\n\nfor name in sorted(totals):\n    print(f\"{name}: ${totals[name]:.2f}\")\n",
            "test_cases": [{"input": "", "expected_output": "Apple: $22.50\nBanana: $21.00"}],
        },
        {
            "title": "JSON Transform",
            "description": "Parse a JSON list, transform it, and print the result.",
            "starter_code": "import json\n\ndata = '[{\"first\": \"Alice\", \"last\": \"Smith\"}, {\"first\": \"Bob\", \"last\": \"Jones\"}]'\nparsed = json.loads(data)\n\n# Transform to full names and print\nfor p in parsed:\n    print(f\"{p['first']} {p['last']}\")\n",
            "test_cases": [{"input": "", "expected_output": "Alice Smith\nBob Jones"}],
        },
        {
            "title": "JSON Diff",
            "description": "Compare two JSON objects and report differences.",
            "starter_code": "import json\n\nold = '{\"name\": \"Alice\", \"age\": 30, \"city\": \"NYC\"}'\nnew = '{\"name\": \"Alice\", \"age\": 31, \"state\": \"NY\"}'\n\nold_d = json.loads(old)\nnew_d = json.loads(new)\n\n# Find and print differences\nall_keys = sorted(set(list(old_d.keys()) + list(new_d.keys())))\nfor k in all_keys:\n    if k not in new_d:\n        print(f\"Removed: {k}\")\n    elif k not in old_d:\n        print(f\"Added: {k}={new_d[k]}\")\n    elif old_d[k] != new_d[k]:\n        print(f\"Changed: {k} ({old_d[k]} -> {new_d[k]})\")\n",
            "test_cases": [{"input": "", "expected_output": "Changed: age (30 -> 31)\nRemoved: city\nAdded: state=NY"}],
        },
    ],

    "Error Handling": [
        # --- Easy (1-3) ---
        {
            "title": "Try Except",
            "description": "Try to convert \"abc\" to int. Catch ValueError and print \"Not a number\".",
            "starter_code": "# Try converting 'abc' to int\n",
            "test_cases": [{"input": "", "expected_output": "Not a number"}],
        },
        {
            "title": "Division Error",
            "description": "Try dividing 10 by 0. Catch ZeroDivisionError and print \"Cannot divide by zero\".",
            "starter_code": "# Try division by zero\n",
            "test_cases": [{"input": "", "expected_output": "Cannot divide by zero"}],
        },
        {
            "title": "Finally Block",
            "description": "Try converting \"42\" to int (succeeds). Print \"Done\" in finally block.",
            "starter_code": "# Try with finally\n",
            "test_cases": [{"input": "", "expected_output": "42\nDone"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Multiple Except",
            "description": "Define `safe_access(lst, idx)` that catches IndexError and TypeError. Test with valid access, bad index, and bad type.\n\nPrint results or error messages.",
            "starter_code": "def safe_access(lst, idx):\n    try:\n        return lst[idx]\n    except IndexError:\n        return \"Index out of range\"\n    except TypeError:\n        return \"Invalid index type\"\n\nprint(safe_access([1, 2, 3], 1))\nprint(safe_access([1, 2, 3], 10))\nprint(safe_access([1, 2, 3], \"a\"))\n",
            "test_cases": [{"input": "", "expected_output": "2\nIndex out of range\nInvalid index type"}],
        },
        {
            "title": "Raise Custom",
            "description": "Define `set_age(age)` that raises ValueError if age < 0 or > 150. Test with 25 and -5.",
            "starter_code": "def set_age(age):\n    if age < 0 or age > 150:\n        raise ValueError(\"Invalid age\")\n    return age\n\ntry:\n    print(set_age(25))\nexcept ValueError as e:\n    print(e)\n\ntry:\n    print(set_age(-5))\nexcept ValueError as e:\n    print(e)\n",
            "test_cases": [{"input": "", "expected_output": "25\nInvalid age"}],
        },
        {
            "title": "Else Clause",
            "description": "Try converting \"100\" to int. If successful, print it in the else block. Always print \"Finished\" in finally.",
            "starter_code": "# Try-except-else-finally\n",
            "test_cases": [{"input": "", "expected_output": "100\nFinished"}],
        },
        {
            "title": "Nested Try",
            "description": "Define `parse_and_divide(a_str, b_str)` that parses two strings to ints and divides. Handle both ValueError and ZeroDivisionError. Test with (\"10\", \"3\"), (\"abc\", \"2\"), (\"10\", \"0\").",
            "starter_code": "def parse_and_divide(a_str, b_str):\n    try:\n        a = int(a_str)\n        b = int(b_str)\n    except ValueError:\n        return \"Invalid number\"\n    try:\n        return a / b\n    except ZeroDivisionError:\n        return \"Cannot divide by zero\"\n\nprint(parse_and_divide(\"10\", \"3\"))\nprint(parse_and_divide(\"abc\", \"2\"))\nprint(parse_and_divide(\"10\", \"0\"))\n",
            "test_cases": [{"input": "", "expected_output": "3.3333333333333335\nInvalid number\nCannot divide by zero"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Custom Exception",
            "description": "Define `InsufficientFundsError(Exception)` with amount attribute. Define `withdraw(balance, amount)` that raises it. Test with balance=100, amount=150.",
            "starter_code": "class InsufficientFundsError(Exception):\n    def __init__(self, amount):\n        self.amount = amount\n        super().__init__(f\"Insufficient funds: need ${amount:.2f} more\")\n\ndef withdraw(balance, amount):\n    if amount > balance:\n        raise InsufficientFundsError(amount - balance)\n    return balance - amount\n\ntry:\n    print(withdraw(100, 50))\nexcept InsufficientFundsError as e:\n    print(e)\n\ntry:\n    print(withdraw(100, 150))\nexcept InsufficientFundsError as e:\n    print(e)\n",
            "test_cases": [{"input": "", "expected_output": "50\nInsufficient funds: need $50.00 more"}],
        },
        {
            "title": "Error Chain",
            "description": "Define a function that processes data through multiple steps, each of which could fail. Catch and report which step failed.",
            "starter_code": "def process(data):\n    steps = [\"parse\", \"validate\", \"transform\"]\n    for step in steps:\n        try:\n            if step == \"validate\" and data == \"bad\":\n                raise ValueError(\"Validation failed\")\n            if step == \"transform\" and data == \"ugly\":\n                raise RuntimeError(\"Transform failed\")\n        except Exception as e:\n            print(f\"Error in {step}: {e}\")\n            return\n    print(\"Success\")\n\nprocess(\"good\")\nprocess(\"bad\")\nprocess(\"ugly\")\n",
            "test_cases": [{"input": "", "expected_output": "Success\nError in validate: Validation failed\nError in transform: Transform failed"}],
        },
        {
            "title": "Retry with Backoff",
            "description": "Simulate retrying an operation that fails the first 2 times.",
            "starter_code": "attempt = 0\n\ndef unreliable():\n    global attempt\n    attempt += 1\n    if attempt < 3:\n        raise ConnectionError(f\"Attempt {attempt} failed\")\n    return \"Connected\"\n\nfor i in range(5):\n    try:\n        result = unreliable()\n        print(result)\n        break\n    except ConnectionError as e:\n        print(e)\n",
            "test_cases": [{"input": "", "expected_output": "Attempt 1 failed\nAttempt 2 failed\nConnected"}],
        },
    ],

    "Modules, Packages": [
        # --- Easy (1-3) ---
        {
            "title": "Import Math",
            "description": "Import the `math` module. Print `math.pi` rounded to 4 decimal places and `math.sqrt(144)`.",
            "starter_code": "import math\n\n# Print pi and sqrt\n",
            "test_cases": [{"input": "", "expected_output": "3.1416\n12.0"}],
        },
        {
            "title": "From Import",
            "description": "From `datetime` import `date`. Print today's... actually, print `date(2026, 4, 11)` in ISO format.",
            "starter_code": "from datetime import date\n\nd = date(2026, 4, 11)\nprint(d.isoformat())\n",
            "test_cases": [{"input": "", "expected_output": "2026-04-11"}],
        },
        {
            "title": "Random Seed",
            "description": "Import random, set seed to 42. Print `random.randint(1, 100)` three times.",
            "starter_code": "import random\nrandom.seed(42)\n\n# Print three random ints\n",
            "test_cases": [{"input": "", "expected_output": "82\n15\n4"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Collections Counter",
            "description": "Use `collections.Counter` to count letters in \"mississippi\". Print the 3 most common.",
            "starter_code": "from collections import Counter\n\nc = Counter(\"mississippi\")\nfor letter, count in c.most_common(3):\n    print(f\"{letter}: {count}\")\n",
            "test_cases": [{"input": "", "expected_output": "i: 4\ns: 4\np: 2"}],
        },
        {
            "title": "Itertools Chain",
            "description": "Use `itertools.chain` to combine two lists and print the result as a list.",
            "starter_code": "from itertools import chain\n\na = [1, 2, 3]\nb = [4, 5, 6]\n\nprint(list(chain(a, b)))\n",
            "test_cases": [{"input": "", "expected_output": "[1, 2, 3, 4, 5, 6]"}],
        },
        {
            "title": "OS Path",
            "description": "Use `os.path` to join parts and get the extension. Print results.",
            "starter_code": "import os\n\npath = os.path.join(\"home\", \"user\", \"file.txt\")\nprint(os.path.basename(path))\nprint(os.path.splitext(path)[1])\n",
            "test_cases": [{"input": "", "expected_output": "file.txt\n.txt"}],
        },
        {
            "title": "Defaultdict",
            "description": "Use `collections.defaultdict` to group words by first letter.",
            "starter_code": "from collections import defaultdict\n\nwords = [\"apple\", \"avocado\", \"banana\", \"blueberry\", \"cherry\"]\ngroups = defaultdict(list)\n\nfor w in words:\n    groups[w[0]].append(w)\n\nfor key in sorted(groups):\n    print(f\"{key}: {groups[key]}\")\n",
            "test_cases": [{"input": "", "expected_output": "a: ['apple', 'avocado']\nb: ['banana', 'blueberry']\nc: ['cherry']"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Functools Reduce",
            "description": "Use `functools.reduce` to compute the product of `[1, 2, 3, 4, 5]`. Print the result.",
            "starter_code": "from functools import reduce\n\nnums = [1, 2, 3, 4, 5]\nresult = reduce(lambda a, b: a * b, nums)\nprint(result)\n",
            "test_cases": [{"input": "", "expected_output": "120"}],
        },
        {
            "title": "Pathlib Modern",
            "description": "Use `pathlib.Path` to demonstrate path operations. Print the suffix and stem of a path.",
            "starter_code": "from pathlib import PurePosixPath\n\np = PurePosixPath(\"/home/user/document.pdf\")\nprint(p.stem)\nprint(p.suffix)\nprint(p.parent)\n",
            "test_cases": [{"input": "", "expected_output": "document\n.pdf\n/home/user"}],
        },
        {
            "title": "Regex Basics",
            "description": "Use `re` to find all emails in a string.",
            "starter_code": "import re\n\ntext = \"Contact alice@example.com or bob@test.org for info\"\nemails = re.findall(r'[\\w.]+@[\\w.]+', text)\nfor e in emails:\n    print(e)\n",
            "test_cases": [{"input": "", "expected_output": "alice@example.com\nbob@test.org"}],
        },
    ],

    "HTTP Requests": [
        # --- Easy (1-3) ---
        {
            "title": "Parse JSON Response",
            "description": "Parse a simulated JSON API response string and print one field.",
            "starter_code": "import json\n\nresponse = '{\"status\": \"ok\", \"data\": {\"id\": 1, \"name\": \"Alice\"}}'\n\nresult = json.loads(response)\nprint(result[\"data\"][\"name\"])\n",
            "test_cases": [{"input": "", "expected_output": "Alice"}],
        },
        {
            "title": "Status Check",
            "description": "Simulate checking an API response status.",
            "starter_code": "import json\n\nresponse = '{\"status_code\": 200, \"body\": \"Success\"}'\ndata = json.loads(response)\n\nif data[\"status_code\"] == 200:\n    print(\"OK\")\nelse:\n    print(\"Error\")\n",
            "test_cases": [{"input": "", "expected_output": "OK"}],
        },
        {
            "title": "Query String",
            "description": "Build a URL query string from a dict using urllib.",
            "starter_code": "from urllib.parse import urlencode\n\nparams = {\"q\": \"python\", \"page\": 1, \"limit\": 10}\nqs = urlencode(params)\nprint(f\"https://api.example.com/search?{qs}\")\n",
            "test_cases": [{"input": "", "expected_output": "https://api.example.com/search?q=python&page=1&limit=10"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Parse Headers",
            "description": "Parse simulated HTTP headers and print content type.",
            "starter_code": "headers_str = \"Content-Type: application/json\\nAuthorization: Bearer token123\\nX-Request-ID: abc\"\n\nheaders = {}\nfor line in headers_str.split(\"\\n\"):\n    key, value = line.split(\": \", 1)\n    headers[key] = value\n\nprint(headers[\"Content-Type\"])\n",
            "test_cases": [{"input": "", "expected_output": "application/json"}],
        },
        {
            "title": "Error Handling",
            "description": "Simulate handling different API response codes.",
            "starter_code": "import json\n\nresponses = [\n    '{\"status\": 200, \"data\": \"OK\"}',\n    '{\"status\": 404, \"error\": \"Not Found\"}',\n    '{\"status\": 500, \"error\": \"Server Error\"}',\n]\n\nfor r in responses:\n    data = json.loads(r)\n    if data[\"status\"] == 200:\n        print(data[\"data\"])\n    else:\n        print(f\"Error {data['status']}: {data['error']}\")\n",
            "test_cases": [{"input": "", "expected_output": "OK\nError 404: Not Found\nError 500: Server Error"}],
        },
        {
            "title": "Pagination Sim",
            "description": "Simulate paginated API responses.",
            "starter_code": "import json\n\npages = [\n    '{\"data\": [1, 2, 3], \"next\": true}',\n    '{\"data\": [4, 5, 6], \"next\": true}',\n    '{\"data\": [7], \"next\": false}',\n]\n\nall_data = []\nfor page in pages:\n    parsed = json.loads(page)\n    all_data.extend(parsed[\"data\"])\n\nprint(all_data)\nprint(f\"Total items: {len(all_data)}\")\n",
            "test_cases": [{"input": "", "expected_output": "[1, 2, 3, 4, 5, 6, 7]\nTotal items: 7"}],
        },
        {
            "title": "Rate Limit Sim",
            "description": "Simulate a rate limiter that allows 3 requests per window.",
            "starter_code": "requests_made = 0\nmax_requests = 3\n\nfor i in range(5):\n    requests_made += 1\n    if requests_made <= max_requests:\n        print(f\"Request {i+1}: OK\")\n    else:\n        print(f\"Request {i+1}: Rate limited\")\n",
            "test_cases": [{"input": "", "expected_output": "Request 1: OK\nRequest 2: OK\nRequest 3: OK\nRequest 4: Rate limited\nRequest 5: Rate limited"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "REST Client Sim",
            "description": "Simulate a REST client with GET and POST operations on a fake data store.",
            "starter_code": "import json\n\n# Simulated data store\nstore = {\"users\": [{\"id\": 1, \"name\": \"Alice\"}]}\n\ndef fake_get(path):\n    if path == \"/users\":\n        return json.dumps(store[\"users\"])\n    return '{\"error\": \"Not found\"}'\n\ndef fake_post(path, body):\n    if path == \"/users\":\n        user = json.loads(body)\n        user[\"id\"] = len(store[\"users\"]) + 1\n        store[\"users\"].append(user)\n        return json.dumps(user)\n\nprint(fake_get(\"/users\"))\nresult = fake_post(\"/users\", '{\"name\": \"Bob\"}')\nprint(result)\nprint(fake_get(\"/users\"))\n",
            "test_cases": [{"input": "", "expected_output": "[{\"id\": 1, \"name\": \"Alice\"}]\n{\"name\": \"Bob\", \"id\": 2}\n[{\"id\": 1, \"name\": \"Alice\"}, {\"name\": \"Bob\", \"id\": 2}]"}],
        },
        {
            "title": "Retry Logic",
            "description": "Simulate retrying failed API calls.",
            "starter_code": "import json\n\ncall_count = 0\n\ndef fake_api():\n    global call_count\n    call_count += 1\n    if call_count < 3:\n        return '{\"status\": 503, \"error\": \"Service unavailable\"}'\n    return '{\"status\": 200, \"data\": \"Success\"}'\n\nfor attempt in range(1, 6):\n    response = json.loads(fake_api())\n    if response[\"status\"] == 200:\n        print(f\"Attempt {attempt}: {response['data']}\")\n        break\n    else:\n        print(f\"Attempt {attempt}: {response['error']}\")\n",
            "test_cases": [{"input": "", "expected_output": "Attempt 1: Service unavailable\nAttempt 2: Service unavailable\nAttempt 3: Success"}],
        },
        {
            "title": "API Response Cache",
            "description": "Simulate caching API responses to avoid duplicate calls.",
            "starter_code": "import json\n\ncache = {}\ncall_count = 0\n\ndef cached_get(url):\n    global call_count\n    if url in cache:\n        return cache[url]\n    call_count += 1\n    response = json.dumps({\"url\": url, \"data\": f\"Result for {url}\"})\n    cache[url] = response\n    return response\n\nprint(json.loads(cached_get(\"/users\"))[\"data\"])\nprint(json.loads(cached_get(\"/posts\"))[\"data\"])\nprint(json.loads(cached_get(\"/users\"))[\"data\"])\nprint(f\"API calls made: {call_count}\")\n",
            "test_cases": [{"input": "", "expected_output": "Result for /users\nResult for /posts\nResult for /users\nAPI calls made: 2"}],
        },
    ],

    "Weather Dashboard": [
        # --- Easy (1-3) ---
        {
            "title": "Parse Weather",
            "description": "Parse a simulated weather JSON response and print the temperature.",
            "starter_code": "import json\n\nresponse = '{\"city\": \"NYC\", \"temp\": 72, \"condition\": \"Sunny\"}'\n\ndata = json.loads(response)\nprint(f\"{data['city']}: {data['temp']}F, {data['condition']}\")\n",
            "test_cases": [{"input": "", "expected_output": "NYC: 72F, Sunny"}],
        },
        {
            "title": "Temp Conversion",
            "description": "Convert a Fahrenheit temperature from weather data to Celsius.",
            "starter_code": "import json\n\ndata = json.loads('{\"temp_f\": 77}')\ntemp_c = (data[\"temp_f\"] - 32) * 5 / 9\nprint(f\"{data['temp_f']}F = {temp_c:.1f}C\")\n",
            "test_cases": [{"input": "", "expected_output": "77F = 25.0C"}],
        },
        {
            "title": "Weather Icon",
            "description": "Map weather conditions to simple text icons.",
            "starter_code": "conditions = {\"Sunny\": \"[SUN]\", \"Rainy\": \"[RAIN]\", \"Cloudy\": \"[CLOUD]\", \"Snowy\": \"[SNOW]\"}\n\nweather = \"Rainy\"\nprint(f\"{conditions.get(weather, '[?]')} {weather}\")\n",
            "test_cases": [{"input": "", "expected_output": "[RAIN] Rainy"}],
        },
        # --- Medium (4-7) ---
        {
            "title": "Weekly Forecast",
            "description": "Display a week's forecast from simulated data.",
            "starter_code": "import json\n\nforecast = json.loads('[{\"day\": \"Mon\", \"high\": 75, \"low\": 60}, {\"day\": \"Tue\", \"high\": 80, \"low\": 65}, {\"day\": \"Wed\", \"high\": 72, \"low\": 58}]')\n\nfor day in forecast:\n    print(f\"{day['day']}: {day['low']}-{day['high']}F\")\n",
            "test_cases": [{"input": "", "expected_output": "Mon: 60-75F\nTue: 65-80F\nWed: 58-72F"}],
        },
        {
            "title": "Average Temp",
            "description": "Calculate average temperature from a week of data.",
            "starter_code": "temps = [72, 75, 68, 80, 77, 71, 69]\n\navg = sum(temps) / len(temps)\nprint(f\"Average: {avg:.1f}F\")\nprint(f\"Range: {min(temps)}-{max(temps)}F\")\n",
            "test_cases": [{"input": "", "expected_output": "Average: 73.1F\nRange: 68-80F"}],
        },
        {
            "title": "Alerts Check",
            "description": "Check weather conditions and issue alerts.",
            "starter_code": "import json\n\ndata = json.loads('{\"temp\": 105, \"wind\": 45, \"humidity\": 15}')\n\nalerts = []\nif data[\"temp\"] > 100:\n    alerts.append(\"Extreme heat warning\")\nif data[\"wind\"] > 40:\n    alerts.append(\"High wind advisory\")\nif data[\"humidity\"] < 20:\n    alerts.append(\"Fire danger\")\n\nif alerts:\n    for a in alerts:\n        print(f\"ALERT: {a}\")\nelse:\n    print(\"No alerts\")\n",
            "test_cases": [{"input": "", "expected_output": "ALERT: Extreme heat warning\nALERT: High wind advisory\nALERT: Fire danger"}],
        },
        {
            "title": "Comparison",
            "description": "Compare weather data for two cities.",
            "starter_code": "import json\n\ncities = json.loads('[{\"city\": \"NYC\", \"temp\": 72, \"humidity\": 65}, {\"city\": \"LA\", \"temp\": 85, \"humidity\": 30}]')\n\nfor c in cities:\n    print(f\"{c['city']}: {c['temp']}F, {c['humidity']}% humidity\")\n\nwarmer = max(cities, key=lambda c: c[\"temp\"])\nprint(f\"Warmer: {warmer['city']}\")\n",
            "test_cases": [{"input": "", "expected_output": "NYC: 72F, 65% humidity\nLA: 85F, 30% humidity\nWarmer: LA"}],
        },
        # --- Hard (8-10) ---
        {
            "title": "Trend Analysis",
            "description": "Analyze temperature trends over a week.",
            "starter_code": "temps = [68, 71, 74, 72, 76, 79, 82]\ndays = [\"Mon\", \"Tue\", \"Wed\", \"Thu\", \"Fri\", \"Sat\", \"Sun\"]\n\ntrend = temps[-1] - temps[0]\nmax_idx = temps.index(max(temps))\nmin_idx = temps.index(min(temps))\n\nprint(f\"Trend: +{trend}F\" if trend > 0 else f\"Trend: {trend}F\")\nprint(f\"Warmest: {days[max_idx]} ({temps[max_idx]}F)\")\nprint(f\"Coolest: {days[min_idx]} ({temps[min_idx]}F)\")\n",
            "test_cases": [{"input": "", "expected_output": "Trend: +14F\nWarmest: Sun (82F)\nCoolest: Mon (68F)"}],
        },
        {
            "title": "Multi-City Dashboard",
            "description": "Create a dashboard summarizing multiple cities.",
            "starter_code": "import json\n\ncities = json.loads('[\\\n{\"city\": \"NYC\", \"temp\": 72, \"condition\": \"Cloudy\"},\\\n{\"city\": \"LA\", \"temp\": 85, \"condition\": \"Sunny\"},\\\n{\"city\": \"Chicago\", \"temp\": 65, \"condition\": \"Rainy\"}\\\n]')\n\nprint(\"=== Weather Dashboard ===\")\nfor c in cities:\n    print(f\"{c['city']:10} {c['temp']}F  {c['condition']}\")\nprint(\"========================\")\navg = sum(c[\"temp\"] for c in cities) / len(cities)\nprint(f\"Average temp: {avg:.1f}F\")\n",
            "test_cases": [{"input": "", "expected_output": "=== Weather Dashboard ===\nNYC        72F  Cloudy\nLA         85F  Sunny\nChicago    65F  Rainy\n========================\nAverage temp: 74.0F"}],
        },
        {
            "title": "Forecast Summary",
            "description": "Generate a forecast summary with daily comparisons.",
            "starter_code": "import json\n\nforecast = json.loads('[\\\n{\"day\": \"Mon\", \"high\": 75, \"low\": 60, \"precip\": 10},\\\n{\"day\": \"Tue\", \"high\": 80, \"low\": 65, \"precip\": 0},\\\n{\"day\": \"Wed\", \"high\": 72, \"low\": 58, \"precip\": 40},\\\n{\"day\": \"Thu\", \"high\": 68, \"low\": 55, \"precip\": 80},\\\n{\"day\": \"Fri\", \"high\": 78, \"low\": 62, \"precip\": 5}\\\n]')\n\nrainy_days = sum(1 for d in forecast if d[\"precip\"] > 30)\navg_high = sum(d[\"high\"] for d in forecast) / len(forecast)\nbest = min(forecast, key=lambda d: abs(d[\"high\"] - 75))\n\nprint(f\"Rainy days: {rainy_days}\")\nprint(f\"Avg high: {avg_high:.1f}F\")\nprint(f\"Best day: {best['day']} ({best['high']}F)\")\n",
            "test_cases": [{"input": "", "expected_output": "Rainy days: 2\nAvg high: 74.6F\nBest day: Mon (75F)"}],
        },
    ],
}


def get_course_info(conn):
    """Get course_id, org_id, and lesson map."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT c.id, c.org_id FROM courses c WHERE c.slug = 'python-programming'
        """)
        course_row = cur.fetchone()
        if not course_row:
            return None, None, {}

        cur.execute("""
            SELECT l.id, l.title, m.id as module_id, m.title as module_title, m.sort_order, l.sort_order
            FROM lessons l
            JOIN modules m ON l.module_id = m.id
            WHERE m.course_id = %s
            ORDER BY m.sort_order, l.sort_order
        """, (course_row[0],))
        lessons = {}
        for lid, ltitle, mid, mtitle, msort, lsort in cur.fetchall():
            lessons[ltitle] = {"id": lid, "module_id": mid, "module_title": mtitle, "m_sort": msort, "l_sort": lsort}

    return course_row[0], course_row[1], lessons


def get_or_create_practice_lesson(conn, course_id, module_id, theory_title, sort_order):
    """Create a 'Practice: ...' lesson if it doesn't exist."""
    practice_title = f"Practice: {theory_title}"
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM lessons WHERE module_id = %s AND title = %s",
            (module_id, practice_title),
        )
        row = cur.fetchone()
        if row:
            return row[0], False

    lesson_id = uuid.uuid4()
    content = json.dumps({
        "blocks": [{
            "id": uuid.uuid4().hex[:7],
            "type": "text",
            "format": "html",
            "body": f"<h2>Practice: {theory_title}</h2><p>Solve the challenges below using what you learned in the lesson.</p>",
            "page": 1,
            "sort_order": 0,
        }],
        "version": 2,
    })
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO lessons (id, module_id, title, content_type, content, sort_order, duration_minutes, created_at, updated_at)
               VALUES (%s, %s, %s, 'text', %s, %s, 30, %s, %s)""",
            (lesson_id, module_id, practice_title, content, sort_order,
             datetime.now(timezone.utc), datetime.now(timezone.utc)),
        )
    return lesson_id, True


TYPE_PREFIX = "C"
_counter = [0]

def next_display_id(conn, org_id):
    if _counter[0] == 0:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM exercises WHERE org_id = %s AND exercise_type = 'code_challenge'",
                (org_id,),
            )
            _counter[0] = cur.fetchone()[0]
        with conn.cursor() as cur:
            cur.execute("SELECT slug FROM organizations WHERE id = %s", (org_id,))
            _counter.append(cur.fetchone()[0])
    _counter[0] += 1
    return f"{_counter[1]}-{TYPE_PREFIX}{_counter[0]:03d}"


def create_challenge(conn, lesson_id, org_id, ch, sort_order):
    """Create a code_challenge exercise with test cases."""
    ex_id = uuid.uuid4()
    display_id = next_display_id(conn, org_id)
    config = {
        "description": ch["description"],
        "language": "python",
        "starter_code": ch["starter_code"],
    }

    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO exercises (id, lesson_id, org_id, display_id, exercise_type, title, config, sort_order, max_attempts, created_at, updated_at)
               VALUES (%s, %s, %s, %s, 'code_challenge', %s, %s, %s, 10, %s, %s)""",
            (ex_id, lesson_id, org_id, display_id, ch["title"], json.dumps(config),
             sort_order, datetime.now(timezone.utc), datetime.now(timezone.utc)),
        )

    for i, tc in enumerate(ch["test_cases"]):
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO test_cases (id, exercise_id, input, expected_output, is_hidden, sort_order, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, false, %s, %s, %s)""",
                (uuid.uuid4(), ex_id, tc.get("input", ""), tc["expected_output"], i,
                 datetime.now(timezone.utc), datetime.now(timezone.utc)),
            )

    # Add exercise block to lesson content
    with conn.cursor() as cur:
        cur.execute("SELECT content FROM lessons WHERE id = %s", (lesson_id,))
        content = cur.fetchone()[0]
        if isinstance(content, str):
            content = json.loads(content)
        blocks = content.get("blocks", [])
        blocks.append({
            "id": uuid.uuid4().hex[:7],
            "type": "exercise",
            "exercise_id": str(ex_id),
            "page": 1,
            "sort_order": len(blocks),
        })
        content["blocks"] = blocks
        cur.execute(
            "UPDATE lessons SET content = %s WHERE id = %s",
            (json.dumps(content), lesson_id),
        )

    return ex_id


def main():
    db_url = os.environ.get("DB_URL", "").replace("+asyncpg", "")
    if not db_url:
        print("DB_URL not set", file=sys.stderr)
        return 1

    with psycopg.connect(db_url, autocommit=False) as conn:
        course_id, org_id, lessons = get_course_info(conn)
        if not course_id:
            print("Course not found", file=sys.stderr)
            return 1

        total = 0
        for theory_title, challenges in PRACTICE.items():
            # Find theory lesson
            lesson_info = None
            for lt, info in lessons.items():
                if theory_title in lt:
                    lesson_info = info
                    break
            if not lesson_info:
                print(f"  ! No lesson matching '{theory_title}'")
                continue

            # Create or find practice lesson (sort_order = theory + 0.5, placed right after)
            practice_id, created = get_or_create_practice_lesson(
                conn, course_id, lesson_info["module_id"],
                theory_title,
                lesson_info["l_sort"] * 10 + 5,  # interleave after theory
            )
            if created:
                print(f"\n  Created practice lesson for: {theory_title}")
            else:
                print(f"\n  Practice lesson exists for: {theory_title}")

            for i, ch in enumerate(challenges):
                # Check if challenge already exists
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT id FROM exercises WHERE lesson_id = %s AND title = %s",
                        (practice_id, ch["title"]),
                    )
                    if cur.fetchone():
                        print(f"    - {ch['title']} already exists")
                        continue

                create_challenge(conn, practice_id, org_id, ch, i + 1)
                total += 1
                difficulty = "easy" if i < 3 else ("medium" if i < 7 else "hard")
                print(f"    ✓ #{i+1} {ch['title']} [{difficulty}]")

        conn.commit()
        print(f"\nDone. Created {total} challenges.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
