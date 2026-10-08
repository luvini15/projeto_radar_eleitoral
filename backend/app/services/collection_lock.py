"""Session-level PostgreSQL advisory locks survive ORM commits and release on disconnect."""
from contextlib import contextmanager
from contextvars import ContextVar
from hashlib import blake2b
from threading import Lock
from fastapi import HTTPException
from sqlalchemy import text

# Kept for compatibility with local/manual global maintenance blocks.
collection_lock = Lock()
_local_locks = {}
_registry_lock = Lock()
_held = ContextVar("collection_locks", default=frozenset())


@contextmanager
def database_slot(db_engine, namespace, identifier):
    key = int.from_bytes(blake2b(f"radar:{namespace}:{identifier}".encode(), digest_size=8).digest(), "big", signed=True)
    identity = (str(db_engine.url) if db_engine.dialect.name == "postgresql" else id(db_engine), key)
    if identity in _held.get():
        yield; return
    token = None
    if db_engine.dialect.name == "postgresql":
        with db_engine.connect() as connection:
            acquired = bool(connection.execute(text("SELECT pg_try_advisory_lock(:key)"), {"key": key}).scalar())
            connection.commit()
            if not acquired: raise HTTPException(409, "Uma coleta desta campanha já está em andamento.")
            token = _held.set(_held.get() | {identity})
            try:
                yield
            finally:
                _held.reset(token)
                try:
                    connection.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": key})
                    connection.commit()
                except Exception:
                    connection.invalidate()
    else:
        # SQLite is a development/test fallback; deployment uses PostgreSQL.
        with _registry_lock:
            lock = _local_locks.setdefault(identity, Lock())
        if not lock.acquire(blocking=False): raise HTTPException(409, "Uma coleta desta campanha já está em andamento.")
        token = _held.set(_held.get() | {identity})
        try: yield
        finally:
            _held.reset(token); lock.release()


@contextmanager
def collection_slot(session=None, campaign_id=None):
    if collection_lock.locked(): raise HTTPException(409, "Uma coleta já está em andamento.")
    if session is None:
        if not collection_lock.acquire(blocking=False): raise HTTPException(409, "Uma coleta já está em andamento.")
        try: yield
        finally: collection_lock.release()
    else:
        with database_slot(session.get_bind(), "campaign", campaign_id):
            yield
