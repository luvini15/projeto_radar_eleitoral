"""Health and backup freshness check. Schedule every five minutes."""
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen


def main() -> int:
    alerts = []
    health_url = os.getenv("HEALTH_URL", "")
    if not health_url or urlparse(health_url).scheme != "https":
        alerts.append("HEALTH_URL HTTPS nao configurada")
    else:
        try:
            with urlopen(health_url, timeout=10) as response:
                if response.status != 200 or json.load(response).get("status") != "ok":
                    alerts.append("API com falha no health check")
        except Exception:
            alerts.append("API indisponivel")
    directory = Path(os.getenv("BACKUP_DIR", "backups"))
    backups = list(directory.glob("radar-*.dump.enc")) if directory.exists() else []
    max_age = timedelta(hours=max(1, int(os.getenv("BACKUP_MAX_AGE_HOURS", "26"))))
    if not backups or datetime.now(timezone.utc) - datetime.fromtimestamp(max(p.stat().st_mtime for p in backups), timezone.utc) > max_age:
        alerts.append("Backup criptografado ausente ou antigo")
    if not alerts:
        return 0
    message = {"service": "radar-eleitoral", "severity": "critical", "alerts": alerts}
    webhook = os.getenv("ALERT_WEBHOOK_URL", "")
    if urlparse(webhook).scheme == "https":
        try:
            request = Request(webhook, data=json.dumps(message).encode(), headers={"Content-Type": "application/json"}, method="POST")
            with urlopen(request, timeout=10) as response:
                if response.status >= 300:
                    raise RuntimeError("webhook falhou")
        except Exception:
            print("Falha ao enviar alerta", file=sys.stderr)
    print(json.dumps(message), file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
