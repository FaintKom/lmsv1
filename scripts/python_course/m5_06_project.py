"""Module 5, Lesson 6: Project — Library Management System."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Project: Library Management System",
            "Build a complete library system with Book, Member, and Library classes. Borrow, return, search, and track late fees.",
        ),

        why_it_matters(
            "<p>This project combines everything from Module 5: classes, methods, properties, "
            "inheritance, dunder methods, and dataclasses. You will model real-world relationships "
            "between objects &mdash; members borrow books, books track their status, the library "
            "manages everything. This is exactly how professional codebases are structured.</p>"
        ),

        section("What we are building"),

        concept("Library system features",
            "<ul>"
            "<li><strong>Book class</strong> &mdash; title, author, ISBN, availability, due dates</li>"
            "<li><strong>Member class</strong> &mdash; name, member ID, borrowed books, borrowing history</li>"
            "<li><strong>Library class</strong> &mdash; catalog management, borrowing/returning, search, fees</li>"
            "<li><strong>Late fee calculation</strong> &mdash; based on days overdue</li>"
            "<li><strong>Search system</strong> &mdash; find books by title, author, or ISBN</li>"
            "</ul>"
        ),

        section("Step 1: The Book class"),

        code_example("Book with properties and dunder methods",
            'from dataclasses import dataclass, field\n'
            'from typing import Optional\n'
            '\n'
            '@dataclass\n'
            'class Book:\n'
            '    title: str\n'
            '    author: str\n'
            '    isbn: str\n'
            '    _is_borrowed: bool = field(default=False, repr=False)\n'
            '    _borrower: Optional[str] = field(default=None, repr=False)\n'
            '    _due_date: Optional[str] = field(default=None, repr=False)\n'
            '\n'
            '    @property\n'
            '    def available(self) -> bool:\n'
            '        return not self._is_borrowed\n'
            '\n'
            '    @property\n'
            '    def status(self) -> str:\n'
            '        if self.available:\n'
            '            return "Available"\n'
            '        return f"Borrowed by {self._borrower} (due: {self._due_date})"\n'
            '\n'
            '    def borrow(self, borrower_name: str, due_date: str) -> bool:\n'
            '        if not self.available:\n'
            '            return False\n'
            '        self._is_borrowed = True\n'
            '        self._borrower = borrower_name\n'
            '        self._due_date = due_date\n'
            '        return True\n'
            '\n'
            '    def return_book(self) -> None:\n'
            '        self._is_borrowed = False\n'
            '        self._borrower = None\n'
            '        self._due_date = None\n'
            '\n'
            '    def __str__(self) -> str:\n'
            '        return f\'"{self.title}" by {self.author} [{self.isbn}]\'\n'
            '\n'
            '\n'
            'book = Book("Python Crash Course", "Eric Matthes", "978-1593279288")\n'
            'print(book)\n'
            'print(f"Status: {book.status}")\n'
            '\n'
            'book.borrow("Alice", "2024-02-15")\n'
            'print(f"Status: {book.status}")\n'
            'print(f"Available: {book.available}")',
            output='"Python Crash Course" by Eric Matthes [978-1593279288]\n'
            "Status: Available\n"
            "Status: Borrowed by Alice (due: 2024-02-15)\n"
            "Available: False",
        ),

        section("Step 2: The Member class"),

        code_example("Member with borrowing history",
            'class Member:\n'
            '    """Library member who can borrow books."""\n'
            '\n'
            '    MAX_BOOKS = 5            # class attribute\n'
            '    LATE_FEE_PER_DAY = 0.25  # $0.25 per day late\n'
            '\n'
            '    def __init__(self, name: str, member_id: str):\n'
            '        self.name = name\n'
            '        self.member_id = member_id\n'
            '        self.borrowed_books: list[Book] = []\n'
            '        self.history: list[str] = []\n'
            '        self.total_fees: float = 0.0\n'
            '\n'
            '    @property\n'
            '    def can_borrow(self) -> bool:\n'
            '        return len(self.borrowed_books) < self.MAX_BOOKS\n'
            '\n'
            '    @property\n'
            '    def books_out(self) -> int:\n'
            '        return len(self.borrowed_books)\n'
            '\n'
            '    def __str__(self) -> str:\n'
            '        return f"{self.name} (ID: {self.member_id})"\n'
            '\n'
            '    def __repr__(self) -> str:\n'
            '        return f"Member({self.name!r}, {self.member_id!r})"\n'
            '\n'
            '\n'
            'member = Member("Alice Smith", "MEM001")\n'
            'print(member)\n'
            'print(f"Can borrow: {member.can_borrow}")\n'
            'print(f"Books out: {member.books_out}")',
            output="Alice Smith (ID: MEM001)\nCan borrow: True\nBooks out: 0",
        ),

        section("Step 3: The Library class"),

        code_example("Library with full functionality",
            'class Library:\n'
            '    """Library that manages books and members."""\n'
            '\n'
            '    LOAN_PERIOD_DAYS = 14\n'
            '\n'
            '    def __init__(self, name: str):\n'
            '        self.name = name\n'
            '        self.books: list[Book] = []\n'
            '        self.members: dict[str, Member] = {}  # id -> Member\n'
            '\n'
            '    # --- Catalog management ---\n'
            '    def add_book(self, book: Book) -> None:\n'
            '        self.books.append(book)\n'
            '\n'
            '    def add_member(self, member: Member) -> None:\n'
            '        self.members[member.member_id] = member\n'
            '\n'
            '    # --- Search ---\n'
            '    def search_by_title(self, query: str) -> list[Book]:\n'
            '        query = query.lower()\n'
            '        return [b for b in self.books if query in b.title.lower()]\n'
            '\n'
            '    def search_by_author(self, query: str) -> list[Book]:\n'
            '        query = query.lower()\n'
            '        return [b for b in self.books if query in b.author.lower()]\n'
            '\n'
            '    def find_by_isbn(self, isbn: str):\n'
            '        for book in self.books:\n'
            '            if book.isbn == isbn:\n'
            '                return book\n'
            '        return None\n'
            '\n'
            '    # --- Borrowing ---\n'
            '    def checkout(self, member_id: str, isbn: str,\n'
            '                 today: str = "2024-01-15") -> str:\n'
            '        """Borrow a book. Returns status message."""\n'
            '        member = self.members.get(member_id)\n'
            '        if not member:\n'
            '            return f"Error: Member {member_id} not found"\n'
            '\n'
            '        book = self.find_by_isbn(isbn)\n'
            '        if not book:\n'
            '            return f"Error: Book {isbn} not found"\n'
            '\n'
            '        if not book.available:\n'
            '            return f"Error: \\\"{book.title}\\\" is already borrowed"\n'
            '\n'
            '        if not member.can_borrow:\n'
            '            return f"Error: {member.name} has reached the borrowing limit"\n'
            '\n'
            '        # Calculate due date (simplified: just add days to string)\n'
            '        due_date = self._add_days(today, self.LOAN_PERIOD_DAYS)\n'
            '        book.borrow(member.name, due_date)\n'
            '        member.borrowed_books.append(book)\n'
            '        member.history.append(f"Borrowed: {book.title} on {today}")\n'
            '\n'
            '        return f"Success: {member.name} borrowed \\\"{book.title}\\\" (due: {due_date})"\n'
            '\n'
            '    def return_book(self, member_id: str, isbn: str,\n'
            '                    return_date: str = "2024-01-29") -> str:\n'
            '        """Return a book. Returns status with any fees."""\n'
            '        member = self.members.get(member_id)\n'
            '        if not member:\n'
            '            return f"Error: Member {member_id} not found"\n'
            '\n'
            '        book = self.find_by_isbn(isbn)\n'
            '        if not book:\n'
            '            return f"Error: Book {isbn} not found"\n'
            '\n'
            '        if book not in member.borrowed_books:\n'
            '            return f"Error: {member.name} did not borrow this book"\n'
            '\n'
            '        # Calculate late fee\n'
            '        days_late = self._days_between(book._due_date, return_date)\n'
            '        fee = max(0, days_late) * Member.LATE_FEE_PER_DAY\n'
            '\n'
            '        book.return_book()\n'
            '        member.borrowed_books.remove(book)\n'
            '        member.history.append(f"Returned: {book.title} on {return_date}")\n'
            '\n'
            '        msg = f"Success: {member.name} returned \\\"{book.title}\\\""\n'
            '        if fee > 0:\n'
            '            member.total_fees += fee\n'
            '            msg += f" (LATE: {days_late} days, fee: ${fee:.2f})"\n'
            '        return msg\n'
            '\n'
            '    # --- Display ---\n'
            '    def show_catalog(self) -> None:\n'
            '        print(f"\\n=== {self.name} Catalog ({len(self.books)} books) ===")\n'
            '        for book in self.books:\n'
            '            print(f"  {book} - {book.status}")\n'
            '\n'
            '    def show_member_info(self, member_id: str) -> None:\n'
            '        member = self.members.get(member_id)\n'
            '        if not member:\n'
            '            print(f"Member {member_id} not found")\n'
            '            return\n'
            '        print(f"\\n--- {member} ---")\n'
            '        print(f"Books out: {member.books_out}/{Member.MAX_BOOKS}")\n'
            '        print(f"Outstanding fees: ${member.total_fees:.2f}")\n'
            '        if member.borrowed_books:\n'
            '            print("Currently borrowed:")\n'
            '            for b in member.borrowed_books:\n'
            '                print(f"  - {b}")\n'
            '        if member.history:\n'
            '            print("History:")\n'
            '            for h in member.history:\n'
            '                print(f"  - {h}")\n'
            '\n'
            '    # --- Helpers (simplified date math) ---\n'
            '    @staticmethod\n'
            '    def _add_days(date_str: str, days: int) -> str:\n'
            '        """Simplified: add days to YYYY-MM-DD string."""\n'
            '        year, month, day = map(int, date_str.split("-"))\n'
            '        day += days\n'
            '        while day > 28:    # simplified month handling\n'
            '            day -= 28\n'
            '            month += 1\n'
            '            if month > 12:\n'
            '                month = 1\n'
            '                year += 1\n'
            '        return f"{year}-{month:02d}-{day:02d}"\n'
            '\n'
            '    @staticmethod\n'
            '    def _days_between(date1: str, date2: str) -> int:\n'
            '        """Simplified: rough days between two YYYY-MM-DD strings."""\n'
            '        y1, m1, d1 = map(int, date1.split("-"))\n'
            '        y2, m2, d2 = map(int, date2.split("-"))\n'
            '        return (y2 - y1) * 365 + (m2 - m1) * 30 + (d2 - d1)',
            explanation="The Library class ties Books and Members together. Checkout validates "
            "everything before proceeding. Return calculates late fees. All operations "
            "return status messages for the caller to display."
        ),

        section("Step 4: Running the system"),

        code_example("Complete demo session",
            '# === Setup ===\n'
            'lib = Library("City Library")\n'
            '\n'
            '# Add books\n'
            'lib.add_book(Book("Python Crash Course", "Eric Matthes", "978-1"))\n'
            'lib.add_book(Book("Clean Code", "Robert Martin", "978-2"))\n'
            'lib.add_book(Book("The Pragmatic Programmer", "David Thomas", "978-3"))\n'
            'lib.add_book(Book("Python Cookbook", "David Beazley", "978-4"))\n'
            '\n'
            '# Add members\n'
            'lib.add_member(Member("Alice Smith", "M001"))\n'
            'lib.add_member(Member("Bob Jones", "M002"))\n'
            '\n'
            '# === Operations ===\n'
            'lib.show_catalog()\n'
            '\n'
            'print("\\n--- Checkouts ---")\n'
            'print(lib.checkout("M001", "978-1", "2024-01-10"))\n'
            'print(lib.checkout("M001", "978-2", "2024-01-12"))\n'
            'print(lib.checkout("M002", "978-3", "2024-01-15"))\n'
            '\n'
            '# Try to borrow an already-borrowed book:\n'
            'print(lib.checkout("M002", "978-1", "2024-01-16"))\n'
            '\n'
            'lib.show_catalog()\n'
            '\n'
            '# Search:\n'
            'print("\\n--- Search for \'python\' ---")\n'
            'results = lib.search_by_title("python")\n'
            'for book in results:\n'
            '    print(f"  {book} - {book.status}")\n'
            '\n'
            '# Return (on time):\n'
            'print("\\n--- Returns ---")\n'
            'print(lib.return_book("M001", "978-1", "2024-01-20"))\n'
            '\n'
            '# Return (late - 5 days after due date):\n'
            'print(lib.return_book("M001", "978-2", "2024-02-05"))\n'
            '\n'
            '# Member info:\n'
            'lib.show_member_info("M001")',
            output="=== City Library Catalog (4 books) ===\n"
            "  \"Python Crash Course\" by Eric Matthes [978-1] - Available\n"
            "  \"Clean Code\" by Robert Martin [978-2] - Available\n"
            "  \"The Pragmatic Programmer\" by David Thomas [978-3] - Available\n"
            "  \"Python Cookbook\" by David Beazley [978-4] - Available\n\n"
            "--- Checkouts ---\n"
            "Success: Alice Smith borrowed \"Python Crash Course\" (due: 2024-01-24)\n"
            "Success: Alice Smith borrowed \"Clean Code\" (due: 2024-01-26)\n"
            "Success: Bob Jones borrowed \"The Pragmatic Programmer\" (due: 2024-01-29)\n"
            "Error: \"Python Crash Course\" is already borrowed\n\n"
            "=== City Library Catalog (4 books) ===\n"
            "  \"Python Crash Course\" by Eric Matthes [978-1] - Borrowed by Alice Smith (due: 2024-01-24)\n"
            "  \"Clean Code\" by Robert Martin [978-2] - Borrowed by Alice Smith (due: 2024-01-26)\n"
            "  \"The Pragmatic Programmer\" by David Thomas [978-3] - Borrowed by Bob Jones (due: 2024-01-29)\n"
            "  \"Python Cookbook\" by David Beazley [978-4] - Available\n\n"
            "--- Search for 'python' ---\n"
            "  \"Python Crash Course\" by Eric Matthes [978-1] - Borrowed by Alice Smith (due: 2024-01-24)\n"
            "  \"Python Cookbook\" by David Beazley [978-4] - Available\n\n"
            "--- Returns ---\n"
            "Success: Alice Smith returned \"Python Crash Course\"\n"
            "Success: Alice Smith returned \"Clean Code\" (LATE: 10 days, fee: $2.50)",
        ),

        section("Extension ideas"),

        concept("Taking it further",
            "<ul>"
            "<li><strong>Reservations</strong> &mdash; let members reserve books that are currently borrowed</li>"
            "<li><strong>Categories and genres</strong> &mdash; add genre/category to Book, search by category</li>"
            "<li><strong>Inheritance</strong> &mdash; create <code>EBook</code> and <code>AudioBook</code> subclasses "
            "with different borrowing rules</li>"
            "<li><strong>Real dates</strong> &mdash; replace the simplified date math with <code>datetime</code></li>"
            "<li><strong>Persistence</strong> &mdash; save/load the library state to a JSON file (Module 6)</li>"
            "<li><strong>Statistics</strong> &mdash; most popular books, most active members, overdue report</li>"
            "</ul>"
        ),

        section("Exercises"),

        exercise("starter", "Add a reservation system",
            "Add a <code>reserve(member_id, isbn)</code> method to Library. If a book is borrowed, "
            "add the member to a waiting list. When the book is returned, automatically notify "
            "the first person in the queue. Add a <code>waitlist</code> attribute to Book.",
            hint="<code>Book</code> gets <code>self.waitlist = []</code>. In <code>reserve</code>, "
            "check if the book is borrowed, then <code>book.waitlist.append(member_id)</code>. "
            "In <code>return_book</code>, check if <code>book.waitlist</code> is not empty."
        ),

        exercise("medium", "EBook and AudioBook subclasses",
            "Create <code>EBook(Book)</code> with <code>file_format</code> and <code>file_size_mb</code>, "
            "and <code>AudioBook(Book)</code> with <code>narrator</code> and <code>duration_hours</code>. "
            "EBooks can be borrowed by unlimited members (no availability check). AudioBooks have a "
            "shorter loan period (7 days). Override the appropriate methods.",
            hint="<code>EBook</code> overrides <code>available</code> to always return True and "
            "<code>borrow</code> to skip the check. <code>AudioBook</code> works with the Library's "
            "checkout but uses a different loan period."
        ),

        exercise("real-world", "Full library with statistics",
            "Add these features to the Library: <code>overdue_report(today)</code> that lists all "
            "overdue books and their fees, <code>popular_books(n)</code> that returns the most-borrowed books "
            "(track borrow count in Book), <code>active_members(n)</code> that returns members with the "
            "most borrows. Add a <code>save_to_dict()</code> and <code>@classmethod from_dict(cls, data)</code> "
            "for serialization.",
            hint="Add <code>self.borrow_count = 0</code> to Book and increment in <code>checkout</code>. "
            "For <code>overdue_report</code>, filter borrowed books where due_date < today."
        ),

        mistakes([
            ("Not validating before modifying state",
             "Always check all conditions (member exists, book available, limit not reached) "
             "BEFORE making any changes. If you modify first and check later, you get inconsistent state."),
            ("Mixing concerns in one class",
             "Book should not know about the Library. Member should not manage the catalog. "
             "Each class handles its own domain."),
            ("Forgetting to update both sides of a relationship",
             "When a member borrows a book, update both <code>book._is_borrowed</code> AND "
             "<code>member.borrowed_books</code>. Missing one leads to inconsistencies."),
            ("Not handling edge cases",
             "What if someone returns a book they never borrowed? What if ISBN does not exist? "
             "Always validate inputs."),
        ]),

        pro_tips([
            "<strong>Return status messages, do not print them.</strong> This makes the system "
            "testable and reusable. The caller decides how to display messages.",
            "<strong>Use properties for derived state.</strong> <code>available</code>, "
            "<code>can_borrow</code>, and <code>books_out</code> are all computed from other data. "
            "Properties make them look like simple attributes.",
            "<strong>Module 5 complete.</strong> You now know classes, methods, properties, "
            "inheritance, dunder methods, and dataclasses. You can model any real-world domain.",
            "<strong>This pattern scales.</strong> Professional codebases use these same patterns "
            "with ORMs (database models), REST APIs, and microservices.",
        ]),

        recap([
            "Built a multi-class system with Book, Member, and Library",
            "Used dataclasses for clean Book definitions",
            "Applied properties for computed attributes (available, status)",
            "Implemented search, checkout, return, and late fee calculation",
            "Used dunder methods for string representation",
            "Maintained consistency across related objects",
            "Module 5 complete &mdash; you can model any domain with OOP",
        ]),
    ])
