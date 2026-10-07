"""Encrypted PostgreSQL backup via pg_dump. Run daily from the host scheduler."""
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from cryptography.fernet import Fernet


def main() -> int:
    key = os.environ.get("BACKUP_ENCRYPTION_KEY")
    if not key:
        raise RuntimeError("BACKUP_ENCRYPTION_KEY obrigatoria")
    cipher = Fernet(key.encode())
    directory = Path(os.environ.get("BACKUP_DIR", "backups")).resolve()
    directory.mkdir(parents=True, exist_ok=True)
    destination = directory / f"radar-{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}.dump.enc"
    with tempfile.TemporaryFile() as output:
        result = subprocess.run(
            ["docker", "compose", "exec", "-T", "postgres", "pg_dump", "-U", "radar", "-Fc", "radar_eleitoral"],
            stdout=output, stderr=subprocess.PIPE, check=False,
        )
        if result.returncode:
            raise RuntimeError(f"pg_dump falhou: {result.stderr.decode(errors='replace')[:300]}")
        output.seek(0)
        data = output.read()
    if not data.startswith(b"PGDMP"):
        raise RuntimeError("Backup invalido")
    temporary = destination.with_suffix(".tmp")
    temporary.write_bytes(cipher.encrypt(data))
    temporary.replace(destination)
    retention_days = max(1, int(os.getenv("BACKUP_RETENTION_DAYS", "30")))
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    for old in directory.glob("radar-*.dump.enc"):
        if datetime.fromtimestamp(old.stat().st_mtime, timezone.utc) < cutoff:
            old.unlink()
    print(destination)
    return 0


if __name__ == "__main__":
    sys.exit(main())
