"""Module 3, Lesson 6: Project — Contact Book CLI."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero("Project: Contact Book CLI",
             "Build a real address book app using lists, dicts, and everything from Module 3"),

        why_it_matters(
            "<p>This project ties together all Module 3 skills: lists to store contacts, "
            "dicts for each contact's data, comprehensions to search and filter, "
            "and sorting to organize output. It's a miniature version of what "
            "real CRM software does.</p>"
        ),

        section("What we're building"),

        concept("Features",
            "<ul>"
            "<li><strong>Add</strong> a contact (name, phone, email, city)</li>"
            "<li><strong>List</strong> all contacts (sorted alphabetically)</li>"
            "<li><strong>Search</strong> by name (partial match)</li>"
            "<li><strong>Edit</strong> a contact's details</li>"
            "<li><strong>Delete</strong> a contact</li>"
            "<li><strong>Stats</strong> — total contacts, contacts per city</li>"
            "</ul>"
        ),

        section("Step 1: Data structure"),

        code_example("Contact storage",
            '# Each contact is a dict, all contacts in a list\n'
            'contacts = []\n'
            '\n'
            '# Example contact:\n'
            '# {"name": "Alice Smith", "phone": "555-0101",\n'
            '#  "email": "alice@example.com", "city": "New York"}',
            explanation="A list of dicts is the most flexible structure here. "
            "Each dict holds one contact, the list holds all of them."
        ),

        section("Step 2: Add contact"),

        code_example("add_contact()",
            'def add_contact(contacts):\n'
            '    name = input("Name: ").strip()\n'
            '    if not name:\n'
            '        print("Name cannot be empty.")\n'
            '        return\n'
            '    \n'
            '    # Check for duplicate\n'
            '    if any(c["name"].lower() == name.lower() for c in contacts):\n'
            '        print(f"Contact \'{name}\' already exists.")\n'
            '        return\n'
            '    \n'
            '    phone = input("Phone: ").strip()\n'
            '    email = input("Email: ").strip()\n'
            '    city = input("City: ").strip()\n'
            '    \n'
            '    contacts.append({\n'
            '        "name": name,\n'
            '        "phone": phone,\n'
            '        "email": email,\n'
            '        "city": city,\n'
            '    })\n'
            '    print(f"✓ Added {name}.")',
            explanation="Note the duplicate check using <code>any()</code> with a generator expression. "
            "This is a common pattern for searching a list of dicts."
        ),

        section("Step 3: List and search"),

        code_example("list_contacts() and search()",
            'def list_contacts(contacts):\n'
            '    if not contacts:\n'
            '        print("No contacts yet.")\n'
            '        return\n'
            '    \n'
            '    # Sort alphabetically by name\n'
            '    for i, c in enumerate(sorted(contacts, key=lambda c: c["name"].lower()), 1):\n'
            '        print(f\'{i}. {c["name"]} | {c["phone"]} | {c["email"]} | {c["city"]}\')\n'
            '    print(f"\\n— {len(contacts)} contact(s) total")\n'
            '\n'
            '\n'
            'def search_contacts(contacts):\n'
            '    query = input("Search name: ").strip().lower()\n'
            '    if not query:\n'
            '        return\n'
            '    \n'
            '    results = [c for c in contacts if query in c["name"].lower()]\n'
            '    \n'
            '    if not results:\n'
            '        print(f"No contacts matching \'{query}\'.")\n'
            '        return\n'
            '    \n'
            '    print(f"Found {len(results)} result(s):")\n'
            '    for c in results:\n'
            '        print(f\'  {c["name"]} | {c["phone"]} | {c["email"]}\')',
            explanation="Search uses a list comprehension with <code>in</code> for partial matching. "
            "Converting both to lowercase makes the search case-insensitive."
        ),

        section("Step 4: Edit and delete"),

        code_example("edit_contact() and delete_contact()",
            'def edit_contact(contacts):\n'
            '    name = input("Edit which contact? Name: ").strip()\n'
            '    matches = [c for c in contacts if c["name"].lower() == name.lower()]\n'
            '    \n'
            '    if not matches:\n'
            '        print("Contact not found.")\n'
            '        return\n'
            '    \n'
            '    contact = matches[0]\n'
            '    print(f"Editing {contact[\'name\']} (press Enter to keep current value)")\n'
            '    \n'
            '    new_phone = input(f"Phone [{contact[\'phone\']}]: ").strip()\n'
            '    new_email = input(f"Email [{contact[\'email\']}]: ").strip()\n'
            '    new_city = input(f"City [{contact[\'city\']}]: ").strip()\n'
            '    \n'
            '    if new_phone: contact["phone"] = new_phone\n'
            '    if new_email: contact["email"] = new_email\n'
            '    if new_city: contact["city"] = new_city\n'
            '    print(f"✓ Updated {contact[\'name\']}.")\n'
            '\n'
            '\n'
            'def delete_contact(contacts):\n'
            '    name = input("Delete which contact? Name: ").strip()\n'
            '    for i, c in enumerate(contacts):\n'
            '        if c["name"].lower() == name.lower():\n'
            '            contacts.pop(i)\n'
            '            print(f"✓ Deleted {name}.")\n'
            '            return\n'
            '    print("Contact not found.")',
            explanation="Edit uses the pattern: find the dict reference, modify it directly. "
            "Since dicts are mutable, changes persist in the list. "
            "Delete uses <code>pop(i)</code> to remove by index."
        ),

        section("Step 5: Stats"),

        code_example("show_stats()",
            'def show_stats(contacts):\n'
            '    if not contacts:\n'
            '        print("No contacts yet.")\n'
            '        return\n'
            '    \n'
            '    print(f"Total contacts: {len(contacts)}")\n'
            '    \n'
            '    # Contacts per city\n'
            '    cities = {}\n'
            '    for c in contacts:\n'
            '        city = c["city"] or "Unknown"\n'
            '        cities[city] = cities.get(city, 0) + 1\n'
            '    \n'
            '    print("\\nContacts by city:")\n'
            '    for city, count in sorted(cities.items(), key=lambda x: x[1], reverse=True):\n'
            '        print(f"  {city}: {count}")',
            explanation="<code>dict.get(key, default)</code> is the safe way to count — "
            "no KeyError if the city hasn't been seen yet."
        ),

        section("Step 6: Main menu loop"),

        code_example("The complete main()",
            'def main():\n'
            '    contacts = []\n'
            '    \n'
            '    while True:\n'
            '        print("\\n===== Contact Book =====")\n'
            '        print("1. Add contact")\n'
            '        print("2. List all")\n'
            '        print("3. Search")\n'
            '        print("4. Edit")\n'
            '        print("5. Delete")\n'
            '        print("6. Stats")\n'
            '        print("7. Quit")\n'
            '        \n'
            '        choice = input("\\nChoice (1-7): ").strip()\n'
            '        \n'
            '        if choice == "1":\n'
            '            add_contact(contacts)\n'
            '        elif choice == "2":\n'
            '            list_contacts(contacts)\n'
            '        elif choice == "3":\n'
            '            search_contacts(contacts)\n'
            '        elif choice == "4":\n'
            '            edit_contact(contacts)\n'
            '        elif choice == "5":\n'
            '            delete_contact(contacts)\n'
            '        elif choice == "6":\n'
            '            show_stats(contacts)\n'
            '        elif choice == "7":\n'
            '            print("Goodbye!")\n'
            '            break\n'
            '        else:\n'
            '            print("Invalid choice.")\n'
            '\n'
            '\n'
            'main()',
            explanation="This is the standard CLI menu pattern: infinite loop + "
            "if/elif chain + break to exit. You'll use this in many projects."
        ),

        try_it("Copy the full program into the Python sandbox and try adding, "
               "searching, and deleting contacts. Then try adding the extensions below."),

        section("Extensions — try these yourself"),

        exercise("starter", "Add a 'favorites' feature",
            "Add a <code>favorite</code> boolean to each contact. "
            "Add a menu option to toggle favorite status, and another "
            "to list only favorites. Use a list comprehension to filter.",
        ),

        exercise("medium", "Export to formatted text",
            "Add an option that prints all contacts in a formatted table "
            "with aligned columns. Use f-string width specifiers: "
            "<code>f\"{name:<20} {phone:<15} {email:<25}\"</code>. "
            "Add a header row and separator line.",
        ),

        exercise("real-world", "Import from CSV string",
            "Add an option to bulk-import contacts from a multi-line string "
            "like:<br><code>\"Alice,555-0101,alice@dev.io,NYC\\n"
            "Bob,555-0202,bob@work.com,LA\"</code><br>"
            "Split by lines, then by commas, validate each row has 4 fields, "
            "skip duplicates, and report how many were imported.",
        ),

        mistakes([
            ("Modifying a list while iterating over it",
             "Never <code>for c in contacts: contacts.remove(c)</code>. "
             "Use <code>contacts = [c for c in contacts if ...]</code> "
             "or iterate over a copy."),
            ("Forgetting that .strip() doesn't modify in place",
             "<code>name.strip()</code> returns a new string. You must "
             "assign it: <code>name = name.strip()</code>."),
            ("Using <code>==</code> for case-insensitive comparison",
             "<code>\"Alice\" == \"alice\"</code> is <code>False</code>. "
             "Always compare <code>.lower()</code> to <code>.lower()</code>."),
        ]),

        pro_tips([
            "<strong>In real projects, use a database</strong> instead of a list. "
            "But the patterns are identical — CRUD (Create, Read, Update, Delete) "
            "is the same everywhere.",
            "<strong>Separate data from display.</strong> Functions like <code>search_contacts</code> "
            "should return results, and a different function should print them. "
            "This makes testing easier.",
            "<strong>Next module preview:</strong> in Module 4 (Functions) you'll learn "
            "how to structure this code even better with proper function design.",
        ]),

        recap([
            "List of dicts = flexible data storage for collections of records",
            "CRUD pattern: Create, Read, Update, Delete",
            "List comprehensions for search and filtering",
            "<code>sorted()</code> with <code>key=lambda</code> for custom ordering",
            "<code>dict.get(key, default)</code> for safe counting",
            "Main menu loop with while True + break",
            "All Module 3 concepts working together in one real app",
        ]),
    ])
