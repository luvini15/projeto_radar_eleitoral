"""Idempotent local imports. Never calls a collection provider."""
from __future__ import annotations

import csv
import re
from pathlib import Path
from urllib.parse import urlparse
from zipfile import ZipFile
import xml.etree.ElementTree as ET
from sqlalchemy import func
from sqlmodel import Session, select
from app.models import AdministrativeRegion, Campaign, CampaignProfile, InstagramProfile, ProfileMonitoring, ProfileRegion
from app.services.taxonomy import normalize_text

DF_GENERAL = ("metropoles.df", "correio.braziliense", "jornaldebrasilia", "distritonews", "daquidebrasilia", "dicasdacapital", "brasilia.indica", "culturakidsbsb", "esporte.df", "gov_df", "sececdf")
HEADER_MAP = {"regiao administrativa": "region", "ra": "region", "perfil instagram": "username", "username": "username", "link instagram": "url", "url": "url", "descricao informada": "description", "descricao": "description", "relevancia": "relevance", "status": "status", "ativo": "active"}


def normalize_username(value):
    username = str(value or "").strip().lstrip("@").lower()
    if not re.fullmatch(r"[a-z0-9_.]{1,30}", username):
        raise ValueError("Username inválido")
    return username


def canonical_url(username, value=None):
    if value:
        parsed = urlparse(str(value).strip())
        if parsed.scheme not in {"https", "http"} or parsed.hostname not in {"instagram.com", "www.instagram.com"} or parsed.path.strip("/").lower() != username:
            raise ValueError("URL não corresponde ao perfil Instagram")
    return f"https://www.instagram.com/{username}/"


def spreadsheet_rows(path):
    path = Path(path)
    if path.suffix.lower() == ".csv":
        with path.open(encoding="utf-8-sig", newline="") as stream:
            sample = stream.read(4096); stream.seek(0)
            dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
            rows = list(csv.reader(stream, dialect))
    elif path.suffix.lower() == ".xlsx":
        ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
        rows = []
        with ZipFile(path) as archive:
            strings = []
            if "xl/sharedStrings.xml" in archive.namelist():
                strings = ["".join(t.text or "" for t in x.findall(".//m:t", ns)) for x in ET.fromstring(archive.read("xl/sharedStrings.xml"))]
            for name in sorted(archive.namelist()):
                if not re.fullmatch(r"xl/worksheets/sheet\d+.xml", name): continue
                for row in ET.fromstring(archive.read(name)).findall("m:sheetData/m:row", ns):
                    cells = {}
                    for cell in row.findall("m:c", ns):
                        column = 0
                        for char in re.match(r"[A-Z]+", cell.get("r", "A1"))[0]: column = column*26+ord(char)-64
                        value = cell.find("m:v", ns)
                        value = value.text if value is not None else "".join(t.text or "" for t in cell.findall(".//m:t", ns))
                        if cell.get("t") == "s": value = strings[int(value)]
                        cells[column-1] = value
                    rows.append([cells.get(i, "") for i in range(max(cells, default=-1)+1)])
    else:
        raise ValueError("Use uma planilha XLSX ou CSV")
    headers = None; result = []
    for row in rows:
        mapped = [HEADER_MAP.get(normalize_text(str(x or "")).strip()) for x in row]
        if "username" in mapped:
            headers = mapped; continue
        if headers is None: continue
        item = {key: row[i] for i, key in enumerate(headers) if key and i < len(row)}
        if item.get("username"): result.append(item)
    if headers is None: raise ValueError("Cabeçalho Perfil Instagram/username não encontrado")
    return result


def import_profiles(session: Session, campaign_id, rows, *, general=False, source_file=None, confirm_territorial=False):
    campaign = session.get(Campaign, campaign_id)
    if not campaign: raise ValueError("Campanha não encontrada")
    regions = {normalize_text(r.name).strip(): r for r in session.exec(select(AdministrativeRegion)).all()}
    result = {"requested": len(rows), "new": 0, "existing": 0, "linked": 0, "already_linked": 0, "duplicate_rows": 0, "profiles": [], "errors": [], "conflicts": []}
    seen = set()
    for i, item in enumerate(rows, 1):
        try:
            username = normalize_username(item.get("username")); url = canonical_url(username, item.get("url"))
            region = None if general else regions.get(normalize_text(item.get("region")).strip())
            if not general and item.get("region") and region is None: raise ValueError("RA não cadastrada: " + str(item["region"]))
            if username in seen:
                result["duplicate_rows"] += 1; continue
            seen.add(username)
            profile = session.exec(select(InstagramProfile).where(
                InstagramProfile.owner_user_id == campaign.owner_user_id,
                func.lower(InstagramProfile.username) == username,
            )).first()
            created = profile is None
            if created:
                profile = InstagramProfile(owner_user_id=campaign.owner_user_id, username=username)
                session.add(profile); session.flush()
            existing_region = session.exec(select(ProfileRegion).where(ProfileRegion.profile_id == profile.id)).first()
            if general and existing_region:
                result["conflicts"].append({"username": username, "reason": "Perfil geral possui associação territorial preexistente; não alterada. Revisão necessária."})
                continue
            result["new" if created else "existing"] += 1
            metadata = session.get(ProfileMonitoring, profile.id)
            if metadata is None:
                metadata = ProfileMonitoring(profile_id=profile.id, scope="DF_GENERAL" if general else "TERRITORIAL", url=url, description=item.get("description") or None, relevance=str(item["relevance"]) if item.get("relevance") is not None else None, source_file=source_file, source_status=item.get("status"), source_active=str(item["active"]) if item.get("active") is not None else None)
                session.add(metadata)
            elif general:
                metadata.scope = "DF_GENERAL"; session.add(metadata)
            if confirm_territorial and region and not general:
                metadata.scope = "TERRITORIAL"; metadata.url = url; session.add(metadata)
                if existing_region:
                    existing_region.region_id = region.id; session.add(existing_region)
            if region and not existing_region and metadata.scope != "DF_GENERAL":
                session.add(ProfileRegion(profile_id=profile.id, region_id=region.id))
            elif region and existing_region and existing_region.region_id != region.id:
                result["conflicts"].append({"username": username, "reason": "RA preexistente preservada; divergência com a planilha"})
            link = session.exec(select(CampaignProfile).where(CampaignProfile.campaign_id == campaign_id, CampaignProfile.profile_id == profile.id)).first()
            if link:
                if confirm_territorial and not general:
                    link.role = "LOCAL_PAGE"; link.active = True; session.add(link)
                result["already_linked"] += 1
            else:
                status = normalize_text(str(item.get("status") or "")).strip()
                active_value = item.get("active")
                active = True if general else (normalize_text(str(active_value)).strip() in {"ativo", "sim", "true", "1"} if active_value is not None else status in {"valido", ""})
                link = CampaignProfile(campaign_id=campaign_id, profile_id=profile.id, role="DF_GENERAL" if general else "LOCAL_PAGE", active=active)
                session.add(link); result["linked"] += 1
            session.flush()
            result["profiles"].append({"profile_id": profile.id, "username": profile.username, "url": metadata.url, "scope": metadata.scope, "region": session.get(AdministrativeRegion, existing_region.region_id).name if existing_region else region.name if region else None, "active": link.active, "new": created})
        except ValueError as exc:
            result["errors"].append({"row": i, "reason": str(exc)})
    session.commit()
    return result


PLANALTINA_PROFILES = ("deolhoemplanaltina", "planaltinanews", "jornalplanaltinaa", "fala_planaltina")


def register_planaltina_profiles(session: Session, campaign_id: int):
    """Explicitly authorized registration; processes only these profiles' existing posts."""
    from app.models import InstagramPost
    from app.services.territorial_detection import classify_post
    rows = [{"username": name, "region": "Planaltina", "active": "true"} for name in PLANALTINA_PROFILES]
    result = import_profiles(session, campaign_id, rows, source_file="Lista Planaltina fornecida pela equipe", confirm_territorial=True)
    result["posts_processed"] = 0
    for item in result["profiles"]:
        posts = session.exec(select(InstagramPost).where(InstagramPost.profile_id == item["profile_id"])).all()
        for post in posts: classify_post(session, post)
        item["posts_local"] = len(posts)
        item["message"] = "Posts locais classificados." if posts else "Perfil cadastrado, mas ainda sem posts locais no banco."
        result["posts_processed"] += len(posts)
    session.commit()
    return result
