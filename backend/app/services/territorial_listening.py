from __future__ import annotations

import html
import re
import threading
import time
import unicodedata
from collections import Counter
from datetime import datetime

import httpx


SOURCES = (
    {
        "id": "df-samambaia",
        "name": "DF Samambaia",
        "type": "LOCAL_NEWS",
        "scope_ra": "Samambaia",
        "url": "https://dfsamambaia.com.br/wp-json/wp/v2/posts",
    },
    {
        "id": "df-taguatinga",
        "name": "DF Taguatinga",
        "type": "LOCAL_NEWS",
        "scope_ra": "Taguatinga",
        "url": "https://www.dftaguatinga.com.br/wp-json/wp/v2/posts",
    },
    {
        "id": "noticiario-df",
        "name": "Noticiário DF",
        "type": "LOCAL_NEWS",
        "scope_ra": None,
        "url": "https://noticiariodf.com.br/wp-json/wp/v2/posts",
    },
)

RA_ALIASES = {
    "Plano Piloto": ("plano piloto", "asa norte", "asa sul"),
    "Gama": ("gama",), "Taguatinga": ("taguatinga",), "Brazlândia": ("brazlandia",),
    "Sobradinho": ("sobradinho",), "Planaltina": ("planaltina",), "Paranoá": ("paranoa",),
    "Núcleo Bandeirante": ("nucleo bandeirante",), "Ceilândia": ("ceilandia",), "Guará": ("guara",),
    "Cruzeiro": ("cruzeiro",), "Samambaia": ("samambaia",), "Santa Maria": ("santa maria",),
    "São Sebastião": ("sao sebastiao",), "Recanto das Emas": ("recanto das emas",),
    "Lago Sul": ("lago sul",), "Riacho Fundo": ("riacho fundo",), "Lago Norte": ("lago norte",),
    "Candangolândia": ("candangolandia",), "Águas Claras": ("aguas claras",), "Riacho Fundo II": ("riacho fundo ii",),
    "Sudoeste/Octogonal": ("sudoeste", "octogonal"), "Varjão": ("varjao",), "Park Way": ("park way",),
    "SCIA/Estrutural": ("estrutural", "scia"), "Sobradinho II": ("sobradinho ii",), "Jardim Botânico": ("jardim botanico",),
    "Itapoã": ("itapoa",), "SIA": ("sia",), "Vicente Pires": ("vicente pires",), "Fercal": ("fercal",),
    "Sol Nascente/Pôr do Sol": ("sol nascente", "por do sol"), "Arniqueira": ("arniqueira",),
    "Arapoanga": ("arapoanga",), "Água Quente": ("agua quente",),
}

TOPICS = {
    "Infraestrutura urbana": ("buraco", "asfalto", "paviment", "calcada", "viaduto", "obra", "alagamento", "enchente"),
    "Transporte e mobilidade": ("onibus", "metro", "transporte", "transito", "mobilidade", "rodoviaria", "ciclovia"),
    "Saúde": ("saude", "hospital", "ubs", "upa", "medic", "consulta", "dengue"),
    "Segurança": ("seguranca", "crime", "roubo", "furto", "violencia", "policia", "assalto"),
    "Limpeza e saneamento": ("lixo", "entulho", "limpeza", "esgoto", "saneamento", "agua", "caesb"),
    "Iluminação e energia": ("iluminacao", "poste", "energia", "apagao", "luz"),
    "Educação": ("escola", "creche", "educacao", "professor", "aluno"),
    "Meio ambiente": ("meio ambiente", "incendio", "queimada", "parque", "arvore", "poluicao"),
    "Habitação": ("moradia", "habitacao", "regularizacao", "condominio", "ocupacao"),
}

ISSUE_TERMS = (
    "reclama", "problema", "falta", "sem ", "buraco", "abandono", "demora", "risco", "precario",
    "interromp", "suspens", "alag", "denuncia", "cobra", "transtorno", "falha", "defeito",
)

_cache: dict[tuple[int], tuple[float, dict]] = {}
_cache_lock = threading.Lock()


def _plain(value: str | None) -> str:
    text = re.sub(r"<[^>]+>", " ", html.unescape(value or ""))
    return re.sub(r"\s+", " ", text).strip()


def _normalized(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def classify_text(title: str, excerpt: str, scope_ra: str | None = None) -> dict:
    searchable = _normalized(f"{title} {excerpt}")
    ra = None
    for name, aliases in RA_ALIASES.items():
        if any(re.search(rf"\b{re.escape(alias)}\b", searchable) for alias in aliases):
            ra = name
            break
    ra_method = "text_mention" if ra else ("source_scope" if scope_ra else None)
    ra = ra or scope_ra
    topics = [name for name, keywords in TOPICS.items() if any(keyword in searchable for keyword in keywords)]
    return {
        "ra": ra,
        "ra_method": ra_method,
        "topics": topics or ["Outros assuntos"],
        "issue_signal": any(term in searchable for term in ISSUE_TERMS),
    }


def _fetch_source(client: httpx.Client, source: dict, limit: int) -> tuple[list[dict], dict]:
    try:
        response = client.get(source["url"], params={"per_page": limit, "_fields": "id,date,link,title,excerpt"})
        response.raise_for_status()
        rows = response.json()
        if not isinstance(rows, list):
            raise ValueError("Resposta inesperada")
        items = []
        for row in rows:
            title = _plain((row.get("title") or {}).get("rendered"))
            excerpt = _plain((row.get("excerpt") or {}).get("rendered"))[:800]
            if not title or not row.get("link"):
                continue
            classification = classify_text(title, excerpt, source["scope_ra"])
            items.append({
                "id": f"{source['id']}:{row.get('id')}",
                "source_id": source["id"], "source_name": source["name"], "source_type": source["type"],
                "title": title, "excerpt": excerpt, "url": row["link"], "published_at": row.get("date"),
                **classification,
            })
        return items, {"id": source["id"], "name": source["name"], "status": "ok", "items": len(items)}
    except (httpx.HTTPError, ValueError, TypeError):
        return [], {"id": source["id"], "name": source["name"], "status": "unavailable", "items": 0}


def collect_listening(limit_per_source: int = 20) -> dict:
    key = (limit_per_source,)
    with _cache_lock:
        cached = _cache.get(key)
        if cached and time.monotonic() - cached[0] < 900:
            return {**cached[1], "cached": True}

    items, source_status = [], []
    with httpx.Client(timeout=12, follow_redirects=True, headers={"User-Agent": "DataSight/0.1 public-news-monitor"}) as client:
        for source in SOURCES:
            source_items, status = _fetch_source(client, source, limit_per_source)
            items.extend(source_items); source_status.append(status)

    unique = {}
    for item in items:
        unique.setdefault(_normalized(item["title"]), item)
    items = sorted(unique.values(), key=lambda item: item.get("published_at") or "", reverse=True)
    topic_counts = Counter(topic for item in items for topic in item["topics"])
    ra_counts = Counter(item["ra"] for item in items if item["ra"])
    day_counts = Counter(str(item.get("published_at") or "")[:10] for item in items if item.get("published_at"))
    payload = {
        "collected_at": datetime.now().astimezone().isoformat(),
        "cached": False,
        "coverage": {
            "sources_configured": len(SOURCES), "sources_available": sum(row["status"] == "ok" for row in source_status),
            "items_collected": len(items), "items_with_ra": sum(bool(item["ra"]) for item in items),
            "items_with_issue_signal": sum(item["issue_signal"] for item in items),
        },
        "methodology": {
            "scope": "Manchetes e resumos publicos das fontes configuradas.",
            "issue_signal": "Correspondencia deterministica de termos; requer leitura da evidencia.",
            "not_public_opinion": True,
            "cache_minutes": 15,
        },
        "sources": source_status,
        "topics": [{"name": name, "count": count} for name, count in topic_counts.most_common()],
        "regions": [{"name": name, "count": count} for name, count in ra_counts.most_common()],
        "timeline": [{"date": date, "count": count} for date, count in sorted(day_counts.items())],
        "items": items,
    }
    with _cache_lock:
        _cache[key] = (time.monotonic(), payload)
    return payload
