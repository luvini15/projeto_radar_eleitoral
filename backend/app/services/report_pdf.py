"""Bounded, offline rendering of a self-contained report snapshot. No database writes."""
import subprocess
import shutil
import threading
from pathlib import Path
from fastapi import HTTPException

MAX_EXPORT_BYTES = 16 * 1024 * 1024
_slots = threading.BoundedSemaphore(2)

def render_pdf(html: bytes) -> bytes:
    if not html or len(html) > MAX_EXPORT_BYTES:
        raise HTTPException(413, "Documento de exportação muito grande.")
    try:
        text = html.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(422, "Documento HTML inválido.")
    if '<main class="report-paper"' not in text:
        raise HTTPException(422, "Documento de relatório inválido.")
    node = shutil.which("node")
    if not node:
        raise HTTPException(503, "Renderizador PDF indisponível. Verifique a instalação do Node e Chromium no servidor.")
    if not _slots.acquire(blocking=False):
        raise HTTPException(429, "Há exportações em andamento. Tente novamente em instantes.")
    try:
        result = subprocess.run(
            [node, str(Path(__file__).with_suffix(".mjs"))], input=html,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=65,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        if result.returncode or not result.stdout.startswith(b"%PDF-"):
            # Do not return subprocess diagnostics: they may contain document data.
            raise HTTPException(503, "Não foi possível gerar o PDF. Verifique a instalação do Chromium para exportação.")
        return result.stdout
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "A geração do PDF excedeu o tempo limite. Tente novamente.")
    except OSError:
        raise HTTPException(503, "Renderizador PDF indisponível.")
    finally:
        _slots.release()
