import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from cryptography.fernet import Fernet

from scripts import backup


class BackupTests(unittest.TestCase):
    def test_backup_is_encrypted_and_restorable(self):
        key = Fernet.generate_key()
        with tempfile.TemporaryDirectory() as directory:
            def fake_dump(command, stdout, stderr, check):
                self.assertIn("pg_dump", command)
                stdout.write(b"PGDMP-test-data")
                class Result:
                    returncode = 0
                    stderr = b""
                return Result()

            with patch.dict(os.environ, {"BACKUP_ENCRYPTION_KEY": key.decode(), "BACKUP_DIR": directory}), patch("scripts.backup.subprocess.run", side_effect=fake_dump):
                self.assertEqual(backup.main(), 0)
            files = list(Path(directory).glob("*.dump.enc"))
            self.assertEqual(len(files), 1)
            ciphertext = files[0].read_bytes()
            self.assertNotIn(b"PGDMP", ciphertext)
            self.assertEqual(Fernet(key).decrypt(ciphertext), b"PGDMP-test-data")


if __name__ == "__main__":
    unittest.main()
