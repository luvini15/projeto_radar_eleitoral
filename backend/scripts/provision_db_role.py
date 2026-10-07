"""Create a DML-only database role after migrations, using owner credentials."""
import os

import psycopg
from psycopg import sql


def main() -> None:
    owner_url = os.environ["MIGRATION_DATABASE_URL"].replace("postgresql+psycopg://", "postgresql://", 1)
    password = os.environ["APP_DB_PASSWORD"]
    if len(password) < 24:
        raise RuntimeError("APP_DB_PASSWORD deve ter pelo menos 24 caracteres")
    with psycopg.connect(owner_url) as conn, conn.cursor() as cursor:
        cursor.execute("SELECT 1 FROM pg_roles WHERE rolname = 'radar_app'")
        if cursor.fetchone():
            cursor.execute(sql.SQL("ALTER ROLE radar_app LOGIN PASSWORD {}").format(sql.Literal(password)))
        else:
            cursor.execute(sql.SQL("CREATE ROLE radar_app LOGIN PASSWORD {}").format(sql.Literal(password)))
        cursor.execute("GRANT CONNECT ON DATABASE radar_eleitoral TO radar_app")
        cursor.execute("GRANT USAGE ON SCHEMA public TO radar_app")
        cursor.execute("GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO radar_app")
        cursor.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO radar_app")
        cursor.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE ON TABLES TO radar_app")
        cursor.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO radar_app")


if __name__ == "__main__":
    main()
