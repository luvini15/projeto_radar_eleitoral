from __future__ import annotations

import html
import json
from datetime import datetime, time, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from typing import Literal
from app.services.territorial_detection import classify_existing, is_general
from app.services.profile_import import DF_GENERAL, import_profiles
from sqlmodel import Session, select

from app.database import get_session
from app.models import AdministrativeRegion, Campaign, GeneratedReport, InstagramProfile, InstagramPost, PostTheme, ProfileRegion, Theme
from app.services.taxonomy import classify_theme, theme_names
from app.services.trends import build_trends, TrendProfileGroup

router = APIRouter(prefix="/api", tags=["territorial intelligence"])

DF_REGIONS = ["Plano Piloto", "Gama", "Taguatinga", "Brazlândia", "Sobradinho", "Planaltina", "Paranoá", "Núcleo Bandeirante", "Ceilândia", "Guará", "Cruzeiro", "Samambaia", "Santa Maria", "São Sebastião", "Recanto das Emas", "Lago Sul", "Riacho Fundo", "Lago Norte", "Candangolândia", "Águas Claras", "Riacho Fundo II", "Sudoeste/Octogonal", "Varjão", "Park Way", "SCIA/Estrutural", "Sobradinho II", "Jardim Botânico", "Itapoã", "SIA", "Vicente Pires", "Fercal", "Sol Nascente/Pôr do Sol", "Arniqueira", "Arapoanga", "Água Quente"]


class ProfileRegionInput(BaseModel):
    region_id: int


class ReportInput(BaseModel):
    region_id: int | None = None
    start_date: str
    end_date: str
    report_type: str = "Diagnóstico Territorial"


def seed_reference_data(session: Session) -> None:
    existing_regions = {row.name for row in session.exec(select(AdministrativeRegion)).all()}
    existing_themes = {row.name for row in session.exec(select(Theme)).all()}
    for name in DF_REGIONS:
        if name not in existing_regions:
            session.add(AdministrativeRegion(name=name))
    for name in theme_names():
        if name not in existing_themes:
            session.add(Theme(name=name))
    session.commit()


def _dates(start_date: str, end_date: str) -> tuple[datetime, datetime]:
    try:
        start = datetime.combine(datetime.fromisoformat(start_date).date(), time.min, tzinfo=timezone.utc)
        end = datetime.combine(datetime.fromisoformat(end_date).date(), time.max, tzinfo=timezone.utc)
    except ValueError as exc:
        raise HTTPException(400, "Datas inválidas; use YYYY-MM-DD.") from exc
    if end < start:
        raise HTTPException(400, "A data final deve ser igual ou posterior à inicial.")
    if (end - start).days > 366:
        raise HTTPException(400, "O período máximo é de 366 dias.")
    return start, end


@router.get("/regions")
def regions(session: Session = Depends(get_session)):
    return {"regions": session.exec(select(AdministrativeRegion).where(AdministrativeRegion.active == True).order_by(AdministrativeRegion.name)).all()}  # noqa: E712


@router.put("/profiles/{profile_id}/region")
def set_profile_region(profile_id: int, payload: ProfileRegionInput, session: Session = Depends(get_session)):
    if not session.get(InstagramProfile, profile_id): raise HTTPException(404, "Perfil não encontrado.")
    if is_general(session, profile_id): raise HTTPException(400, "Perfis gerais do DF não recebem RA fixa.")
    if not session.get(AdministrativeRegion, payload.region_id):
        raise HTTPException(404, "Região não encontrada.")
    item = session.exec(select(ProfileRegion).where(ProfileRegion.profile_id == profile_id)).first()
    if item:
        item.region_id = payload.region_id
    else:
        item = ProfileRegion(profile_id=profile_id, region_id=payload.region_id)
    session.add(item); session.commit(); session.refresh(item)
    return item


@router.post("/campaigns/{campaign_id}/classify-posts")
def classify_posts(campaign_id: int, session: Session = Depends(get_session)):
    if not session.get(Campaign, campaign_id):
        raise HTTPException(404, "Campanha não encontrada.")
    result = classify_existing(session, campaign_id)
    return {**result, "classified": result["posts_processed"], "source": "RULES"}


class ImportRow(BaseModel):
    username: str
    url: str | None = None
    region: str | None = None
    description: str | None = None
    relevance: str | None = None
    status: str | None = None
    active: str | None = None


class ImportInput(BaseModel):
    profiles: list[ImportRow] = Field(max_length=2000)


@router.post("/campaigns/{campaign_id}/profiles/import")
def import_territorial_profiles(campaign_id: int, payload: ImportInput, session: Session = Depends(get_session)):
    if not session.get(Campaign, campaign_id): raise HTTPException(404, "Campanha não encontrada.")
    return import_profiles(session, campaign_id, [row.model_dump() for row in payload.profiles], source_file="API")


@router.post("/campaigns/{campaign_id}/profiles/df-general")
def import_general_profiles(campaign_id: int, session: Session = Depends(get_session)):
    if not session.get(Campaign, campaign_id): raise HTTPException(404, "Campanha não encontrada.")
    return import_profiles(session, campaign_id, [{"username": name} for name in DF_GENERAL], general=True, source_file="Lista fornecida pela equipe")


@router.get("/campaigns/{campaign_id}/trends")
def trends(campaign_id: int, start_date: str, end_date: str, region_id: int | None = None, theme: str | None = None, profile_id: list[int] = Query(default=[]), format: str | None = None, session: Session = Depends(get_session), territorial_origin: Literal["PROFILE", "CONTENT", "LOCATION"] | None = None, profile_group: TrendProfileGroup = "ALL"):
    if not session.get(Campaign, campaign_id):
        raise HTTPException(404, "Campanha não encontrada.")
    start, end = _dates(start_date, end_date)
    data = build_trends(session, campaign_id, start, end, region_id, theme, profile_id, format, territorial_origin, profile_group=profile_group)
    for row in data["trends"]:
        row["small_comparison_base"] = 0 < row["previous_volume"] < 5
    return data


def _intelligence(data: dict) -> dict:
    rows = [row for row in data["trends"] if row["volume"]]
    alerts = [{"type": "theme_growth", "severity": "high" if (row["growth"] or 0) >= .5 else "medium", "title": f"{row['theme']} em crescimento", "description": f"O volume cresceu {round(row['growth'] * 100)}% frente ao período anterior.", "evidence": row["evidence"]} for row in rows if row["growth"] is not None and row["growth"] >= .2]
    problems = [{"theme": row["theme"], "description": f"Tema recorrente em {row['recurrence_days']} dias do período; requer leitura qualitativa das evidências.", "frequency": row["volume"], "interactions": row["interactions"], "evidence": row["evidence"]} for row in rows if row["recurrence_days"] >= 3 and row["volume"] >= 3]
    averages = sorted(row["average_interactions"] or 0 for row in rows)
    median = averages[len(averages) // 2] if averages else 0
    opportunities = [{"theme": row["theme"], "description": "Interação média acima da mediana com volume ainda baixo no recorte.", "priority": "high" if (row["average_interactions"] or 0) >= median * 1.5 else "medium", "evidence": row["evidence"]} for row in rows if row["volume"] <= max(2, sum(r["volume"] for r in rows) / max(len(rows), 1)) and (row["average_interactions"] or 0) > median]
    return {**data, "alerts": alerts, "problems": problems, "opportunities": opportunities, "limitations": ["A amostra digital não representa estatisticamente toda a população.", "Interações podem ser parciais quando compartilhamentos e salvamentos não estão disponíveis.", "Recorrência temática é um sinal para análise, não prova automática de problema público."]}


@router.get("/campaigns/{campaign_id}/intelligence")
def intelligence(campaign_id: int, start_date: str, end_date: str, region_id: int | None = None, session: Session = Depends(get_session), profile_group: TrendProfileGroup = "ALL"):
    if not session.get(Campaign, campaign_id):
        raise HTTPException(404, "Campanha não encontrada.")
    start, end = _dates(start_date, end_date)
    return _intelligence(build_trends(session, campaign_id, start, end, region_id, profile_group=profile_group))


def _report_html(campaign: Campaign, region: AdministrativeRegion | None, payload: ReportInput, intel: dict) -> str:
    rows = intel["trends"][:10]
    posts = sum(row["volume"] for row in rows)
    observed = [row["interactions"] for row in rows if row["interactions"] is not None]
    interactions = sum(observed) if observed else "N/D"
    region_name = region.name if region else "Todas as regiões"
    status = intel["data_status"]
    central = "Não há dados suficientes para concluir." if status != "SUFFICIENT" else (f"{rows[0]['theme']} lidera o recorte por relevância combinada de volume, variação, interação e recorrência." if rows else "Não há dados para o período.")
    theme_rows = "".join(
        f"<tr><td>{html.escape(r['theme'])}</td><td>{r['volume']}</td>"
        f"<td>{'Sem base' if r['growth'] is None else format(r['growth'] * 100, '+.1f') + '%'}</td>"
        f"<td>{r['interactions'] if r['interactions'] is not None else 'N/D'}</td><td>{r['relevance']}</td></tr>"
        for r in rows
    )
    evidence = "".join(f"<article><b>@{html.escape(str(e['profile'] or 'N/D'))}</b> · {str(e['date'])[:10]} · {html.escape(r['theme'])}<p>{html.escape(e['summary'])}</p><a href=\"{html.escape(e['url'], quote=True)}\">Abrir publicação</a></article>" for r in rows[:5] for e in r["evidence"][:1])
    return f"""<!doctype html><html lang='pt-BR'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width'><title>Radar Eleitoral — {html.escape(region_name)}</title><style>@page{{size:A4;margin:16mm;@bottom-center{{content:'Radar Eleitoral · ' counter(page)}}}}*{{box-sizing:border-box}}body{{font:14px Arial;color:#17233c;margin:0;background:#f4f7fb}}main{{max-width:1000px;margin:auto;background:white;padding:38px}}h1,h2{{color:#102a56}}.eyebrow{{color:#2868c7;font-weight:bold;letter-spacing:.12em}}.cards,.spo{{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:24px 0}}.card,article{{border:1px solid #dce4ef;border-radius:10px;padding:16px}}.card strong{{font-size:26px;display:block}}table{{width:100%;border-collapse:collapse}}th,td{{padding:10px;border-bottom:1px solid #dce4ef;text-align:left}}a{{color:#1764c0}}.note{{background:#eef5ff;padding:16px;border-left:4px solid #2868c7}}@media(max-width:700px){{main{{padding:20px}}.cards,.spo{{grid-template-columns:1fr}}}}@media print{{body{{background:white}}main{{padding:0}}a{{color:#1764c0}}article{{break-inside:avoid}}}}</style></head><body><main><p class='eyebrow'>RADAR ELEITORAL</p><h1>{html.escape(payload.report_type)}</h1><h2>{html.escape(region_name)}</h2><p>{payload.start_date} — {payload.end_date}</p><section class='cards'><div class='card'>Publicações<strong>{posts}</strong></div><div class='card'>Temas<strong>{len(rows)}</strong></div><div class='card'>Interações observadas<strong>{interactions}</strong></div></section><section class='spo'><div class='card'><b>SITUAÇÃO</b><p>{html.escape(central)}</p></div><div class='card'><b>PROBLEMA</b><p>{html.escape(intel['problems'][0]['description'] if intel['problems'] else 'Sem evidência estruturada suficiente.')}</p></div><div class='card'><b>OPORTUNIDADE</b><p>{html.escape(intel['opportunities'][0]['description'] if intel['opportunities'] else 'Sem evidência estruturada suficiente.')}</p></div></section><h2>Leitura central</h2><p class='note'>{html.escape(central)}</p><h2>Principais indicadores e temas</h2><table><thead><tr><th>Tema</th><th>Volume</th><th>Variação</th><th>Interações</th><th>Relevância</th></tr></thead><tbody>{theme_rows}</tbody></table><h2>Publicações de evidência</h2>{evidence or '<p>Não há publicações de evidência no recorte.</p>'}<h2>Recomendações</h2><p>Priorizar validação qualitativa dos temas recorrentes e testar conteúdo nos temas de alta interação com baixa exploração. Toda decisão deve considerar as limitações da amostra.</p><h2>Metodologia</h2><p>{html.escape(intel['methodology']['score'])}. Crescimento: {html.escape(intel['methodology']['growth'])}.</p><h2>Limitações</h2><ul>{''.join(f'<li>{html.escape(x)}</li>' for x in intel['limitations'])}</ul></main></body></html>"""


@router.post("/campaigns/{campaign_id}/reports")
def create_report(campaign_id: int, payload: ReportInput, session: Session = Depends(get_session)):
    campaign = session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(404, "Campanha não encontrada.")
    region = session.get(AdministrativeRegion, payload.region_id) if payload.region_id else None
    if payload.region_id and not region:
        raise HTTPException(404, "Região não encontrada.")
    start, end = _dates(payload.start_date, payload.end_date)
    intel = _intelligence(build_trends(session, campaign_id, start, end, payload.region_id))
    rendered = _report_html(campaign, region, payload, intel)
    report = GeneratedReport(campaign_id=campaign_id, region_id=payload.region_id, period_start=start, period_end=end, report_type=payload.report_type, html_content=rendered, structured_content=json.dumps(intel, default=str, ensure_ascii=False))
    session.add(report); session.commit(); session.refresh(report)
    return {"id": report.id, "status": report.status, "html_url": f"/api/reports/{report.id}/html", "pdf_method": "Abra o HTML e use Imprimir > Salvar como PDF; estilos A4 e links são preservados."}


@router.get("/reports/{report_id}/html", response_class=Response)
def report_html(report_id: int, session: Session = Depends(get_session)):
    report = session.get(GeneratedReport, report_id)
    if not report or not report.html_content:
        raise HTTPException(404, "Relatório não encontrado.")
    return Response(report.html_content, media_type="text/html; charset=utf-8")


@router.get("/integrations/status")
def integration_status():
    return {"instagram_apify": {"implemented": True}, "google_trends": {"implemented": False, "reason": "Provedor e credenciais não configurados."}, "news": {"implemented": False, "reason": "Fontes/licença não configuradas."}, "comments_sentiment": {"implemented": False, "reason": "A coleta atual não contém comentários individuais."}, "ai_diagnosis": {"implemented": False, "reason": "Provedor de IA e credencial não configurados."}}


@router.get("/campaigns/{campaign_id}/trends/posts")
def trend_posts(campaign_id: int, start_date: str, end_date: str, region_id: int | None = None,
                theme: str | None = None, profile_id: list[int] = Query(default=[]), format: str | None = None,
                territorial_origin: Literal["PROFILE", "CONTENT", "LOCATION"] | None = None,
                offset: int = Query(default=0, ge=0), limit: int = Query(default=50, ge=1, le=200),
                session: Session = Depends(get_session), profile_group: TrendProfileGroup = "ALL"):
    if not session.get(Campaign, campaign_id): raise HTTPException(404, "Campanha não encontrada.")
    start, end = _dates(start_date, end_date)
    data = build_trends(session, campaign_id, start, end, region_id, theme, profile_id, format, territorial_origin, include_all_evidence=True, profile_group=profile_group)
    posts = sorted((e for row in data["trends"] for e in row["evidence"]), key=lambda e: (str(e["date"]), e["post_id"]), reverse=True)
    return {"filters": data["filters"], "total": len(posts), "offset": offset, "limit": limit, "posts": posts[offset:offset+limit]}
