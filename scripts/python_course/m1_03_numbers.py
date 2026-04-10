"""Module 1, Lesson 3: Numbers & Math."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Numbers &amp; Math",
            "From simple arithmetic to complex calculations &mdash; Python handles numbers with ease.",
        ),

        why_it_matters(
            "<p>Numbers power everything: prices, scores, coordinates, percentages, "
            "timestamps, statistics. Whether you're building an e-commerce checkout, "
            "a fitness tracker, or a financial dashboard, you need solid number skills.</p>"
        ),

        section("Two number types"),

        concept("int vs float",
            "<p>Python has two main number types:</p>"
            "<ul>"
            "<li><code>int</code> &mdash; whole numbers with no decimal point: <code>42</code>, <code>-7</code>, <code>0</code></li>"
            "<li><code>float</code> &mdash; numbers with a decimal point: <code>3.14</code>, <code>-0.5</code>, <code>100.0</code></li>"
            "</ul>"
            "<p>Python automatically picks the right type based on whether you include a decimal point.</p>"
        ),

        code_example("int and float basics",
            'age = 25            # int\n'
            'price = 19.99       # float\n'
            'temperature = -3.5  # float\n'
            'big = 1_000_000     # int (underscores for readability)\n'
            '\n'
            'print(type(age))          # <class \'int\'>\n'
            'print(type(price))        # <class \'float\'>\n'
            'print(type(big))          # <class \'int\'>\n'
            'print(big)                # 1000000',
            output="<class 'int'>\n<class 'float'>\n<class 'int'>\n1000000",
            explanation="Underscores in numbers are ignored by Python &mdash; they just "
            "make large numbers easier to read."
        ),

        section("Arithmetic operators"),

        concept("The seven arithmetic operators",
            "<table style='width:100%;border-collapse:collapse;margin:8px 0'>"
            "<tr style='border-bottom:1px solid #e2e8f0'><td style='padding:6px'><code>+</code></td><td>Addition</td><td><code>5 + 3 = 8</code></td></tr>"
            "<tr style='border-bottom:1px solid #e2e8f0'><td style='padding:6px'><code>-</code></td><td>Subtraction</td><td><code>10 - 4 = 6</code></td></tr>"
            "<tr style='border-bottom:1px solid #e2e8f0'><td style='padding:6px'><code>*</code></td><td>Multiplication</td><td><code>6 * 7 = 42</code></td></tr>"
            "<tr style='border-bottom:1px solid #e2e8f0'><td style='padding:6px'><code>/</code></td><td>True division</td><td><code>7 / 2 = 3.5</code></td></tr>"
            "<tr style='border-bottom:1px solid #e2e8f0'><td style='padding:6px'><code>//</code></td><td>Floor division</td><td><code>7 // 2 = 3</code></td></tr>"
            "<tr style='border-bottom:1px solid #e2e8f0'><td style='padding:6px'><code>%</code></td><td>Modulo (remainder)</td><td><code>7 % 2 = 1</code></td></tr>"
            "<tr><td style='padding:6px'><code>**</code></td><td>Exponentiation</td><td><code>2 ** 10 = 1024</code></td></tr>"
            "</table>"
        ),

        code_example("All operators in action",
            'a, b = 17, 5\n'
            '\n'
            'print(f"{a} + {b}  = {a + b}")\n'
            'print(f"{a} - {b}  = {a - b}")\n'
            'print(f"{a} * {b}  = {a * b}")\n'
            'print(f"{a} / {b}  = {a / b}")\n'
            'print(f"{a} // {b} = {a // b}")\n'
            'print(f"{a} % {b}  = {a % b}")\n'
            'print(f"{a} ** {b} = {a ** b}")',
            output="17 + 5  = 22\n17 - 5  = 12\n17 * 5  = 85\n17 / 5  = 3.4\n17 // 5 = 3\n17 % 5  = 2\n17 ** 5 = 1419857",
        ),

        section("True division vs floor division"),

        code_example("The / and // difference",
            '# True division (/) always returns a float\n'
            'print(10 / 3)      # 3.3333333333333335\n'
            'print(10 / 2)      # 5.0 (still a float!)\n'
            '\n'
            '# Floor division (//) rounds DOWN to nearest integer\n'
            'print(10 // 3)     # 3\n'
            'print(-10 // 3)    # -4 (rounds toward negative infinity)\n'
            '\n'
            '# Modulo (%) gives the remainder\n'
            'print(10 % 3)      # 1  (10 = 3*3 + 1)',
            output="3.3333333333333335\n5.0\n3\n-4\n1",
            explanation="<code>/</code> always returns a float. <code>//</code> drops the decimal. "
            "Watch out: <code>-10 // 3</code> is <code>-4</code>, not <code>-3</code>, because "
            "it rounds toward negative infinity."
        ),

        concept("Why negative floor division rounds down",
            "<p>Floor division always rounds <strong>down</strong> (toward negative infinity), "
            "not toward zero. So <code>-10 // 3</code> equals <code>-4</code>, not <code>-3</code>, "
            "because &minus;3.33... rounded down is &minus;4. This surprises many beginners who expect "
            "it to simply chop off the decimal.</p>"
        ),

        code_example("Negative floor division",
            '# Positive: rounds down toward zero\n'
            'print(10 // 3)      # 3   (3.33 -> 3)\n'
            '\n'
            '# Negative: rounds down toward NEGATIVE infinity\n'
            'print(-10 // 3)     # -4  (-3.33 -> -4, not -3)\n'
            'print(10 // -3)     # -4  (same idea)\n'
            '\n'
            '# Compare with int() which truncates toward zero\n'
            'print(int(-10 / 3)) # -3  (truncation, not floor)',
            output="3\n-4\n-4\n-3",
            explanation="<code>//</code> always rounds toward negative infinity. "
            "If you want truncation toward zero instead, use <code>int()</code> on the true division result."
        ),

        section("Order of operations (PEMDAS)"),

        concept("Python follows standard math order",
            "<p>Operations are evaluated in this order:</p>"
            "<ol>"
            "<li><strong>P</strong>arentheses <code>()</code></li>"
            "<li><strong>E</strong>xponents <code>**</code></li>"
            "<li><strong>M</strong>ultiplication / <strong>D</strong>ivision <code>* / // %</code></li>"
            "<li><strong>A</strong>ddition / <strong>S</strong>ubtraction <code>+ -</code></li>"
            "</ol>"
            "<p>When in doubt, use parentheses to make your intent clear.</p>"
        ),

        code_example("Order of operations",
            '# Without parentheses\n'
            'result = 2 + 3 * 4\n'
            'print(result)          # 14 (not 20!)\n'
            '\n'
            '# With parentheses\n'
            'result = (2 + 3) * 4\n'
            'print(result)          # 20\n'
            '\n'
            '# Exponents before multiplication\n'
            'result = 2 * 3 ** 2\n'
            'print(result)          # 18 (3**2 = 9, then 2*9)',
            output="14\n20\n18",
        ),

        section("Built-in math functions"),

        code_example("abs, round, min, max",
            '# Absolute value\n'
            'print(abs(-42))         # 42\n'
            'print(abs(3.7))         # 3.7\n'
            '\n'
            '# Rounding\n'
            'print(round(3.7))       # 4\n'
            'print(round(3.14159, 2))  # 3.14\n'
            'print(round(2.5))       # 2 (banker\'s rounding!)\n'
            '\n'
            '# Min and max\n'
            'print(min(10, 3, 7, 1))   # 1\n'
            'print(max(10, 3, 7, 1))   # 10',
            output="42\n3.7\n4\n3.14\n2\n1\n10",
            explanation="Note: <code>round(2.5)</code> returns 2 (not 3). Python uses banker's rounding &mdash; "
            "it rounds to the nearest even number when exactly halfway."
        ),

        section("The math module"),

        code_example("Importing math",
            'import math\n'
            '\n'
            'print(math.pi)           # 3.141592653589793\n'
            'print(math.e)            # 2.718281828459045\n'
            '\n'
            'print(math.sqrt(144))    # 12.0\n'
            'print(math.ceil(3.2))    # 4 (round up)\n'
            'print(math.floor(3.8))   # 3 (round down)\n'
            'print(math.pow(2, 10))   # 1024.0\n'
            'print(math.log(100, 10)) # 2.0 (log base 10)',
            output="3.141592653589793\n2.718281828459045\n12.0\n4\n3\n1024.0\n2.0",
            explanation="<code>math.ceil()</code> always rounds up, <code>math.floor()</code> always rounds down. "
            "These are different from <code>round()</code> which rounds to the nearest."
        ),

        section("Practical number patterns"),

        code_example("Common real-world calculations",
            '# Percentage\n'
            'total = 250\n'
            'discount_pct = 15\n'
            'discount = total * discount_pct / 100\n'
            'final_price = total - discount\n'
            'print(f"${total} - {discount_pct}% = ${final_price:.2f}")\n'
            '\n'
            '# Check if a number is even or odd (remainder trick)\n'
            'number = 42\n'
            'remainder = number % 2\n'
            'print(f"{number} % 2 = {remainder}")  # 0 means even\n'
            '\n'
            '# Convert between units\n'
            'miles = 26.2\n'
            'km = miles * 1.60934\n'
            'print(f"{miles} miles = {km:.1f} km")',
            output="$250 - 15% = $212.50\n42 % 2 = 0\n26.2 miles = 42.2 km",
        ),

        try_it("Use the code editor below the lesson to try calculating compound interest or converting temperatures."),

        section("Real-world pattern: Unit conversion chain"),

        code_example("Converting through multiple units",
            '# Convert a marathon distance through several units\n'
            'miles = 26.2\n'
            'km = miles * 1.60934\n'
            'meters = km * 1000\n'
            'feet = meters * 3.28084\n'
            '\n'
            'print(f"Marathon distance:")\n'
            'print(f"  {miles} miles")\n'
            'print(f"  {km:.2f} kilometers")\n'
            'print(f"  {meters:.0f} meters")\n'
            'print(f"  {feet:,.0f} feet")',
            output="Marathon distance:\n  26.2 miles\n  42.16 kilometers\n  42165 meters\n  138,306 feet",
            explanation="Each conversion builds on the previous one. This chaining pattern "
            "appears in any unit conversion, currency exchange, or measurement system."
        ),

        section("Exercises"),

        exercise("starter", "BMI calculator",
            "Create variables <code>weight_kg = 75</code> and <code>height_m = 1.80</code>. "
            "Calculate BMI using the formula: <code>BMI = weight / height ** 2</code>. "
            "Print the result rounded to one decimal place, like: <em>Your BMI is 23.1</em>.",
            hint="<code>bmi = weight_kg / height_m ** 2</code>, "
            "then <code>f\"Your BMI is {bmi:.1f}\"</code>"
        ),

        exercise("medium", "Currency converter",
            "Build a converter with exchange rates: "
            "<code>usd_to_eur = 0.92</code>, <code>usd_to_gbp = 0.79</code>, "
            "<code>usd_to_jpy = 149.50</code>. "
            "Convert <code>amount_usd = 150.00</code> to all three currencies and print "
            "a formatted table:<br>"
            "<code>$150.00 USD = 138.00 EUR<br>"
            "$150.00 USD = 118.50 GBP<br>"
            "$150.00 USD = 22,425.00 JPY</code>",
            hint="Use f-string formatting: <code>f\"${amount_usd:.2f} USD = {eur:,.2f} EUR\"</code>"
        ),

        exercise("medium", "Compound interest calculator",
            "Given <code>principal = 10000</code>, <code>annual_rate = 0.05</code>, "
            "<code>years = 10</code>, <code>compounds_per_year = 12</code>, "
            "calculate the final amount using: "
            "<code>A = P * (1 + r/n) ** (n*t)</code>. "
            "Print the final amount and total interest earned, "
            "both formatted as currency.",
            hint="<code>amount = principal * (1 + annual_rate / compounds_per_year) "
            "** (compounds_per_year * years)</code>"
        ),

        exercise("real-world", "Investment growth calculator",
            "Calculate how an investment grows over time using compound interest. "
            "Given: <code>principal = 5000</code>, <code>annual_rate = 0.07</code>, "
            "<code>years = 5</code>, <code>compounds_per_year = 4</code> (quarterly). "
            "Use the formula: <code>A = P * (1 + r/n) ** (n * t)</code>.<br>"
            "Print the value at the end of each year (year 1 through 5), "
            "and the total interest earned. Format all values as currency.",
            hint="For year 1: <code>amount = principal * (1 + annual_rate / compounds_per_year) "
            "** (compounds_per_year * 1)</code>. Repeat for each year. "
            "Interest = amount - principal."
        ),

        mistakes([
            ("Using <code>/</code> when you need <code>//</code>",
             "<code>7 / 2</code> gives <code>3.5</code> (float). "
             "<code>7 // 2</code> gives <code>3</code> (int). Choose based on what you need."),
            ("Floating-point precision surprises",
             "<code>0.1 + 0.2</code> equals <code>0.30000000000000004</code>, not <code>0.3</code>. "
             "Use <code>round()</code> for display, or the <code>decimal</code> module for financial math."),
            ("Forgetting PEMDAS",
             "<code>100 - 25 * 2</code> is <code>50</code>, not <code>150</code>. "
             "Multiplication happens before subtraction. Use parentheses when unsure."),
            ("Integer overflow &mdash; just kidding",
             "Python handles arbitrarily large integers: <code>2 ** 1000</code> works fine. "
             "But floats can overflow: <code>1e308 * 10</code> gives <code>inf</code>."),
        ]),

        pro_tips([
            "<strong>Use underscores in large numbers:</strong> <code>1_000_000</code> is "
            "the same as <code>1000000</code> but much easier to read.",
            "<strong><code>divmod()</code> gives both quotient and remainder:</strong> "
            "<code>divmod(17, 5)</code> returns <code>(3, 2)</code>. Great for hours/minutes conversions.",
            "<strong>For financial calculations, use <code>decimal.Decimal</code>.</strong> "
            "Floats are fast but imprecise. Money needs exact arithmetic.",
            "<strong>The <code>%</code> operator is more useful than you think.</strong> "
            "Check even/odd (<code>n % 2</code>), cycle through items (<code>i % len(items)</code>), "
            "or wrap around ranges.",
        ]),

        recap([
            "Two number types: <code>int</code> (whole) and <code>float</code> (decimal)",
            "Seven operators: <code>+ - * / // % **</code>",
            "<code>/</code> always returns float; <code>//</code> returns int (floor division)",
            "PEMDAS: Parentheses, Exponents, Multiply/Divide, Add/Subtract",
            "Built-in: <code>abs()</code>, <code>round()</code>, <code>min()</code>, <code>max()</code>",
            "<code>import math</code> for <code>sqrt</code>, <code>ceil</code>, <code>floor</code>, <code>pi</code>, and more",
        ]),
    ])
