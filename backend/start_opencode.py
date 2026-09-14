"""Loads the local OpenRouter key without printing it, then starts OpenCode."""
import os
from pathlib import Path
import shutil
import subprocess
from dotenv import dotenv_values
root = Path(__file__).resolve().parent.parent
config = dotenv_values(root / 'backend' / '.env')
token = config.get('OPENROUTER_API_KEY') or os.getenv('OPENROUTER_API_KEY')
if not token:
    raise SystemExit('Configure OPENROUTER_API_KEY no backend/.env antes de iniciar o OpenCode.')
command = shutil.which('opencode')
if not command:
    raise SystemExit('OpenCode não encontrado no PATH. Instale o OpenCode e tente novamente.')
env = os.environ.copy()
env['OPENROUTER_API_KEY'] = token
raise SystemExit(subprocess.call([command], cwd=root, env=env))
