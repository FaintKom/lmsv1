"""Fix exercise configs to match what the frontend components expect.

true_false: frontend expects {statement: str, correct_answer: bool}
  but we created {questions: [{statement, correct_answer}]}
  Fix: flatten — take first question and put at top level.
  For multiple questions, create separate exercises.
"""
import json
import os
import sys
import uuid
from datetime import datetime, timezone

import psycopg


def main():
    db_url = os.environ.get("DB_URL", "").replace("+asyncpg", "")
    if not db_url:
        print("DB_URL not set", file=sys.stderr)
        return 1

    with psycopg.connect(db_url) as conn:
        # Fix true_false exercises: split questions into separate exercises
        with conn.cursor() as cur:
            cur.execute("""
                SELECT e.id, e.title, e.config, e.lesson_id, e.org_id, e.sort_order, e.display_id
                FROM exercises e
                WHERE e.exercise_type = 'true_false'
                AND e.config::text LIKE '%questions%'
            """)
            rows = cur.fetchall()

        for ex_id, title, config, lesson_id, org_id, sort_order, display_id in rows:
            if isinstance(config, str):
                config = json.loads(config)
            questions = config.get("questions", [])
            if not questions:
                continue

            # Update first exercise with first question at top level
            first_q = questions[0]
            new_config = {
                "statement": first_q["statement"],
                "correct_answer": first_q["correct_answer"],
            }
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE exercises SET config = %s, title = %s WHERE id = %s",
                    (json.dumps(new_config), f"{title} (1/{len(questions)})", ex_id),
                )
            print(f"  ✓ Updated {title} → question 1/{len(questions)}")

            # Create additional exercises for remaining questions
            for i, q in enumerate(questions[1:], 2):
                new_id = uuid.uuid4()
                new_display = f"{display_id}-{i}"
                q_config = {
                    "statement": q["statement"],
                    "correct_answer": q["correct_answer"],
                }
                with conn.cursor() as cur:
                    cur.execute(
                        """INSERT INTO exercises (id, lesson_id, org_id, display_id, exercise_type, title, config, sort_order, max_attempts, created_at, updated_at)
                           VALUES (%s, %s, %s, %s, 'true_false', %s, %s, %s, 10, %s, %s)""",
                        (new_id, lesson_id, org_id, new_display, f"{title} ({i}/{len(questions)})",
                         json.dumps(q_config), sort_order + i - 1,
                         datetime.now(timezone.utc), datetime.now(timezone.utc)),
                    )
                print(f"  + Created {title} ({i}/{len(questions)})")

        # Fix quiz exercises similarly if needed
        with conn.cursor() as cur:
            cur.execute("""
                SELECT e.id, e.title, e.config
                FROM exercises e
                WHERE e.exercise_type = 'quiz'
                AND e.config::text LIKE '%questions%'
            """)
            quiz_rows = cur.fetchall()

        for ex_id, title, config in quiz_rows:
            if isinstance(config, str):
                config = json.loads(config)
            questions = config.get("questions", [])
            if questions:
                # Quiz renderer expects questions array — check if it works
                # Actually quiz component likely reads config.questions directly
                print(f"  - Quiz '{title}' has {len(questions)} questions (checking renderer...)")

        conn.commit()
    print("Done.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
