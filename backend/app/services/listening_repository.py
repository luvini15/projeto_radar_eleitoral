from __future__ import annotations

import csv
import hashlib
import io
import ipaddress
import json
import socket
from collections import Counter, defaultdict
from datetime import datetime, time, timedelta, timezone
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

import httpx
from sqlmodel import Session, select

from app.models import ListeningAlert, ListeningItem, ListeningSource, WeeklyEvidenceReport, utc_now
from app.services.territorial_listening import _plain, classify_text


SP_TZ = ZoneInfo("America/Sao_Paulo")
ALLOWED_SOURCE_TYPES = {"WORDPRESS", "OUV_CSV"}


def validate_public_source_url(value: str) -> str:
    parsed = urlparse(value.strip())
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("A fonte deve usar uma URL HTTPS pública, sem credenciais.")
    if parsed.port not in (None, 443):
        raise ValueError("A fonte deve usar a porta HTTPS padrão.")
    try:
        addresses = {row[4][0] for row in socket.getaddrinfo(parsed.hostname, 443, type=socket.SOCK_STREAM)}
    except socket.gaierror as exc:
        raise ValueError("O domínio da fonte não pôde ser resolvido.") from exc
    if not addresses or any(not ipaddress.ip_address(address).is_global for address in addresses):
        raise ValueError("A fonte deve apontar para um endereço público.")
    return value.strip()


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    for parser in (
        lambda raw: datetime.fromisoformat(raw.replace("Z", "+00:00")),
        lambda raw: datetime.strptime(raw, "%d/%m/%Y %H:%M").replace(tzinfo=SP_TZ),
    ):
        try:
            parsed = parser(value.strip())
            return parsed.replace(tzinfo=SP_TZ) if parsed.tzinfo is None else parsed
        except ValueError:
            continue
    return None


def _wp_rows(response: httpx.Response, source: ListeningSource, limit: int) -> list[dict]:
    rows = response.json()
    if not isinstance(rows, list):
        raise ValueError("A API WordPress não retornou uma lista.")
    result = []
    for row in rows:
        title = _plain((row.get("title") or {}).get("rendered"))
        excerpt = _plain((row.get("excerpt") or {}).get("rendered"))[:2000]
        link = str(row.get("link") or "")
        if not title or not link:
            continue
        result.append({
            "external_id": str(row.get("id") or hashlib.sha256(link.encode()).hexdigest()),
            "evidence_kind": "NEWS", "title": title, "excerpt": excerpt, "url": link,
            "published_at": _parse_datetime(row.get("date")),
            **classify_text(title, excerpt, source.scope_ra),
        })
    return result[:limit]


def _decode_csv(content: bytes) -> str:
    for encoding in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    return content.decode("utf-8", errors="replace")


def _ouv_rows(response: httpx.Response, source: ListeningSource, limit: int) -> list[dict]:
    text = _decode_csv(response.content)
    lines = text.splitlines()
    header_index = next((index for index, line in enumerate(lines) if "Protocolo" in line and "Classifica" in line), None)
    if header_index is None:
        raise ValueError("Cabeçalho do CSV OUV-DF não identificado.")
    reader = csv.DictReader(io.StringIO("\n".join(lines[header_index:])), delimiter=";")
    result = []
    for row in reader:
        protocol = (row.get("Protocolo") or "").strip()
        classification = (row.get("Classificação") or row.get("ClassificaÃ§Ã£o") or "Manifestação").strip()
        subject = (row.get("Assunto") or "Assunto não informado").strip()
        status = (row.get("Situação") or row.get("SituaÃ§Ã£o") or "").strip()
        if not protocol:
            continue
        title = f"{classification}: {subject}"
        excerpt = f"Protocolo {protocol}. Situação: {status or 'não informada'}."
        classified = classify_text(title, excerpt, source.scope_ra)
        result.append({
            "external_id": protocol, "evidence_kind": "OFFICIAL_COMPLAINT", "title": title,
            "excerpt": excerpt, "url": source.url, "published_at": _parse_datetime(row.get("Entrada")),
            **classified,
            "issue_signal": classification.casefold() in {"reclamação", "denúncia", "solicitação"},
        })
    return result[:limit]


def sync_source(session: Session, source: ListeningSource, limit: int = 100) -> dict:
    if source.source_type not in ALLOWED_SOURCE_TYPES:
        raise ValueError("Tipo de fonte não suportado.")
    validate_public_source_url(source.url)
    now = utc_now()
    created = updated = 0
    try:
        with httpx.Client(timeout=20, follow_redirects=True, headers={"User-Agent": "DataSight/0.2 evidence-monitor"}) as client:
            if source.source_type == "WORDPRESS":
                response = client.get(source.url, params={"per_page": min(limit, 100), "_fields": "id,date,link,title,excerpt"})
                response.raise_for_status()
                rows = _wp_rows(response, source, limit)
            else:
                response = client.get(source.url)
                response.raise_for_status()
                rows = _ouv_rows(response, source, limit)
        for row in rows:
            item = session.exec(select(ListeningItem).where(
                ListeningItem.source_id == source.id,
                ListeningItem.external_id == row["external_id"],
            )).first()
            if item:
                updated += 1
            else:
                item = ListeningItem(source_id=source.id, external_id=row["external_id"])
                created += 1
            item.evidence_kind = row["evidence_kind"]
            item.title = row["title"]
            item.excerpt = row["excerpt"]
            item.url = row["url"]
            item.published_at = row["published_at"]
            item.ra = row["ra"]
            item.ra_method = row["ra_method"]
            item.topics_json = json.dumps(row["topics"], ensure_ascii=False)
            item.issue_signal = row["issue_signal"]
            item.collected_at = now
            session.add(item)
        source.last_status = "ok"
        source.last_error = None
        source.last_items_count = len(rows)
    except (httpx.HTTPError, ValueError, TypeError, json.JSONDecodeError) as exc:
        source.last_status = "error"
        source.last_error = str(exc)[:1000]
        source.last_items_count = 0
        rows = []
    source.last_checked_at = now
    source.updated_at = now
    session.add(source)
    session.commit()
    return {"source_id": source.id, "name": source.name, "status": source.last_status, "received": len(rows), "created": created, "updated": updated, "error": source.last_error}


def sync_active_sources(session: Session, limit: int = 100) -> list[dict]:
    sources = session.exec(select(ListeningSource).where(ListeningSource.active == True).order_by(ListeningSource.id)).all()  # noqa: E712
    return [sync_source(session, source, limit) for source in sources]


def source_payload(source: ListeningSource) -> dict:
    return {
        "id": source.id, "name": source.name, "source_type": source.source_type, "url": source.url,
        "scope_ra": source.scope_ra, "active": source.active, "official": source.official,
        "last_status": source.last_status, "last_error": source.last_error,
        "last_items_count": source.last_items_count, "last_checked_at": source.last_checked_at,
    }


def item_payload(item: ListeningItem, source: ListeningSource) -> dict:
    try:
        topics = json.loads(item.topics_json)
    except json.JSONDecodeError:
        topics = []
    return {
        "id": str(item.id), "source_id": str(source.id), "source_name": source.name,
        "source_type": source.source_type, "evidence_kind": item.evidence_kind,
        "title": item.title, "excerpt": item.excerpt, "url": item.url,
        "published_at": item.published_at, "ra": item.ra, "ra_method": item.ra_method,
        "topics": topics, "issue_signal": item.issue_signal,
    }


def listening_payload(session: Session, max_items: int = 500) -> dict:
    sources = list(session.exec(select(ListeningSource).order_by(ListeningSource.id)).all())
    active_ids = [source.id for source in sources if source.active]
    items = list(session.exec(
        select(ListeningItem).where(ListeningItem.source_id.in_(active_ids)).order_by(ListeningItem.published_at.desc()).limit(max_items)
    ).all()) if active_ids else []
    source_map = {source.id: source for source in sources}
    rows = [item_payload(item, source_map[item.source_id]) for item in items if item.source_id in source_map]
    topic_counts = Counter(topic for item in rows for topic in item["topics"])
    ra_counts = Counter(item["ra"] for item in rows if item["ra"])
    day_counts = Counter(item["published_at"].astimezone(SP_TZ).date().isoformat() for item in rows if item["published_at"])
    return {
        "collected_at": max((source.last_checked_at for source in sources if source.last_checked_at), default=None),
        "coverage": {
            "sources_configured": len(sources), "sources_available": sum(source.active and source.last_status == "ok" for source in sources),
            "items_collected": len(rows), "items_with_ra": sum(bool(item["ra"]) for item in rows),
            "items_with_issue_signal": sum(item["issue_signal"] for item in rows),
        },
        "methodology": {
            "scope": "Evidências públicas persistidas das fontes ativas.",
            "issue_signal": "Classificação determinística; requer leitura da evidência.",
            "not_public_opinion": True,
        },
        "sources": [source_payload(source) for source in sources],
        "topics": [{"name": name, "count": count} for name, count in topic_counts.most_common()],
        "regions": [{"name": name, "count": count} for name, count in ra_counts.most_common()],
        "timeline": [{"date": date, "count": count} for date, count in sorted(day_counts.items())],
        "items": rows,
    }


def rebuild_alerts(session: Session, campaign_id: int, window_days: int = 14) -> list[ListeningAlert]:
    since = utc_now() - timedelta(days=window_days)
    items = list(session.exec(select(ListeningItem).where(
        ListeningItem.issue_signal == True,  # noqa: E712
        ListeningItem.published_at >= since,
        ListeningItem.ra.is_not(None),
    )).all())
    grouped: dict[tuple[str, str], list[ListeningItem]] = defaultdict(list)
    for item in items:
        try:
            topics = json.loads(item.topics_json)
        except json.JSONDecodeError:
            topics = []
        for topic in topics:
            grouped[(item.ra, topic)].append(item)
    alerts = []
    for (ra, topic), evidence in grouped.items():
        days = {item.published_at.astimezone(SP_TZ).date() for item in evidence if item.published_at}
        if len(evidence) < 3 or len(days) < 2:
            continue
        fingerprint = hashlib.sha256(f"{campaign_id}|{window_days}|{ra}|{topic}".encode()).hexdigest()
        alert = session.exec(select(ListeningAlert).where(ListeningAlert.fingerprint == fingerprint)).first()
        status = alert.status if alert else "NEW"
        alert = alert or ListeningAlert(
            fingerprint=fingerprint, campaign_id=campaign_id, ra=ra, topic=topic,
            first_seen_at=min(item.published_at for item in evidence if item.published_at),
            last_seen_at=max(item.published_at for item in evidence if item.published_at),
        )
        alert.window_days = window_days
        alert.evidence_count = len(evidence)
        alert.source_count = len({item.source_id for item in evidence})
        alert.first_seen_at = min(item.published_at for item in evidence if item.published_at)
        alert.last_seen_at = max(item.published_at for item in evidence if item.published_at)
        alert.generated_at = utc_now()
        alert.status = status
        session.add(alert); alerts.append(alert)
    session.commit()
    for alert in alerts:
        session.refresh(alert)
    return sorted(alerts, key=lambda alert: (alert.last_seen_at, alert.evidence_count), reverse=True)


def alert_payload(alert: ListeningAlert) -> dict:
    return {
        "id": alert.id, "ra": alert.ra, "topic": alert.topic, "window_days": alert.window_days,
        "evidence_count": alert.evidence_count, "source_count": alert.source_count,
        "first_seen_at": alert.first_seen_at, "last_seen_at": alert.last_seen_at,
        "status": alert.status, "generated_at": alert.generated_at,
        "rule": "3 ou mais evidências em pelo menos 2 dias distintos",
    }


def region_payload(session: Session, ra: str, days: int = 30) -> dict:
    since = utc_now() - timedelta(days=days)
    items = list(session.exec(select(ListeningItem).where(
        ListeningItem.ra == ra,
        ListeningItem.published_at >= since,
    ).order_by(ListeningItem.published_at.desc())).all())
    source_ids = {item.source_id for item in items}
    sources = {source.id: source for source in session.exec(select(ListeningSource).where(ListeningSource.id.in_(source_ids))).all()} if source_ids else {}
    rows = [item_payload(item, sources[item.source_id]) for item in items if item.source_id in sources]
    topics = Counter(topic for row in rows for topic in row["topics"])
    source_counts = Counter(row["source_name"] for row in rows)
    days_count = Counter(row["published_at"].astimezone(SP_TZ).date().isoformat() for row in rows if row["published_at"])
    alerts = session.exec(select(ListeningAlert).where(ListeningAlert.ra == ra).order_by(ListeningAlert.last_seen_at.desc())).all()
    return {
        "region": ra, "period_days": days,
        "summary": {"evidence_count": len(rows), "issue_signals": sum(row["issue_signal"] for row in rows), "source_count": len(source_counts), "active_days": len(days_count)},
        "topics": [{"name": name, "count": count} for name, count in topics.most_common()],
        "sources": [{"name": name, "count": count} for name, count in source_counts.most_common()],
        "timeline": [{"date": date, "count": count} for date, count in sorted(days_count.items())],
        "alerts": [alert_payload(alert) for alert in alerts], "items": rows,
    }


def generate_weekly_report(session: Session, campaign_id: int, end_date=None) -> WeeklyEvidenceReport:
    local_end_date = end_date or datetime.now(SP_TZ).date()
    local_start_date = local_end_date - timedelta(days=6)
    start = datetime.combine(local_start_date, time.min, tzinfo=SP_TZ).astimezone(timezone.utc)
    end = datetime.combine(local_end_date, time.max, tzinfo=SP_TZ).astimezone(timezone.utc)
    existing = session.exec(select(WeeklyEvidenceReport).where(
        WeeklyEvidenceReport.campaign_id == campaign_id,
        WeeklyEvidenceReport.week_start == start,
        WeeklyEvidenceReport.week_end == end,
    )).first()
    items = list(session.exec(select(ListeningItem).where(
        ListeningItem.published_at >= start,
        ListeningItem.published_at <= end,
    ).order_by(ListeningItem.published_at.desc())).all())
    source_ids = {item.source_id for item in items}
    sources = {source.id: source for source in session.exec(select(ListeningSource).where(ListeningSource.id.in_(source_ids))).all()} if source_ids else {}
    rows = [item_payload(item, sources[item.source_id]) for item in items if item.source_id in sources]
    topics = Counter(topic for row in rows for topic in row["topics"])
    regions = Counter(row["ra"] for row in rows if row["ra"])
    issue_rows = [row for row in rows if row["issue_signal"]]
    data = {
        "period": {"start": local_start_date.isoformat(), "end": local_end_date.isoformat()},
        "summary": {"evidence_count": len(rows), "issue_signals": len(issue_rows), "source_count": len(source_ids), "regions_identified": len(regions)},
        "topics": [{"name": name, "count": count} for name, count in topics.most_common()],
        "regions": [{"name": name, "count": count} for name, count in regions.most_common()],
        "evidence": rows[:20],
        "methodology": {"not_public_opinion": True, "generated_from_persisted_evidence": True},
    }
    lines = [
        f"# Relatório semanal de evidências · {local_start_date.strftime('%d/%m/%Y')} a {local_end_date.strftime('%d/%m/%Y')}", "",
        f"- Evidências coletadas: {len(rows)}", f"- Sinais automáticos de problema: {len(issue_rows)}",
        f"- Fontes representadas: {len(source_ids)}", f"- Regiões identificadas: {len(regions)}", "",
        "## Temas observados", *([f"- {name}: {count}" for name, count in topics.most_common()] or ["- Nenhuma evidência no período."]), "",
        "## Regiões mencionadas", *([f"- {name}: {count}" for name, count in regions.most_common()] or ["- Nenhuma RA identificada."]), "",
        "## Evidências", *([f"- [{row['title']}]({row['url']}) · {row['source_name']}" for row in rows[:20]] or ["- Nenhuma evidência no período."]), "",
        "> Limitação: menções nas fontes monitoradas não representam a opinião de toda a população.",
    ]
    markdown = "\n".join(lines)
    report = existing or WeeklyEvidenceReport(campaign_id=campaign_id, week_start=start, week_end=end, data_json="{}", markdown="")
    report.data_json = json.dumps(data, ensure_ascii=False, default=str)
    report.markdown = markdown
    report.generated_at = utc_now()
    session.add(report); session.commit(); session.refresh(report)
    return report


def report_payload(report: WeeklyEvidenceReport) -> dict:
    return {
        "id": report.id, "campaign_id": report.campaign_id, "week_start": report.week_start,
        "week_end": report.week_end, "data": json.loads(report.data_json), "markdown": report.markdown,
        "generated_at": report.generated_at,
    }
