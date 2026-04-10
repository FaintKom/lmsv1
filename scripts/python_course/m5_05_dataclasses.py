"""Module 5, Lesson 5: Dataclasses & Type Hints."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Dataclasses &amp; Type Hints",
            "Let Python generate boilerplate for you. Dataclasses create __init__, __repr__, __eq__, and more automatically.",
        ),

        why_it_matters(
            "<p>Most classes exist just to hold data: a user has a name, email, and age. "
            "Writing <code>__init__</code>, <code>__repr__</code>, and <code>__eq__</code> for every "
            "data class is tedious and error-prone. Python's <code>@dataclass</code> decorator "
            "generates all of this from simple type-annotated fields. Combined with type hints, "
            "your code becomes self-documenting and IDE-friendly.</p>"
        ),

        section("Type hints basics"),

        concept("Annotating your code",
            "<p>Type hints tell Python (and your IDE) what types variables and parameters should be. "
            "They do not enforce anything at runtime &mdash; they are documentation that tools can check:</p>"
        ),

        code_example("Basic type hints",
            '# Variable annotations:\n'
            'name: str = "Alice"\n'
            'age: int = 30\n'
            'balance: float = 1049.99\n'
            'is_active: bool = True\n'
            '\n'
            '# Function annotations:\n'
            'def greet(name: str, excited: bool = False) -> str:\n'
            '    """Greet someone by name."""\n'
            '    if excited:\n'
            '        return f"HEY {name.upper()}!!!"\n'
            '    return f"Hello, {name}"\n'
            '\n'
            'print(greet("Alice"))\n'
            'print(greet("Bob", excited=True))',
            output="Hello, Alice\nHEY BOB!!!",
            explanation="The <code>-> str</code> after the parentheses means the function returns a string. "
            "Type hints make your code easier to understand and let IDEs provide better autocomplete."
        ),

        code_example("Common type hint patterns",
            'from typing import Optional\n'
            '\n'
            '# Lists with element types:\n'
            'scores: list[int] = [85, 92, 78]\n'
            'names: list[str] = ["Alice", "Bob"]\n'
            '\n'
            '# Dictionaries with key/value types:\n'
            'user: dict[str, str] = {"name": "Alice", "email": "alice@co.com"}\n'
            'grades: dict[str, int] = {"math": 95, "english": 88}\n'
            '\n'
            '# Optional (could be None):\n'
            'middle_name: Optional[str] = None\n'
            'nickname: str | None = None   # Python 3.10+ syntax\n'
            '\n'
            '# Tuples:\n'
            'point: tuple[float, float] = (3.14, 2.72)\n'
            'rgb: tuple[int, int, int] = (255, 128, 0)\n'
            '\n'
            '# Function example with complex types:\n'
            'def filter_passing(grades: dict[str, int], threshold: int = 70) -> list[str]:\n'
            '    """Return names of students who passed."""\n'
            '    return [name for name, grade in grades.items() if grade >= threshold]\n'
            '\n'
            'print(filter_passing({"Alice": 95, "Bob": 60, "Charlie": 78}))',
            output="['Alice', 'Charlie']",
            explanation="Type hints in Python 3.9+ use built-in types directly: <code>list[str]</code>, "
            "<code>dict[str, int]</code>. For <code>None</code>-able values, use <code>Optional</code> "
            "or the <code>X | None</code> syntax."
        ),

        section("Dataclasses"),

        concept("The <code>@dataclass</code> decorator",
            "<p>Import <code>dataclass</code> from the <code>dataclasses</code> module. "
            "Annotate your fields with types, and Python generates <code>__init__</code>, "
            "<code>__repr__</code>, and <code>__eq__</code> automatically:</p>"
        ),

        code_example("Your first dataclass",
            'from dataclasses import dataclass\n'
            '\n'
            '# WITHOUT dataclass (lots of boilerplate):\n'
            'class UserOld:\n'
            '    def __init__(self, name, email, age):\n'
            '        self.name = name\n'
            '        self.email = email\n'
            '        self.age = age\n'
            '    def __repr__(self):\n'
            '        return f"User({self.name!r}, {self.email!r}, {self.age!r})"\n'
            '    def __eq__(self, other):\n'
            '        return (self.name, self.email, self.age) == \\\n'
            '               (other.name, other.email, other.age)\n'
            '\n'
            '# WITH dataclass (clean and concise):\n'
            '@dataclass\n'
            'class User:\n'
            '    name: str\n'
            '    email: str\n'
            '    age: int\n'
            '\n'
            'alice = User("Alice", "alice@co.com", 30)\n'
            'bob = User("Bob", "bob@co.com", 25)\n'
            'alice2 = User("Alice", "alice@co.com", 30)\n'
            '\n'
            'print(alice)              # auto __repr__\n'
            'print(alice == alice2)    # auto __eq__\n'
            'print(alice == bob)',
            output="User(name='Alice', email='alice@co.com', age=30)\n"
            "True\nFalse",
            explanation="Three lines of field definitions replace 10+ lines of boilerplate. "
            "The dataclass decorator generates <code>__init__</code>, <code>__repr__</code>, "
            "and <code>__eq__</code> based on the annotated fields."
        ),

        section("Default values and field()"),

        code_example("Defaults and field configuration",
            'from dataclasses import dataclass, field\n'
            'from typing import Optional\n'
            '\n'
            '@dataclass\n'
            'class Product:\n'
            '    name: str\n'
            '    price: float\n'
            '    category: str = "general"              # simple default\n'
            '    tags: list[str] = field(default_factory=list)  # mutable default\n'
            '    stock: int = 0\n'
            '    description: Optional[str] = None\n'
            '\n'
            'laptop = Product("Laptop", 999.99, "electronics", tags=["sale", "new"])\n'
            'book = Product("Python Guide", 39.99)\n'
            '\n'
            'print(laptop)\n'
            'print(book)\n'
            'print(f"Laptop tags: {laptop.tags}")\n'
            'print(f"Book tags: {book.tags}")\n'
            '\n'
            '# Tags are independent (not shared):\n'
            'book.tags.append("bestseller")\n'
            'print(f"Laptop tags: {laptop.tags}")\n'
            'print(f"Book tags: {book.tags}")',
            output="Product(name='Laptop', price=999.99, category='electronics', "
            "tags=['sale', 'new'], stock=0, description=None)\n"
            "Product(name='Python Guide', price=39.99, category='general', "
            "tags=[], stock=0, description=None)\n"
            "Laptop tags: ['sale', 'new']\nBook tags: []\n"
            "Laptop tags: ['sale', 'new']\nBook tags: ['bestseller']",
            explanation="Use <code>field(default_factory=list)</code> for mutable defaults (lists, dicts, sets). "
            "This creates a new list for each instance, avoiding the shared mutable default bug."
        ),

        section("Dataclass options"),

        code_example("Frozen, ordered, and post_init",
            'from dataclasses import dataclass, field\n'
            '\n'
            '# Frozen = immutable (like a tuple)\n'
            '@dataclass(frozen=True)\n'
            'class Point:\n'
            '    x: float\n'
            '    y: float\n'
            '\n'
            'p = Point(3.0, 4.0)\n'
            'print(p)\n'
            'try:\n'
            '    p.x = 5.0\n'
            'except AttributeError as e:\n'
            '    print(f"Frozen! {e}")\n'
            '\n'
            '# Can be used in sets and as dict keys:\n'
            'points = {Point(0, 0), Point(1, 1), Point(0, 0)}\n'
            'print(f"Unique points: {points}")\n'
            '\n'
            '\n'
            '# order=True adds comparison operators:\n'
            '@dataclass(order=True)\n'
            'class Version:\n'
            '    major: int\n'
            '    minor: int\n'
            '    patch: int\n'
            '\n'
            'versions = [Version(2, 1, 0), Version(1, 9, 5), Version(2, 0, 3)]\n'
            'versions.sort()\n'
            'print(f"Sorted: {versions}")\n'
            '\n'
            '\n'
            '# __post_init__ for computed fields:\n'
            '@dataclass\n'
            'class Rectangle:\n'
            '    width: float\n'
            '    height: float\n'
            '    area: float = field(init=False)    # not in __init__\n'
            '\n'
            '    def __post_init__(self):\n'
            '        self.area = self.width * self.height\n'
            '\n'
            'r = Rectangle(10, 5)\n'
            'print(f"Rectangle: {r}")',
            output="Point(x=3.0, y=4.0)\nFrozen! cannot assign to field 'x'\n"
            "Unique points: {Point(x=0, y=0), Point(x=1, y=1)}\n"
            "Sorted: [Version(major=1, minor=9, patch=5), "
            "Version(major=2, minor=0, patch=3), Version(major=2, minor=1, patch=0)]\n"
            "Rectangle: Rectangle(width=10, height=5, area=50)",
            explanation="<code>frozen=True</code> makes instances immutable and hashable. "
            "<code>order=True</code> generates comparison operators. "
            "<code>__post_init__</code> runs after <code>__init__</code> for computed fields."
        ),

        section("Dataclasses with methods"),

        code_example("Full-featured dataclass",
            'from dataclasses import dataclass, field\n'
            'from typing import Optional\n'
            '\n'
            '@dataclass\n'
            'class Student:\n'
            '    name: str\n'
            '    student_id: str\n'
            '    grades: list[int] = field(default_factory=list)\n'
            '    email: Optional[str] = None\n'
            '\n'
            '    @property\n'
            '    def gpa(self) -> float:\n'
            '        """Calculate GPA on a 4.0 scale."""\n'
            '        if not self.grades:\n'
            '            return 0.0\n'
            '        avg = sum(self.grades) / len(self.grades)\n'
            '        return round(min(avg / 25, 4.0), 2)\n'
            '\n'
            '    @property\n'
            '    def letter_grade(self) -> str:\n'
            '        gpa = self.gpa\n'
            '        if gpa >= 3.7: return "A"\n'
            '        if gpa >= 3.0: return "B"\n'
            '        if gpa >= 2.0: return "C"\n'
            '        if gpa >= 1.0: return "D"\n'
            '        return "F"\n'
            '\n'
            '    def add_grade(self, grade: int) -> None:\n'
            '        if 0 <= grade <= 100:\n'
            '            self.grades.append(grade)\n'
            '        else:\n'
            '            raise ValueError(f"Grade must be 0-100, got {grade}")\n'
            '\n'
            '    def summary(self) -> str:\n'
            '        return (f"{self.name} ({self.student_id}) - "\n'
            '                f"GPA: {self.gpa} ({self.letter_grade}), "\n'
            '                f"Courses: {len(self.grades)}")\n'
            '\n'
            '\n'
            'alice = Student("Alice", "STU001")\n'
            'alice.add_grade(92)\n'
            'alice.add_grade(88)\n'
            'alice.add_grade(95)\n'
            '\n'
            'bob = Student("Bob", "STU002", grades=[70, 65, 78])\n'
            '\n'
            'print(alice)\n'
            'print(alice.summary())\n'
            'print(bob.summary())',
            output="Student(name='Alice', student_id='STU001', grades=[92, 88, 95], email=None)\n"
            "Alice (STU001) - GPA: 3.67 (B), Courses: 3\n"
            "Bob (STU002) - GPA: 2.84 (C), Courses: 3",
            explanation="Dataclasses work perfectly with properties, regular methods, and "
            "class methods. The decorator just handles the boilerplate &mdash; you add the behavior."
        ),

        section("API response model example"),

        code_example("Modeling API responses",
            'from dataclasses import dataclass, field\n'
            'from typing import Optional\n'
            '\n'
            '@dataclass\n'
            'class APIResponse:\n'
            '    status_code: int\n'
            '    data: dict = field(default_factory=dict)\n'
            '    error: Optional[str] = None\n'
            '    headers: dict[str, str] = field(default_factory=dict)\n'
            '\n'
            '    @property\n'
            '    def ok(self) -> bool:\n'
            '        return 200 <= self.status_code < 300\n'
            '\n'
            '    @property\n'
            '    def is_error(self) -> bool:\n'
            '        return self.status_code >= 400\n'
            '\n'
            '    @classmethod\n'
            '    def success(cls, data: dict) -> "APIResponse":\n'
            '        return cls(status_code=200, data=data)\n'
            '\n'
            '    @classmethod\n'
            '    def not_found(cls, message: str = "Not found") -> "APIResponse":\n'
            '        return cls(status_code=404, error=message)\n'
            '\n'
            '    @classmethod\n'
            '    def server_error(cls, message: str = "Internal error") -> "APIResponse":\n'
            '        return cls(status_code=500, error=message)\n'
            '\n'
            '\n'
            '# Clean factory methods:\n'
            'resp1 = APIResponse.success({"user": "Alice", "id": 42})\n'
            'resp2 = APIResponse.not_found("User 999 not found")\n'
            '\n'
            'print(f"Response 1: ok={resp1.ok}, data={resp1.data}")\n'
            'print(f"Response 2: ok={resp2.ok}, error={resp2.error}")',
            output="Response 1: ok=True, data={'user': 'Alice', 'id': 42}\n"
            "Response 2: ok=False, error=User 999 not found",
        ),

        try_it("Create a <code>@dataclass</code> called <code>Config</code> with fields for <code>host</code> (str), <code>port</code> (int, default 8080), and <code>debug</code> (bool, default False). Create two configs and compare them."),

        section("Exercises"),

        exercise("starter", "Student record",
            "Create a <code>Student</code> dataclass with <code>name: str</code>, "
            "<code>student_id: str</code>, <code>major: str</code>, and <code>gpa: float</code>. "
            "Make it orderable by GPA (<code>order=True</code>). Create a list of 5 students, "
            "sort them by GPA, and print the top 3.",
            hint="Use <code>@dataclass(order=True)</code>. Put <code>gpa</code> as the first field "
            "if you want sorting by GPA by default (dataclass sorts by field order). "
            "Or rearrange fields using <code>field(compare=False)</code> on non-sort fields."
        ),

        exercise("medium", "Config dataclass",
            "Build a <code>Config</code> dataclass with <code>app_name: str</code>, "
            "<code>debug: bool = False</code>, <code>port: int = 8080</code>, "
            "<code>allowed_hosts: list[str] = field(default_factory=lambda: [\"localhost\"])</code>, "
            "and <code>database_url: str = \"sqlite:///db.sqlite3\"</code>. "
            "Add a <code>@classmethod from_dict(cls, data)</code> and a <code>to_dict()</code> method "
            "that uses <code>dataclasses.asdict()</code>. Make it frozen for safety.",
            hint="<code>from dataclasses import asdict</code>. For <code>from_dict</code>: "
            "<code>return cls(**data)</code> works if keys match fields."
        ),

        exercise("real-world", "API response model",
            "Build a set of dataclasses to model API responses: <code>PaginationInfo</code> "
            "(page, per_page, total, total_pages), <code>UserData</code> (id, name, email, role), "
            "and <code>APIResponse</code> (status_code, data: list[UserData], pagination: PaginationInfo, "
            "error: Optional[str]). Add factory class methods <code>success()</code>, "
            "<code>error()</code>, and <code>paginated()</code>. Simulate a paginated API response "
            "with 3 users.",
            hint="Nest dataclasses freely: a field of type <code>PaginationInfo</code> gets "
            "its own auto-generated repr. Use <code>@dataclass(frozen=True)</code> for immutable "
            "responses."
        ),

        mistakes([
            ("Using mutable defaults without <code>field(default_factory=...)</code>",
             "<code>tags: list[str] = []</code> is a bug &mdash; all instances share the same list. "
             "Always use <code>field(default_factory=list)</code>."),
            ("Forgetting that type hints are not enforced",
             "<code>age: int = \"thirty\"</code> will not raise an error at runtime. "
             "Type hints are for documentation and static analysis tools like mypy."),
            ("Putting fields without defaults before fields with defaults",
             "Just like function parameters, required fields must come before optional ones."),
            ("Using dataclass when you need complex __init__ logic",
             "If <code>__init__</code> needs heavy validation, database calls, or complex setup, "
             "a regular class might be more appropriate."),
        ]),

        pro_tips([
            "<strong>Use <code>frozen=True</code> by default.</strong> Immutable data is easier to reason "
            "about. Only use mutable dataclasses when you need to change fields after creation.",
            "<strong>Combine with <code>__post_init__</code> for validation.</strong> "
            "Validate fields after auto-generated <code>__init__</code> runs.",
            "<strong><code>dataclasses.asdict()</code> and <code>dataclasses.astuple()</code></strong> "
            "convert dataclasses to standard Python types &mdash; great for JSON serialization.",
            "<strong>Use <code>field(repr=False)</code></strong> to hide sensitive data (passwords, tokens) "
            "from the auto-generated <code>__repr__</code>.",
        ]),

        recap([
            "Type hints annotate types: <code>name: str</code>, <code>list[int]</code>, <code>Optional[str]</code>",
            "<code>@dataclass</code> auto-generates <code>__init__</code>, <code>__repr__</code>, <code>__eq__</code>",
            "Use <code>field(default_factory=list)</code> for mutable defaults",
            "<code>frozen=True</code> makes immutable instances",
            "<code>order=True</code> adds comparison operators",
            "<code>__post_init__</code> runs after initialization for computed fields",
            "Dataclasses work with properties, methods, and class methods",
        ]),
    ])
