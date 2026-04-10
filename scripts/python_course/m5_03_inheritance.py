"""Module 5, Lesson 3: Inheritance & Polymorphism."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Inheritance &amp; Polymorphism",
            "Build class hierarchies where child classes inherit and specialize parent behavior. Write code that works with any compatible object.",
        ),

        why_it_matters(
            "<p>Inheritance is how you avoid rewriting the same code in similar classes. "
            "If <code>Dog</code> and <code>Cat</code> both have <code>name</code>, <code>age</code>, "
            "and <code>eat()</code>, define them once in an <code>Animal</code> parent class. "
            "Polymorphism means you can write a function that works with any animal &mdash; "
            "dog, cat, or any future type. This is how frameworks like Django and Flask "
            "let you extend their behavior.</p>"
        ),

        section("Basic inheritance"),

        concept("Parent and child classes",
            "<p>A <strong>child class</strong> inherits all attributes and methods from its "
            "<strong>parent class</strong>. It can add new ones or override existing ones:</p>"
        ),

        code_example("Simple inheritance",
            'class Animal:\n'
            '    """Base class for all animals."""\n'
            '\n'
            '    def __init__(self, name, species):\n'
            '        self.name = name\n'
            '        self.species = species\n'
            '\n'
            '    def speak(self):\n'
            '        return f"{self.name} makes a sound"\n'
            '\n'
            '    def describe(self):\n'
            '        return f"{self.name} ({self.species})"\n'
            '\n'
            '\n'
            'class Dog(Animal):    # Dog inherits from Animal\n'
            '    """A dog is an animal that barks."""\n'
            '\n'
            '    def __init__(self, name, breed):\n'
            '        super().__init__(name, "Dog")    # call parent __init__\n'
            '        self.breed = breed\n'
            '\n'
            '    def speak(self):    # override parent method\n'
            '        return f"{self.name} says Woof!"\n'
            '\n'
            '    def fetch(self):    # new method (only dogs have it)\n'
            '        return f"{self.name} fetches the ball!"\n'
            '\n'
            '\n'
            'class Cat(Animal):\n'
            '    def __init__(self, name, indoor=True):\n'
            '        super().__init__(name, "Cat")\n'
            '        self.indoor = indoor\n'
            '\n'
            '    def speak(self):\n'
            '        return f"{self.name} says Meow!"\n'
            '\n'
            '\n'
            'dog = Dog("Rex", "Labrador")\n'
            'cat = Cat("Whiskers")\n'
            '\n'
            'print(dog.describe())    # inherited from Animal\n'
            'print(dog.speak())       # overridden in Dog\n'
            'print(dog.fetch())       # only in Dog\n'
            'print(cat.speak())       # overridden in Cat\n'
            'print(cat.describe())    # inherited from Animal',
            output="Rex (Dog)\nRex says Woof!\nRex fetches the ball!\n"
            "Whiskers says Meow!\nWhiskers (Cat)",
            explanation="<code>Dog</code> inherits <code>describe()</code> from <code>Animal</code> "
            "but overrides <code>speak()</code> with its own version. "
            "<code>super().__init__()</code> calls the parent's constructor."
        ),

        section("The <code>super()</code> function"),

        concept("Calling parent methods",
            "<p><code>super()</code> gives you access to the parent class. Use it to extend "
            "(not just replace) parent behavior:</p>"
        ),

        code_example("Extending parent methods with super()",
            'class Employee:\n'
            '    def __init__(self, name, salary):\n'
            '        self.name = name\n'
            '        self.salary = salary\n'
            '\n'
            '    def get_info(self):\n'
            '        return f"{self.name}: ${self.salary:,.2f}/year"\n'
            '\n'
            '    def annual_bonus(self):\n'
            '        return self.salary * 0.05\n'
            '\n'
            '\n'
            'class Manager(Employee):\n'
            '    def __init__(self, name, salary, department):\n'
            '        super().__init__(name, salary)    # reuse parent init\n'
            '        self.department = department\n'
            '        self.team = []\n'
            '\n'
            '    def get_info(self):\n'
            '        base = super().get_info()    # get parent info\n'
            '        return f"{base} | Dept: {self.department} | Team: {len(self.team)}"\n'
            '\n'
            '    def annual_bonus(self):\n'
            '        base_bonus = super().annual_bonus()    # 5% from parent\n'
            '        team_bonus = len(self.team) * 1000     # extra per team member\n'
            '        return base_bonus + team_bonus\n'
            '\n'
            '    def add_to_team(self, employee):\n'
            '        self.team.append(employee)\n'
            '\n'
            '\n'
            'emp = Employee("Alice", 80000)\n'
            'mgr = Manager("Bob", 120000, "Engineering")\n'
            'mgr.add_to_team(emp)\n'
            'mgr.add_to_team(Employee("Charlie", 75000))\n'
            '\n'
            'print(emp.get_info())\n'
            'print(f"Bonus: ${emp.annual_bonus():,.2f}")\n'
            'print(mgr.get_info())\n'
            'print(f"Bonus: ${mgr.annual_bonus():,.2f}")',
            output="Alice: $80,000.00/year\nBonus: $4,000.00\n"
            "Bob: $120,000.00/year | Dept: Engineering | Team: 2\n"
            "Bonus: $8,000.00",
        ),

        section("Polymorphism"),

        concept("Same interface, different behavior",
            "<p><strong>Polymorphism</strong> means you can write code that works with any object "
            "that has the right methods, regardless of its specific type:</p>"
        ),

        code_example("Polymorphism in action",
            'class Shape:\n'
            '    """Base class for shapes."""\n'
            '    def area(self):\n'
            '        raise NotImplementedError("Subclasses must implement area()")\n'
            '\n'
            '    def perimeter(self):\n'
            '        raise NotImplementedError("Subclasses must implement perimeter()")\n'
            '\n'
            '    def describe(self):\n'
            '        return (f"{self.__class__.__name__}: "\n'
            '                f"area={self.area():.2f}, perimeter={self.perimeter():.2f}")\n'
            '\n'
            '\n'
            'class Circle(Shape):\n'
            '    def __init__(self, radius):\n'
            '        self.radius = radius\n'
            '\n'
            '    def area(self):\n'
            '        return 3.14159 * self.radius ** 2\n'
            '\n'
            '    def perimeter(self):\n'
            '        return 2 * 3.14159 * self.radius\n'
            '\n'
            '\n'
            'class Rectangle(Shape):\n'
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
            '\n'
            'class Triangle(Shape):\n'
            '    def __init__(self, a, b, c):\n'
            '        self.a, self.b, self.c = a, b, c\n'
            '\n'
            '    def area(self):\n'
            '        s = (self.a + self.b + self.c) / 2\n'
            '        return (s * (s-self.a) * (s-self.b) * (s-self.c)) ** 0.5\n'
            '\n'
            '    def perimeter(self):\n'
            '        return self.a + self.b + self.c\n'
            '\n'
            '\n'
            '# Polymorphism: same code works with any Shape:\n'
            'shapes = [Circle(5), Rectangle(10, 4), Triangle(3, 4, 5)]\n'
            '\n'
            'for shape in shapes:\n'
            '    print(shape.describe())\n'
            '\n'
            '# Find the largest shape:\n'
            'largest = max(shapes, key=lambda s: s.area())\n'
            'print(f"\\nLargest: {largest.describe()}")',
            output="Circle: area=78.54, perimeter=31.42\n"
            "Rectangle: area=40.00, perimeter=28.00\n"
            "Triangle: area=6.00, perimeter=12.00\n\n"
            "Largest: Circle: area=78.54, perimeter=31.42",
            explanation="The <code>for</code> loop and <code>max()</code> do not care what type "
            "each shape is. They just call <code>.area()</code> and <code>.describe()</code>. "
            "This is polymorphism &mdash; different types, same interface."
        ),

        section("isinstance() and type checking"),

        code_example("Checking object types",
            'class Animal:\n'
            '    pass\n'
            '\n'
            'class Dog(Animal):\n'
            '    pass\n'
            '\n'
            'class Cat(Animal):\n'
            '    pass\n'
            '\n'
            'rex = Dog()\n'
            '\n'
            '# isinstance checks the whole hierarchy:\n'
            'print(f"rex is Dog: {isinstance(rex, Dog)}")\n'
            'print(f"rex is Animal: {isinstance(rex, Animal)}")\n'
            'print(f"rex is Cat: {isinstance(rex, Cat)}")\n'
            '\n'
            '# type checks exact type only:\n'
            'print(f"type is Dog: {type(rex) is Dog}")\n'
            'print(f"type is Animal: {type(rex) is Animal}")',
            output="rex is Dog: True\nrex is Animal: True\n"
            "rex is Cat: False\ntype is Dog: True\ntype is Animal: False",
            explanation="<code>isinstance()</code> returns True for the exact class AND all parents. "
            "<code>type()</code> checks the exact class only. Prefer <code>isinstance()</code> "
            "in most cases."
        ),

        section("Abstract base classes"),

        code_example("Using abc for formal interfaces",
            'from abc import ABC, abstractmethod\n'
            '\n'
            'class PaymentProcessor(ABC):\n'
            '    """All payment processors must implement these methods."""\n'
            '\n'
            '    @abstractmethod\n'
            '    def charge(self, amount):\n'
            '        pass\n'
            '\n'
            '    @abstractmethod\n'
            '    def refund(self, transaction_id, amount):\n'
            '        pass\n'
            '\n'
            '    def log(self, message):\n'
            '        """Concrete method available to all subclasses."""\n'
            '        print(f"[{self.__class__.__name__}] {message}")\n'
            '\n'
            '\n'
            'class StripeProcessor(PaymentProcessor):\n'
            '    def charge(self, amount):\n'
            '        self.log(f"Charging ${amount:.2f} via Stripe")\n'
            '        return {"id": "txn_123", "amount": amount}\n'
            '\n'
            '    def refund(self, transaction_id, amount):\n'
            '        self.log(f"Refunding ${amount:.2f} for {transaction_id}")\n'
            '        return True\n'
            '\n'
            '\n'
            '# Cannot instantiate abstract class:\n'
            'try:\n'
            '    p = PaymentProcessor()\n'
            'except TypeError as e:\n'
            '    print(f"Error: {e}")\n'
            '\n'
            '# Can instantiate concrete class:\n'
            'stripe = StripeProcessor()\n'
            'result = stripe.charge(49.99)\n'
            'print(f"Transaction: {result}")\n'
            'stripe.refund("txn_123", 49.99)',
            output="Error: Can't instantiate abstract class PaymentProcessor "
            "without an implementation for abstract methods 'charge', 'refund'\n"
            "[StripeProcessor] Charging $49.99 via Stripe\n"
            "Transaction: {'id': 'txn_123', 'amount': 49.99}\n"
            "[StripeProcessor] Refunding $49.99 for txn_123",
            explanation="Abstract classes define the interface. Concrete subclasses must implement "
            "all abstract methods. This is how you enforce a contract in a class hierarchy."
        ),

        try_it("Create a <code>Square</code> class that inherits from <code>Rectangle</code>. Its <code>__init__</code> should take one <code>side</code> parameter and pass it as both width and height to <code>super().__init__</code>."),

        section("Exercises"),

        exercise("starter", "Shape hierarchy",
            "Create a <code>Shape</code> base class with an abstract <code>area()</code> method. "
            "Implement <code>Circle</code>, <code>Rectangle</code>, and <code>Triangle</code> subclasses. "
            "Create a list of mixed shapes and print each one's area. Find and print the shape "
            "with the smallest area.",
            hint="Use <code>from abc import ABC, abstractmethod</code>. "
            "Triangle area with sides a, b, c: use Heron's formula."
        ),

        exercise("medium", "Employee types",
            "Create an <code>Employee</code> base class with <code>name</code>, <code>base_salary</code>, "
            "and an abstract <code>calculate_pay()</code> method. Create subclasses: "
            "<code>FullTime</code> (gets full salary + bonus), <code>PartTime</code> (hourly rate * hours), "
            "and <code>Contractor</code> (daily rate * days). Write a <code>process_payroll(employees)</code> "
            "function that calculates and prints pay for a mixed list of employees.",
            hint="Each subclass stores its own extra data (hours, days, bonus) and implements "
            "<code>calculate_pay()</code> differently."
        ),

        exercise("real-world", "Notification system",
            "Build a notification system with a <code>Notification</code> base class and subclasses "
            "<code>EmailNotification</code>, <code>SMSNotification</code>, and <code>PushNotification</code>. "
            "Each has a <code>send(user, message)</code> method that formats the message differently. "
            "Create a <code>NotificationService</code> class that accepts a list of notification channels "
            "and broadcasts messages to all of them. Test by sending a message through all three channels.",
            hint="<code>NotificationService.__init__(self, channels)</code> stores the list. "
            "<code>broadcast(user, message)</code> loops through channels calling <code>channel.send(user, message)</code>."
        ),

        mistakes([
            ("Forgetting to call <code>super().__init__()</code>",
             "If the parent's <code>__init__</code> sets important attributes, the child must call it. "
             "Otherwise those attributes will be missing."),
            ("Overriding without calling <code>super()</code>",
             "If you want to extend behavior (not replace it), call <code>super().method()</code> "
             "inside your override."),
            ("Deep inheritance hierarchies",
             "More than 2-3 levels of inheritance gets confusing fast. Prefer composition "
             "(has-a) over deep inheritance (is-a)."),
            ("Checking types instead of using polymorphism",
             "Code like <code>if isinstance(shape, Circle): ...</code> defeats the purpose. "
             "Use polymorphic method calls instead."),
        ]),

        pro_tips([
            "<strong>Composition over inheritance.</strong> Instead of making <code>Car</code> inherit "
            "from <code>Engine</code>, give <code>Car</code> an <code>engine</code> attribute. "
            "A car HAS an engine, it IS NOT an engine.",
            "<strong>Keep hierarchies shallow.</strong> Parent -> Child is fine. "
            "Parent -> Child -> Grandchild -> GreatGrandchild is a design smell.",
            "<strong>Use abstract classes for contracts.</strong> They make it clear what "
            "subclasses must implement, and Python enforces it at instantiation time.",
            "<strong>The Liskov Substitution Principle:</strong> a subclass should be usable "
            "anywhere its parent is used without breaking anything.",
        ]),

        recap([
            "Child classes inherit attributes and methods from parent classes",
            "<code>super()</code> calls parent methods",
            "Override methods to specialize behavior",
            "Polymorphism: same code works with different types",
            "<code>isinstance()</code> checks type hierarchy",
            "Abstract classes define required interfaces",
            "Prefer composition over deep inheritance",
        ]),
    ])
