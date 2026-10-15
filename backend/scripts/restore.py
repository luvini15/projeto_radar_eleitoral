"""Restore an encrypted backup into the configured Compose PostgreSQL instance."""
import argparse
import os
import subprocess
import sys
from pathlib import Path

from cryptography.fernet import Fernet


def main() -> int:
    parser = argparse.ArgumentParser(description="Restaura backup criptografado no PostgreSQL local")
    parser.add_argument("archive", type=Path)
    parser.add_argument("--confirm", action="store_true", help="Confirma substituicao dos dados do banco")
    args = parser.parse_args()
    if not args.confirm:
        parser.error("Use --confirm somente apos validar o alvo e fazer outro backup")
    key = os.environ.get("BACKUP_ENCRYPTION_KEY")
    if not key:
        raise RuntimeError("BACKUP_ENCRYPTION_KEY obrigatoria")
    data = Fernet(key.encode()).decrypt(args.archive.read_bytes())
    if not data.startswith(b"PGDMP"):
        raise RuntimeError("Arquivo pg_dump invalido")
    result = subprocess.run(
        ["docker", "compose", "exec", "-T", "postgres", "pg_restore", "--clean", "--if-exists", "-U", "radar", "-d", "radar_eleitoral"],
        input=data, capture_output=True, check=False,
    )
    if result.returncode:
        raise RuntimeError(f"pg_restore falhou: {result.stderr.decode(errors='replace')[:300]}")
    print("Restauracao concluida; valide esquema, dados e API antes de abrir o acesso")
    return 0


if __name__ == "__main__":
    sys.exit(main())
