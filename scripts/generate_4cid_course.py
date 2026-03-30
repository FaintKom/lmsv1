#!/usr/bin/env python3
"""
Generate the Python Programming PRO course with 4C/ID instructional design.
Reads the original course JSON, replaces each lesson's content.body with
rich 4C/ID theory content, and saves to python_pro_course_4cid.json.
"""

import json
import copy

# All 37 lesson theories indexed by (module_index, lesson_index)
THEORIES = {}

# ============================================================
# MODULE 1: Hello, Python!
# ============================================================

THEORIES[(0, 0)] = r"""## Your First Program: print()

### 🧠 How It Works

Imagine you walk into a room and want to get everyone's attention. You open your mouth and say something out loud — that is exactly what `print()` does for your program. It is the computer's voice. Whatever you put inside the parentheses (wrapped in quotes) is what the computer "says" — it displays that text on the screen.

The text you pass to `print()` is called a **string** — think of it as a string of beads where each bead is a character. You can use double quotes `"hello"` or single quotes `'hello'`, both work identically. Each call to `print()` outputs on its own line, like writing on a new line of a notepad.

Why does this matter? Every app you have ever used communicates by displaying text or images on screen. `print()` is the simplest form of that communication. It is also the number-one debugging tool — when your code does something unexpected, you sprinkle `print()` statements to peek at what is happening inside. Professional developers still use this technique daily.

### 📝 Step by Step

1. Write the keyword `print` (all lowercase).
2. Open parentheses `(` right after the word — no space between `print` and `(`.
3. Inside the parentheses, put your text wrapped in quotes: `"Hello, World!"`.
4. Close the parentheses `)`.
5. Each `print()` statement goes on its own line in your code.

### 💻 Example

```python
# Printing different messages
print("Hello, World!")
print("My name is Alex")
print("I am 15 years old")
print("Python is awesome!")
```

**Output:**
```
Hello, World!
My name is Alex
I am 15 years old
Python is awesome!
```

### ⚠️ Common Mistakes

- **Mistake: Forgetting quotes** — `print(Hello)` looks for a variable called `Hello` instead of printing the word. → **Fix**: Always wrap text in quotes: `print("Hello")`.
- **Mistake: Mismatched quotes** — `print("Hello')` mixes double and single quotes. → **Fix**: Use the same type of quote on both sides: `print("Hello")` or `print('Hello')`.
- **Mistake: Capital P in Print** — Python is case-sensitive, so `Print("hi")` does not work. → **Fix**: Always use lowercase `print`.

### 🔗 Connection

This is your very first Python instruction! You have zero prerequisites — everyone starts here. In the next lesson, you will learn about *variables*, which let you store data and reuse it. Think of `print()` as the output door — soon you will learn how to put interesting things through that door.

### 🏋️ Quick Practice

Try these in your head before coding:
1. What does `print("2 + 3")` display? (Hint: it is inside quotes.)
2. How many lines of output does this produce: `print("A")` followed by `print("B")` followed by `print("C")`?
3. What happens if you write `print()` with nothing inside the parentheses?
"""

THEORIES[(0, 1)] = r"""## Variables: Giving Names to Data

### 🧠 How It Works

Imagine a row of labeled boxes on a shelf. You can put something inside a box and write a name on the label — later, you use that name to find what you stored. That is exactly what a **variable** is: a named container for a value. You create one by writing a name, an equals sign, and the value you want to store.

Variables are powerful because they let your program *remember* things. A game remembers your score; a messaging app remembers your username. Without variables, every piece of information would vanish the moment it was created. The equals sign `=` is the **assignment operator** — it puts the value on the right into the variable on the left.

Python is **dynamically typed**, meaning you do not declare a type in advance. A variable can hold a number now and a string later (though switching types on purpose is usually bad practice). Variable names are case-sensitive (`score` and `Score` are different), must start with a letter or underscore, and cannot be Python keywords like `if`, `for`, or `print`.

### 📝 Step by Step

1. Choose a descriptive name: `player_score`, `user_name`, `total_price`.
2. Use `=` to assign a value: `player_score = 0`.
3. Use the variable name wherever you need that value: `print(player_score)`.
4. To update, assign again: `player_score = 100` (the old value is replaced).
5. To swap two variables, use a temporary variable or Python's tuple swap: `a, b = b, a`.

### 💻 Example

```python
# Creating variables
name = "Alex"
age = 15
favorite_game = "Minecraft"

# Using variables
print(name)
print(age)

# Updating a variable
age = 16
print(age)  # Now prints 16

# Swapping two variables
a = "first"
b = "second"
a, b = b, a
print(a)  # second
print(b)  # first
```

**Output:**
```
Alex
15
16
second
first
```

### ⚠️ Common Mistakes

- **Mistake: Using a variable before creating it** — `print(score)` when `score` was never assigned causes a `NameError`. → **Fix**: Always assign a value before using the variable.
- **Mistake: Spaces or hyphens in names** — `my-score` or `my score` are not valid. → **Fix**: Use underscores: `my_score`.
- **Mistake: Confusing `=` (assignment) with `==` (comparison)** — `x = 5` stores 5, `x == 5` checks if x equals 5. → **Fix**: Remember that single `=` means "put this value in," double `==` means "is this equal?"

### 🔗 Connection

You just learned `print()` to display output. Now variables let you *store* data so you can display it later, combine it, or change it. In the next lesson, you will discover that not all data is the same — numbers and text behave differently, leading us to **data types**.

### 🏋️ Quick Practice

Try these in your head before coding:
1. After `x = 10` and then `x = 20`, what is the value of `x`?
2. Is `myVar` the same variable as `myvar`?
3. After `a = 5`, `b = 10`, `temp = a`, `a = b`, `b = temp` — what are `a` and `b`?
"""

THEORIES[(0, 2)] = r"""## Data Types: Numbers and Strings

### 🧠 How It Works

Think about your school backpack. You would not store a sandwich the same way you store a textbook — they are different types of items that need different handling. Python works the same way: the number `42` and the text `"42"` look similar but are completely different data types with different capabilities.

Python has four basic data types you need to know now: **int** (whole numbers like 5, -3, 1000), **float** (decimal numbers like 3.14, -0.5), **str** (text strings like "hello"), and **bool** (True or False). The type determines what operations are possible — you can multiply numbers but not text (well, sort of — `"ha" * 3` gives `"hahaha"`, but that is string repetition, not math).

When you read input from a user or a file, Python gives you a string. If you need to do math, you must **convert** it using `int()` or `float()`. Going the other direction, `str()` converts numbers to text. This conversion process is called **type casting**, and forgetting to do it is one of the most common beginner errors.

### 📝 Step by Step

1. Determine what kind of data you are working with (number vs text vs true/false).
2. Use the right literal format: numbers have no quotes (`42`), strings have quotes (`"42"`), booleans are `True` or `False` (capitalized).
3. Check a value's type with `type()`: `print(type(42))` shows `<class 'int'>`.
4. Convert between types when needed: `int("42")` gives the number 42, `str(42)` gives the string "42".
5. Be careful mixing types — `"Age: " + str(15)` works, but `"Age: " + 15` crashes.

### 💻 Example

```python
# Different types
age = 15            # int
price = 9.99        # float
name = "Alex"       # str
is_student = True   # bool

# Checking types
print(type(age))    # <class 'int'>
print(type(price))  # <class 'float'>

# Type conversion
text_number = "42"
real_number = int(text_number)
print(real_number + 8)  # 50

# Combining string and number
print("I am " + str(age) + " years old")
```

**Output:**
```
<class 'int'>
<class 'float'>
50
I am 15 years old
```

### ⚠️ Common Mistakes

- **Mistake: Adding a string and a number** — `"Score: " + 100` causes a TypeError. → **Fix**: Convert the number first: `"Score: " + str(100)`.
- **Mistake: Doing math on string input** — `input()` always returns a string, so `input() + input()` concatenates instead of adding. → **Fix**: Wrap with `int()` or `float()`: `int(input()) + int(input())`.
- **Mistake: Converting non-numeric strings** — `int("hello")` crashes with ValueError. → **Fix**: Only convert strings that actually contain numbers.

### 🔗 Connection

You know how to create variables and print them. Now you understand *what kind of data* those variables hold. This matters because in the next lesson you will do **math operations** — and math only works correctly when you have the right types. Understanding types prevents the majority of beginner bugs.

### 🏋️ Quick Practice

Try these in your head before coding:
1. What is `type("3.14")` — int, float, or str?
2. What does `int(3.7)` return? (Hint: it truncates, it does not round.)
3. What does `"ha" * 3` produce?
"""

THEORIES[(0, 3)] = r"""## Math Operations and Expressions

### 🧠 How It Works

Python is a supercharged calculator built right into a programming language. You can do all the math you know from school — addition, subtraction, multiplication, division — plus a few extra operations that are incredibly useful in programming.

Think of math expressions like recipes: the operators (+, -, *, /) are the actions, and the numbers are the ingredients. Python follows the same **order of operations** you learned in math class (PEMDAS): Parentheses first, then Exponents, then Multiplication and Division (left to right), then Addition and Subtraction (left to right). When in doubt, add parentheses to make your intent clear.

Two operators deserve special attention. **Floor division** (`//`) divides and drops the decimal part — `7 // 2` gives `3`, not `3.5`. **Modulo** (`%`) gives the remainder after division — `7 % 2` gives `1` because 7 divided by 2 is 3 remainder 1. Modulo is surprisingly useful: checking if a number is even (`n % 2 == 0`), wrapping around values (like clock arithmetic), and extracting digits.

### 📝 Step by Step

1. Write your numbers and operators: `result = 10 + 3`.
2. Use parentheses to control order: `result = (10 + 3) * 2`.
3. For integer division (no decimals), use `//`.
4. For remainders, use `%`.
5. For powers, use `**`: `2 ** 10` is 1024.
6. Use shorthand update operators: `x += 5` is the same as `x = x + 5`.

### 💻 Example

```python
# Basic operations
print(10 + 3)    # 13
print(10 - 3)    # 7
print(10 * 3)    # 30
print(10 / 3)    # 3.3333333333333335
print(10 // 3)   # 3 (floor division)
print(10 % 3)    # 1 (remainder)
print(10 ** 3)   # 1000 (exponent)

# Order of operations
print(2 + 3 * 4)       # 14 (not 20)
print((2 + 3) * 4)     # 20

# Shorthand operators
score = 0
score += 10   # score is now 10
score *= 2    # score is now 20
print(score)
```

**Output:**
```
13
7
30
3.3333333333333335
3
1
1000
14
20
20
```

### ⚠️ Common Mistakes

- **Mistake: Using `/` when you want `//`** — `7 / 2` gives `3.5`, not `3`. → **Fix**: Use `//` for integer results: `7 // 2` gives `3`.
- **Mistake: Forgetting order of operations** — `100 - 20 * 3` gives `40`, not `240`. → **Fix**: Use parentheses: `(100 - 20) * 3`.
- **Mistake: Dividing by zero** — `10 / 0` crashes your program. → **Fix**: Always check the divisor is not zero before dividing.

### 🔗 Connection

You have learned types (lesson 3) so you know the difference between `int` and `float`. Now you can *calculate* with them. These math operations are the backbone of every program — from computing game physics to calculating shopping cart totals. Next module, you will learn to get **user input** so you can build interactive calculators.

### 🏋️ Quick Practice

Try these in your head before coding:
1. What is `17 // 5` and `17 % 5`?
2. What is `2 ** 8`?
3. After `x = 10` then `x += 5` then `x *= 2`, what is `x`?
"""

# ============================================================
# MODULE 2: Input and Strings
# ============================================================

THEORIES[(1, 0)] = r"""## Getting User Input

### 🧠 How It Works

Imagine having a conversation where only you can talk — pretty boring, right? So far, your programs are like that: they output things but never listen. The `input()` function changes everything by letting the user type something back. It pauses the program, waits for the user to type and press Enter, then returns what they typed as a string.

Think of `input()` as a microphone for your program. When you write `name = input("What is your name? ")`, the program displays the prompt message, hands the microphone to the user, waits for their response, and stores it in the variable `name`. The prompt (the text inside the parentheses) is optional but helps the user know what to type.

There is one critical thing to remember: **`input()` always returns a string**, even if the user types a number. If the user types `15`, you get the string `"15"`, not the number `15`. To do math with it, you must convert using `int()` or `float()`. A very common shortcut is `age = int(input("Your age: "))` — this reads input and converts to integer in one step.

### 📝 Step by Step

1. Call `input()` with an optional prompt string: `response = input("Enter something: ")`.
2. The return value is always a **string**.
3. To use it as a number, convert: `number = int(input())` or `decimal = float(input())`.
4. You can chain conversion in one line: `age = int(input("Age: "))`.
5. Store the result in a variable to use it later.

### 💻 Example

```python
# Simple text input
name = input("What is your name? ")
print("Hello, " + name + "!")

# Numeric input (must convert!)
birth_year = int(input("Birth year: "))
age = 2025 - birth_year
print("You are " + str(age) + " years old")

# Multiple inputs
first = input("First name: ")
last = input("Last name: ")
print("Full name: " + first + " " + last)
```

**Output:**
```
What is your name? Alex
Hello, Alex!
Birth year: 2010
You are 15 years old
First name: Alex
Last name: Smith
Full name: Alex Smith
```

### ⚠️ Common Mistakes

- **Mistake: Doing math without converting** — `age = input() + 1` tries to add 1 to a string. → **Fix**: Convert first: `age = int(input()) + 1`.
- **Mistake: Converting non-numeric input** — If the user types "abc" and you do `int(input())`, it crashes. → **Fix**: For now, assume valid input; later you will learn error handling.
- **Mistake: Forgetting that input includes what the user typed, not the prompt** — The prompt is just displayed; only the user's response is returned.

### 🔗 Connection

You learned to display output with `print()` and store data in variables. Now `input()` completes the loop — your programs can both talk and listen. In the next lesson, you will learn powerful **string methods** to manipulate the text that users type in.

### 🏋️ Quick Practice

Try these in your head before coding:
1. If the user types "25", what does `type(input())` return?
2. What does `int(input()) * 2` produce if the user types "7"?
3. What is the difference between `input("Name: ")` and `input()`?
"""

THEORIES[(1, 1)] = r"""## String Operations and Methods

### 🧠 How It Works

Strings are like Swiss Army knives — they come packed with built-in tools called **methods**. A method is a function that belongs to a specific object. When you write `"hello".upper()`, you are calling the `upper` method on the string `"hello"`, and it returns `"HELLO"`. The original string does not change (strings are immutable), so a new string is created.

Think of a string as a row of lockers, each holding one character. Each locker has a number (index) starting from 0. The string `"Python"` has locker 0 = 'P', locker 1 = 'y', locker 2 = 't', and so on. You can access individual characters with square brackets (`word[0]`) and grab slices (substrings) using the colon notation (`word[0:3]` gives the first three characters).

Indexing also works backwards: index `-1` is the last character, `-2` is second-to-last, and so on. Slicing with `[start:end]` includes `start` but excludes `end` — think of it like a half-open interval in math. This "off by one" convention feels weird at first but is consistent across Python.

### 📝 Step by Step

1. Call a method with dot notation: `text.upper()`, `text.lower()`, `text.strip()`.
2. Access a character by index: `text[0]` (first), `text[-1]` (last).
3. Slice with `[start:end]`: `text[0:3]` gets characters at positions 0, 1, 2.
4. Omit start or end: `text[:3]` means "from beginning to 3", `text[2:]` means "from 2 to end".
5. Chain methods: `text.strip().lower()` removes whitespace then lowercases.

### 💻 Example

```python
message = "  Hello, World!  "

# Common methods
print(message.strip())           # "Hello, World!" (remove whitespace)
print(message.strip().upper())   # "HELLO, WORLD!"
print(message.strip().lower())   # "hello, world!"
print(message.strip().replace("World", "Python"))  # "Hello, Python!"
print(len(message.strip()))      # 13

# Indexing and slicing
word = "Python"
print(word[0])     # P
print(word[-1])    # n
print(word[0:3])   # Pyt
print(word[2:])    # thon
print(word[::-1])  # nohtyP (reversed!)
```

**Output:**
```
Hello, World!
HELLO, WORLD!
hello, world!
Hello, Python!
13
P
n
Pyt
thon
nohtyP
```

### ⚠️ Common Mistakes

- **Mistake: Thinking methods change the original string** — `name.upper()` does NOT modify `name`. → **Fix**: Assign the result: `name = name.upper()`.
- **Mistake: Index out of range** — `"Hi"[5]` crashes because "Hi" only has indices 0 and 1. → **Fix**: Check `len()` before indexing, or use negative indices.
- **Mistake: Forgetting that slicing excludes the end index** — `"Python"[0:3]` gives "Pyt", not "Pyth". → **Fix**: Remember the end index is exclusive; use `[0:4]` to get four characters.

### 🔗 Connection

You can now get user input (previous lesson) and manipulate it with string methods. These tools are essential for processing any text — usernames, messages, file paths. Next, you will learn **f-strings**, a cleaner way to combine variables and text.

### 🏋️ Quick Practice

Try these in your head before coding:
1. What does `"Hello World".count("o")` return?
2. What does `"Python"[1:4]` give you?
3. What does `"  spaces  ".strip()` produce?
"""

THEORIES[(1, 2)] = r"""## F-strings and String Formatting

### 🧠 How It Works

Imagine you are filling out a form with blanks: "My name is ___ and I am ___ years old." Instead of cutting and pasting pieces together, you just write in the blanks. F-strings work exactly like that — you write your text template and drop variables right where the blanks are, using curly braces `{}`.

Before f-strings, combining strings and variables was painful: `"Name: " + name + ", Age: " + str(age)`. You had to convert every number with `str()` and manually add spaces. F-strings (available since Python 3.6) fix all of this. Just put an `f` before the opening quote and place any variable or expression inside `{}`. Python handles the conversions automatically.

F-strings can also do math and call methods right inside the curly braces: `f"Area: {width * height}"` or `f"Name: {name.upper()}"`. For formatting numbers, you add a colon and a format specifier: `f"${price:.2f}"` formats a number to exactly 2 decimal places — perfect for displaying money. This is the modern, Pythonic way to format strings, and you should use it everywhere.

### 📝 Step by Step

1. Start the string with `f` before the quote: `f"..."`.
2. Inside the string, put variables in curly braces: `f"Hello, {name}!"`.
3. You can put any expression inside braces: `f"Sum: {a + b}"`.
4. Format numbers with `:` specifiers: `f"{price:.2f}"` for 2 decimal places.
5. Call methods inside braces: `f"{name.upper()}"`.

### 💻 Example

```python
name = "Alex"
age = 15
score = 98.567

# Basic f-string
print(f"Hello, {name}! You are {age} years old.")

# Expressions inside braces
print(f"Next year you will be {age + 1}")
print(f"Name in caps: {name.upper()}")

# Number formatting
print(f"Score: {score:.1f}")      # 1 decimal place
print(f"Price: ${9.9:.2f}")       # 2 decimal places
print(f"Percentage: {0.856:.0%}") # As percentage
```

**Output:**
```
Hello, Alex! You are 15 years old.
Next year you will be 16
Name in caps: ALEX
Score: 98.6
Price: $9.90
Percentage: 86%
```

### ⚠️ Common Mistakes

- **Mistake: Forgetting the `f` prefix** — `"Hello, {name}"` prints literally `{name}` instead of the variable value. → **Fix**: Always start with `f`: `f"Hello, {name}"`.
- **Mistake: Using wrong format specifier** — `:.2f` works for floats, not strings. → **Fix**: Only use numeric format specifiers on numbers.
- **Mistake: Unmatched curly braces** — To print a literal `{`, you must double it: `f"{{"` prints `{`.

### 🔗 Connection

You have been building strings with the `+` operator, which works but is clunky. F-strings are the clean, modern replacement. You will use them in virtually every Python program from now on. Next lesson covers `split()` and `join()`, which let you break strings apart and reassemble them.

### 🏋️ Quick Practice

Try these in your head before coding:
1. What does `f"{3 * 7}"` display?
2. What does `f"{'hello'.upper()}"` display?
3. What does `f"{19.5:.0f}"` display?
"""

THEORIES[(1, 3)] = r"""## String Challenges: split() and join()

### 🧠 How It Works

Imagine you have a sentence written on a banner, and you need to cut it into individual word cards. That is what `split()` does — it chops a string into a list of smaller strings based on a separator. By default, it splits on spaces, but you can split on any character: commas, dashes, slashes, etc.

Now imagine the reverse: you have a pile of word cards and need to glue them back into a banner with a separator between each card. That is `join()`. You call it on the separator string and pass the list: `" ".join(words)` puts spaces between words, `"-".join(parts)` puts dashes between parts.

These two methods are a power duo used constantly in real programming. Parsing CSV data? Split on commas. Building a file path? Join with slashes. Processing user input? Split into words, modify some, join back. The pattern of split-process-join is one of the most common patterns in text processing.

### 📝 Step by Step

1. Split a string into a list: `words = sentence.split()` (splits on spaces).
2. Split on a specific character: `parts = date.split("-")`.
3. Process the list (modify, filter, reorder).
4. Join back together: `result = " ".join(words)`.
5. The separator goes before `.join()`: `"/".join(parts)`.

### 💻 Example

```python
# Splitting
sentence = "Python is really fun"
words = sentence.split()
print(words)  # ['Python', 'is', 'really', 'fun']

date = "2025-03-15"
parts = date.split("-")
print(parts)  # ['2025', '03', '15']

# Joining
colors = ["red", "green", "blue"]
print(", ".join(colors))  # red, green, blue
print(" -> ".join(colors))  # red -> green -> blue

# Split, modify, join
sentence = "hello world python"
words = sentence.split()
capitalized = [w.capitalize() for w in words]
print(" ".join(capitalized))  # Hello World Python
```

**Output:**
```
['Python', 'is', 'really', 'fun']
['2025', '03', '15']
red, green, blue
red -> green -> blue
Hello World Python
```

### ⚠️ Common Mistakes

- **Mistake: Calling join on the list instead of the separator** — `words.join(" ")` is wrong. → **Fix**: Call it on the separator: `" ".join(words)`.
- **Mistake: Forgetting that split returns a list** — `sentence.split()[0]` gets the first word, not the first character. → **Fix**: Remember split gives you a list of strings.
- **Mistake: Joining non-string items** — `" ".join([1, 2, 3])` crashes because join needs strings. → **Fix**: Convert first: `" ".join(str(x) for x in [1, 2, 3])`.

### 🔗 Connection

You have mastered strings — creating, formatting, and now splitting and joining them. You are ready to move to **making decisions**. In the next module, you will learn `if` statements, which let your program choose different paths based on conditions. Strings will keep appearing everywhere.

### 🏋️ Quick Practice

Try these in your head before coding:
1. What does `"a,b,c".split(",")` produce?
2. What does `"-".join(["2025", "01", "01"])` produce?
3. How many elements does `"one two three".split()` produce?
"""

# ============================================================
# MODULE 3: Making Decisions
# ============================================================

THEORIES[(2, 0)] = r"""## If Statements: Your First Decision

### 🧠 How It Works

Up until now, your programs run like trains on rails — straight from top to bottom, executing every line. But real programs need to make choices. Should the game character take damage or heal? Should the website show a login page or a dashboard? The `if` statement is how your program makes decisions.

Think of an `if` statement like a bouncer at a club: "If you are 18 or older, you can enter." The bouncer checks a condition and acts accordingly. In Python, you write the condition after `if`, and if it is `True`, the indented code block underneath runs. If it is `False`, that block is skipped entirely.

Python uses **indentation** (whitespace at the beginning of a line) to define which code belongs to the `if` block. This is different from most other languages that use curly braces. The standard is 4 spaces. Everything indented at the same level under the `if` is part of that block. The first line that is NOT indented is outside the block and always runs.

### 📝 Step by Step

1. Write `if` followed by a condition and a colon: `if age >= 18:`.
2. Indent the next lines by 4 spaces — these run only when the condition is True.
3. Add `else:` for code that runs when the condition is False.
4. Use comparison operators: `==`, `!=`, `>`, `<`, `>=`, `<=`.
5. The first non-indented line after the block always runs regardless.

### 💻 Example

```python
age = int(input("Enter your age: "))

if age >= 18:
    print("You are an adult!")
    print("You can vote.")
else:
    print("You are a minor.")
    print("You cannot vote yet.")

print("Thanks for checking!")  # Always runs
```

**Output (if user enters 20):**
```
Enter your age: 20
You are an adult!
You can vote.
Thanks for checking!
```

### ⚠️ Common Mistakes

- **Mistake: Using `=` instead of `==`** — `if x = 5:` is assignment, not comparison. → **Fix**: Use `==` for comparison: `if x == 5:`.
- **Mistake: Forgetting the colon** — `if age >= 18` without `:` is a syntax error. → **Fix**: Always end the `if` line with a colon.
- **Mistake: Inconsistent indentation** — Mixing tabs and spaces causes errors. → **Fix**: Always use 4 spaces for indentation.

### 🔗 Connection

You have been writing linear programs. Now you can make your programs *think* and choose different paths. This is the foundation of all interactive software. Next, you will learn `elif` chains to handle multiple options — not just yes/no decisions.

### 🏋️ Quick Practice

Try these in your head before coding:
1. If `x = 3`, does `if x > 5: print("big")` print anything?
2. What does `==` do compared to `=`?
3. If the indented block under `if` has 3 lines, how many of them run when the condition is False?
"""

THEORIES[(2, 1)] = r"""## If / Elif / Else Chains

### 🧠 How It Works

A simple `if/else` is like a fork in the road — two choices. But what if you need to choose between five options? That is where `elif` (short for "else if") comes in. It lets you chain multiple conditions together, like a series of doors: Python tries each one in order and enters the first door whose condition is True.

Imagine a grade calculator: A for 90+, B for 80+, C for 70+, D for 60+, F otherwise. You cannot do this with simple if/else — you need multiple checkpoints. With `elif`, Python checks each condition from top to bottom and runs the FIRST block that matches. Once a match is found, all remaining elif and else blocks are skipped. The `else` at the end is a catch-all safety net.

A critical distinction: using `elif` means the conditions are mutually exclusive (only one block runs). Using separate `if` statements means each condition is checked independently (multiple blocks could run). For grading, you want `elif` so a score of 95 only gives "A", not "A" and "B" and "C".

### 📝 Step by Step

1. Start with `if condition:` for the first check.
2. Add `elif condition:` for each additional check.
3. End with `else:` as the catch-all (optional but recommended).
4. Python checks from top to bottom and runs only the first matching block.
5. Order matters: put the most specific conditions first.

### 💻 Example

```python
score = int(input("Enter your score: "))

if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 70:
    grade = "C"
elif score >= 60:
    grade = "D"
else:
    grade = "F"

print(f"Your grade: {grade}")
```

**Output (if user enters 85):**
```
Enter your score: 85
Your grade: B
```

### ⚠️ Common Mistakes

- **Mistake: Using `if` instead of `elif`** — Separate `if` statements check every condition independently. → **Fix**: Use `elif` when only one branch should execute.
- **Mistake: Wrong order of conditions** — Checking `score >= 60` before `score >= 90` means 95 matches 60+ first. → **Fix**: Order from most restrictive to least restrictive.
- **Mistake: Forgetting `else`** — Without `else`, no code runs if nothing matches. → **Fix**: Always include `else` as a safety net when appropriate.

### 🔗 Connection

You learned simple if/else (two paths). Now you can handle multiple paths with elif chains. Next, you will learn **logical operators** (and, or, not) to combine multiple conditions into one — like checking if someone is old enough AND has a ticket.

### 🏋️ Quick Practice

Try these in your head before coding:
1. In an if/elif/elif/else chain, how many blocks can execute at most?
2. If you use four separate `if` statements instead of elif, how many could execute?
3. What grade does a score of 90 get in the example above?
"""

THEORIES[(2, 2)] = r"""## Logical Operators: and, or, not

### 🧠 How It Works

Sometimes one condition is not enough to make a decision. Can a teenager create a social media account? They need to be 13 or older AND have parental permission. Should you bring an umbrella? If it is raining OR the forecast says rain. Should you go outside? If it is NOT too cold. Python's logical operators — `and`, `or`, `not` — let you combine conditions.

Think of `and` as a strict teacher who requires ALL conditions to be met: both must be True for the result to be True. Think of `or` as a lenient teacher who just needs at least one to be True. And `not` simply flips True to False and vice versa — like a light switch.

You can combine as many conditions as you want and use parentheses to group them clearly. Python evaluates `not` first, then `and`, then `or` — but using parentheses makes your code much more readable. A useful technique: `not (a and b)` is the same as `(not a) or (not b)` (De Morgan's law).

### 📝 Step by Step

1. Use `and` when ALL conditions must be True: `if age >= 13 and has_permission:`.
2. Use `or` when ANY condition being True is enough: `if day == "Sat" or day == "Sun":`.
3. Use `not` to flip a condition: `if not is_raining:`.
4. Use parentheses for clarity: `if (a > 5 and b > 5) or c > 10:`.
5. Combine with elif chains for complex decision trees.

### 💻 Example

```python
age = 16
has_id = True
is_student = True

# and: both must be true
if age >= 16 and has_id:
    print("You can drive!")

# or: at least one must be true
if is_student or age < 18:
    print("You get a discount!")

# not: flips the condition
is_weekend = False
if not is_weekend:
    print("Time for school")

# Complex combination
temp = 25
is_sunny = True
if (temp > 20 and temp < 35) and is_sunny:
    print("Perfect beach weather!")
```

**Output:**
```
You can drive!
You get a discount!
Time for school
Perfect beach weather!
```

### ⚠️ Common Mistakes

- **Mistake: Using `and` when you mean `or`** — `if color == "red" and color == "blue"` is always False (color cannot be both). → **Fix**: Use `or`: `if color == "red" or color == "blue"`.
- **Mistake: Writing `if x == 1 or 2`** — This does not check if x is 1 or 2. → **Fix**: Write `if x == 1 or x == 2`.
- **Mistake: Overly complex conditions** — Too many `and`/`or` in one line is confusing. → **Fix**: Break into multiple lines or use intermediate variables.

### 🔗 Connection

You can now make multi-option decisions (elif) and combine conditions (and/or/not). Next, you will learn **nested conditions** — putting if statements inside other if statements — for when your decision tree has layers.

### 🏋️ Quick Practice

Try these in your head before coding:
1. What is `True and False`?
2. What is `True or False`?
3. What is `not True`?
"""

THEORIES[(2, 3)] = r"""## Nested Conditions and Complex Logic

### 🧠 How It Works

Sometimes a decision depends on the result of a previous decision. Should you go to the movies? First, do you have money? If yes, is there a good movie playing? If yes, do you have time? Each question only matters if the previous answer was "yes." This is called **nesting** — putting `if` statements inside other `if` statements.

Think of it like a decision tree or a flowchart where each branch leads to more branches. The first `if` checks the broadest condition, and inner `if` statements narrow things down. Each level of nesting adds 4 more spaces of indentation. While nesting is powerful, going deeper than 2-3 levels makes code hard to read — a sign that you should refactor using functions or `and`/`or`.

A very practical pattern with nesting is **input validation**: first check if the input is the right type (a number), then check if the number is in an acceptable range. The `.isdigit()` method checks if a string contains only digit characters, and `.replace()` can handle negative numbers or decimals.

### 📝 Step by Step

1. Write the outer `if` condition for the broadest check.
2. Indent and write the inner `if` for a more specific check.
3. Each nesting level adds 4 more spaces.
4. Add `else` blocks at each level as needed.
5. If nesting gets deeper than 2-3 levels, consider using `and`/`or` instead.

### 💻 Example

```python
has_ticket = True
age = 15

if has_ticket:
    if age >= 18:
        print("Welcome to the R-rated movie!")
    elif age >= 13:
        print("Welcome to the PG-13 movie!")
    else:
        print("Sorry, only G-rated movies for you.")
else:
    print("Please buy a ticket first.")

# Input validation pattern
value = input("Enter a positive number: ")
if value.isdigit():
    number = int(value)
    if number > 0:
        print(f"Square root: {number ** 0.5:.2f}")
    else:
        print("Must be positive!")
else:
    print("Not a valid number!")
```

**Output (with ticket, age 15):**
```
Welcome to the PG-13 movie!
```

### ⚠️ Common Mistakes

- **Mistake: Nesting too deeply** — 4+ levels of nesting becomes unreadable. → **Fix**: Flatten with `and`/`or` or extract into functions.
- **Mistake: Forgetting that inner else belongs to the inner if** — Indentation determines which `if` an `else` belongs to. → **Fix**: Carefully align your `else` with its matching `if`.
- **Mistake: Not handling all cases** — Forgetting an `else` at the outer level means some inputs are silently ignored. → **Fix**: Always handle the "else" case, even if just to print an error.

### 🔗 Connection

You now have all the decision-making tools: if/elif/else, logical operators, and nesting. This completes the "Making Decisions" module. Next, you will enter the world of **loops**, where your programs can repeat actions — the real power multiplier of programming.

### 🏋️ Quick Practice

Try these in your head before coding:
1. Is `"-5".isdigit()` True or False? (Hint: the minus sign is not a digit.)
2. In nested ifs, which `else` does the innermost `else` belong to?
3. Can you rewrite `if a: if b: do_something()` using `and`?
"""

# ============================================================
# MODULE 4: Loops — Repeat Yourself
# ============================================================

THEORIES[(3, 0)] = r"""## For Loops: Counting and Iterating

### 🧠 How It Works

Imagine you are a teacher who needs to hand out papers to 30 students. You do not write 30 separate instructions — you just say "for each student, give them a paper." That is exactly what a `for` loop does: it repeats a block of code for each item in a sequence.

The `for` loop is Python's most common loop. It walks through a sequence — numbers generated by `range()`, characters in a string, or items in a list — and executes the body once for each item. The loop variable (commonly `i`) takes the value of each item one by one.

The `range()` function is your best friend for generating sequences of numbers. `range(5)` generates 0, 1, 2, 3, 4 (five numbers starting from 0). `range(1, 6)` generates 1, 2, 3, 4, 5 (start is inclusive, end is exclusive). `range(0, 20, 5)` counts by 5: 0, 5, 10, 15. You can even count backwards: `range(10, 0, -1)` gives 10, 9, 8, ..., 1.

### 📝 Step by Step

1. Write `for variable in sequence:` followed by a colon.
2. Indent the body — the code that repeats.
3. Use `range(n)` for n iterations (0 to n-1).
4. Use `range(start, stop)` for a specific range (stop is excluded).
5. Use `range(start, stop, step)` to count by a step value.

### 💻 Example

```python
# Count from 1 to 5
for i in range(1, 6):
    print(i)

# Count by 2
for i in range(0, 10, 2):
    print(i, end=" ")  # 0 2 4 6 8
print()  # new line

# Loop over a string
for char in "Python":
    print(char, end="-")  # P-y-t-h-o-n-
print()

# Accumulator pattern
total = 0
for i in range(1, 11):
    total += i
print(f"Sum of 1-10: {total}")  # 55
```

**Output:**
```
1
2
3
4
5
0 2 4 6 8
P-y-t-h-o-n-
Sum of 1-10: 55
```

### ⚠️ Common Mistakes

- **Mistake: Off-by-one with range** — `range(1, 5)` gives 1,2,3,4 (not 5). → **Fix**: Use `range(1, 6)` to include 5. The end is always excluded.
- **Mistake: Modifying the loop variable** — Changing `i` inside the loop does not affect the next iteration. → **Fix**: Understand that `for` assigns `i` fresh each iteration.
- **Mistake: Forgetting the colon** — `for i in range(5)` without `:` is a syntax error.

### 🔗 Connection

You have made decisions with `if`. Now loops let your programs **repeat** — the second fundamental control structure. Together, decisions and loops can solve almost any problem. Next, you will learn `while` loops for situations where you do not know in advance how many times to repeat.

### 🏋️ Quick Practice

Try these in your head before coding:
1. How many times does `for i in range(10):` execute its body?
2. What does `range(3, 8)` generate?
3. What does `range(10, 0, -2)` generate?
"""

THEORIES[(3, 1)] = r"""## While Loops: Repeat Until Done

### 🧠 How It Works

A `for` loop runs a fixed number of times. But what if you do not know how many repetitions you need? Imagine a guessing game: you keep guessing until you get it right. You have no idea whether it will take 1 guess or 100. A `while` loop handles this perfectly — it keeps running as long as a condition is True.

Think of a `while` loop like a revolving door: before each pass, you check "should I keep going?" If yes, you go through again. If no, you stop. The condition is checked BEFORE each iteration, so if it starts as False, the body never runs at all (unlike a do-while loop in other languages, which Python does not have).

The biggest danger with while loops is the **infinite loop** — when the condition never becomes False. This happens when you forget to update the variable being checked. Always ask yourself: "What changes inside my loop to eventually make the condition False?" Common patterns: incrementing a counter, reading new input, or using `break`.

### 📝 Step by Step

1. Write `while condition:` followed by a colon.
2. Indent the body — the code that repeats.
3. Make sure something in the body changes the condition eventually.
4. Use `while True:` with `break` for loops that check the exit condition in the middle.
5. Test your loop mentally: does it terminate?

### 💻 Example

```python
# Basic counting
count = 1
while count <= 5:
    print(count)
    count += 1  # CRITICAL: without this, infinite loop!

# User input loop
while True:
    command = input("Type 'quit' to exit: ")
    if command == "quit":
        break
    print(f"You said: {command}")

# Finding the first power of 2 over 1000
power = 1
while power <= 1000:
    power *= 2
print(f"First power of 2 over 1000: {power}")
```

**Output:**
```
1
2
3
4
5
First power of 2 over 1000: 1024
```

### ⚠️ Common Mistakes

- **Mistake: Forgetting to update the loop variable** — The loop runs forever. → **Fix**: Always modify the variable that the condition checks inside the loop body.
- **Mistake: Off-by-one in the condition** — `while count < 5` vs `while count <= 5` gives different results. → **Fix**: Trace through mentally: does 5 get included or not?
- **Mistake: Using `while` when `for` is simpler** — If you know the number of iterations, `for` is cleaner. → **Fix**: Use `while` only when the number of iterations is unknown.

### 🔗 Connection

`for` loops repeat a known number of times; `while` loops repeat until a condition changes. Together they cover all repetition needs. Next, you will learn `break`, `continue`, and loop `else` — tools for fine-tuning how your loops behave.

### 🏋️ Quick Practice

Try these in your head before coding:
1. How many times does `while False: print("hi")` execute?
2. After `x = 10; while x > 0: x -= 3`, what is `x`?
3. What happens if you write `while True:` with no `break` inside?
"""

THEORIES[(3, 2)] = r"""## Loop Control: break, continue, else

### 🧠 How It Works

Sometimes you need more control over a loop than just "keep going" or "stop." Maybe you want to exit early when you find what you are looking for, skip certain iterations, or know whether the loop finished naturally. Python gives you three tools: `break`, `continue`, and the loop `else`.

Think of `break` as an emergency exit — you immediately leave the loop, no matter where you are. Think of `continue` as a skip button — you skip the rest of the current iteration and jump to the next one. And the loop `else` is like a "mission accomplished" flag — it runs only if the loop completed without hitting a `break`.

The `for/else` pattern is unique to Python and is especially useful for search problems. You loop through items looking for something. If you find it, you `break`. If the loop finishes without finding it (no break was hit), the `else` runs — that is your "not found" handler. This pattern eliminates the need for a `found` flag variable.

### 📝 Step by Step

1. Use `break` to exit a loop immediately when a condition is met.
2. Use `continue` to skip the rest of the current iteration.
3. Use `else` on a loop to run code when the loop finishes without `break`.
4. `break` and `continue` work in both `for` and `while` loops.
5. In nested loops, `break` only exits the innermost loop.

### 💻 Example

```python
# break: stop when found
for num in range(1, 100):
    if num % 7 == 0 and num % 5 == 0:
        print(f"First number divisible by 7 and 5: {num}")
        break

# continue: skip odd numbers
for i in range(10):
    if i % 2 != 0:
        continue
    print(i, end=" ")  # 0 2 4 6 8
print()

# for/else: search pattern
target = 13
for i in range(2, target):
    if target % i == 0:
        print(f"{target} is divisible by {i}")
        break
else:
    print(f"{target} is prime!")
```

**Output:**
```
First number divisible by 7 and 5: 35
0 2 4 6 8
13 is prime!
```

### ⚠️ Common Mistakes

- **Mistake: Putting `else` at wrong indentation** — The `else` must align with the `for` or `while`, not with the `if` inside the loop. → **Fix**: Align `else` with the loop keyword.
- **Mistake: Using `break` when you mean `continue`** — `break` exits the entire loop; `continue` just skips one iteration. → **Fix**: Think about what you want: "stop entirely" vs "skip this one."
- **Mistake: Expecting `break` to exit all nested loops** — It only exits the innermost loop. → **Fix**: Use a flag variable or refactor into a function with `return`.

### 🔗 Connection

You now have complete control over loops: `for` for counting, `while` for unknown iterations, and `break`/`continue`/`else` for fine-tuning. Next, you will learn **nested loops** — putting loops inside loops — for working with grids and patterns.

### 🏋️ Quick Practice

Try these in your head before coding:
1. Does the `else` block run if the loop completes without `break`?
2. In `for i in range(5): if i == 3: continue; print(i)`, which numbers print?
3. What is the output of `for i in range(3): if i == 1: break` followed by `else: print("done")`?
"""

THEORIES[(3, 3)] = r"""## Nested Loops and Patterns

### 🧠 How It Works

Think of nested loops like the gears in a clock. The hour hand (outer loop) moves slowly, and for each position of the hour hand, the minute hand (inner loop) goes through a full rotation. In code, the inner loop runs completely for EVERY single iteration of the outer loop.

If the outer loop runs 3 times and the inner loop runs 4 times, the code inside the inner loop executes 3 times 4 = 12 times total. This is incredibly powerful for working with two-dimensional structures: grids, tables, matrices, and text patterns.

A key tool for patterns is the `end` parameter of `print()`. By default, `print()` adds a newline at the end. Writing `print("*", end=" ")` replaces the newline with a space, keeping output on the same line. Then `print()` with no arguments creates a new line. This combo lets you build 2D patterns line by line.

### 📝 Step by Step

1. Write the outer loop for rows: `for row in range(n):`.
2. Inside it, write the inner loop for columns: `for col in range(m):`.
3. Use `print(..., end=" ")` to print on the same line.
4. After the inner loop, call `print()` to move to the next line.
5. The total iterations = outer iterations multiplied by inner iterations.

### 💻 Example

```python
# Print a 3x4 grid of stars
for row in range(3):
    for col in range(4):
        print("*", end=" ")
    print()  # new line after each row

print()  # blank line

# Right triangle pattern
n = 5
for i in range(1, n + 1):
    print("*" * i)

print()

# Multiplication table (5x5)
for i in range(1, 6):
    for j in range(1, 6):
        print(f"{i*j:4}", end="")
    print()
```

**Output:**
```
* * * *
* * * *
* * * *

*
**
***
****
*****

   1   2   3   4   5
   2   4   6   8  10
   3   6   9  12  15
   4   8  12  16  20
   5  10  15  20  25
```

### ⚠️ Common Mistakes

- **Mistake: Forgetting `print()` after the inner loop** — Everything prints on one long line. → **Fix**: Always add `print()` (no arguments) after the inner loop to start a new row.
- **Mistake: Wrong loop variable in the inner loop** — Using `i` in both loops causes confusion. → **Fix**: Use different names: `row`/`col`, `i`/`j`, `outer`/`inner`.
- **Mistake: Not understanding total iterations** — An outer loop of 100 and inner loop of 100 means 10,000 iterations. → **Fix**: Multiply the ranges to estimate total work.

### 🔗 Connection

Nested loops complete your loop toolkit. You can now repeat with `for`, loop conditionally with `while`, control flow with `break`/`continue`, and work with 2D structures using nested loops. Next module: **lists and tuples** — data structures that store collections of items, which loops are perfect for processing.

### 🏋️ Quick Practice

Try these in your head before coding:
1. If the outer loop runs 5 times and inner runs 3 times, how many total iterations?
2. What does `print("X", end="")` do differently from `print("X")`?
3. What does `"*" * 4` produce?
"""

# ============================================================
# MODULE 5: Lists and Tuples
# ============================================================

THEORIES[(4, 0)] = r"""## Lists: Ordered Collections

### 🧠 How It Works

So far, each variable holds one value — one name, one number, one string. But what if you need to store 30 student names, 100 test scores, or a shopping cart with varying items? Creating separate variables for each is madness. A **list** is a single variable that holds multiple values in order, like a numbered column in a spreadsheet.

Think of a list as a train with numbered cars. Each car (element) has a position (index) starting from 0. You can add cars to the end, insert them in the middle, remove specific ones, or rearrange the entire train. Lists are **mutable** — unlike strings, you can change their contents after creation.

Lists are created with square brackets `[]` and elements separated by commas. They can hold any type of data — strings, numbers, booleans, even other lists. You access elements by index (just like string characters), and Python provides a rich set of methods for adding, removing, and modifying elements.

### 📝 Step by Step

1. Create a list with square brackets: `fruits = ["apple", "banana", "cherry"]`.
2. Access elements by index (starting from 0): `fruits[0]` gives `"apple"`.
3. Modify elements: `fruits[1] = "blueberry"`.
4. Add to the end: `fruits.append("date")`.
5. Remove elements: `fruits.remove("cherry")` or `fruits.pop()` (removes last).

### 💻 Example

```python
# Creating and accessing
scores = [95, 87, 92, 78, 100]
print(scores[0])    # 95 (first)
print(scores[-1])   # 100 (last)
print(len(scores))  # 5

# Modifying
scores.append(88)          # Add to end
scores.insert(0, 99)       # Insert at position 0
scores.remove(78)          # Remove first occurrence of 78
last = scores.pop()        # Remove and return last item
print(scores)

# Useful built-ins
print(min(scores))
print(max(scores))
print(sum(scores))
```

**Output:**
```
95
100
5
[99, 95, 87, 92, 100]
87
100
474
```

### ⚠️ Common Mistakes

- **Mistake: Index out of range** — Accessing `my_list[10]` when the list has 5 elements. → **Fix**: Valid indices are 0 to `len(list)-1`. Use negative indices for counting from the end.
- **Mistake: Confusing `append` and `+`** — `list.append([1,2])` adds one element (a list); `list + [1,2]` concatenates. → **Fix**: Use `append` for single items, `extend` or `+` for adding multiple items.
- **Mistake: Forgetting that lists are mutable** — Assigning `b = a` makes both variables point to the same list. → **Fix**: Use `b = a.copy()` or `b = a[:]` to create a separate copy.

### 🔗 Connection

Variables store single values; lists store collections. Combined with loops, you can process thousands of items with just a few lines. Next, you will learn powerful list operations: sorting, slicing, and comprehensions — which make lists truly elegant.

### 🏋️ Quick Practice

Try these in your head before coding:
1. After `x = [1, 2, 3]; x.append(4)`, what is `len(x)`?
2. What does `[1, 2, 3][-1]` return?
3. What does `[10, 20, 30].pop()` return, and what is left?
"""

THEORIES[(4, 1)] = r"""## List Operations: sort, slice, comprehension

### 🧠 How It Works

Lists become truly powerful with three features: **sorting** to organize data, **slicing** to extract portions, and **comprehensions** to create new lists in a single elegant line. These are the tools that separate beginner Python from real Python.

Sorting rearranges elements in order. `sort()` changes the list in-place (modifies the original), while `sorted()` returns a new sorted list (original unchanged). Both support `reverse=True` for descending order and a `key` parameter for custom sorting.

Slicing works exactly like string slicing: `list[start:end]` extracts a sublist (start included, end excluded). The step parameter `list[::2]` takes every second element, and `list[::-1]` reverses the list. Comprehensions are a one-line shortcut for the loop-append pattern: `[expression for item in iterable if condition]`. They read almost like English and are one of Python's most beloved features.

### 📝 Step by Step

1. Sort in place: `my_list.sort()` (ascending) or `my_list.sort(reverse=True)`.
2. Create a sorted copy: `new_list = sorted(my_list)`.
3. Slice a portion: `my_list[1:4]` (elements at indices 1, 2, 3).
4. Reverse with slicing: `my_list[::-1]`.
5. Use list comprehensions: `[x**2 for x in range(10)]` creates `[0, 1, 4, 9, ...]`.

### 💻 Example

```python
# Sorting
numbers = [3, 1, 4, 1, 5, 9, 2, 6]
numbers.sort()
print(numbers)  # [1, 1, 2, 3, 4, 5, 6, 9]

# Slicing
letters = ['a', 'b', 'c', 'd', 'e']
print(letters[1:4])   # ['b', 'c', 'd']
print(letters[::-1])  # ['e', 'd', 'c', 'b', 'a']

# Comprehensions
squares = [x ** 2 for x in range(6)]
print(squares)  # [0, 1, 4, 9, 16, 25]

evens = [x for x in range(20) if x % 2 == 0]
print(evens)  # [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]

names = ["alice", "bob", "charlie"]
upper_names = [n.upper() for n in names]
print(upper_names)  # ['ALICE', 'BOB', 'CHARLIE']
```

**Output:**
```
[1, 1, 2, 3, 4, 5, 6, 9]
['b', 'c', 'd']
['e', 'd', 'c', 'b', 'a']
[0, 1, 4, 9, 16, 25]
[0, 2, 4, 6, 8, 10, 12, 14, 16, 18]
['ALICE', 'BOB', 'CHARLIE']
```

### ⚠️ Common Mistakes

- **Mistake: Confusing `sort()` and `sorted()`** — `sort()` returns `None` and modifies the list. `sorted()` returns a new list. → **Fix**: Use `sorted()` when you need to keep the original.
- **Mistake: Forgetting slice end is exclusive** — `[1:3]` gives indices 1 and 2, not 3. → **Fix**: Same rule as `range()` — end is always excluded.
- **Mistake: Overly complex comprehensions** — Multi-line comprehensions with nested conditions are hard to read. → **Fix**: If it does not fit on one readable line, use a regular loop.

### 🔗 Connection

You can now create, modify, sort, slice, and generate lists with comprehensions. These are skills you will use in every project. Next, you will learn **tuples** — the immutable cousin of lists — and when to use each.

### 🏋️ Quick Practice

Try these in your head before coding:
1. What does `sorted([3, 1, 2], reverse=True)` produce?
2. What does `[1, 2, 3, 4, 5][::2]` produce?
3. What does `[x * 10 for x in range(4)]` produce?
"""

THEORIES[(4, 2)] = r"""## Tuples: Immutable Sequences

### 🧠 How It Works

A **tuple** is like a list's more serious sibling — it stores ordered elements, but once created, it cannot be changed. No adding, no removing, no modifying. Think of it like a photo versus a whiteboard: a whiteboard (list) can be erased and rewritten, but a photo (tuple) is fixed once taken.

Why would you ever want something you cannot change? Three reasons. First, **safety**: when data should not change (GPS coordinates, RGB colors, database records), a tuple prevents accidental modification. Second, **performance**: tuples use slightly less memory and are slightly faster. Third, **dictionary keys**: tuples can be used as dictionary keys because they are immutable; lists cannot.

Tuples use parentheses `()` instead of square brackets. A tricky edge case: a single-element tuple needs a trailing comma — `(42,)` not `(42)` (which is just the number 42 in parentheses). Tuple **unpacking** is one of the coolest features: `x, y = (3, 7)` assigns 3 to x and 7 to y in one line.

### 📝 Step by Step

1. Create a tuple with parentheses: `point = (3, 7)`.
2. Access elements by index (same as lists): `point[0]` gives `3`.
3. Unpack into variables: `x, y = point`.
4. Single element tuples need a comma: `solo = (42,)`.
5. Use tuples for data that should not change: coordinates, colors, config values.

### 💻 Example

```python
# Creating tuples
coordinates = (10, 20)
rgb_color = (255, 128, 0)
single = (42,)  # Note the comma!

# Accessing elements
print(coordinates[0])  # 10
print(rgb_color[-1])   # 0

# Tuple unpacking
x, y = coordinates
print(f"x={x}, y={y}")  # x=10, y=20

# Swap trick using tuples
a, b = 5, 10
a, b = b, a
print(f"a={a}, b={b}")  # a=10, b=5

# Tuples are immutable
# coordinates[0] = 99  # ERROR! Cannot modify

# Can be used in loops
for value in rgb_color:
    print(value)
```

**Output:**
```
10
0
x=10, y=20
a=10, b=5
255
128
0
```

### ⚠️ Common Mistakes

- **Mistake: Forgetting the comma in single-element tuples** — `(42)` is just the number 42, not a tuple. → **Fix**: Always add a comma: `(42,)`.
- **Mistake: Trying to modify a tuple** — `my_tuple[0] = 5` raises TypeError. → **Fix**: If you need to change data, use a list instead.
- **Mistake: Confusing tuples with lists** — They look similar but have different purposes. → **Fix**: Use tuples for fixed data, lists for data that changes.

### 🔗 Connection

Lists are mutable (changeable), tuples are immutable (fixed). Choosing the right one shows programming maturity. Next, you will learn about **searching and iterating** through lists — patterns you will use every day as a programmer.

### 🏋️ Quick Practice

Try these in your head before coding:
1. What is `type((1, 2, 3))`?
2. After `a, b, c = (10, 20, 30)`, what is `b`?
3. Why is `(5)` not a tuple but `(5,)` is?
"""

THEORIES[(4, 3)] = r"""## Iterating and Searching in Lists

### 🧠 How It Works

Most real programs revolve around processing collections of data: finding the highest score, checking if a user exists, counting how many items match a condition. These are all **iteration and search** patterns — and once you learn them, you will see them everywhere.

Think of it like going through a stack of papers. Sometimes you flip through every page (full iteration). Sometimes you stop as soon as you find what you need (search with early exit). Sometimes you need to know not just the item but its position (enumeration). Python provides elegant tools for all of these.

The `in` keyword checks membership: `"banana" in fruits` returns True if the list contains "banana". `enumerate()` gives you both the index and value during iteration, saving you from manual counter management. And the built-in `min()`, `max()`, `sum()` functions work on any sequence of numbers.

### 📝 Step by Step

1. Check if an item exists: `if item in my_list:`.
2. Find an item's position: `my_list.index(item)`.
3. Count occurrences: `my_list.count(item)`.
4. Use enumerate for index + value: `for i, val in enumerate(my_list):`.
5. Use min/max/sum for quick calculations on number lists.

### 💻 Example

```python
scores = [85, 92, 78, 95, 88, 92]

# Membership check
print(95 in scores)      # True
print(100 in scores)     # False

# Finding and counting
print(scores.index(92))  # 1 (first occurrence)
print(scores.count(92))  # 2

# Enumerate: index + value
for i, score in enumerate(scores):
    if score >= 90:
        print(f"Position {i}: {score} (excellent!)")

# Built-in functions
print(f"Min: {min(scores)}")
print(f"Max: {max(scores)}")
print(f"Sum: {sum(scores)}")
print(f"Avg: {sum(scores) / len(scores):.1f}")
```

**Output:**
```
True
False
1
2
Position 1: 92 (excellent!)
Position 3: 95 (excellent!)
Position 5: 92 (excellent!)
Min: 78
Max: 95
Sum: 530
Avg: 88.3
```

### ⚠️ Common Mistakes

- **Mistake: Using `index()` on a missing item** — `[1,2,3].index(99)` raises ValueError. → **Fix**: Check with `in` first: `if 99 in my_list:`.
- **Mistake: Modifying a list while iterating** — Removing items during a `for` loop skips elements. → **Fix**: Iterate over a copy: `for item in my_list.copy():`.
- **Mistake: Forgetting enumerate starts at 0** — Use `enumerate(list, start=1)` if you want 1-based counting.

### 🔗 Connection

You now have a complete toolkit for lists: creating, modifying, sorting, slicing, comprehensions, tuples, and searching. This completes the collections module. Next, you enter the world of **dictionaries** — key-value storage that is even more powerful than lists for real-world data.

### 🏋️ Quick Practice

Try these in your head before coding:
1. What does `"cat" in ["cat", "dog", "fish"]` return?
2. What does `enumerate(["a", "b", "c"])` produce?
3. What is `sum([10, 20, 30]) / len([10, 20, 30])`?
"""

# ============================================================
# MODULE 6: Dictionaries
# ============================================================

THEORIES[(5, 0)] = r"""## Dictionaries: Key-Value Storage

### 🧠 How It Works

A list stores items by position (index 0, 1, 2...), but what if you want to look things up by name? A **dictionary** stores data as **key-value pairs** — like a real dictionary where you look up a word (key) to find its definition (value), or like a phone book where you look up a name (key) to find a number (value).

Think of a dictionary as a set of labeled boxes. Instead of numbered slots (like lists), each box has a unique label. You look up items by their label, not their position. This makes dictionaries perfect for representing real-world objects: a student with a name, age, and grade; a product with a title, price, and quantity; a game character with health, attack, and defense.

Dictionaries are created with curly braces `{}` and colons between keys and values. Keys must be unique and immutable (strings, numbers, tuples). Values can be anything. Looking up a key is extremely fast — Python uses a hash table internally, making dictionary lookups nearly instant regardless of size.

### 📝 Step by Step

1. Create with curly braces: `student = {"name": "Alex", "age": 15}`.
2. Access by key: `student["name"]` gives `"Alex"`.
3. Add or update: `student["email"] = "alex@school.com"`.
4. Delete: `del student["email"]`.
5. Check key existence: `if "name" in student:`.

### 💻 Example

```python
# Creating a dictionary
student = {
    "name": "Alex",
    "age": 15,
    "grade": "10th",
    "gpa": 3.8
}

# Accessing values
print(student["name"])   # Alex
print(student["gpa"])    # 3.8

# Adding and updating
student["email"] = "alex@school.com"
student["gpa"] = 3.9

# Checking keys
print("name" in student)   # True
print("phone" in student)  # False

# Length
print(len(student))  # 5
```

**Output:**
```
Alex
3.8
True
False
5
```

### ⚠️ Common Mistakes

- **Mistake: Accessing a non-existent key** — `student["phone"]` raises KeyError. → **Fix**: Check first with `in`, or use `.get("phone", "N/A")`.
- **Mistake: Using a mutable key** — `{[1,2]: "value"}` crashes because lists are not hashable. → **Fix**: Use tuples or strings as keys.
- **Mistake: Confusing `in` for values vs keys** — `"Alex" in student` checks KEYS, not values. → **Fix**: Check values with `"Alex" in student.values()`.

### 🔗 Connection

Lists store ordered collections; dictionaries store labeled data. You will use both together constantly — for example, a list of dictionaries to represent a table of students. Next, you will learn dictionary methods for safe access and iteration.

### 🏋️ Quick Practice

Try these in your head before coding:
1. What does `{"a": 1, "b": 2}["b"]` return?
2. Can you use a list as a dictionary key?
3. What does `len({"x": 10, "y": 20, "z": 30})` return?
"""

THEORIES[(5, 1)] = r"""## Dictionary Methods and Iteration

### 🧠 How It Works

Dictionaries come packed with methods that make working with key-value data smooth and safe. The most important one is `.get()` — it lets you access a key without crashing if the key does not exist. Instead, it returns a default value you specify.

Iterating over dictionaries is different from lists because each element has two parts: a key and a value. By default, looping over a dictionary gives you the keys. Use `.values()` for just the values, and `.items()` for both keys and values together. The `.items()` method is the most commonly used — it gives you tuples of (key, value) that you can unpack directly in the loop.

Other useful methods include `.update()` for merging dictionaries, `.pop()` for removing a key and getting its value, and converting keys or values to lists with `list(d.keys())` or `list(d.values())`. Dictionary lookups are extremely fast (O(1) time complexity), making them ideal for counting, grouping, and caching.

### 📝 Step by Step

1. Safe access: `d.get("key", default_value)` — never crashes.
2. Loop over keys: `for key in my_dict:`.
3. Loop over values: `for value in my_dict.values():`.
4. Loop over both: `for key, value in my_dict.items():`.
5. Remove and get: `value = my_dict.pop("key")`.

### 💻 Example

```python
scores = {"Alice": 95, "Bob": 87, "Charlie": 92}

# Safe access with .get()
print(scores.get("Alice", 0))     # 95
print(scores.get("Unknown", 0))   # 0 (no crash!)

# Iterating
for name in scores:
    print(f"Key: {name}")

for name, score in scores.items():
    print(f"{name} scored {score}")

# Useful operations
scores.update({"Diana": 88, "Eve": 91})
removed = scores.pop("Bob")
print(f"Removed Bob with score {removed}")

all_keys = list(scores.keys())
all_vals = list(scores.values())
print(f"Students: {all_keys}")
```

**Output:**
```
95
0
Key: Alice
Key: Bob
Key: Charlie
Alice scored 95
Bob scored 87
Charlie scored 92
Removed Bob with score 87
Students: ['Alice', 'Charlie', 'Diana', 'Eve']
```

### ⚠️ Common Mistakes

- **Mistake: Using `[]` on a missing key** — `d["missing"]` crashes. → **Fix**: Use `d.get("missing", default)` for safe access.
- **Mistake: Modifying dictionary size during iteration** — Adding or removing keys during a `for` loop raises RuntimeError. → **Fix**: Iterate over a copy: `for k in list(d.keys()):`.
- **Mistake: Assuming dictionary order** — In Python 3.7+, dictionaries maintain insertion order. Older Python does not guarantee this.

### 🔗 Connection

You can now safely access, iterate, and modify dictionaries. Combined with lists, you can model almost any real-world data. Next, you will learn about **nested dictionaries** — dictionaries inside dictionaries — for handling complex, structured data like API responses.

### 🏋️ Quick Practice

Try these in your head before coding:
1. What does `{"a": 1}.get("b", 0)` return?
2. What does `for k, v in {"x": 10}.items(): print(k, v)` print?
3. What does `list({"a": 1, "b": 2}.values())` produce?
"""

THEORIES[(5, 2)] = r"""## Nested Dictionaries and Real-World Data

### 🧠 How It Works

Real-world data is rarely flat. A student does not just have a name — they have a name, an age, a list of grades, an address (which itself has a street, city, and zip code). **Nested dictionaries** let you represent this layered structure by putting dictionaries inside dictionaries (or lists inside dictionaries).

Think of nested dictionaries like Russian nesting dolls (matryoshka). Each doll contains a smaller doll inside. A school database is a dictionary of students; each student is a dictionary of their attributes; their grades are a list inside that dictionary. You navigate this structure by chaining keys: `school["Alice"]["grades"][0]` gets Alice's first grade.

This is not just an academic concept. When you connect to a web API (weather, social media, games), the data comes as nested dictionaries (JSON format). Learning to navigate nested structures is essential for building real applications that interact with the internet.

### 📝 Step by Step

1. Create nested structure: `data = {"Alice": {"age": 15, "grades": [90, 85]}}`.
2. Access nested data by chaining keys: `data["Alice"]["grades"][0]`.
3. Modify nested values: `data["Alice"]["age"] = 16`.
4. Iterate with nested loops: `for name, info in data.items():`.
5. Use `.get()` at each level for safety.

### 💻 Example

```python
# Nested dictionary
school = {
    "Alice": {
        "age": 15,
        "grades": [95, 88, 92],
        "active": True
    },
    "Bob": {
        "age": 16,
        "grades": [78, 85, 80],
        "active": True
    }
}

# Accessing nested data
print(school["Alice"]["age"])        # 15
print(school["Bob"]["grades"][0])    # 78

# Processing nested data
for name, info in school.items():
    avg = sum(info["grades"]) / len(info["grades"])
    status = "active" if info["active"] else "inactive"
    print(f"{name}: avg={avg:.1f}, {status}")
```

**Output:**
```
15
78
Alice: avg=91.7, active
Bob: avg=81.0, active
```

### ⚠️ Common Mistakes

- **Mistake: KeyError in nested access** — `data["Alice"]["phone"]` crashes if "phone" does not exist. → **Fix**: Use `.get()`: `data.get("Alice", {}).get("phone", "N/A")`.
- **Mistake: Modifying shared nested objects** — If you copy a dict with `=`, nested objects are shared. → **Fix**: Use `import copy; copy.deepcopy(data)` for independent copies.
- **Mistake: Overly deep nesting** — More than 3-4 levels deep becomes unmanageable. → **Fix**: Consider using classes instead for deeply structured data.

### 🔗 Connection

You have mastered dictionaries — from simple key-value pairs to complex nested structures. This completes the data structures foundation. Next, you enter the world of **functions** — reusable blocks of code that are the key to writing clean, organized programs.

### 🏋️ Quick Practice

Try these in your head before coding:
1. How do you access Bob's second grade in the school dictionary above?
2. What does `{"a": {"b": 1}}.get("c", {}).get("d", 0)` return?
3. Can a dictionary value be a list? Can a list element be a dictionary?
"""

# ============================================================
# MODULE 7: Functions
# ============================================================

THEORIES[(6, 0)] = r"""## Defining and Calling Functions

### 🧠 How It Works

Imagine you make a great sandwich recipe. Instead of describing the steps every time you want a sandwich, you write the recipe once and just say "make me a sandwich" whenever you need one. **Functions** are recipes for your code: you define a block of instructions once, give it a name, and then call that name whenever you need those instructions executed.

Functions are one of the most important concepts in programming because they solve three critical problems. First, **reuse** — write code once, use it anywhere. Second, **organization** — break a complex program into small, manageable pieces. Third, **abstraction** — once a function works, you can use it without thinking about how it works internally.

A function definition starts with `def`, followed by the function name, parameters in parentheses, and a colon. The indented block is the function body. **Parameters** are like blank spaces in your recipe (how many eggs? what flavor?), and **arguments** are the specific values you fill in when calling the function.

### 📝 Step by Step

1. Define with `def function_name(parameters):`.
2. Write the body (indented).
3. Call by name with arguments: `function_name(argument1, argument2)`.
4. Parameters receive the argument values in order.
5. A function can have zero, one, or many parameters.

### 💻 Example

```python
# Function with no parameters
def say_hello():
    print("Hello, World!")

say_hello()  # Hello, World!

# Function with parameters
def greet(name, greeting):
    print(f"{greeting}, {name}!")

greet("Alice", "Hi")      # Hi, Alice!
greet("Bob", "Hey there")  # Hey there, Bob!

# Function doing calculation
def calculate_area(width, height):
    area = width * height
    print(f"Area: {area}")

calculate_area(5, 3)  # Area: 15
calculate_area(10, 7) # Area: 70
```

**Output:**
```
Hello, World!
Hi, Alice!
Hey there, Bob!
Area: 15
Area: 70
```

### ⚠️ Common Mistakes

- **Mistake: Calling a function before defining it** — Python reads top to bottom. → **Fix**: Always define functions above where you call them.
- **Mistake: Forgetting parentheses when calling** — `greet` without `()` references the function object, not calling it. → **Fix**: Always use parentheses: `greet("Alice")`.
- **Mistake: Wrong number of arguments** — Passing 2 args to a function expecting 3 causes TypeError. → **Fix**: Match the number of arguments to parameters.

### 🔗 Connection

You have been writing all code at the top level. Functions let you organize code into reusable blocks. Next, you will learn about **return values** — how functions can send results back to the caller, and about **scope** — where variables live and die.

### 🏋️ Quick Practice

Try these in your head before coding:
1. What is the difference between a parameter and an argument?
2. Can you call a function multiple times with different arguments?
3. What happens if you call `def greet(name):` with `greet()`?
"""

THEORIES[(6, 1)] = r"""## Return Values and Scope

### 🧠 How It Works

So far, your functions just DO things (like printing). But functions can also GIVE BACK a result — like a vending machine that takes your money (arguments) and gives you a snack (return value). The `return` keyword sends a value back to wherever the function was called.

Think of `return` as the answer to a question. When you call `square(5)`, you are asking "what is 5 squared?" The function computes it and `return`s `25`. You can then use that answer in an expression, store it in a variable, or pass it to another function. A function without `return` (or with `return` alone) gives back `None`.

**Scope** is about where variables live. Variables created inside a function are **local** — they exist only while the function runs and disappear afterward. Variables created outside functions are **global** — they exist for the entire program. Functions can READ global variables but should not modify them. This separation prevents functions from accidentally stepping on each other's data.

### 📝 Step by Step

1. Use `return value` to send a result back to the caller.
2. Store the result: `result = my_function(args)`.
3. You can return any type: numbers, strings, lists, even other functions.
4. Local variables exist only inside their function.
5. Global variables can be read (but not modified) inside functions.

### 💻 Example

```python
# Function with return
def square(n):
    return n * n

result = square(5)
print(result)           # 25
print(square(3) + 10)   # 19

# Function returning None
def say_hi(name):
    print(f"Hi, {name}")
    # No return statement

result = say_hi("Alice")
print(result)  # None

# Scope demonstration
x = "global"

def my_func():
    y = "local"
    print(x)  # Can READ global
    print(y)  # Local variable

my_func()
# print(y)  # ERROR: y doesn't exist here
```

**Output:**
```
25
19
Hi, Alice
None
global
local
```

### ⚠️ Common Mistakes

- **Mistake: Printing instead of returning** — `print(result)` inside a function does not return anything. → **Fix**: Use `return result` if the caller needs the value.
- **Mistake: Using a local variable outside the function** — It does not exist after the function ends. → **Fix**: Return the value and store it: `result = my_func()`.
- **Mistake: Forgetting to capture the return value** — `square(5)` without assignment discards the result. → **Fix**: `result = square(5)`.

### 🔗 Connection

You can now create functions that return results, making them composable building blocks. Next, you will learn about **default parameters and keyword arguments** — ways to make your functions more flexible and user-friendly.

### 🏋️ Quick Practice

Try these in your head before coding:
1. What does a function return if it has no `return` statement?
2. Can you use `return` to exit a function early?
3. After `def f(): x = 5`, can you access `x` outside the function?
"""

THEORIES[(6, 2)] = r"""## Default Parameters and Keyword Arguments

### 🧠 How It Works

Imagine ordering coffee. The barista has a default — medium size, regular milk. You can just say "coffee" and get the default, or specify "large with oat milk" to customize. **Default parameters** work the same way: they give function parameters a fallback value that is used when the caller does not provide one.

Default parameters make your functions more flexible without making them harder to use. The most common settings get default values, and callers only need to specify the unusual ones. For example, `def greet(name, greeting="Hello")` can be called as `greet("Alice")` (uses "Hello") or `greet("Alice", "Bonjour")` (custom greeting).

**Keyword arguments** let you specify arguments by name instead of position. This is invaluable when a function has many parameters — you can skip the ones with defaults and only specify what you need. Python also supports returning multiple values using tuples: `return min_val, max_val` returns a tuple that the caller can unpack.

### 📝 Step by Step

1. Define defaults: `def func(required, optional="default"):`.
2. Parameters with defaults must come after those without.
3. Call with keywords: `func(name="Alex", age=15)`.
4. Keyword arguments can be in any order.
5. Return multiple values: `return a, b` (returns a tuple).

### 💻 Example

```python
# Default parameters
def greet(name, greeting="Hello", punctuation="!"):
    print(f"{greeting}, {name}{punctuation}")

greet("Alice")                        # Hello, Alice!
greet("Bob", "Hey")                   # Hey, Bob!
greet("Charlie", punctuation=".")     # Hello, Charlie.

# Keyword arguments
def create_profile(name, age, city="Unknown"):
    return f"{name}, {age}, from {city}"

print(create_profile(name="Alex", age=15))
print(create_profile(age=16, name="Bob", city="NYC"))

# Multiple return values
def min_max(numbers):
    return min(numbers), max(numbers)

lowest, highest = min_max([3, 1, 4, 1, 5, 9])
print(f"Range: {lowest} to {highest}")
```

**Output:**
```
Hello, Alice!
Hey, Bob!
Hello, Charlie.
Alex, 15, from Unknown
Bob, 16, from NYC
Range: 1 to 9
```

### ⚠️ Common Mistakes

- **Mistake: Putting default parameters before non-default ones** — `def f(a=1, b)` is a syntax error. → **Fix**: Non-default parameters must come first.
- **Mistake: Using mutable default values** — `def f(items=[])` shares the same list across calls. → **Fix**: Use `None` as default: `def f(items=None): items = items or []`.
- **Mistake: Mixing positional and keyword arguments incorrectly** — Positional args must come before keyword args.

### 🔗 Connection

Your functions are now flexible with defaults and keyword arguments. Next, you will learn about **lambda functions** and higher-order functions (map, filter, sorted) — powerful tools for writing concise, functional-style code.

### 🏋️ Quick Practice

Try these in your head before coding:
1. In `def f(a, b=10):`, what is `f(5)` equivalent to?
2. Can you call `f(b=20, a=5)` if defined as `def f(a, b)`?
3. What does `def f(): return 1, 2` return?
"""

THEORIES[(6, 3)] = r"""## Lambda Functions and Higher-Order Functions

### 🧠 How It Works

Sometimes you need a tiny function that does one simple thing — like doubling a number or checking if something is even. Writing a full `def` block for that feels like overkill. **Lambda functions** are one-line anonymous functions: `lambda x: x * 2` creates a function that doubles its input, without needing a name.

Think of lambdas as sticky notes versus full letters. A full letter (regular function) has a header, body, and signature. A sticky note (lambda) just has the message. Lambdas are limited to a single expression — no multi-line logic, no statements like `if`/`for`. They shine when passed to other functions.

**Higher-order functions** are functions that take other functions as arguments. Python's built-in `map()`, `filter()`, and `sorted()` are the big three. `map()` applies a function to every element, `filter()` keeps elements where the function returns True, and `sorted()` can sort by a custom key function. These tools, combined with lambdas, let you write powerful data transformations in very few lines.

### 📝 Step by Step

1. Create a lambda: `double = lambda x: x * 2`.
2. Use `map(function, iterable)` to transform every element.
3. Use `filter(function, iterable)` to keep elements that pass a test.
4. Use `sorted(iterable, key=function)` to sort by a custom criterion.
5. Convert map/filter results to lists: `list(map(...))`.

### 💻 Example

```python
# Lambda basics
double = lambda x: x * 2
print(double(5))  # 10

# map: transform every element
numbers = [1, 2, 3, 4, 5]
squared = list(map(lambda x: x ** 2, numbers))
print(squared)  # [1, 4, 9, 16, 25]

# filter: keep elements passing a test
evens = list(filter(lambda x: x % 2 == 0, numbers))
print(evens)  # [2, 4]

# sorted with custom key
words = ["banana", "pie", "cherry", "a"]
by_length = sorted(words, key=lambda w: len(w))
print(by_length)  # ['a', 'pie', 'banana', 'cherry']

# Combining them
data = [3, -1, 4, -5, 2, -3]
result = sorted(filter(lambda x: x > 0, data))
print(result)  # [2, 3, 4]
```

**Output:**
```
10
[1, 4, 9, 16, 25]
[2, 4]
['a', 'pie', 'banana', 'cherry']
[2, 3, 4]
```

### ⚠️ Common Mistakes

- **Mistake: Making lambdas too complex** — Multi-condition lambdas become unreadable. → **Fix**: If it needs more than one line of logic, use a regular `def` function.
- **Mistake: Forgetting `list()` around map/filter** — `map()` returns a lazy iterator, not a list. → **Fix**: Wrap with `list()`: `list(map(...))`.
- **Mistake: Using lambda when a list comprehension is clearer** — `list(map(lambda x: x**2, nums))` vs `[x**2 for x in nums]`. → **Fix**: Prefer comprehensions for simple transformations.

### 🔗 Connection

Functions are complete: defining, returning, defaults, and now lambdas with higher-order functions. This functional style is used heavily in data science and web development. Next module: **working with files** — reading and writing data that persists beyond your program's lifetime.

### 🏋️ Quick Practice

Try these in your head before coding:
1. What does `(lambda x, y: x + y)(3, 4)` return?
2. What does `list(filter(lambda x: x > 3, [1, 5, 2, 8]))` produce?
3. How would you sort `["cat", "a", "elephant"]` by length using `sorted`?
"""

# ============================================================
# MODULE 8: Working with Files
# ============================================================

THEORIES[(7, 0)] = r"""## Reading Files

### 🧠 How It Works

Every program you have written so far has a short memory — when it ends, all data is gone. **File I/O** (Input/Output) lets your program read data from files on disk and write data back. Think of files as permanent notebooks that survive after your program closes, while variables are like a whiteboard that gets erased.

Reading a file in Python follows a simple pattern: open the file, read its contents, close the file. The `with` statement handles the opening and closing automatically — like a library checkout system that guarantees you return the book. Inside the `with` block, you can read the entire file at once (`read()`), read line by line (loop), or read all lines into a list (`readlines()`).

The file **mode** tells Python what you want to do: `"r"` for reading (default), `"w"` for writing (creates or overwrites), `"a"` for appending (adds to the end). If you try to read a file that does not exist, Python raises a `FileNotFoundError`. Always use the `with` statement — it is the safe, modern way to work with files.

### 📝 Step by Step

1. Open with `with open("filename", "r") as file:`.
2. Read all at once: `content = file.read()`.
3. Read line by line: `for line in file: print(line.strip())`.
4. Read into a list: `lines = file.readlines()`.
5. The `with` block automatically closes the file when done.

### 💻 Example

```python
# Reading entire file
with open("data.txt", "r") as file:
    content = file.read()
    print(content)

# Reading line by line (memory efficient)
with open("data.txt", "r") as file:
    for line in file:
        clean = line.strip()  # Remove newline
        print(f"Line: {clean}")

# Reading into a list
with open("data.txt", "r") as file:
    lines = file.readlines()
    print(f"Total lines: {len(lines)}")
    print(f"First line: {lines[0].strip()}")
```

**Output:**
```
Hello World
Python is great
Bye
Line: Hello World
Line: Python is great
Line: Bye
Total lines: 3
First line: Hello World
```

### ⚠️ Common Mistakes

- **Mistake: Forgetting `strip()` when reading lines** — Each line includes `\n` at the end. → **Fix**: Use `.strip()` to remove whitespace and newlines.
- **Mistake: Not using `with`** — Forgetting to close files can cause data corruption. → **Fix**: Always use `with open(...) as file:`.
- **Mistake: Reading a file twice** — After reading to the end, the cursor is at the end. → **Fix**: Reopen the file or use `file.seek(0)` to go back to the start.

### 🔗 Connection

You can now read persistent data from files. This opens up a world of possibilities: processing data files, reading configurations, and working with user-saved data. Next, you will learn to **write** files — saving your program's output permanently.

### 🏋️ Quick Practice

Try these in your head before coding:
1. What mode do you use to read a file?
2. Why is `with` better than manually calling `file.close()`?
3. What does `line.strip()` do to the string `"Hello\n"`?
"""

THEORIES[(7, 1)] = r"""## Writing Files

### 🧠 How It Works

Reading files gets data into your program; writing files gets data out permanently. Whether you are saving a game state, generating a report, or logging events, writing to files lets your program create lasting output that survives after the program ends.

Think of file modes like pens with different powers. **Write mode** (`"w"`) is like an eraser-pen: it wipes the entire file clean before writing new content. **Append mode** (`"a"`) is like a regular pen: it adds new content at the end without erasing anything. This distinction is critical — accidentally opening a file in write mode when you meant append will destroy all existing data.

You write to files using `file.write(string)` or `print(string, file=file)`. The `write()` method does NOT add a newline automatically — you must include `\n` yourself. The `print()` function with the `file` parameter adds a newline, just like normal `print()`.

### 📝 Step by Step

1. Open in write mode: `with open("output.txt", "w") as file:` (creates or overwrites).
2. Open in append mode: `with open("log.txt", "a") as file:` (adds to end).
3. Write text: `file.write("Hello\n")` (must add `\n` manually).
4. Or use print: `print("Hello", file=file)` (adds `\n` automatically).
5. Writing a list: loop through items and write each one.

### 💻 Example

```python
# Write mode: creates or overwrites
with open("output.txt", "w") as file:
    file.write("Line 1\n")
    file.write("Line 2\n")
    print("Line 3", file=file)  # print adds \n

# Append mode: adds to existing content
with open("output.txt", "a") as file:
    file.write("Line 4 (appended)\n")

# Writing a list of items
names = ["Alice", "Bob", "Charlie"]
with open("names.txt", "w") as file:
    for name in names:
        file.write(f"{name}\n")

# Reading back to verify
with open("names.txt", "r") as file:
    print(file.read())
```

**Output:**
```
Alice
Bob
Charlie
```

### ⚠️ Common Mistakes

- **Mistake: Using "w" when you mean "a"** — Write mode erases everything first! → **Fix**: Double-check your mode. Use `"a"` to add without erasing.
- **Mistake: Forgetting `\n` in `write()`** — `file.write("A"); file.write("B")` produces `"AB"` on one line. → **Fix**: Add `\n`: `file.write("A\n")`.
- **Mistake: Writing non-strings** — `file.write(42)` crashes; write only accepts strings. → **Fix**: Convert first: `file.write(str(42))` or use f-strings.

### 🔗 Connection

You can now read AND write files, making your programs work with persistent data. Next, you will learn about **CSV files** — a standard format for tabular data that bridges Python with spreadsheets and databases.

### 🏋️ Quick Practice

Try these in your head before coding:
1. What is the difference between `"w"` and `"a"` mode?
2. Does `file.write("Hello")` add a newline at the end?
3. What happens if you open a non-existent file in `"w"` mode?
"""

THEORIES[(7, 2)] = r"""## Working with CSV Data

### 🧠 How It Works

**CSV** (Comma-Separated Values) is one of the simplest and most universal data formats. Think of it as a spreadsheet saved as plain text: each line is a row, and values within a row are separated by commas. You can open CSV files in Excel, Google Sheets, or any text editor — making CSV the lingua franca of data exchange.

Reading CSV is straightforward: read each line, split by commas, and process the values. The first line is usually the **header** containing column names. Python's built-in `csv` module handles edge cases like commas inside quoted values (`"Smith, John"` should be one field, not two), but for simple cases, `split(",")` works fine.

CSV files are everywhere in the real world: exporting data from spreadsheets, downloading datasets for data science, exchanging data between systems, and storing simple databases. Being able to read, process, and write CSV is a fundamental skill that connects Python to the broader world of data.

### 📝 Step by Step

1. Read the header line first: `header = lines[0].split(",")`.
2. Process data lines: `for line in lines[1:]: values = line.split(",")`.
3. Convert numeric values: `score = int(values[2])`.
4. For complex CSV, use `import csv` and `csv.DictReader`.
5. Write CSV with `csv.writer` or manual formatting.

### 💻 Example

```python
import csv

# Manual CSV parsing
csv_text = "name,subject,score\nAlice,Math,90\nBob,Math,80\nAlice,Science,85"

lines = csv_text.strip().split("\n")
header = lines[0].split(",")
print(f"Columns: {header}")

for line in lines[1:]:
    name, subject, score = line.split(",")
    print(f"{name} got {score} in {subject}")

# Using csv module (with files)
# with open("data.csv", "r") as file:
#     reader = csv.DictReader(file)
#     for row in reader:
#         print(row["name"], row["score"])

# Building a summary
subjects = {}
for line in lines[1:]:
    _, subject, score = line.split(",")
    if subject not in subjects:
        subjects[subject] = []
    subjects[subject].append(int(score))

for subj, scores in subjects.items():
    avg = sum(scores) / len(scores)
    print(f"{subj}: avg {avg:.1f}")
```

**Output:**
```
Columns: ['name', 'subject', 'score']
Alice got 90 in Math
Bob got 80 in Math
Alice got 85 in Science
Math: avg 85.0
Science: avg 85.0
```

### ⚠️ Common Mistakes

- **Mistake: Forgetting that CSV values are strings** — `"90"` needs `int()` before math. → **Fix**: Always convert: `int(values[2])` or `float(values[2])`.
- **Mistake: Splitting when values contain commas** — `"Smith, John,90".split(",")` gives 3 parts, not 2. → **Fix**: Use the `csv` module for data with embedded commas.
- **Mistake: Off-by-one with the header** — Processing `lines[0]` as data when it is the header. → **Fix**: Always skip the header: `for line in lines[1:]`.

### 🔗 Connection

You can now work with files and structured CSV data. This bridges Python to spreadsheets, databases, and the data science world. Next module: **error handling** — learning to write robust code that does not crash when unexpected things happen.

### 🏋️ Quick Practice

Try these in your head before coding:
1. What does `"Alice,Math,90".split(",")` produce?
2. Why is the first line of a CSV file usually special?
3. What Python module handles complex CSV files with quoted fields?
"""

# ============================================================
# MODULE 9: Error Handling
# ============================================================

THEORIES[(8, 0)] = r"""## Understanding Errors and Exceptions

### 🧠 How It Works

Errors are not a sign of failure — they are a natural, expected part of programming. Even the best code encounters unexpected situations: a user types "abc" when a number is expected, a file is missing, a network connection drops. Python distinguishes between two types of problems: **syntax errors** (your code is not valid Python) and **exceptions** (something goes wrong while running valid code).

Think of syntax errors as grammatical mistakes in a sentence — Python catches them before running your code, just like a spell-checker catches typos before you send a message. Exceptions are like unexpected events during a trip — your car gets a flat tire (the code was fine, but something happened at runtime).

Each exception type has a descriptive name: `ValueError` (wrong value), `TypeError` (wrong type), `ZeroDivisionError` (dividing by zero), `IndexError` (list index out of range), `KeyError` (dictionary key not found), `FileNotFoundError` (file missing). Reading the error message and **traceback** (which shows exactly which line failed) is one of the most valuable skills you can develop as a programmer.

### 📝 Step by Step

1. Read the error type: the last line tells you what kind of error.
2. Read the description: the message after the colon explains what went wrong.
3. Read the traceback: work backwards from the bottom to find which line caused it.
4. Common errors: TypeError (wrong type), ValueError (wrong value), KeyError (missing key).
5. Fix the root cause, do not just silence the error.

### 💻 Example

```python
# TypeError: wrong operation for the type
# result = "age: " + 15  # Cannot add str and int

# ValueError: right type, wrong content
# number = int("hello")  # "hello" is not a number

# ZeroDivisionError
# result = 10 / 0

# IndexError: out of range
# my_list = [1, 2, 3]
# print(my_list[10])

# KeyError: missing dictionary key
# my_dict = {"a": 1}
# print(my_dict["b"])

# The right way: handle potential errors
user_input = "42"  # Simulating input
try:
    number = int(user_input)
    print(f"Success: {number}")
except ValueError:
    print("That is not a valid number")
```

**Output:**
```
Success: 42
```

### ⚠️ Common Mistakes

- **Mistake: Ignoring error messages** — The traceback tells you exactly what went wrong and where. → **Fix**: Read the LAST line first (error type), then trace up to find the line number.
- **Mistake: Catching all exceptions blindly** — `except:` without a type hides bugs. → **Fix**: Catch specific exceptions: `except ValueError:`.
- **Mistake: Confusing syntax errors with exceptions** — Syntax errors cannot be caught with try/except. → **Fix**: Fix syntax errors in your code; use try/except for runtime exceptions.

### 🔗 Connection

You now understand what errors are and why they happen. This is essential background for the next lesson, where you will learn to **catch and handle** exceptions gracefully using try/except blocks — turning crashes into controlled responses.

### 🏋️ Quick Practice

Try these in your head before coding:
1. What error does `int("hello")` raise?
2. What error does `[1, 2, 3][10]` raise?
3. What is the difference between a syntax error and an exception?
"""

THEORIES[(8, 1)] = r"""## Try / Except / Finally

### 🧠 How It Works

Imagine you are a tightrope walker. Without a safety net, one mistake and you fall to the ground (program crashes). The `try/except` block IS that safety net — you "try" the risky code, and if something goes wrong, you "catch" the error and handle it gracefully instead of crashing.

The basic pattern is simple: wrap risky code in `try:`, and write error-handling code in `except:`. Python tries to run the code in the `try` block. If an exception occurs, it immediately jumps to the matching `except` block. If no exception occurs, the `except` block is skipped. You can have multiple `except` blocks for different error types.

The full pattern adds `else` and `finally`. The `else` block runs only if NO exception occurred — perfect for code that should only execute on success. The `finally` block ALWAYS runs, regardless of whether an exception occurred — perfect for cleanup code like closing connections or saving data.

### 📝 Step by Step

1. Wrap risky code in `try:`.
2. Add `except ErrorType:` blocks for each error you expect.
3. Use `except ErrorType as e:` to capture the error message.
4. Add `else:` for code that runs only on success (optional).
5. Add `finally:` for cleanup code that always runs (optional).

### 💻 Example

```python
# Basic try/except
try:
    number = int(input("Enter a number: "))
    result = 100 / number
    print(f"Result: {result}")
except ValueError:
    print("That is not a valid number!")
except ZeroDivisionError:
    print("Cannot divide by zero!")

# Full pattern with else and finally
try:
    value = int("42")
except ValueError:
    print("Invalid!")
else:
    print(f"Success: {value}")  # Runs only if no error
finally:
    print("Done processing")    # Always runs

# Catching multiple errors
try:
    data = [1, 2, 3]
    print(data[10])
except (IndexError, KeyError) as e:
    print(f"Error: {e}")
```

**Output:**
```
Enter a number: 5
Result: 20.0
Success: 42
Done processing
Error: list index out of range
```

### ⚠️ Common Mistakes

- **Mistake: Catching too broadly** — `except:` catches ALL errors, hiding real bugs. → **Fix**: Always specify the error type: `except ValueError:`.
- **Mistake: Putting too much code in `try`** — Only wrap the specific lines that might fail. → **Fix**: Keep the try block as small as possible.
- **Mistake: Using try/except as flow control** — Exceptions are for exceptional situations, not normal logic. → **Fix**: Use `if` statements for expected conditions.

### 🔗 Connection

You can now catch errors gracefully instead of crashing. Next, you will learn to **raise your own exceptions** — telling callers that something is wrong with their input, which is essential for writing robust, professional-quality functions.

### 🏋️ Quick Practice

Try these in your head before coding:
1. Which block runs if NO exception occurs: `except`, `else`, or `finally`?
2. Which block ALWAYS runs, even if there is an exception?
3. Can you have multiple `except` blocks for different error types?
"""

THEORIES[(8, 2)] = r"""## Raising Exceptions and Custom Validation

### 🧠 How It Works

So far you have been catching errors from Python. But what about YOUR code? When someone passes invalid data to your function — like a negative age or an empty password — you should tell them something is wrong. The `raise` keyword lets you intentionally trigger an exception.

Think of `raise` like a referee throwing a flag in a game. When you see a rule violation (invalid input), you stop the action and signal the problem. The caller then has the chance to catch the exception with `try/except` and handle it. This is much better than silently returning wrong results or a special value like `-1`.

A very common pattern is the **validation loop**: keep asking for input until the user provides something valid. Inside the loop, try to convert and validate the input; if it fails, catch the error and ask again. This pattern appears in every real application — web forms validate emails, games validate moves, and APIs validate request data.

### 📝 Step by Step

1. Validate input: check if values meet your requirements.
2. Raise an exception if validation fails: `raise ValueError("Age cannot be negative")`.
3. The caller catches it: `try: ... except ValueError as e:`.
4. Use a while loop for repeated validation until valid input is given.
5. Check conditions in order: most critical first.

### 💻 Example

```python
# Raising exceptions in a function
def set_age(age):
    if age < 0:
        raise ValueError("Age cannot be negative")
    if age > 150:
        raise ValueError("Age seems unrealistic")
    return age

# Catching raised exceptions
try:
    age = set_age(-5)
except ValueError as e:
    print(f"Invalid: {e}")

# Validation function
def validate_email(email):
    if "@" not in email:
        raise ValueError("Missing @ symbol")
    if "." not in email.split("@")[1]:
        raise ValueError("Invalid domain")
    return email

# Testing validation
emails = ["user@example.com", "invalid", "no@domain"]
for email in emails:
    try:
        validate_email(email)
        print(f"{email}: Valid")
    except ValueError as e:
        print(f"{email}: {e}")
```

**Output:**
```
Invalid: Age cannot be negative
user@example.com: Valid
invalid: Missing @ symbol
no@domain: Invalid domain
```

### ⚠️ Common Mistakes

- **Mistake: Returning error codes instead of raising** — `return -1` for errors is ambiguous. → **Fix**: Raise a descriptive exception: `raise ValueError("reason")`.
- **Mistake: Raising generic Exception** — `raise Exception("error")` is too vague. → **Fix**: Use specific types: `ValueError`, `TypeError`, etc.
- **Mistake: Not providing an error message** — `raise ValueError()` with no message gives no context. → **Fix**: Always include a descriptive message.

### 🔗 Connection

You now have complete error handling: catching, raising, and validating. This completes the error handling module. Next, the final module: **Classes and OOP** — where you will create your own custom types and build real, structured programs.

### 🏋️ Quick Practice

Try these in your head before coding:
1. What does `raise ValueError("bad input")` do?
2. How does the caller handle a raised exception?
3. Why is raising an exception better than returning `-1` for errors?
"""

# ============================================================
# MODULE 10: Classes and OOP
# ============================================================

THEORIES[(9, 0)] = r"""## Introduction to Classes and Objects

### 🧠 How It Works

Imagine you are designing a video game. Each player character has a name, health, level, and abilities. You could use separate variables for each (`player1_name`, `player1_health`...), but that gets chaotic with 50 players. **Classes** let you create a custom type that bundles related data (attributes) and behavior (methods) into one clean package.

Think of a class as a **blueprint** and an object as a **building made from that blueprint**. The class `Dog` describes what all dogs have (name, breed) and can do (bark, sit). Each actual dog — Buddy, Rex, Luna — is an **object** (or **instance**) created from that blueprint. You can create as many objects as you want from one class.

The special method `__init__` is the **constructor** — it runs automatically when you create a new object and sets up its initial data. The `self` parameter refers to the specific object being created. When you write `self.name = name`, you are storing the name on that particular object. Every method in a class takes `self` as its first parameter.

### 📝 Step by Step

1. Define a class: `class ClassName:`.
2. Write `__init__` to set up attributes: `def __init__(self, param):`.
3. Store data with `self.attribute = value`.
4. Define methods: `def method_name(self):`.
5. Create objects: `obj = ClassName(arguments)`.

### 💻 Example

```python
class Dog:
    def __init__(self, name, breed, age):
        self.name = name
        self.breed = breed
        self.age = age

    def bark(self):
        print(f"{self.name} says: Woof!")

    def info(self):
        print(f"{self.name} is a {self.age}-year-old {self.breed}")

# Creating objects
buddy = Dog("Buddy", "Golden Retriever", 3)
rex = Dog("Rex", "German Shepherd", 5)

# Using methods
buddy.bark()   # Buddy says: Woof!
rex.info()     # Rex is a 5-year-old German Shepherd

# Accessing attributes
print(buddy.name)  # Buddy
buddy.age = 4      # Modify attribute
print(buddy.age)   # 4
```

**Output:**
```
Buddy says: Woof!
Rex is a 5-year-old German Shepherd
Buddy
4
```

### ⚠️ Common Mistakes

- **Mistake: Forgetting `self`** — Every method must have `self` as the first parameter. → **Fix**: Always write `def method(self, ...):`.
- **Mistake: Forgetting `self.` when accessing attributes** — `name` is a local variable; `self.name` is the object's attribute. → **Fix**: Use `self.attribute` to access/set object data.
- **Mistake: Forgetting to call `__init__` parameters** — `Dog()` with no arguments when `__init__` expects them. → **Fix**: Pass all required arguments: `Dog("Buddy", "Retriever", 3)`.

### 🔗 Connection

You have used built-in types (str, list, dict). Now you can create your own types with classes. Next, you will learn about **magic methods** — special methods that let your objects work with built-in Python operators like `+`, `==`, and `print()`.

### 🏋️ Quick Practice

Try these in your head before coding:
1. What is the difference between a class and an object?
2. What does `self` refer to inside a method?
3. When does `__init__` run?
"""

THEORIES[(9, 1)] = r"""## Methods, Properties, and Magic Methods

### 🧠 How It Works

When you write `print(my_object)` or `obj1 + obj2`, Python needs to know how YOUR custom objects behave with these operations. **Magic methods** (also called dunder methods because they have double underscores) are special methods that Python calls automatically when you use built-in operations on your objects.

Think of magic methods as translators between Python's built-in operations and your custom class. When you write `print(vector)`, Python secretly calls `vector.__str__()`. When you write `v1 + v2`, Python calls `v1.__add__(v2)`. When you write `len(cart)`, Python calls `cart.__len__()`. By defining these methods, you make your objects behave like built-in types.

**Encapsulation** is another key OOP concept: hiding internal details behind a clean interface. By convention, attributes starting with `_` are "private" — meant for internal use only. Instead of letting code directly modify `_balance`, you provide methods like `deposit()` and `withdraw()` that validate the data before changing it. This prevents invalid states like negative balances.

### 📝 Step by Step

1. Define `__str__` for human-readable string representation.
2. Define `__repr__` for developer-friendly representation.
3. Define `__add__` to support the `+` operator.
4. Define `__eq__` to support the `==` operator.
5. Define `__len__` to support the `len()` function.

### 💻 Example

```python
class Vector:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __str__(self):
        return f"({self.x}, {self.y})"

    def __add__(self, other):
        return Vector(self.x + other.x, self.y + other.y)

    def __eq__(self, other):
        return self.x == other.x and self.y == other.y

    def __len__(self):
        return int((self.x ** 2 + self.y ** 2) ** 0.5)

v1 = Vector(3, 4)
v2 = Vector(1, 2)

print(v1)           # (3, 4)
print(v1 + v2)      # (4, 6)
print(v1 == v2)     # False
print(len(v1))      # 5

# Encapsulation example
class BankAccount:
    def __init__(self, balance):
        self._balance = balance  # "private"

    def deposit(self, amount):
        if amount > 0:
            self._balance += amount

    def get_balance(self):
        return self._balance

acc = BankAccount(100)
acc.deposit(50)
print(acc.get_balance())  # 150
```

**Output:**
```
(3, 4)
(4, 6)
False
5
150
```

### ⚠️ Common Mistakes

- **Mistake: Forgetting to return a new object in `__add__`** — Returning `self` modifies the original. → **Fix**: Create and return a new instance: `return Vector(...)`.
- **Mistake: Using `__str__` when you need `__repr__`** — `__str__` is for end users, `__repr__` is for developers. → **Fix**: Define both; `__repr__` should be unambiguous.
- **Mistake: Accessing private attributes directly** — Bypassing validation methods. → **Fix**: Use the provided methods; respect the `_` convention.

### 🔗 Connection

Your classes now integrate with Python's built-in operations. Next, you will learn **inheritance** — creating new classes based on existing ones — which is the key to code reuse and building class hierarchies.

### 🏋️ Quick Practice

Try these in your head before coding:
1. Which magic method does `print(obj)` call?
2. Which magic method does `obj1 + obj2` call?
3. Why use `self._balance` instead of `self.balance`?
"""

THEORIES[(9, 2)] = r"""## Inheritance: Building on Existing Classes

### 🧠 How It Works

Imagine you have a class `Vehicle` with attributes like speed, fuel, and methods like `start()` and `stop()`. Now you want a `Car` class and a `Truck` class. They share everything a Vehicle has, plus their own unique features. Instead of rewriting all the Vehicle code twice, **inheritance** lets you create `Car` and `Truck` as children of `Vehicle`, automatically getting everything the parent has.

Think of inheritance like a family tree. A child inherits traits from their parents but also has their own unique characteristics. In Python, you create a child class by putting the parent class name in parentheses: `class Dog(Animal)`. The child class gets all attributes and methods from the parent, and can add new ones or **override** existing ones with its own versions.

The `super()` function calls the parent class's methods. Most commonly, you use `super().__init__()` inside the child's `__init__` to run the parent's setup code before adding the child's own attributes. This ensures the parent's initialization happens properly.

### 📝 Step by Step

1. Define the parent class with common attributes and methods.
2. Create child class: `class Child(Parent):`.
3. Call parent's init: `super().__init__(args)`.
4. Add child-specific attributes and methods.
5. Override parent methods by defining them again in the child.

### 💻 Example

```python
class Animal:
    def __init__(self, name, sound):
        self.name = name
        self.sound = sound

    def speak(self):
        return f"{self.name} says {self.sound}!"

class Dog(Animal):
    def __init__(self, name):
        super().__init__(name, "Woof")

    def fetch(self):
        return f"{self.name} fetches the ball!"

class Cat(Animal):
    def __init__(self, name):
        super().__init__(name, "Meow")

    def purr(self):
        return f"{self.name} purrs..."

# Using inheritance
dog = Dog("Buddy")
cat = Cat("Whiskers")

print(dog.speak())   # Inherited from Animal
print(dog.fetch())   # Dog-specific
print(cat.speak())   # Inherited from Animal
print(cat.purr())    # Cat-specific
```

**Output:**
```
Buddy says Woof!
Buddy fetches the ball!
Whiskers says Meow!
Whiskers purrs...
```

### ⚠️ Common Mistakes

- **Mistake: Forgetting `super().__init__()`** — Parent attributes are not initialized. → **Fix**: Always call `super().__init__()` in the child's `__init__`.
- **Mistake: Redefining parent methods unintentionally** — Naming a child method the same as a parent method overrides it. → **Fix**: Use unique names or intentionally override with `super()`.
- **Mistake: Deep inheritance hierarchies** — More than 3 levels deep becomes confusing. → **Fix**: Prefer composition (has-a) over deep inheritance (is-a).

### 🔗 Connection

Inheritance completes the core OOP toolkit: classes, objects, magic methods, encapsulation, and now inheritance. Next is the **capstone** lesson where you combine everything you have learned into a real mini-project.

### 🏋️ Quick Practice

Try these in your head before coding:
1. What does `super().__init__()` do?
2. If Dog inherits from Animal and has its own `speak()`, which version runs?
3. Can a child class add methods that the parent does not have?
"""

THEORIES[(9, 3)] = r"""## Capstone: Building a Mini Project

### 🧠 How It Works

You have now learned every fundamental building block of Python: variables, types, strings, conditions, loops, lists, dictionaries, functions, file I/O, error handling, and classes. The capstone is about combining these pieces into a cohesive program — just like building with LEGO bricks, where individual pieces are simple but the combinations create something complex and useful.

Think of program design like architecture. Before building a house, you plan: what rooms do you need? How do they connect? Similarly, before writing code, you identify the "nouns" (classes), the "verbs" (methods), and the "connections" (how classes interact). A Task Manager has Tasks (class) with titles, priorities, and completion status (attributes), plus the ability to complete and display themselves (methods). A TaskManager holds a collection of Tasks and provides operations like add, remove, and filter.

Good software design follows principles: each class has one clear responsibility, functions are short and focused, and the code reads almost like English. When you look at your code and it makes sense without reading every line — that is clean code. This does not happen on the first draft; it comes from refactoring and iteration.

### 📝 Step by Step

1. **Identify the nouns** in your problem — these become classes (Contact, ContactBook).
2. **Identify the data** each class needs — these become attributes (name, phone, email).
3. **Identify the actions** — these become methods (add, search, list).
4. **Write the code** starting with the simplest class, then build up.
5. **Test each part** before connecting them together.

### 💻 Example

```python
class Task:
    def __init__(self, title, priority="medium"):
        self.title = title
        self.priority = priority
        self.done = False

    def complete(self):
        self.done = True

    def __str__(self):
        status = "DONE" if self.done else "TODO"
        return f"[{status}] {self.title} ({self.priority})"

class TaskManager:
    def __init__(self):
        self.tasks = []

    def add(self, title, priority="medium"):
        self.tasks.append(Task(title, priority))

    def complete(self, title):
        for task in self.tasks:
            if task.title == title:
                task.complete()
                return True
        return False

    def pending(self):
        return [t for t in self.tasks if not t.done]

# Using the mini project
manager = TaskManager()
manager.add("Learn Python", "high")
manager.add("Build a game", "medium")
manager.complete("Learn Python")

for task in manager.tasks:
    print(task)
print(f"Pending: {len(manager.pending())}")
```

**Output:**
```
[DONE] Learn Python (high)
[TODO] Build a game (medium)
Pending: 1
```

### ⚠️ Common Mistakes

- **Mistake: Putting everything in one class** — A class that does everything is called a "God class." → **Fix**: Each class should have one responsibility.
- **Mistake: Not planning before coding** — Jumping into code leads to spaghetti architecture. → **Fix**: Spend 5 minutes listing your classes, attributes, and methods.
- **Mistake: Not testing incrementally** — Building the entire program then testing at the end makes bugs hard to find. → **Fix**: Test each class and method as you write it.

### 🔗 Connection

This is the summit of your Python journey so far. You have gone from `print("Hello")` to building multi-class programs. From here, the world opens up: web development with Flask or Django, data science with Pandas, game development with Pygame, or automation scripts for real-world tasks. The foundation is solid — now go build something amazing.

### 🏋️ Quick Practice

Try these in your head before coding:
1. If you are building a library system, what classes might you create?
2. Why should each class have a single responsibility?
3. What is the benefit of testing each class before connecting them?
"""


def main():
    # Read the original course
    with open(r"F:\lms\scripts\python_pro_course.json", "r", encoding="utf-8") as f:
        course = json.load(f)

    # Deep copy to avoid modifying the original
    new_course = copy.deepcopy(course)

    # Replace theory content for each lesson
    lesson_count = 0
    for mod_idx, module in enumerate(new_course["modules"]):
        for les_idx, lesson in enumerate(module["lessons"]):
            key = (mod_idx, les_idx)
            if key in THEORIES:
                lesson["content"]["body"] = THEORIES[key].strip()
                lesson_count += 1
            else:
                print(f"WARNING: No theory for module {mod_idx}, lesson {les_idx}: {lesson['title']}")

    print(f"Updated {lesson_count} lessons out of {sum(len(m['lessons']) for m in new_course['modules'])} total")

    # Write the output
    with open(r"F:\lms\scripts\python_pro_course_4cid.json", "w", encoding="utf-8") as f:
        json.dump(new_course, f, indent=2, ensure_ascii=False)

    print("Saved to python_pro_course_4cid.json")


if __name__ == "__main__":
    main()
