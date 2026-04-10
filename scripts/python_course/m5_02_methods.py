"""Module 5, Lesson 2: Methods & Properties."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Methods &amp; Properties",
            "Instance methods, class methods, static methods, and properties. Control how your objects expose and protect their data.",
        ),

        why_it_matters(
            "<p>Real classes need more than just instance methods. You need factory methods to create "
            "objects in different ways (<code>@classmethod</code>), utility functions that belong to "
            "a class but do not need instance data (<code>@staticmethod</code>), and computed attributes "
            "that look like simple data but run logic behind the scenes (<code>@property</code>). "
            "These tools make your classes clean and Pythonic.</p>"
        ),

        section("Instance methods (review)"),

        concept("Methods that use <code>self</code>",
            "<p>Instance methods are the most common kind. They take <code>self</code> as the first "
            "parameter and can access/modify the object's state:</p>"
        ),

        code_example("Instance methods",
            'class ShoppingCart:\n'
            '    def __init__(self):\n'
            '        self.items = []\n'
            '\n'
            '    def add(self, name, price, qty=1):\n'
            '        """Add an item to the cart."""\n'
            '        self.items.append({"name": name, "price": price, "qty": qty})\n'
            '\n'
            '    def total(self):\n'
            '        """Calculate total price."""\n'
            '        return sum(item["price"] * item["qty"] for item in self.items)\n'
            '\n'
            '    def item_count(self):\n'
            '        """Total number of items."""\n'
            '        return sum(item["qty"] for item in self.items)\n'
            '\n'
            'cart = ShoppingCart()\n'
            'cart.add("Keyboard", 49.99)\n'
            'cart.add("Mouse", 29.99)\n'
            'cart.add("USB Cable", 9.99, qty=3)\n'
            'print(f"Items: {cart.item_count()}, Total: ${cart.total():.2f}")',
            output="Items: 5, Total: $109.95",
        ),

        section("@classmethod"),

        concept("Methods on the class itself",
            "<p>A <strong>class method</strong> receives the class (not an instance) as its first argument. "
            "Use it for alternative constructors &mdash; different ways to create objects:</p>"
        ),

        code_example("Class methods as alternative constructors",
            'class Date:\n'
            '    def __init__(self, year, month, day):\n'
            '        self.year = year\n'
            '        self.month = month\n'
            '        self.day = day\n'
            '\n'
            '    @classmethod\n'
            '    def from_string(cls, date_string):\n'
            '        """Create a Date from a \'YYYY-MM-DD\' string."""\n'
            '        year, month, day = date_string.split("-")\n'
            '        return cls(int(year), int(month), int(day))\n'
            '\n'
            '    @classmethod\n'
            '    def today(cls):\n'
            '        """Create a Date for today."""\n'
            '        import datetime\n'
            '        t = datetime.date.today()\n'
            '        return cls(t.year, t.month, t.day)\n'
            '\n'
            '    def display(self):\n'
            '        print(f"{self.year}-{self.month:02d}-{self.day:02d}")\n'
            '\n'
            '# Three ways to create a Date:\n'
            'd1 = Date(2024, 3, 15)            # regular constructor\n'
            'd2 = Date.from_string("2024-07-04") # from string\n'
            'd3 = Date.today()                   # from today\n'
            '\n'
            'd1.display()\n'
            'd2.display()\n'
            'd3.display()',
            output="2024-03-15\n2024-07-04\n2026-04-10",
            explanation="Notice <code>cls</code> instead of <code>self</code> &mdash; "
            "it receives the class. <code>cls(...)</code> creates a new instance. "
            "This is the standard pattern for factory methods in Python."
        ),

        section("@staticmethod"),

        concept("Utility functions in a class",
            "<p>A <strong>static method</strong> belongs to the class namespace but does not receive "
            "<code>self</code> or <code>cls</code>. It is essentially a regular function that lives "
            "inside the class for organizational purposes:</p>"
        ),

        code_example("Static methods",
            'class MathUtils:\n'
            '    """Collection of math utility functions."""\n'
            '\n'
            '    @staticmethod\n'
            '    def is_even(n):\n'
            '        return n % 2 == 0\n'
            '\n'
            '    @staticmethod\n'
            '    def clamp(value, minimum, maximum):\n'
            '        """Keep a value within a range."""\n'
            '        return max(minimum, min(maximum, value))\n'
            '\n'
            '    @staticmethod\n'
            '    def percentage(part, whole):\n'
            '        if whole == 0:\n'
            '            return 0.0\n'
            '        return round((part / whole) * 100, 1)\n'
            '\n'
            '# Call on the class (no instance needed):\n'
            'print(MathUtils.is_even(4))\n'
            'print(MathUtils.clamp(150, 0, 100))\n'
            'print(MathUtils.percentage(75, 200))',
            output="True\n100\n37.5",
            explanation="Static methods are good for grouping related utility functions. "
            "They do not access any instance or class state."
        ),

        section("@property"),

        concept("Computed attributes",
            "<p>A <strong>property</strong> looks like a simple attribute from outside but runs a "
            "method behind the scenes. Use it for computed values and controlled access:</p>"
        ),

        code_example("Properties as computed attributes",
            'class Temperature:\n'
            '    """Temperature with Celsius and Fahrenheit views."""\n'
            '\n'
            '    def __init__(self, celsius=0):\n'
            '        self._celsius = celsius    # underscore = private convention\n'
            '\n'
            '    @property\n'
            '    def celsius(self):\n'
            '        """Get temperature in Celsius."""\n'
            '        return self._celsius\n'
            '\n'
            '    @celsius.setter\n'
            '    def celsius(self, value):\n'
            '        """Set temperature in Celsius with validation."""\n'
            '        if value < -273.15:\n'
            '            raise ValueError("Temperature below absolute zero")\n'
            '        self._celsius = value\n'
            '\n'
            '    @property\n'
            '    def fahrenheit(self):\n'
            '        """Get temperature in Fahrenheit (computed)."""\n'
            '        return self._celsius * 9/5 + 32\n'
            '\n'
            '    @fahrenheit.setter\n'
            '    def fahrenheit(self, value):\n'
            '        """Set temperature via Fahrenheit."""\n'
            '        self.celsius = (value - 32) * 5/9    # uses the celsius setter\n'
            '\n'
            'temp = Temperature(100)\n'
            'print(f"{temp.celsius}C = {temp.fahrenheit}F")\n'
            '\n'
            'temp.fahrenheit = 72\n'
            'print(f"{temp.celsius:.1f}C = {temp.fahrenheit:.1f}F")\n'
            '\n'
            'try:\n'
            '    temp.celsius = -300\n'
            'except ValueError as e:\n'
            '    print(f"Error: {e}")',
            output="100C = 212.0F\n22.2C = 72.0F\nError: Temperature below absolute zero",
            explanation="<code>temp.fahrenheit</code> looks like a simple attribute access, "
            "but it actually computes the value. The setter lets you assign to it naturally. "
            "Validation happens automatically."
        ),

        code_example("Read-only properties",
            'class Circle:\n'
            '    def __init__(self, radius):\n'
            '        self._radius = radius\n'
            '\n'
            '    @property\n'
            '    def radius(self):\n'
            '        return self._radius\n'
            '\n'
            '    @radius.setter\n'
            '    def radius(self, value):\n'
            '        if value < 0:\n'
            '            raise ValueError("Radius cannot be negative")\n'
            '        self._radius = value\n'
            '\n'
            '    @property\n'
            '    def area(self):\n'
            '        """Read-only computed property."""\n'
            '        return 3.14159 * self._radius ** 2\n'
            '\n'
            '    @property\n'
            '    def circumference(self):\n'
            '        """Read-only computed property."""\n'
            '        return 2 * 3.14159 * self._radius\n'
            '\n'
            'c = Circle(5)\n'
            'print(f"Radius: {c.radius}")\n'
            'print(f"Area: {c.area:.2f}")\n'
            'print(f"Circumference: {c.circumference:.2f}")\n'
            '\n'
            'c.radius = 10\n'
            'print(f"New area: {c.area:.2f}")\n'
            '\n'
            '# Cannot set area directly:\n'
            'try:\n'
            '    c.area = 100\n'
            'except AttributeError as e:\n'
            '    print(f"Error: {e}")',
            output="Radius: 5\nArea: 78.54\nCircumference: 31.42\n"
            "New area: 314.16\n"
            "Error: property 'area' of 'Circle' object has no setter",
            explanation="Properties without setters are read-only. Trying to assign to them "
            "raises <code>AttributeError</code>. The area updates automatically when radius changes."
        ),

        section("Putting it all together"),

        code_example("Product class with all method types",
            'class Product:\n'
            '    """E-commerce product with price management."""\n'
            '    tax_rate = 0.08    # class attribute\n'
            '\n'
            '    def __init__(self, name, base_price, stock=0):\n'
            '        self.name = name\n'
            '        self._base_price = base_price\n'
            '        self.stock = stock\n'
            '        self._discount = 0.0\n'
            '\n'
            '    # --- Instance methods ---\n'
            '    def apply_discount(self, percent):\n'
            '        """Apply a percentage discount (0-100)."""\n'
            '        self._discount = min(percent, 100) / 100\n'
            '\n'
            '    def restock(self, quantity):\n'
            '        self.stock += quantity\n'
            '\n'
            '    # --- Properties ---\n'
            '    @property\n'
            '    def price(self):\n'
            '        """Current price after discount."""\n'
            '        return round(self._base_price * (1 - self._discount), 2)\n'
            '\n'
            '    @property\n'
            '    def price_with_tax(self):\n'
            '        """Price including tax."""\n'
            '        return round(self.price * (1 + self.tax_rate), 2)\n'
            '\n'
            '    @property\n'
            '    def in_stock(self):\n'
            '        return self.stock > 0\n'
            '\n'
            '    # --- Class method ---\n'
            '    @classmethod\n'
            '    def from_dict(cls, data):\n'
            '        """Create a Product from a dictionary."""\n'
            '        return cls(data["name"], data["price"], data.get("stock", 0))\n'
            '\n'
            '    # --- Static method ---\n'
            '    @staticmethod\n'
            '    def format_price(amount):\n'
            '        return f"${amount:,.2f}"\n'
            '\n'
            '# Use all features:\n'
            'laptop = Product("Laptop", 999.99, stock=5)\n'
            'laptop.apply_discount(10)\n'
            'print(f"{laptop.name}: {Product.format_price(laptop.price)}")\n'
            'print(f"With tax: {Product.format_price(laptop.price_with_tax)}")\n'
            'print(f"In stock: {laptop.in_stock}")\n'
            '\n'
            '# From dictionary:\n'
            'mouse_data = {"name": "Mouse", "price": 29.99, "stock": 50}\n'
            'mouse = Product.from_dict(mouse_data)\n'
            'print(f"{mouse.name}: {Product.format_price(mouse.price)}")',
            output="Laptop: $899.99\nWith tax: $972.00\nIn stock: True\n"
            "Mouse: $29.99",
        ),

        try_it("Add a <code>@property</code> called <code>summary</code> to the Product class that returns a formatted string like <code>\"Laptop - $899.99 (5 in stock)\"</code>."),

        section("Exercises"),

        exercise("starter", "Temperature class",
            "Create a <code>Temperature</code> class that stores the value internally in Celsius. "
            "Add properties for <code>celsius</code>, <code>fahrenheit</code>, and <code>kelvin</code> "
            "(all with getters and setters). Setting any one should correctly convert when reading the others. "
            "Add a <code>@classmethod</code> called <code>from_fahrenheit(cls, f)</code>. "
            "Kelvin = Celsius + 273.15.",
            hint="All setters should convert to Celsius and store in <code>self._celsius</code>. "
            "All getters compute from <code>self._celsius</code>."
        ),

        exercise("medium", "Product with discount property",
            "Build a <code>Product</code> class with <code>name</code>, <code>base_price</code>, "
            "and a <code>discount</code> property (0.0 to 1.0). The setter validates the range. "
            "Add a read-only <code>final_price</code> property. Add <code>@classmethod from_csv_line(cls, line)</code> "
            "that parses <code>\"Laptop,999.99,0.1\"</code>. Add <code>@staticmethod compare(p1, p2)</code> "
            "that returns the cheaper product.",
            hint="<code>from_csv_line</code> does <code>parts = line.split(\",\")</code>, "
            "then <code>return cls(parts[0], float(parts[1]))</code> with discount applied after."
        ),

        exercise("real-world", "User profile with computed properties",
            "Build a <code>UserProfile</code> class with <code>first_name</code>, <code>last_name</code>, "
            "<code>email</code>, <code>birth_year</code>. Add properties: <code>full_name</code> (computed), "
            "<code>age</code> (computed from birth_year and current year 2024), "
            "<code>email</code> (validated setter that checks for @ and domain). "
            "Add <code>@classmethod from_dict(cls, data)</code> and <code>@staticmethod validate_email(email)</code>. "
            "Create users from a list of dictionaries and display their profiles.",
            hint="Store email as <code>self._email</code>. The setter calls "
            "<code>self.validate_email(value)</code> (the static method) and raises "
            "<code>ValueError</code> if invalid."
        ),

        mistakes([
            ("Forgetting <code>@property</code> before getter",
             "Without the decorator, it is just a regular method. Callers would need "
             "<code>obj.celsius()</code> with parentheses instead of <code>obj.celsius</code>."),
            ("Using <code>self.x</code> inside <code>@x.setter</code> without underscore",
             "If your property is <code>x</code> and the setter does <code>self.x = value</code>, "
             "you get infinite recursion. Store in <code>self._x</code>."),
            ("Making everything a property",
             "Only use properties for computed values or validated access. Simple data "
             "attributes are fine as plain attributes."),
            ("Confusing <code>@classmethod</code> and <code>@staticmethod</code>",
             "Use <code>@classmethod</code> when you need to create instances or access class attributes. "
             "Use <code>@staticmethod</code> for pure utility functions."),
        ]),

        pro_tips([
            "<strong>Properties let you start simple.</strong> Start with a plain attribute. "
            "If you later need validation or computation, change it to a property without "
            "breaking any existing code.",
            "<strong>Use <code>_underscore</code> prefix for private data.</strong> "
            "It signals to other developers: do not access this directly, use the property.",
            "<strong>Class methods for polymorphic construction.</strong> <code>cls(...)</code> "
            "works correctly with inheritance &mdash; subclasses get instances of themselves.",
            "<strong>Static methods for pure functions.</strong> If a function does not need "
            "<code>self</code> or <code>cls</code>, make it static. It can even be tested "
            "without creating an instance.",
        ]),

        recap([
            "Instance methods use <code>self</code> to access/modify object state",
            "<code>@classmethod</code> receives <code>cls</code> &mdash; use for factory methods",
            "<code>@staticmethod</code> receives neither &mdash; use for utility functions",
            "<code>@property</code> makes methods look like attributes",
            "Setters validate data; read-only properties have no setter",
            "Use <code>_underscore</code> prefix for backing attributes",
        ]),
    ])
