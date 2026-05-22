-- Auto-run by pgvector/pgvector:pg16 image at first start
-- (anything in /docker-entrypoint-initdb.d/*.sql is sourced once on init).
-- The knowledge module declares VECTOR(1024) columns; without this the
-- backend's create_all step fails with `type "vector" does not exist`.
CREATE EXTENSION IF NOT EXISTS vector;
