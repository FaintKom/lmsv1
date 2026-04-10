"""Module 5, Lesson 4: Dunder Methods & Operator Overloading."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Dunder Methods &amp; Operator Overloading",
            "Make your objects behave like built-in types. Print them, compare them, add them, iterate them.",
        ),

        why_it_matters(
            "<p>When you write <code>print(my_obj)</code>, Python calls <code>my_obj.__str__()</code>. "
            "When you write <code>len(my_list)</code>, Python calls <code>my_list.__len__()</code>. "
            "By implementing these <strong>dunder</strong> (double underscore) methods, your objects "
            "integrate seamlessly with Python's syntax. Libraries like NumPy and pandas rely on "
            "this heavily &mdash; that is why <code>df[\"column\"]</code> and <code>array + 5</code> work.</p>"
        ),

        section("String representation"),

        concept("<code>__str__</code> and <code>__repr__</code>",
            "<p>These two methods control how your objects appear as strings:</p>"
            "<ul>"
            "<li><code>__str__</code> &mdash; human-readable, used by <code>print()</code> and <code>str()</code></li>"
            "<li><code>__repr__</code> &mdash; developer-readable, used by the debugger and interactive console. "
            "Should ideally be valid Python that recreates the object.</li>"
            "</ul>"
        ),

        code_example("__str__ and __repr__",
            'class Money:\n'
            '    def __init__(self, amount, currency="USD"):\n'
            '        self.amount = amount\n'
            '        self.currency = currency\n'
            '\n'
            '    def __str__(self):\n'
            '        """Human-readable: for print() and f-strings."""\n'
            '        symbols = {"USD": "$", "EUR": "\\u20ac", "GBP": "\\u00a3"}\n'
            '        sym = symbols.get(self.currency, self.currency + " ")\n'
            '        return f"{sym}{self.amount:,.2f}"\n'
            '\n'
            '    def __repr__(self):\n'
            '        """Developer-readable: for debugging."""\n'
            '        return f\'Money({self.amount}, "{self.currency}")\'\n'
            '\n'
            'price = Money(1299.99)\n'
            'print(price)         # uses __str__\n'
            'print(repr(price))   # uses __repr__\n'
            'print(f"Price: {price}")  # uses __str__\n'
            '\n'
            'euro = Money(49.90, "EUR")\n'
            'print(euro)\n'
            'print(repr(euro))\n'
            '\n'
            '# In lists, __repr__ is used:\n'
            'prices = [Money(10), Money(20, "EUR"), Money(30, "GBP")]\n'
            'print(prices)',
            output="$1,299.99\nMoney(1299.99, \"USD\")\nPrice: $1,299.99\n"
            "\u20ac49.90\nMoney(49.9, \"EUR\")\n"
            "[Money(10, \"USD\"), Money(20, \"EUR\"), Money(30, \"GBP\")]",
            explanation="Always implement <code>__repr__</code>. If you only implement one, "
            "Python uses <code>__repr__</code> as fallback for <code>str()</code> too."
        ),

        section("Comparison operators"),

        concept("Making objects comparable",
            "<p>Implement comparison dunders to use <code>&lt;</code>, <code>&gt;</code>, "
            "<code>==</code>, etc. with your objects:</p>"
            "<ul>"
            "<li><code>__eq__</code> &mdash; <code>==</code></li>"
            "<li><code>__lt__</code> &mdash; <code>&lt;</code></li>"
            "<li><code>__le__</code> &mdash; <code>&lt;=</code></li>"
            "<li><code>__gt__</code> &mdash; <code>&gt;</code></li>"
            "<li><code>__ge__</code> &mdash; <code>&gt;=</code></li>"
            "</ul>"
        ),

        code_example("Comparison operators",
            'from functools import total_ordering\n'
            '\n'
            '@total_ordering    # fills in the rest from __eq__ and __lt__\n'
            'class Money:\n'
            '    def __init__(self, amount, currency="USD"):\n'
            '        self.amount = amount\n'
            '        self.currency = currency\n'
            '\n'
            '    def __eq__(self, other):\n'
            '        if not isinstance(other, Money):\n'
            '            return NotImplemented\n'
            '        return self.amount == other.amount and self.currency == other.currency\n'
            '\n'
            '    def __lt__(self, other):\n'
            '        if not isinstance(other, Money):\n'
            '            return NotImplemented\n'
            '        if self.currency != other.currency:\n'
            '            raise ValueError(f"Cannot compare {self.currency} and {other.currency}")\n'
            '        return self.amount < other.amount\n'
            '\n'
            '    def __repr__(self):\n'
            '        return f"Money({self.amount}, \\\"{self.currency}\\\")"  \n'
            '\n'
            'a = Money(50)\n'
            'b = Money(75)\n'
            'c = Money(50)\n'
            '\n'
            'print(f"a == c: {a == c}")\n'
            'print(f"a < b:  {a < b}")\n'
            'print(f"b >= a: {b >= a}")\n'
            '\n'
            '# Sorting works automatically:\n'
            'prices = [Money(30), Money(10), Money(50), Money(20)]\n'
            'prices.sort()\n'
            'print(prices)',
            output="a == c: True\na < b:  True\nb >= a: True\n"
            "[Money(10, \"USD\"), Money(20, \"USD\"), Money(30, \"USD\"), Money(50, \"USD\")]",
            explanation="<code>@total_ordering</code> from functools automatically generates "
            "<code>__le__</code>, <code>__gt__</code>, and <code>__ge__</code> from "
            "<code>__eq__</code> and <code>__lt__</code>."
        ),

        section("Arithmetic operators"),

        concept("Making objects addable, subtractable, etc.",
            "<p>Implement arithmetic dunders to use <code>+</code>, <code>-</code>, <code>*</code> with your objects:</p>"
            "<ul>"
            "<li><code>__add__</code> &mdash; <code>+</code></li>"
            "<li><code>__sub__</code> &mdash; <code>-</code></li>"
            "<li><code>__mul__</code> &mdash; <code>*</code></li>"
            "<li><code>__truediv__</code> &mdash; <code>/</code></li>"
            "<li><code>__neg__</code> &mdash; unary <code>-</code></li>"
            "</ul>"
        ),

        code_example("Arithmetic with Money",
            'class Money:\n'
            '    def __init__(self, amount, currency="USD"):\n'
            '        self.amount = round(amount, 2)\n'
            '        self.currency = currency\n'
            '\n'
            '    def __add__(self, other):\n'
            '        if isinstance(other, Money):\n'
            '            if self.currency != other.currency:\n'
            '                raise ValueError("Cannot add different currencies")\n'
            '            return Money(self.amount + other.amount, self.currency)\n'
            '        if isinstance(other, (int, float)):\n'
            '            return Money(self.amount + other, self.currency)\n'
            '        return NotImplemented\n'
            '\n'
            '    def __sub__(self, other):\n'
            '        if isinstance(other, Money):\n'
            '            if self.currency != other.currency:\n'
            '                raise ValueError("Cannot subtract different currencies")\n'
            '            return Money(self.amount - other.amount, self.currency)\n'
            '        return NotImplemented\n'
            '\n'
            '    def __mul__(self, factor):\n'
            '        if isinstance(factor, (int, float)):\n'
            '            return Money(self.amount * factor, self.currency)\n'
            '        return NotImplemented\n'
            '\n'
            '    def __neg__(self):\n'
            '        return Money(-self.amount, self.currency)\n'
            '\n'
            '    def __str__(self):\n'
            '        return f"${self.amount:,.2f}"\n'
            '\n'
            '    def __repr__(self):\n'
            '        return f\'Money({self.amount}, "{self.currency}")\'\n'
            '\n'
            '\n'
            'price = Money(29.99)\n'
            'tax = Money(2.40)\n'
            'total = price + tax\n'
            'print(f"Total: {total}")\n'
            '\n'
            'discount = total * 0.9    # 10% off\n'
            'print(f"After discount: {discount}")\n'
            '\n'
            'refund = price - Money(10)\n'
            'print(f"Refund: {refund}")\n'
            '\n'
            '# Sum a list of Money objects:\n'
            'items = [Money(10), Money(20), Money(30)]\n'
            'total = Money(0)\n'
            'for item in items:\n'
            '    total = total + item\n'
            'print(f"Cart total: {total}")',
            output="Total: $32.39\nAfter discount: $29.15\n"
            "Refund: $19.99\nCart total: $60.00",
        ),

        section("<code>__len__</code> and <code>__bool__</code>"),

        code_example("Making objects measurable and truthy",
            'class Playlist:\n'
            '    def __init__(self, name):\n'
            '        self.name = name\n'
            '        self.songs = []\n'
            '\n'
            '    def add(self, song):\n'
            '        self.songs.append(song)\n'
            '\n'
            '    def __len__(self):\n'
            '        """len(playlist) returns number of songs."""\n'
            '        return len(self.songs)\n'
            '\n'
            '    def __bool__(self):\n'
            '        """Empty playlist is falsy."""\n'
            '        return len(self.songs) > 0\n'
            '\n'
            '    def __contains__(self, song):\n'
            '        """Support \'in\' operator."""\n'
            '        return song in self.songs\n'
            '\n'
            '    def __getitem__(self, index):\n'
            '        """Support indexing: playlist[0]."""\n'
            '        return self.songs[index]\n'
            '\n'
            '    def __repr__(self):\n'
            '        return f"Playlist(\'{self.name}\', {len(self)} songs)"\n'
            '\n'
            '\n'
            'rock = Playlist("Classic Rock")\n'
            'print(f"Empty? {not rock}")    # uses __bool__\n'
            '\n'
            'rock.add("Bohemian Rhapsody")\n'
            'rock.add("Stairway to Heaven")\n'
            'rock.add("Hotel California")\n'
            '\n'
            'print(f"Songs: {len(rock)}")             # __len__\n'
            'print(f"Has songs? {bool(rock)}")        # __bool__\n'
            'print(f"First: {rock[0]}")               # __getitem__\n'
            'print(f"Contains? {\"Hotel California\" in rock}")  # __contains__\n'
            'print(rock)',
            output="Empty? True\nSongs: 3\nHas songs? True\n"
            "First: Bohemian Rhapsody\nContains? True\n"
            "Playlist('Classic Rock', 3 songs)",
        ),

        section("Vector2D example"),

        code_example("A complete Vector2D class",
            'import math\n'
            '\n'
            'class Vector2D:\n'
            '    """2D vector with full operator support."""\n'
            '\n'
            '    def __init__(self, x, y):\n'
            '        self.x = x\n'
            '        self.y = y\n'
            '\n'
            '    def __repr__(self):\n'
            '        return f"Vector2D({self.x}, {self.y})"\n'
            '\n'
            '    def __str__(self):\n'
            '        return f"({self.x}, {self.y})"\n'
            '\n'
            '    def __add__(self, other):\n'
            '        return Vector2D(self.x + other.x, self.y + other.y)\n'
            '\n'
            '    def __sub__(self, other):\n'
            '        return Vector2D(self.x - other.x, self.y - other.y)\n'
            '\n'
            '    def __mul__(self, scalar):\n'
            '        return Vector2D(self.x * scalar, self.y * scalar)\n'
            '\n'
            '    def __eq__(self, other):\n'
            '        return self.x == other.x and self.y == other.y\n'
            '\n'
            '    def __abs__(self):\n'
            '        """abs(v) returns the magnitude."""\n'
            '        return math.sqrt(self.x ** 2 + self.y ** 2)\n'
            '\n'
            '    def __neg__(self):\n'
            '        return Vector2D(-self.x, -self.y)\n'
            '\n'
            '    def __bool__(self):\n'
            '        return self.x != 0 or self.y != 0\n'
            '\n'
            'v1 = Vector2D(3, 4)\n'
            'v2 = Vector2D(1, 2)\n'
            '\n'
            'print(f"v1 + v2 = {v1 + v2}")\n'
            'print(f"v1 - v2 = {v1 - v2}")\n'
            'print(f"v1 * 3  = {v1 * 3}")\n'
            'print(f"|v1|    = {abs(v1)}")\n'
            'print(f"-v1     = {-v1}")\n'
            'print(f"v1 == v2: {v1 == v2}")\n'
            'print(f"zero?   : {bool(Vector2D(0, 0))}")',
            output="v1 + v2 = (4, 6)\nv1 - v2 = (2, 2)\n"
            "v1 * 3  = (9, 12)\n|v1|    = 5.0\n"
            "-v1     = (-3, -4)\nv1 == v2: False\nzero?   : False",
        ),

        try_it("Add a <code>dot(other)</code> method to Vector2D that computes the dot product: <code>self.x * other.x + self.y * other.y</code>."),

        section("Exercises"),

        exercise("starter", "Money class with + and comparison",
            "Build a <code>Money</code> class with <code>amount</code> and <code>currency</code>. "
            "Implement <code>__str__</code>, <code>__repr__</code>, <code>__add__</code>, "
            "<code>__eq__</code>, and <code>__lt__</code>. Raise <code>ValueError</code> when "
            "adding or comparing different currencies. Create a list of prices, sort them, "
            "and sum them.",
            hint="Use <code>@total_ordering</code> to get all comparisons from just <code>__eq__</code> "
            "and <code>__lt__</code>."
        ),

        exercise("medium", "Vector2D with dot product and angle",
            "Extend <code>Vector2D</code> with: <code>dot(other)</code> for dot product, "
            "<code>angle_between(other)</code> that returns degrees between two vectors "
            "(use <code>math.acos</code> and <code>math.degrees</code>), and <code>normalize()</code> "
            "that returns a unit vector. Make it iterable (<code>__iter__</code>) so you can do "
            "<code>x, y = vector</code>.",
            hint="Dot product: <code>self.x*other.x + self.y*other.y</code>. "
            "Angle: <code>cos_angle = dot / (|self| * |other|)</code>. "
            "For <code>__iter__</code>: <code>yield self.x; yield self.y</code>."
        ),

        exercise("real-world", "Matrix2x2 class",
            "Build a <code>Matrix2x2</code> class storing values <code>a, b, c, d</code> "
            "(top-left, top-right, bottom-left, bottom-right). Implement <code>__add__</code>, "
            "<code>__mul__</code> (matrix multiplication and scalar), <code>__eq__</code>, "
            "<code>__str__</code> (formatted grid), <code>determinant()</code>, "
            "and <code>@classmethod identity(cls)</code>. Verify that multiplying any matrix by "
            "identity returns the same matrix.",
            hint="Matrix multiply: result.a = self.a*other.a + self.b*other.c, etc. "
            "Determinant: <code>a*d - b*c</code>. "
            "Identity: <code>Matrix2x2(1, 0, 0, 1)</code>."
        ),

        mistakes([
            ("Returning <code>None</code> from <code>__add__</code>",
             "Arithmetic methods must return a <strong>new object</strong>, not modify <code>self</code>. "
             "<code>v1 + v2</code> should not change <code>v1</code>."),
            ("Not handling incompatible types",
             "Return <code>NotImplemented</code> (not raise <code>NotImplementedError</code>) when "
             "your dunder gets a type it does not understand. Python will then try the other object's method."),
            ("Forgetting <code>__repr__</code>",
             "Without it, printing a list of your objects shows ugly <code>&lt;__main__.Money object at 0x...&gt;</code>."),
            ("Implementing <code>__eq__</code> without <code>__hash__</code>",
             "Objects with custom <code>__eq__</code> become unhashable by default. If you need to "
             "use them in sets or as dict keys, implement <code>__hash__</code> too."),
        ]),

        pro_tips([
            "<strong>Start with <code>__repr__</code>.</strong> It is the single most useful dunder. "
            "Make it output valid Python: <code>Money(10, \"USD\")</code>.",
            "<strong>Use <code>@total_ordering</code> to save work.</strong> Implement just "
            "<code>__eq__</code> and one of <code>__lt__/__gt__</code>, and functools fills in the rest.",
            "<strong>Return <code>NotImplemented</code>, not <code>NotImplementedError</code>.</strong> "
            "<code>NotImplemented</code> is a signal to Python. <code>NotImplementedError</code> is an exception.",
            "<strong>Arithmetic methods should be pure.</strong> <code>a + b</code> should create a new "
            "object. Neither <code>a</code> nor <code>b</code> should change.",
        ]),

        recap([
            "<code>__str__</code> for human-readable, <code>__repr__</code> for developer-readable",
            "<code>__eq__</code>, <code>__lt__</code> for comparison operators",
            "<code>__add__</code>, <code>__sub__</code>, <code>__mul__</code> for arithmetic",
            "<code>__len__</code>, <code>__bool__</code>, <code>__contains__</code> for built-in integration",
            "<code>__getitem__</code> for indexing with <code>[]</code>",
            "Return <code>NotImplemented</code> for unsupported types",
            "Use <code>@total_ordering</code> to auto-generate comparisons",
        ]),
    ])
