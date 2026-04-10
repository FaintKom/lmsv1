"""Module 5, Lesson 1: Classes & Objects."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Classes &amp; Objects",
            "Group data and behavior into objects. Classes are blueprints; objects are the things built from them.",
        ),

        why_it_matters(
            "<p>Almost every real Python program uses objects. When you write <code>\"hello\".upper()</code>, "
            "you are calling a method on a string object. Django models, Flask routes, pandas DataFrames "
            "&mdash; all classes. Understanding OOP lets you model real-world things (users, products, "
            "transactions) as code and build systems that are organized and maintainable.</p>"
        ),

        section("Your first class"),

        concept("Classes are blueprints",
            "<p>A <strong>class</strong> defines a new type of object. It bundles "
            "<strong>data</strong> (attributes) and <strong>behavior</strong> (methods) together. "
            "An <strong>object</strong> (or instance) is one specific thing built from that blueprint:</p>"
        ),

        code_example("Defining a simple class",
            'class Dog:\n'
            '    """A simple dog class."""\n'
            '\n'
            '    def __init__(self, name, breed, age):\n'
            '        """Initialize a new Dog instance."""\n'
            '        self.name = name\n'
            '        self.breed = breed\n'
            '        self.age = age\n'
            '\n'
            '# Create instances (objects):\n'
            'rex = Dog("Rex", "German Shepherd", 5)\n'
            'luna = Dog("Luna", "Golden Retriever", 3)\n'
            '\n'
            'print(f"{rex.name} is a {rex.age}-year-old {rex.breed}")\n'
            'print(f"{luna.name} is a {luna.age}-year-old {luna.breed}")',
            output="Rex is a 5-year-old German Shepherd\n"
            "Luna is a 3-year-old Golden Retriever",
            explanation="<code>__init__</code> is called automatically when you create an instance. "
            "<code>self</code> refers to the specific object being created. "
            "Each dog has its own <code>name</code>, <code>breed</code>, and <code>age</code>."
        ),

        section("The <code>__init__</code> method"),

        concept("The constructor",
            "<p><code>__init__</code> (short for initialize) runs every time you create a new object. "
            "It sets up the initial state by assigning attributes to <code>self</code>:</p>"
            "<ul>"
            "<li><code>self.name = name</code> creates an <strong>instance attribute</strong></li>"
            "<li><code>self</code> is always the first parameter in methods &mdash; Python passes it automatically</li>"
            "<li>You never call <code>__init__</code> directly &mdash; Python calls it when you write <code>Dog(...)</code></li>"
            "</ul>"
        ),

        code_example("__init__ with defaults and validation",
            'class BankAccount:\n'
            '    """A bank account with validation."""\n'
            '\n'
            '    def __init__(self, owner, balance=0.0):\n'
            '        self.owner = owner\n'
            '        if balance < 0:\n'
            '            raise ValueError("Initial balance cannot be negative")\n'
            '        self.balance = balance\n'
            '        self.transactions = []    # empty list to track history\n'
            '\n'
            'acct = BankAccount("Alice", 1000)\n'
            'print(f"{acct.owner}: ${acct.balance:.2f}")\n'
            'print(f"Transactions: {acct.transactions}")\n'
            '\n'
            '# Default balance:\n'
            'new_acct = BankAccount("Bob")\n'
            'print(f"{new_acct.owner}: ${new_acct.balance:.2f}")\n'
            '\n'
            '# Invalid balance:\n'
            'try:\n'
            '    bad = BankAccount("Eve", -500)\n'
            'except ValueError as e:\n'
            '    print(f"Error: {e}")',
            output="Alice: $1000.00\nTransactions: []\nBob: $0.00\n"
            "Error: Initial balance cannot be negative",
            explanation="Validate data in <code>__init__</code> to prevent invalid objects from being created. "
            "Attributes like <code>self.transactions = []</code> give each instance its own list."
        ),

        section("Adding methods"),

        concept("Methods are functions on objects",
            "<p>A <strong>method</strong> is a function defined inside a class. "
            "It always takes <code>self</code> as its first parameter, giving it access "
            "to the object's attributes:</p>"
        ),

        code_example("Methods with self",
            'class BankAccount:\n'
            '    def __init__(self, owner, balance=0.0):\n'
            '        self.owner = owner\n'
            '        self.balance = balance\n'
            '        self.transactions = []\n'
            '\n'
            '    def deposit(self, amount):\n'
            '        """Add money to the account."""\n'
            '        if amount <= 0:\n'
            '            print("Deposit amount must be positive")\n'
            '            return\n'
            '        self.balance += amount\n'
            '        self.transactions.append(f"+${amount:.2f}")\n'
            '        print(f"Deposited ${amount:.2f}. Balance: ${self.balance:.2f}")\n'
            '\n'
            '    def withdraw(self, amount):\n'
            '        """Remove money from the account."""\n'
            '        if amount <= 0:\n'
            '            print("Withdrawal amount must be positive")\n'
            '            return\n'
            '        if amount > self.balance:\n'
            '            print(f"Insufficient funds. Balance: ${self.balance:.2f}")\n'
            '            return\n'
            '        self.balance -= amount\n'
            '        self.transactions.append(f"-${amount:.2f}")\n'
            '        print(f"Withdrew ${amount:.2f}. Balance: ${self.balance:.2f}")\n'
            '\n'
            '    def get_statement(self):\n'
            '        """Print account statement."""\n'
            '        print(f"\\n--- Statement for {self.owner} ---")\n'
            '        for t in self.transactions:\n'
            '            print(f"  {t}")\n'
            '        print(f"  Balance: ${self.balance:.2f}")\n'
            '\n'
            'acct = BankAccount("Alice", 500)\n'
            'acct.deposit(200)\n'
            'acct.withdraw(50)\n'
            'acct.withdraw(1000)\n'
            'acct.get_statement()',
            output="Deposited $200.00. Balance: $700.00\n"
            "Withdrew $50.00. Balance: $650.00\n"
            "Insufficient funds. Balance: $650.00\n\n"
            "--- Statement for Alice ---\n"
            "  +$200.00\n  -$50.00\n  Balance: $650.00",
            explanation="Methods modify the object's state through <code>self</code>. "
            "Each <code>BankAccount</code> instance has its own balance and transaction history."
        ),

        section("Attributes vs variables"),

        concept("Instance state is independent",
            "<p>Each object has its own copy of instance attributes. Changing one object "
            "does not affect another:</p>"
        ),

        code_example("Independent instance state",
            'class Counter:\n'
            '    def __init__(self, name):\n'
            '        self.name = name\n'
            '        self.count = 0\n'
            '\n'
            '    def increment(self):\n'
            '        self.count += 1\n'
            '\n'
            '    def display(self):\n'
            '        print(f"{self.name}: {self.count}")\n'
            '\n'
            '# Two independent counters:\n'
            'page_views = Counter("Page Views")\n'
            'api_calls = Counter("API Calls")\n'
            '\n'
            'page_views.increment()\n'
            'page_views.increment()\n'
            'page_views.increment()\n'
            'api_calls.increment()\n'
            '\n'
            'page_views.display()\n'
            'api_calls.display()',
            output="Page Views: 3\nAPI Calls: 1",
            explanation="<code>page_views.count</code> and <code>api_calls.count</code> are "
            "completely separate variables that happen to have the same name."
        ),

        section("Class attributes vs instance attributes"),

        code_example("Shared vs per-instance data",
            'class Employee:\n'
            '    # Class attribute -- shared by ALL instances:\n'
            '    company = "Acme Corp"\n'
            '    employee_count = 0\n'
            '\n'
            '    def __init__(self, name, role):\n'
            '        # Instance attributes -- unique to each instance:\n'
            '        self.name = name\n'
            '        self.role = role\n'
            '        Employee.employee_count += 1\n'
            '\n'
            '    def display(self):\n'
            '        print(f"{self.name} ({self.role}) at {self.company}")\n'
            '\n'
            'alice = Employee("Alice", "Engineer")\n'
            'bob = Employee("Bob", "Designer")\n'
            '\n'
            'alice.display()\n'
            'bob.display()\n'
            'print(f"Total employees: {Employee.employee_count}")',
            output="Alice (Engineer) at Acme Corp\n"
            "Bob (Designer) at Acme Corp\n"
            "Total employees: 2",
            explanation="<code>company</code> and <code>employee_count</code> are defined on the class, "
            "so they are shared. <code>name</code> and <code>role</code> are on <code>self</code>, "
            "so each instance has its own."
        ),

        section("A bigger example: Rectangle"),

        code_example("Rectangle class with methods",
            'class Rectangle:\n'
            '    """A rectangle with width and height."""\n'
            '\n'
            '    def __init__(self, width, height):\n'
            '        self.width = width\n'
            '        self.height = height\n'
            '\n'
            '    def area(self):\n'
            '        return self.width * self.height\n'
            '\n'
            '    def perimeter(self):\n'
            '        return 2 * (self.width + self.height)\n'
            '\n'
            '    def is_square(self):\n'
            '        return self.width == self.height\n'
            '\n'
            '    def scale(self, factor):\n'
            '        """Scale the rectangle by a factor."""\n'
            '        self.width *= factor\n'
            '        self.height *= factor\n'
            '\n'
            '    def describe(self):\n'
            '        shape = "square" if self.is_square() else "rectangle"\n'
            '        print(f"{self.width}x{self.height} {shape} "\n'
            '              f"(area={self.area()}, perimeter={self.perimeter()})")\n'
            '\n'
            'r = Rectangle(10, 5)\n'
            'r.describe()\n'
            'r.scale(2)\n'
            'r.describe()\n'
            '\n'
            's = Rectangle(7, 7)\n'
            's.describe()',
            output="10x5 rectangle (area=50, perimeter=30)\n"
            "20x10 rectangle (area=200, perimeter=60)\n"
            "7x7 square (area=49, perimeter=28)",
        ),

        try_it("Create a <code>Circle</code> class with a <code>radius</code> attribute and methods for <code>area()</code> and <code>circumference()</code>. Use <code>3.14159</code> for pi."),

        section("Exercises"),

        exercise("starter", "Dog class with tricks",
            "Create a <code>Dog</code> class with <code>name</code>, <code>breed</code>, and "
            "<code>age</code> attributes. Add methods: <code>bark()</code> that prints a bark message, "
            "<code>learn_trick(trick)</code> that adds to a tricks list, and "
            "<code>show_tricks()</code> that prints all learned tricks. Create 2 dogs, teach them "
            "different tricks, and display them.",
            hint="Initialize <code>self.tricks = []</code> in <code>__init__</code>. "
            "<code>learn_trick</code> does <code>self.tricks.append(trick)</code>."
        ),

        exercise("medium", "BankAccount with transfer",
            "Extend the <code>BankAccount</code> class with a <code>transfer(self, other, amount)</code> "
            "method that moves money from one account to another. Add an <code>interest_rate</code> "
            "class attribute set to <code>0.02</code>, and an <code>apply_interest()</code> method "
            "that adds interest to the balance. Create 3 accounts, perform transfers, apply interest, "
            "and print statements.",
            hint="<code>transfer</code> calls <code>self.withdraw(amount)</code> and "
            "<code>other.deposit(amount)</code>. Check that withdrawal succeeds before depositing."
        ),

        exercise("real-world", "Rectangle toolbox",
            "Build a <code>Rectangle</code> class with full functionality: <code>area()</code>, "
            "<code>perimeter()</code>, <code>is_square()</code>, <code>diagonal()</code> (use Pythagorean theorem), "
            "<code>scale(factor)</code>, and <code>fits_inside(other)</code> that checks if this rectangle "
            "fits inside another (considering rotation). Create a list of 5 rectangles, find the one "
            "with the largest area, and check which ones fit inside it.",
            hint="For <code>fits_inside</code>, check both orientations: "
            "<code>(self.width <= other.width and self.height <= other.height) or "
            "(self.height <= other.width and self.width <= other.height)</code>."
        ),

        mistakes([
            ("Forgetting <code>self</code> in method definitions",
             "Every method must have <code>self</code> as its first parameter. "
             "Without it, you get <code>TypeError: method takes 0 positional arguments but 1 was given</code>."),
            ("Using <code>self</code> outside a class",
             "<code>self</code> only has meaning inside class methods. It is not a keyword &mdash; "
             "it is just a convention for the first parameter."),
            ("Confusing class attributes and instance attributes",
             "Class attributes are shared. If you assign a mutable class attribute like a list, "
             "all instances share the same list. Use <code>self</code> in <code>__init__</code> for per-instance data."),
            ("Calling methods without parentheses",
             "<code>rect.area</code> returns the method object. <code>rect.area()</code> calls it and "
             "returns the result."),
        ]),

        pro_tips([
            "<strong>Keep <code>__init__</code> simple.</strong> Initialize attributes and validate input. "
            "Do not do heavy computation or I/O in the constructor.",
            "<strong>Name classes in PascalCase.</strong> <code>BankAccount</code>, <code>UserProfile</code>, "
            "<code>HttpRequest</code>. This is a universal Python convention.",
            "<strong>Each class = one concept.</strong> A <code>User</code> class should not also handle "
            "database queries. Separate concerns into different classes.",
            "<strong>Prefer returning values over printing.</strong> Methods like <code>area()</code> should "
            "return the value. Let the caller decide how to display it.",
        ]),

        recap([
            "Classes are blueprints; objects are instances",
            "<code>__init__</code> initializes each new instance",
            "<code>self</code> refers to the current instance",
            "Instance attributes are unique to each object",
            "Class attributes are shared across all instances",
            "Methods are functions that operate on instance data",
            "PascalCase for class names, snake_case for methods",
        ]),
    ])
