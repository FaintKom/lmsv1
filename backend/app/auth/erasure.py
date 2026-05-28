"""GDPR Art. 17 erasure — shared cascade-delete logic.

Used by both the admin hard-delete endpoint and the self-service "delete my
account" endpoint so the two paths can never drift. See
``app/admin/router.py`` and ``app/auth/router.py``.
"""

import uuid

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def cascade_delete_user_refs(
    db: AsyncSession, user_id: uuid.UUID
) -> tuple[dict, list, list]:
    """Clear ALL FK references to users.id ourselves before issuing the DELETE.

    Why clear ALL (not only NO ACTION/RESTRICT)?
    Production DB has pgvector-indexed tables (knowledge_entries). When Postgres
    processes a user DELETE and triggers cascade SET NULL on knowledge_entries,
    the per-row index maintenance pulls in `vector` opclass functions and fails
    with `could not access file "$libdir/vector"` if the extension binary is
    missing/broken. By pre-clearing the rows via plain UPDATE/DELETE (no
    cascade), we keep the user DELETE itself a leaf operation: zero referencing
    rows to act on, zero cascades, no vector ops needed.

    Three-stage ladder for each FK (each stage in its own savepoint):
      1. Try UPDATE -> NULL (nullable col) or DELETE row (NOT NULL col).
      2. If (1) fails (e.g. pgvector index maintenance throws), DROP the FK
         constraint itself so the upcoming user DELETE will not try to
         cascade through it.
      3. If (2) also fails, record both errors and continue.

    Stage 2 is brutal — it removes referential integrity for that column
    until owner re-adds the constraint via migration after fixing the
    underlying issue (e.g. reinstalling pgvector). The trade-off is that
    deleting a user becomes possible at all.

    Returns (cleared, dropped_constraints, failures).
    """
    rows = await db.execute(
        text(
            """
            SELECT
              c.conname                          AS constraint_name,
              tn.nspname || '.' || tc.relname    AS child_table,
              ta.attname                         AS child_column,
              ta.attnotnull                      AS not_null
            FROM pg_constraint c
            JOIN pg_class tc       ON tc.oid = c.conrelid
            JOIN pg_namespace tn   ON tn.oid = tc.relnamespace
            JOIN pg_class rc       ON rc.oid = c.confrelid
            JOIN pg_namespace rn   ON rn.oid = rc.relnamespace
            JOIN pg_attribute ta   ON ta.attrelid = c.conrelid AND ta.attnum = c.conkey[1]
            JOIN pg_attribute ra   ON ra.attrelid = c.confrelid AND ra.attnum = c.confkey[1]
            WHERE c.contype = 'f'
              AND rc.relname = 'users'
              AND ra.attname = 'id'
              AND rn.nspname = 'public'
            """
        )
    )
    cleared: dict[str, int] = {}
    dropped_constraints: list[str] = []
    failures: list[str] = []
    for row in rows.mappings().all():
        table = row["child_table"]
        col = row["child_column"]
        constraint = row["constraint_name"]
        not_null = row["not_null"]
        if not_null:
            stmt = text(f'DELETE FROM {table} WHERE "{col}" = :uid')
        else:
            stmt = text(f'UPDATE {table} SET "{col}" = NULL WHERE "{col}" = :uid')

        # Stage 1: try to clear rows.
        sp = await db.begin_nested()
        try:
            res = await db.execute(stmt, {"uid": user_id})
            if res.rowcount:
                cleared[f"{table}.{col}"] = res.rowcount
            await sp.commit()
            continue
        except Exception as e:  # noqa: BLE001
            await sp.rollback()
            clear_err = f"{type(e).__name__}: {e}"

        # Stage 2: drop the FK constraint so user DELETE won't cascade through it.
        sp = await db.begin_nested()
        try:
            await db.execute(text(f'ALTER TABLE {table} DROP CONSTRAINT IF EXISTS "{constraint}"'))
            await sp.commit()
            dropped_constraints.append(f"{table}.{col} ({constraint})")
            continue
        except Exception as e:  # noqa: BLE001
            await sp.rollback()
            drop_err = f"{type(e).__name__}: {e}"

        failures.append(f"{table}.{col}: clear={clear_err} drop={drop_err}")
    return cleared, dropped_constraints, failures


async def erase_user(db: AsyncSession, target) -> dict:
    """Pre-clear FK refs, then DELETE the user row. Returns a summary dict.

    Raises HTTPException(400) on a residual-FK / unexpected DB error so the
    caller surfaces the clear/drop/failure breakdown.
    """
    from fastapi import HTTPException
    from sqlalchemy.exc import IntegrityError

    cleared, dropped_constraints, failures = await cascade_delete_user_refs(db, target.id)
    try:
        await db.delete(target)
        await db.flush()
    except IntegrityError as e:
        raise HTTPException(
            400,
            f"Cannot delete user: residual FK blocked deletion. "
            f"Cleared: {cleared}. Dropped constraints: {dropped_constraints}. "
            f"Failures: {failures}. Original error: {e.orig}",
        ) from e
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            400,
            f"Cannot delete user: {type(e).__name__}: {e}. "
            f"Cleared: {cleared}. Dropped constraints: {dropped_constraints}. "
            f"Failures: {failures}.",
        ) from e
    return {
        "ok": True,
        "cleared": cleared,
        "dropped_constraints": dropped_constraints,
        "preclear_failures": failures,
    }
