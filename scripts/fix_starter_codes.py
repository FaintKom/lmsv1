"""Fix broken starter codes in code_challenge exercises.

Problem: starter codes contain empty assignments like `tip = ` which
cause SyntaxError when the student clicks Run before writing anything.

Fix: replace empty assignments with comments or working defaults.
"""
import json
import os
import sys
import psycopg

FIXES = {
    "Tip Calculator": {
        "starter_code": (
            "meal_cost = 52.50\n"
            "tip_rate = 0.18\n"
            "people = 3\n"
            "\n"
            "# Calculate tip, total, and per person\n"
            "# Write your code here\n"
        ),
    },
    "Email Generator": {
        "starter_code": (
            "first_name = 'Alice'\n"
            "last_name = 'Smith'\n"
            "\n"
            "# Generate email address (all lowercase)\n"
            "# Write your code here\n"
        ),
    },
    "BMI Calculator": {
        "starter_code": (
            "weight_kg = 70\n"
            "height_m = 1.75\n"
            "\n"
            "# Calculate BMI: weight / (height squared)\n"
            "# Write your code here\n"
        ),
    },
    "Data Cleanup": {
        "starter_code": (
            "raw = [' Alice ', 'bob', '', 'CHARLIE', ' ', 'diana']\n"
            "\n"
            "# Clean the list using a comprehension\n"
            "# Write your code here\n"
        ),
    },
}

def main():
    db_url = os.environ.get("DB_URL", "").replace("+asyncpg", "")
    if not db_url:
        print("DB_URL not set", file=sys.stderr)
        return 1

    with psycopg.connect(db_url) as conn:
        for title, fixes in FIXES.items():
            with conn.cursor() as cur:
                cur.execute("SELECT id, config FROM exercises WHERE title = %s", (title,))
                row = cur.fetchone()
                if not row:
                    print(f"  ! {title} not found")
                    continue
                ex_id, config = row
                if isinstance(config, str):
                    config = json.loads(config)

                for key, value in fixes.items():
                    config[key] = value

                cur.execute(
                    "UPDATE exercises SET config = %s WHERE id = %s",
                    (json.dumps(config), ex_id),
                )
                print(f"  ✓ {title} — starter code fixed")
        conn.commit()
    print("Done.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
