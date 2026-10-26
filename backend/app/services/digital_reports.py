"""Frozen report documents assembled from existing analytics, without collection or AI calls."""
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
import json
import os
from fastapi import HTTPException
from sqlmodel import select
from app.models import Campaign, CampaignProfile, CampaignSlate, SlateMember, InstagramProfile, GeneratedReport, ProfileSnapshot
from app.services.analysis_period import calendar_bounds
from app.services.campaign_scope import campaign_links, slate_payloads
from app.services.executive import executive_summary
from app.routers.analytics import campaign_posts
from app.services.follower_history import MANUAL_SOURCE
from app.services.media_preview import CONTENT_EXTENSIONS, _allowed_image_url

REPORT_TYPE = "DIGITAL_INTELLIGENCE_V1"


@contextmanager
def report_scope(session, **values):
    previous = dict(session.info)
    session.info.clear()
    session.info.update(values)
    try:
        yield
    finally:
        session.info.clear()
        session.info.update(previous)


def cache_image(post_id):
    root = Path(os.getenv("PREVIEW_CACHE_DIR", Path(__file__).resolve().parents[2] / ".cache" / "previews"))
    for mime, ext in CONTENT_EXTENSIONS.items():
        path = root / (str(post_id) + ext)
        if path.is_file():
            return path, mime
    return None


def number(value):
    if value is None:
        return "métrica não disponível"
    return f"{value:,.2f}".rstrip("0").rstrip(".").replace(",", "_").replace(".", ",").replace("_", ".")


METHODOLOGY = [
 {"title":"Fonte e agrupamento", "text":"São utilizadas observações já armazenadas pelo Data Sight. A coleta é individual por perfil; a chapa é um agrupamento explícito. Perfis continuam disponíveis individualmente. Nenhuma coleta, scraping ou redação por IA é executada para gerar este relatório."},
 {"title":"Período e amostra", "text":"Dias completos em UTC, incluindo início e fim. Publicações são filtradas pela data de publicação antes de limitar a amostra por perfil. O relatório representa os posts armazenados e disponíveis; não garante a totalidade da produção no período. Dias e horários da semana usam America/Sao_Paulo, como no painel."},
 {"title":"Snapshots das publicações", "text":"Cada publicação usa seu último snapshot armazenado no momento da geração. Essas métricas podem ter sido observadas depois da data de publicação e do período selecionado; não são uma reconstrução retroativa do que se sabia naquele dia."},
 {"title":"Interações observadas", "text":"É utilizado o interactions_count armazenado pelo coletor. O normalizador soma os componentes disponíveis de curtidas, comentários, compartilhamentos e salvamentos. Se nenhum componente está disponível, a métrica permanece ausente. A interação é completa apenas quando todos os quatro componentes estão disponíveis. Views e plays não são acrescentados a esse total."},
 {"title":"Totais e médias", "text":"Somente valores disponíveis entram nos totais. A média é a soma da métrica dividida pelo número de posts que possuem essa métrica. Não se somam nem se calculam médias simples das médias dos perfis. Zero observado é preservado; ausência não vira zero. A cobertura aparece junto dos indicadores."},
 {"title":"Seguidores e crescimento", "text":"Seguidores agregados somam as audiências dos perfis; não são pessoas únicas e não há deduplicação. A evolução agregada usa apenas datas com observação de todos os perfis necessários. Crescimento exige duas datas comparáveis; percentual exige base inicial não nula. Não há interpolação nem preenchimento com zero."},
 {"title":"Origem do histórico", "text":"MANUAL_HISTORICAL identifica observações históricas fornecidas manualmente; APIFY_PUBLIC identifica a coleta pública armazenada. Uma contagem real disponível tem prioridade sobre a manual no mesmo dia, sem apagar registros. Não são criados pontos adicionais; uma única observação não permite medir evolução."},
 {"title":"Documento preservado", "text":"Filtros, nomes, associações e resultados são salvos como um documento no momento da geração. Reabrir este relatório não recalcula indicadores com coletas posteriores. Imagens usam apenas cache ou URLs já armazenadas e podem deixar de estar disponíveis na fonte externa."},
]
LIMITATIONS = [
 "A cobertura pode ser parcial; dados e métricas podem estar ausentes. Valores não disponíveis são explicitados.",
 "Uma única observação não permite medir crescimento. Ausências não são interpoladas nem preenchidas com zero.",
 "Seguidores, plays e views não necessariamente representam pessoas únicas; não se estima alcance ou impressões.",
 "Os resultados descrevem a amostra disponível.",
 "Relações entre formatos, dias, horários e desempenho são descritivas, sem demonstração de causalidade.",
 "Os dados não medem intenção de voto, apoio eleitoral, sentimento ou características demográficas.",
]


def editorial_insights(report):
    from app.services.report_interpretation import executive_reading
    return executive_reading(report)


def build_report(session, campaign_id, payload):
    start,end=calendar_bounds(payload.start_date,payload.end_date)
    campaign=session.get(Campaign,campaign_id)
    if campaign is None:
        raise HTTPException(404,"Campanha não encontrada.")
    slates=slate_payloads(session,campaign_id)
    chosen=list(dict.fromkeys(payload.slate_ids))
    if any(sid not in {s['id'] for s in slates} for sid in chosen):
        raise HTTPException(404,"Chapa não pertence à campanha selecionada.")
    if payload.profile_id and payload.compare_slates:
        raise HTTPException(422,"Escolha comparação entre chapas ou um perfil individual.")
    if payload.compare_slates and len(chosen or slates)<2:
        raise HTTPException(422,"Selecione pelo menos duas chapas para comparar.")
    selected_slates=[s for s in slates if not chosen or s['id'] in chosen]
    active={link.profile_id for link in session.exec(select(CampaignProfile).where(CampaignProfile.campaign_id==campaign_id,CampaignProfile.active==True)).all()}
    ids=active & {m['profile_id'] for s in selected_slates for m in s['members']} if chosen else active
    if payload.profile_id:
        if payload.profile_id not in ids:
            raise HTTPException(404,"Perfil não pertence ao recorte selecionado.")
        ids={payload.profile_id}
    with report_scope(session,scope_profile_ids=ids,period_start=payload.start_date,period_end=payload.end_date,sample_limit=payload.limit_per_profile):
        report=executive_summary(session,campaign_id,payload.limit_per_profile)
        posts=campaign_posts(campaign_id,payload.limit_per_profile,session=session)['posts']
        comparisons=[]
        if payload.compare_slates:
            for slate in selected_slates:
                with report_scope(session,scope_profile_ids=ids,slate_id=slate['id'],period_start=payload.start_date,period_end=payload.end_date,sample_limit=payload.limit_per_profile):
                    detail=executive_summary(session,campaign_id,payload.limit_per_profile)
                    comparisons.append({"slate":slate,"summary":detail['summary'],"profiles":detail['profiles'],"follower_history":detail['follower_history']})
    labels={"observed_interactions":"Maior interação","comments":"Mais comentários","plays":"Mais plays","likes":"Mais curtidas"}
    winners={}
    for metric,label in labels.items():
        top=report['insights']['top_posts'].get(metric)
        if metric=='likes':
            available=[p for p in posts if p['metrics']['likes'] is not None]
            top=max(available,key=lambda p:p['metrics']['likes']) if available else None
        if top:
            item=winners.setdefault(top['post_id'],{"post":top,"distinctions":[],"image":{}})
            item['distinctions'].append(label)
    for item in winners.values():
        post=item['post'];url=post['content'].get('thumbnail_url')
        item['image']={"cached":cache_image(post['post_id']) is not None,"url":url if _allowed_image_url(url) else None}
    cover_post=next((p for p in posts if cache_image(p['post_id']) is not None),None)
    if cover_post is None:
        cover_post=next((p for p in posts if _allowed_image_url(p['content'].get('thumbnail_url'))),None)
    cover={"post":cover_post,"image":{"cached":cache_image(cover_post['post_id']) is not None,
        "url":cover_post['content'].get('thumbnail_url') if _allowed_image_url(cover_post['content'].get('thumbnail_url')) else None}} if cover_post else None
    title="@"+session.get(InstagramProfile,payload.profile_id).username if payload.profile_id else " × ".join(s['name'] for s in selected_slates) if chosen else campaign.name
    last_real=session.exec(select(ProfileSnapshot).where(ProfileSnapshot.profile_id.in_(ids),ProfileSnapshot.source!=MANUAL_SOURCE).order_by(ProfileSnapshot.collected_at.desc())).first() if ids else None
    times=[p['metrics']['collected_at'] for p in posts if p['metrics']['collected_at']]
    if last_real:times.append(last_real.collected_at)
    aware=lambda value:value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
    document={"schema_version":1,"title":title,"generated_at":datetime.now(timezone.utc),"campaign":{"id":campaign.id,"name":campaign.name},
        "filters":payload.model_dump(),"profile_ids":sorted(ids),"slates":selected_slates,
        "last_collection_at":max((aware(t) for t in times),default=None),"analysis":report,"comparisons":comparisons,
        "highlights":list(winners.values()),"cover":cover,"editorial_insights":editorial_insights(report),"editorial_version":2,
        "methodology":METHODOLOGY,"limitations":LIMITATIONS,
        "interaction_coverage":{"available_posts":sum(p['metrics']['observed_interactions'] is not None for p in posts),"complete_posts":sum(p['metrics']['interactions_complete'] for p in posts),"posts":len(posts)}}
    return document,start,end


def save_report(session,campaign_id,payload):
    document,start,end=build_report(session,campaign_id,payload)
    serialized=json.dumps(document,ensure_ascii=False,default=lambda value:value.isoformat())
    row=GeneratedReport(campaign_id=campaign_id,period_start=start,period_end=end,report_type=REPORT_TYPE,structured_content=serialized)
    session.add(row);session.commit();session.refresh(row)
    return {"id":row.id,"url":f"/relatorios/{row.id}","status":row.status}


def read_report(session,report_id):
    row=session.get(GeneratedReport,report_id)
    if row is None or row.report_type!=REPORT_TYPE or not row.structured_content:
        raise HTTPException(404,"Relatório digital não encontrado.")
    document=json.loads(row.structured_content)
    # Upgrade presentation only from this frozen snapshot; never rewrite stored documents.
    document['editorial_insights']=editorial_insights(document['analysis'])
    document['editorial_version']=2
    return row,document
