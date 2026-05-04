"""add knowledge module: entries + sources + pgvector

Adds the knowledge base module. Stores atomic edtech concepts/tools/etc
extracted from raw materials by Claude Desktop, with facet filters
(stage/audience/mode/problems), free-form tags, lifecycle status,
verification scores, and a 1024-dim Voyage embedding for RAG search.

Also enables the `vector` extension and creates HNSW + GIN indexes
for fast similarity / facet queries plus a Russian+English full-text
GIN index for hybrid search.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, ENUM, JSONB, UUID


# revision identifiers, used by Alembic.
revision = "m1n2o3p4q5r6"
down_revision = "l1m2n3o4p5q6"
branch_labels = None
depends_on = None


ENTRY_TYPE_VALUES = (
    "concept", "insight", "tool", "framework",
    "method", "template", "exercise", "case_study",
)
ENTRY_STATUS_VALUES = ("draft", "verified", "rejected", "archived")
ENTRY_VISIBILITY_VALUES = ("public", "private")
SOURCE_TYPE_VALUES = ("skillbox", "prog_tools", "telegram", "web", "book", "own")


def upgrade() -> None:
    # --- Extension ---
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # --- Enum types ---
    # Create via raw SQL with DO-block guard (idempotent; survives partial-failure
    # re-runs without leaving the transaction in a bad state).
    def _create_enum(name: str, values: tuple[str, ...]) -> None:
        vals_sql = ", ".join(f"'{v}'" for v in values)
        op.execute(
            f"""
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{name}') THEN
                    CREATE TYPE {name} AS ENUM ({vals_sql});
                END IF;
            END $$;
            """
        )

    _create_enum("knowledge_entry_type", ENTRY_TYPE_VALUES)
    _create_enum("knowledge_entry_status", ENTRY_STATUS_VALUES)
    _create_enum("knowledge_entry_visibility", ENTRY_VISIBILITY_VALUES)
    _create_enum("knowledge_source_type", SOURCE_TYPE_VALUES)

    # Column-side enum refs: create_type=False prevents create_table from
    # trying to CREATE TYPE again (the postgresql.ENUM dialect supports this).
    entry_type = ENUM(*ENTRY_TYPE_VALUES, name="knowledge_entry_type", create_type=False)
    entry_status = ENUM(*ENTRY_STATUS_VALUES, name="knowledge_entry_status", create_type=False)
    entry_visibility = ENUM(*ENTRY_VISIBILITY_VALUES, name="knowledge_entry_visibility", create_type=False)
    source_type = ENUM(*SOURCE_TYPE_VALUES, name="knowledge_source_type", create_type=False)

    # --- knowledge_entries ---
    op.create_table(
        "knowledge_entries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("type", entry_type, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("summary", sa.Text, nullable=False, server_default=""),
        sa.Column("content", sa.Text, nullable=False, server_default=""),
        sa.Column("applicability", sa.Text, nullable=False, server_default=""),
        sa.Column("stage", ARRAY(sa.String(40)), nullable=False, server_default="{}"),
        sa.Column("audience", ARRAY(sa.String(40)), nullable=False, server_default="{}"),
        sa.Column("mode", ARRAY(sa.String(40)), nullable=False, server_default="{}"),
        sa.Column("problems", ARRAY(sa.String(40)), nullable=False, server_default="{}"),
        sa.Column("tags", ARRAY(sa.String(80)), nullable=False, server_default="{}"),
        sa.Column("status", entry_status, nullable=False, server_default="draft"),
        sa.Column("visibility", entry_visibility, nullable=False, server_default="public"),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ai_quality", sa.Float, nullable=True),
        sa.Column("verifier_score", sa.Float, nullable=True),
        sa.Column("verifier_issues", JSONB, nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_by",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Embedding column added via raw SQL (pgvector type not in Alembic core)
    op.execute("ALTER TABLE knowledge_entries ADD COLUMN embedding vector(1024)")

    # --- Indexes ---
    op.create_index("ix_knowledge_entries_status", "knowledge_entries", ["status"])
    op.create_index("ix_knowledge_entries_visibility", "knowledge_entries", ["visibility"])
    op.create_index("ix_knowledge_entries_type", "knowledge_entries", ["type"])
    op.create_index("ix_knowledge_entries_deleted_at", "knowledge_entries", ["deleted_at"])

    # GIN indexes for facet array queries
    for col in ("stage", "audience", "mode", "problems", "tags"):
        op.execute(
            f"CREATE INDEX ix_knowledge_entries_{col}_gin "
            f"ON knowledge_entries USING GIN ({col})"
        )

    # HNSW index for cosine similarity search (Voyage embeddings)
    op.execute(
        "CREATE INDEX ix_knowledge_entries_embedding_hnsw "
        "ON knowledge_entries USING hnsw (embedding vector_cosine_ops)"
    )

    # Full-text search GIN — language-agnostic 'simple' config so it indexes both Russian and English
    # (we don't need stemming because edtech terminology is usually transliterated/borrowed)
    op.execute(
        "CREATE INDEX ix_knowledge_entries_fts ON knowledge_entries "
        "USING GIN (to_tsvector('simple', "
        "coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(content,'')"
        "))"
    )

    # --- knowledge_entry_sources ---
    op.create_table(
        "knowledge_entry_sources",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "entry_id",
            UUID(as_uuid=True),
            sa.ForeignKey("knowledge_entries.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("url", sa.String(2000), nullable=True),
        sa.Column("source_type", source_type, nullable=False),
        sa.Column("title", sa.String(500), nullable=True),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("raw_path", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_knowledge_entry_sources_entry_id",
        "knowledge_entry_sources",
        ["entry_id"],
    )
    op.create_index(
        "ix_knowledge_entry_sources_source_type",
        "knowledge_entry_sources",
        ["source_type"],
    )


def downgrade() -> None:
    op.drop_index("ix_knowledge_entry_sources_source_type", table_name="knowledge_entry_sources")
    op.drop_index("ix_knowledge_entry_sources_entry_id", table_name="knowledge_entry_sources")
    op.drop_table("knowledge_entry_sources")

    op.execute("DROP INDEX IF EXISTS ix_knowledge_entries_fts")
    op.execute("DROP INDEX IF EXISTS ix_knowledge_entries_embedding_hnsw")
    for col in ("tags", "problems", "mode", "audience", "stage"):
        op.execute(f"DROP INDEX IF EXISTS ix_knowledge_entries_{col}_gin")
    op.drop_index("ix_knowledge_entries_deleted_at", table_name="knowledge_entries")
    op.drop_index("ix_knowledge_entries_type", table_name="knowledge_entries")
    op.drop_index("ix_knowledge_entries_visibility", table_name="knowledge_entries")
    op.drop_index("ix_knowledge_entries_status", table_name="knowledge_entries")

    op.drop_table("knowledge_entries")

    op.execute("DROP TYPE IF EXISTS knowledge_source_type")
    op.execute("DROP TYPE IF EXISTS knowledge_entry_visibility")
    op.execute("DROP TYPE IF EXISTS knowledge_entry_status")
    op.execute("DROP TYPE IF EXISTS knowledge_entry_type")
    # Don't drop the vector extension — other tables might use it later
