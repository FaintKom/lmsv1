"""Module 3, Lesson 1: Lists & Indexing."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Lists &amp; Indexing",
            "Lists are Python's most versatile data structure &mdash; ordered, mutable collections that hold anything.",
        ),

        why_it_matters(
            "<p>Almost every real program works with collections of data: a list of users, "
            "a feed of posts, rows from a database, items in a shopping cart. "
            "Python lists are the foundation for all of these. Master lists and you "
            "unlock the ability to work with real-world data.</p>"
        ),

        section("Creating lists"),

        concept("What is a list?",
            "<p>A list is an <strong>ordered, mutable sequence</strong> of items. "
            "Create one with square brackets <code>[]</code>:</p>"
        ),

        code_example("Basic lists",
            '# A list of strings\n'
            'fruits = ["apple", "banana", "cherry"]\n'
            'print(fruits)\n'
            '\n'
            '# A list of numbers\n'
            'scores = [95, 87, 72, 91, 88]\n'
            'print(scores)\n'
            '\n'
            '# Mixed types (legal but uncommon)\n'
            'mixed = ["Alice", 30, True, 3.14]\n'
            'print(mixed)\n'
            '\n'
            '# Empty list\n'
            'empty = []\n'
            'print(empty)',
            output='[\'apple\', \'banana\', \'cherry\']\n[95, 87, 72, 91, 88]\n[\'Alice\', 30, True, 3.14]\n[]',
            explanation="Lists can hold any data type, and even mix types. "
            "In practice, most lists contain items of the same type."
        ),

        code_example("Creating lists from other data",
            '# list() constructor converts iterables to lists\n'
            'letters = list("hello")\n'
            'print(letters)    # [\'h\', \'e\', \'l\', \'l\', \'o\']\n'
            '\n'
            '# range() to list\n'
            'nums = list(range(1, 6))\n'
            'print(nums)       # [1, 2, 3, 4, 5]\n'
            '\n'
            '# Split a string into a list\n'
            'words = "one two three".split()\n'
            'print(words)      # [\'one\', \'two\', \'three\']',
            output="['h', 'e', 'l', 'l', 'o']\n[1, 2, 3, 4, 5]\n['one', 'two', 'three']",
            explanation="<code>list()</code> converts any iterable into a list. "
            "<code>str.split()</code> is one of the most common ways to create lists from text data."
        ),

        section("Accessing items by index"),

        concept("Indexing starts at 0",
            "<p>Each item in a list has a position called an <strong>index</strong>. "
            "Python uses <strong>zero-based indexing</strong> &mdash; the first item is at index 0:</p>"
            "<pre>"
            '  fruits = ["apple", "banana", "cherry", "date"]\n'
            "  Index:      0        1         2        3\n"
            "  Negative:  -4       -3        -2       -1"
            "</pre>"
        ),

        code_example("Positive indexing",
            'fruits = ["apple", "banana", "cherry", "date"]\n'
            '\n'
            'print(fruits[0])    # First item\n'
            'print(fruits[1])    # Second item\n'
            'print(fruits[3])    # Last item (index 3)',
            output="apple\nbanana\ndate",
            explanation="Use <code>list[index]</code> to access a specific item. "
            "Remember: the first item is at index 0, not 1."
        ),

        code_example("Negative indexing",
            'fruits = ["apple", "banana", "cherry", "date"]\n'
            '\n'
            'print(fruits[-1])    # Last item\n'
            'print(fruits[-2])    # Second to last\n'
            'print(fruits[-4])    # First item',
            output="date\ncherry\napple",
            explanation="Negative indices count from the end. <code>-1</code> is always the last item. "
            "This is extremely useful when you don't know the list length."
        ),

        section("Slicing"),

        concept("Extracting sublists with slices",
            "<p>Slicing lets you grab a range of items: <code>list[start:stop:step]</code></p>"
            "<ul>"
            "<li><code>start</code> &mdash; where to begin (inclusive, default 0)</li>"
            "<li><code>stop</code> &mdash; where to end (exclusive, default end of list)</li>"
            "<li><code>step</code> &mdash; how many to skip (default 1)</li>"
            "</ul>"
        ),

        code_example("Basic slicing",
            'nums = [10, 20, 30, 40, 50, 60, 70, 80]\n'
            '\n'
            'print(nums[1:4])     # Items at index 1, 2, 3\n'
            'print(nums[:3])      # First 3 items\n'
            'print(nums[5:])      # From index 5 to end\n'
            'print(nums[-3:])     # Last 3 items',
            output="[20, 30, 40]\n[10, 20, 30]\n[60, 70, 80]\n[60, 70, 80]",
            explanation="The stop index is <strong>exclusive</strong> &mdash; "
            "<code>nums[1:4]</code> gets indices 1, 2, 3 but NOT 4. "
            "This is a common source of confusion."
        ),

        code_example("Step slicing",
            'nums = [10, 20, 30, 40, 50, 60, 70, 80]\n'
            '\n'
            '# Every other item\n'
            'print(nums[::2])     # [10, 30, 50, 70]\n'
            '\n'
            '# Every other, starting from index 1\n'
            'print(nums[1::2])    # [20, 40, 60, 80]\n'
            '\n'
            '# Reverse the list\n'
            'print(nums[::-1])    # [80, 70, 60, 50, 40, 30, 20, 10]',
            output="[10, 30, 50, 70]\n[20, 40, 60, 80]\n[80, 70, 60, 50, 40, 30, 20, 10]",
            explanation="<code>[::-1]</code> is the Python idiom for reversing a list. "
            "You will see it everywhere."
        ),

        try_it("Create a list of 10 numbers and practice slicing: first 5, last 3, every other, reversed."),

        section("Modifying lists"),

        concept("Lists are mutable",
            "<p>Unlike strings, you can change list items in place. "
            "This is what <strong>mutable</strong> means:</p>"
        ),

        code_example("Changing items",
            'colors = ["red", "green", "blue"]\n'
            'print(colors)\n'
            '\n'
            '# Change an item by index\n'
            'colors[1] = "yellow"\n'
            'print(colors)\n'
            '\n'
            '# Change a slice\n'
            'colors[0:2] = ["purple", "orange"]\n'
            'print(colors)',
            output="['red', 'green', 'blue']\n['red', 'yellow', 'blue']\n['purple', 'orange', 'blue']",
            explanation="You can replace a single item or an entire slice at once."
        ),

        code_example("Adding items: append, insert, extend",
            'tasks = ["buy groceries", "clean house"]\n'
            '\n'
            '# append: add to the end\n'
            'tasks.append("do laundry")\n'
            'print(tasks)\n'
            '\n'
            '# insert: add at a specific position\n'
            'tasks.insert(1, "walk dog")\n'
            'print(tasks)\n'
            '\n'
            '# extend: add multiple items from another list\n'
            'tasks.extend(["cook dinner", "read book"])\n'
            'print(tasks)',
            output='[\'buy groceries\', \'clean house\', \'do laundry\']\n'
            '[\'buy groceries\', \'walk dog\', \'clean house\', \'do laundry\']\n'
            '[\'buy groceries\', \'walk dog\', \'clean house\', \'do laundry\', \'cook dinner\', \'read book\']',
            explanation="<code>append()</code> adds one item to the end. "
            "<code>insert(i, item)</code> adds at position i. "
            "<code>extend()</code> adds all items from another iterable."
        ),

        code_example("Removing items: remove, pop, del",
            'fruits = ["apple", "banana", "cherry", "banana", "date"]\n'
            '\n'
            '# remove: delete first occurrence by value\n'
            'fruits.remove("banana")\n'
            'print(fruits)    # [\'apple\', \'cherry\', \'banana\', \'date\']\n'
            '\n'
            '# pop: remove by index and return the value\n'
            'last = fruits.pop()       # removes last item\n'
            'print(last)               # date\n'
            'second = fruits.pop(1)    # removes index 1\n'
            'print(second)             # cherry\n'
            'print(fruits)             # [\'apple\', \'banana\']\n'
            '\n'
            '# del: remove by index or slice\n'
            'nums = [10, 20, 30, 40, 50]\n'
            'del nums[0]\n'
            'print(nums)               # [20, 30, 40, 50]\n'
            'del nums[1:3]\n'
            'print(nums)               # [20, 50]',
            output="['apple', 'cherry', 'banana', 'date']\ndate\ncherry\n['apple', 'banana']\n[20, 30, 40, 50]\n[20, 50]",
            explanation="<code>remove()</code> deletes by value (first match). "
            "<code>pop()</code> deletes by index and returns the removed item. "
            "<code>del</code> is a statement that deletes by index or slice."
        ),

        section("Useful list operations"),

        code_example("len(), in, count, index",
            'scores = [88, 92, 75, 92, 68, 95, 92]\n'
            '\n'
            '# Length of the list\n'
            'print(len(scores))           # 7\n'
            '\n'
            '# Check membership\n'
            'print(92 in scores)          # True\n'
            'print(100 in scores)         # False\n'
            '\n'
            '# Count occurrences\n'
            'print(scores.count(92))      # 3\n'
            '\n'
            '# Find index of first occurrence\n'
            'print(scores.index(75))      # 2\n'
            '\n'
            '# Min, max, sum\n'
            'print(min(scores))           # 68\n'
            'print(max(scores))           # 95\n'
            'print(sum(scores))           # 502',
            output="7\nTrue\nFalse\n3\n2\n68\n95\n502",
            explanation="These built-in functions and methods work on any list. "
            "<code>in</code> is particularly useful for checking if something exists before accessing it."
        ),

        code_example("Iterating over lists",
            '# Simple for loop\n'
            'fruits = ["apple", "banana", "cherry"]\n'
            'for fruit in fruits:\n'
            '    print(f"I like {fruit}")\n'
            '\n'
            'print()\n'
            '\n'
            '# With index using enumerate()\n'
            'for i, fruit in enumerate(fruits):\n'
            '    print(f"{i + 1}. {fruit}")',
            output="I like apple\nI like banana\nI like cherry\n\n1. apple\n2. banana\n3. cherry",
            explanation="<code>enumerate()</code> gives you both the index and the value. "
            "This is much cleaner than using <code>range(len(list))</code>."
        ),

        code_example("Copying lists (important!)",
            'original = [1, 2, 3]\n'
            '\n'
            '# WRONG: this creates a reference, not a copy\n'
            'alias = original\n'
            'alias.append(4)\n'
            'print(original)    # [1, 2, 3, 4] -- original changed too!\n'
            '\n'
            '# RIGHT: create an actual copy\n'
            'original = [1, 2, 3]\n'
            'copy1 = original.copy()    # Method 1\n'
            'copy2 = original[:]        # Method 2\n'
            'copy3 = list(original)     # Method 3\n'
            '\n'
            'copy1.append(99)\n'
            'print(original)    # [1, 2, 3] -- original unchanged\n'
            'print(copy1)       # [1, 2, 3, 99]',
            output="[1, 2, 3, 4]\n[1, 2, 3]\n[1, 2, 3, 99]",
            explanation="Assignment with <code>=</code> does NOT copy a list. "
            "Both variables point to the same list in memory. Use <code>.copy()</code>, "
            "<code>[:]</code>, or <code>list()</code> to create an independent copy."
        ),

        section("Exercises"),

        exercise("starter", "Shopping list manager",
            "Create a shopping list with 5 items. Then: "
            "(1) Add two more items with <code>append()</code>. "
            "(2) Insert \"milk\" at the beginning. "
            "(3) Remove one item by name. "
            "(4) Print the final list with numbered items using <code>enumerate()</code>. "
            "(5) Print the total number of items.",
            hint="Start with <code>shopping = [\"bread\", \"eggs\", ...]</code>. "
            "Use <code>shopping.insert(0, \"milk\")</code> to add at the beginning. "
            "Use <code>for i, item in enumerate(shopping, 1)</code> for 1-based numbering."
        ),

        exercise("medium", "Top-3 scores finder",
            "Given a list of exam scores: <code>[72, 95, 88, 61, 77, 93, 85, 90, 68, 82]</code>, "
            "find the top 3 scores <strong>without modifying the original list</strong>. "
            "Print the top 3 scores and their original positions (indices). "
            "Also print the average of all scores and how many scores are above average.",
            hint="Use <code>sorted(scores, reverse=True)[:3]</code> for top 3. "
            "Use <code>scores.index(score)</code> to find original positions. "
            "Average: <code>sum(scores) / len(scores)</code>."
        ),

        exercise("real-world", "Playlist organizer",
            "Build a playlist manager. Start with a list of 8 song titles. Implement these operations:<br>"
            "(1) Print the playlist with numbered tracks.<br>"
            "(2) Move a song from one position to another (remove then insert).<br>"
            "(3) Swap two songs by index.<br>"
            "(4) Reverse the playlist order.<br>"
            "(5) Create a \"top 3\" sub-playlist from the first 3 songs using slicing.<br>"
            "(6) Print the final playlist and the sub-playlist.",
            hint="To move a song: <code>song = playlist.pop(old_index)</code> then "
            "<code>playlist.insert(new_index, song)</code>. "
            "To swap: <code>playlist[a], playlist[b] = playlist[b], playlist[a]</code>."
        ),

        mistakes([
            ("Off-by-one errors with indexing",
             "A list of 5 items has indices 0 through 4. <code>list[5]</code> raises "
             "<code>IndexError</code>. Use <code>list[-1]</code> for the last item."),
            ("Confusing <code>append()</code> with <code>extend()</code>",
             "<code>list.append([1, 2])</code> adds <em>one item</em> (the list itself). "
             "<code>list.extend([1, 2])</code> adds <em>two items</em> (1 and 2)."),
            ("Modifying a list while iterating over it",
             "Removing items during a for loop causes skipped items. "
             "Instead, iterate over a copy: <code>for item in list[:]:</code>"),
            ("Forgetting that <code>=</code> creates a reference, not a copy",
             "<code>b = a</code> makes both names point to the same list. "
             "Changing one changes the other. Use <code>b = a.copy()</code>."),
            ("Using <code>remove()</code> on an item that does not exist",
             "<code>list.remove(x)</code> raises <code>ValueError</code> if x is not in the list. "
             "Check with <code>if x in list:</code> first."),
        ]),

        pro_tips([
            "<strong>Use negative indexing freely.</strong> <code>list[-1]</code> for the last item "
            "is idiomatic Python. No need for <code>list[len(list) - 1]</code>.",
            "<strong><code>enumerate()</code> is your friend.</strong> Whenever you need both the "
            "index and value, use <code>for i, val in enumerate(list)</code>.",
            "<strong>Slicing never raises IndexError.</strong> <code>[1, 2, 3][10:20]</code> returns "
            "<code>[]</code> instead of crashing. This is a safe way to grab partial data.",
            "<strong>Lists are everywhere.</strong> Function arguments (<code>*args</code>), "
            "string <code>.split()</code>, file <code>.readlines()</code>, database query results &mdash; "
            "they all produce lists. This lesson's skills apply to all of them.",
        ]),

        recap([
            "Lists are ordered, mutable collections: <code>[1, 2, 3]</code>",
            "Index with <code>list[0]</code> (first) and <code>list[-1]</code> (last)",
            "Slice with <code>list[start:stop:step]</code>",
            "Add items: <code>append()</code>, <code>insert()</code>, <code>extend()</code>",
            "Remove items: <code>remove()</code>, <code>pop()</code>, <code>del</code>",
            "Check membership with <code>in</code>, length with <code>len()</code>",
            "Use <code>enumerate()</code> to loop with index and value",
            "Copy lists with <code>.copy()</code> or <code>[:]</code> &mdash; not <code>=</code>",
        ]),
    ])
