"""unified exercises

Revision ID: e1f2a3b4c5d6
Revises: d5e6f7a8b9c0
Create Date: 2026-03-16 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, None] = "d5e6f7a8b9c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create exercisetype enum (may already exist from main.py startup)
    exercisetype = postgresql.ENUM(
        "quiz", "code_challenge", "matching", "ordering",
        "fill_blanks", "true_false", "categorize", "file_upload",
        name="exercisetype",
        create_type=False,
    )
    # Create type only if it doesn't exist
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exercisetype') THEN
                CREATE TYPE exercisetype AS ENUM (
                    'quiz', 'code_challenge', 'matching', 'ordering',
                    'fill_blanks', 'true_false', 'categorize', 'file_upload'
                );
            END IF;
        END$$;
    """)

    # 2. Create exercises table
    op.execute("""
        CREATE TABLE IF NOT EXISTS exercises (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
            org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            display_id VARCHAR(50) UNIQUE NOT NULL,
            exercise_type exercisetype NOT NULL,
            title VARCHAR(255) NOT NULL,
            config JSONB DEFAULT '{}',
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_exercises_display_id ON exercises(display_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_exercises_lesson_id ON exercises(lesson_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_exercises_org_id ON exercises(org_id)")

    # 3. Create exercise_submissions table
    op.execute("""
        CREATE TABLE IF NOT EXISTS exercise_submissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
            student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            answers JSONB,
            score FLOAT,
            passed BOOLEAN,
            status VARCHAR(20) DEFAULT 'submitted',
            source_code TEXT,
            language VARCHAR(20),
            execution_time_ms INTEGER,
            total_passed INTEGER,
            total_tests INTEGER,
            results JSONB,
            original_filename VARCHAR(500),
            stored_filename VARCHAR(500),
            file_path VARCHAR(1000),
            file_size INTEGER,
            mime_type VARCHAR(100),
            submitted_at TIMESTAMPTZ NOT NULL,
            graded_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_exercise_submissions_exercise_student ON exercise_submissions(exercise_id, student_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_exercise_submissions_submitted_at ON exercise_submissions(submitted_at)")

    # 4. Add exercise_id to questions and test_cases (nullable, for transition period)
    op.execute("ALTER TABLE questions ADD COLUMN IF NOT EXISTS exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE")
    op.execute("ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE")

    # 5. Data migration — Quizzes → exercises
    op.execute("""
        INSERT INTO exercises (id, lesson_id, org_id, display_id, exercise_type, title, config, sort_order, created_at, updated_at)
        SELECT
            q.id,
            q.lesson_id,
            c.org_id,
            'migrated-Q' || ROW_NUMBER() OVER (ORDER BY q.created_at),
            'quiz'::exercisetype,
            q.title,
            jsonb_build_object(
                'passing_score', q.passing_score,
                'time_limit_minutes', q.time_limit_minutes
            ),
            0,
            q.created_at,
            q.updated_at
        FROM quizzes q
        JOIN lessons l ON l.id = q.lesson_id
        JOIN modules m ON m.id = l.module_id
        JOIN courses c ON c.id = m.course_id
        WHERE NOT EXISTS (SELECT 1 FROM exercises e WHERE e.id = q.id)
    """)

    # 6. Link questions to exercises (via quiz_id = exercise.id since we reused the UUID)
    op.execute("""
        UPDATE questions SET exercise_id = quiz_id
        WHERE quiz_id IS NOT NULL AND exercise_id IS NULL
        AND EXISTS (SELECT 1 FROM exercises WHERE exercises.id = questions.quiz_id)
    """)

    # 7. CodeChallenges → exercises
    op.execute("""
        INSERT INTO exercises (id, lesson_id, org_id, display_id, exercise_type, title, config, sort_order, created_at, updated_at)
        SELECT
            cc.id,
            cc.lesson_id,
            c.org_id,
            'migrated-C' || ROW_NUMBER() OVER (ORDER BY cc.created_at),
            'code_challenge'::exercisetype,
            cc.title,
            jsonb_build_object(
                'language', cc.language,
                'starter_code', COALESCE(cc.starter_code, ''),
                'solution_code', COALESCE(cc.solution_code, ''),
                'time_limit_seconds', cc.time_limit_seconds,
                'memory_limit_mb', cc.memory_limit_mb,
                'description', COALESCE(cc.description, '')
            ),
            0,
            cc.created_at,
            cc.updated_at
        FROM code_challenges cc
        JOIN lessons l ON l.id = cc.lesson_id
        JOIN modules m ON m.id = l.module_id
        JOIN courses c ON c.id = m.course_id
        WHERE NOT EXISTS (SELECT 1 FROM exercises e WHERE e.id = cc.id)
    """)

    # 8. Link test_cases to exercises
    op.execute("""
        UPDATE test_cases SET exercise_id = challenge_id
        WHERE challenge_id IS NOT NULL AND exercise_id IS NULL
        AND EXISTS (SELECT 1 FROM exercises WHERE exercises.id = test_cases.challenge_id)
    """)

    # 9. Quiz submissions → exercise_submissions
    op.execute("""
        INSERT INTO exercise_submissions (id, exercise_id, student_id, answers, score, passed, status, submitted_at, graded_at, created_at)
        SELECT
            qs.id,
            qs.quiz_id,
            qs.student_id,
            jsonb_build_object('quiz_answers', qs.answers),
            qs.score::float,
            qs.passed,
            'graded',
            qs.submitted_at,
            qs.graded_at,
            qs.submitted_at
        FROM quiz_submissions qs
        WHERE EXISTS (SELECT 1 FROM exercises WHERE exercises.id = qs.quiz_id)
        AND NOT EXISTS (SELECT 1 FROM exercise_submissions es WHERE es.id = qs.id)
    """)

    # 10. Code submissions → exercise_submissions
    op.execute("""
        INSERT INTO exercise_submissions (id, exercise_id, student_id, source_code, language, status, results, total_passed, total_tests, execution_time_ms, submitted_at, created_at)
        SELECT
            cs.id,
            cs.challenge_id,
            cs.student_id,
            cs.source_code,
            cs.language,
            cs.status::text,
            cs.results,
            cs.total_passed,
            cs.total_tests,
            cs.execution_time_ms,
            cs.submitted_at,
            cs.submitted_at
        FROM code_submissions cs
        WHERE EXISTS (SELECT 1 FROM exercises WHERE exercises.id = cs.challenge_id)
        AND NOT EXISTS (SELECT 1 FROM exercise_submissions es WHERE es.id = cs.id)
    """)

    # 11. Now fix display_ids with proper org slugs (Python-based for accuracy)
    conn = op.get_bind()
    rows = conn.execute(sa.text("""
        SELECT e.id, e.org_id, e.exercise_type, o.slug
        FROM exercises e
        JOIN organizations o ON o.id = e.org_id
        WHERE e.display_id LIKE 'migrated-%'
        ORDER BY e.exercise_type, e.created_at
    """)).fetchall()

    type_prefix = {
        "quiz": "Q", "code_challenge": "C", "matching": "M", "ordering": "O",
        "fill_blanks": "FB", "true_false": "T", "categorize": "G", "file_upload": "FU",
    }
    counters = {}  # (org_id, exercise_type) -> count

    for row in rows:
        eid, org_id, etype, slug = row
        key = (str(org_id), etype)
        counters[key] = counters.get(key, 0) + 1
        prefix = type_prefix.get(etype, "X")
        display_id = f"{slug}-{prefix}{counters[key]:03d}"
        conn.execute(
            sa.text("UPDATE exercises SET display_id = :did WHERE id = :eid"),
            {"did": display_id, "eid": eid},
        )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS exercise_submissions CASCADE")
    op.execute("DROP TABLE IF EXISTS exercises CASCADE")
    op.execute("ALTER TABLE questions DROP COLUMN IF EXISTS exercise_id")
    op.execute("ALTER TABLE test_cases DROP COLUMN IF EXISTS exercise_id")
