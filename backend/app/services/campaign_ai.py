"""Grounded campaign assistant and per-user conversation history."""
import json
import os
from datetime import datetime, timezone
from threading import Lock
from uuid import uuid4

import httpx
from fastapi import HTTPException
from sqlmodel import Session, select

from app.models import AIUsage, AssistantConversation, AssistantMessage, utc_now
from app.routers.analytics import campaign_overview, followers_history, themes_formats, time_performance

assistant_lock = Lock()
SYSTEM_PROMPT = """Você é a IA do Data Sight. Responda em português claro, direto e com personalidade, usando somente os dados fornecidos.
"Campanha" é apenas o nome do espaço de monitoramento no produto. Ela pode acompanhar uma banda, artista, marca,
negócio, projeto cultural, organização, figura pública ou iniciativa política. Nunca presuma que o contexto é eleitoral
ou institucional. Identifique o contexto pelos nomes da campanha e dos perfis, pelo conteúdo observado e pelo jeito como
o usuário escreve. Se ainda houver dúvida, use termos neutros como projeto, perfil, conteúdo e público.

Converse como alguém que acompanha de verdade o trabalho analisado. Se o nome ou perfil indicar uma banda ou artista,
trate explicitamente como banda ou artista — nunca como campanha, organização ou instituição. Nesse caso, fale de posts,
faixas, shows, bastidores e comunidade apenas quando isso aparecer no contexto. Se for uma marca, fale de produto e
público; se for uma organização, use o vocabulário dela. Prefira frases naturais, específicas e curtas, como numa
conversa com a pessoa responsável pelo projeto. Evite linguagem burocrática, tom de relatório, termos como "campanha eleitoral",
"eleitorado", "stakeholders", "institucional" ou "estratégia de comunicação" quando não forem pertinentes, além de
elogios automáticos, introduções genéricas, conclusões dramáticas e avisos repetidos. Não force listas nem coloque todo
item em negrito. Adapte o vocabulário ao contexto sem inventar fatos ou tentar imitar gírias.

Os dados podem ter valores null, amostras parciais e períodos diferentes. Não invente números nem causalidade. Não deduza
crenças, intenção de voto ou atributos pessoais. Não crie persuasão política, segmentação de eleitores ou mensagens
manipulativas. Compare apenas medidas compatíveis. Quando uma limitação mudar a interpretação, explique-a uma vez, junto
do ponto afetado ou no fim. Responda em até 350 palavras, sem HTML e sem fingir que executou ações."""


def _visualizations(evidence: dict) -> dict[str, list[dict]]:
    overview = evidence["overview"]
    themes = evidence["themes_formats"]
    timing = evidence["time_performance"]
    followers = evidence["followers_history"]

    profile_rows = [
        {
            "label": item.get("full_name") or f"@{item['username'].lstrip('@')}",
            "interactions": item.get("observed_interactions"),
            "posts": item.get("posts_analyzed"),
        }
        for item in overview.get("profiles", [])
    ]

    def comparison_chart(items: list[dict], category_key: str, title: str) -> dict:
        rows = [
            {
                "label": item.get(category_key) or "Sem classificação",
                "interactions": item.get("avg_observed_interactions"),
                "likes": item.get("avg_likes"),
                "posts": item.get("posts"),
            }
            for item in items[:8]
        ]
        return {
            "kind": "bar",
            "title": title,
            "subtitle": "Média por publicação; a quantidade de posts aparece no detalhe.",
            "categoryKey": "label",
            "sampleKey": "posts",
            "data": rows,
            "series": [
                {"key": "interactions", "label": "Interações observadas", "color": "#ff5a1f"},
                {"key": "likes", "label": "Curtidas", "color": "#8a8a8a"},
            ],
        }

    weekdays = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]
    time_cells = [
        {
            "row": item["weekday"],
            "column": item["hour_label"],
            "value": item.get("avg_observed_interactions"),
            "posts": item.get("posts"),
        }
        for item in timing.get("cells", [])
    ]
    columns = list(dict.fromkeys(item["column"] for item in sorted(time_cells, key=lambda cell: cell["column"])))

    follower_rows: dict[str, dict] = {}
    follower_series = []
    for profile in followers.get("profiles", []):
        key = f"profile_{profile['profile_id']}"
        label = profile.get("full_name") or f"@{profile['username'].lstrip('@')}"
        follower_series.append({"key": key, "label": label})
        for point in profile.get("history", []):
            follower_rows.setdefault(point["date"], {"date": point["date"]})[key] = point.get("followers")

    return {
        "overview": [{
            "kind": "bar",
            "title": "Interações observadas por perfil",
            "subtitle": "Totais nos posts mais recentes incluídos na análise.",
            "categoryKey": "label",
            "sampleKey": "posts",
            "data": profile_rows,
            "series": [{"key": "interactions", "label": "Interações observadas", "color": "#ff5a1f"}],
        }],
        "themes_formats": [
            comparison_chart(themes.get("themes", []), "theme", "Desempenho médio por tema"),
            comparison_chart(themes.get("formats", []), "format", "Desempenho médio por formato"),
        ],
        "time_performance": [{
            "kind": "heatmap",
            "title": "Interações por dia e horário",
            "subtitle": "Média observada por publicação em janelas de três horas.",
            "rows": [day for day in weekdays if any(cell["row"] == day for cell in time_cells)],
            "columns": columns,
            "cells": time_cells,
            "valueLabel": "interações observadas",
        }],
        "followers_history": [{
            "kind": "line",
            "title": "Histórico de seguidores",
            "subtitle": "Registros disponíveis nos últimos 30 dias.",
            "xKey": "date",
            "data": [follower_rows[key] for key in sorted(follower_rows)],
            "series": follower_series,
        }],
    }


def _owned_conversation(session: Session, conversation_id: str, user_id: str, campaign_id: int) -> AssistantConversation:
    conversation = session.get(AssistantConversation, conversation_id)
    if not conversation or conversation.user_id != user_id or conversation.campaign_id != campaign_id:
        raise HTTPException(404, "Conversa não encontrada.")
    return conversation


def list_conversations(session: Session, campaign_id: int, user_id: str) -> list[dict]:
    conversations = session.exec(
        select(AssistantConversation)
        .where(
            AssistantConversation.user_id == user_id,
            AssistantConversation.campaign_id == campaign_id,
        )
        .order_by(AssistantConversation.updated_at.desc())
        .limit(30)
    ).all()
    result = []
    for item in conversations:
        messages = session.exec(
            select(AssistantMessage).where(AssistantMessage.conversation_id == item.id)
        ).all()
        result.append({
            "id": item.id,
            "title": item.title,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
            "message_count": len(messages),
        })
    return result


def get_conversation(session: Session, campaign_id: int, user_id: str, conversation_id: str) -> dict:
    conversation = _owned_conversation(session, conversation_id, user_id, campaign_id)
    messages = session.exec(
        select(AssistantMessage)
        .where(AssistantMessage.conversation_id == conversation.id)
        .order_by(AssistantMessage.id)
    ).all()
    chart_groups = _visualizations({
        "overview": campaign_overview(campaign_id, 25, session),
        "themes_formats": themes_formats(campaign_id, 25, session),
        "time_performance": time_performance(campaign_id, 25, session),
        "followers_history": followers_history(campaign_id, 30, session),
    })
    visualizations_by_label = {
        "Visão geral": chart_groups["overview"],
        "Temas e formatos": chart_groups["themes_formats"],
        "Dias e horários": chart_groups["time_performance"],
        "Audiência": chart_groups["followers_history"],
    }

    def hydrated_sources(message: AssistantMessage) -> list[dict]:
        sources = json.loads(message.sources_json) if message.sources_json else []
        for source in sources:
            source.setdefault("visualizations", visualizations_by_label.get(source.get("label"), []))
        return sources

    return {
        "id": conversation.id,
        "title": conversation.title,
        "created_at": conversation.created_at,
        "updated_at": conversation.updated_at,
        "messages": [
            {
                "id": message.id,
                "role": message.role,
                "content": message.content,
                "sources": hydrated_sources(message),
                "created_at": message.created_at,
            }
            for message in messages
        ],
    }


def ask_campaign(
    session: Session,
    campaign_id: int,
    question: str,
    user_id: str,
    conversation_id: str | None = None,
) -> dict:
    model = os.getenv("OPENROUTER_MODEL", "openrouter/free")
    if model != "openrouter/free" and not model.endswith(":free"):
        raise HTTPException(503, "Configure um modelo gratuito no OpenRouter.")
    token = os.getenv("OPENROUTER_API_KEY")
    if not token:
        raise HTTPException(503, "IA ainda não configurada no backend.")

    conversation = None
    history: list[dict] = []
    if conversation_id:
        conversation = _owned_conversation(session, conversation_id, user_id, campaign_id)
        saved_messages = session.exec(
            select(AssistantMessage)
            .where(AssistantMessage.conversation_id == conversation.id)
            .order_by(AssistantMessage.id.desc())
            .limit(12)
        ).all()
        history = [{"role": message.role, "content": message.content} for message in reversed(saved_messages)]

    evidence = {
        "overview": campaign_overview(campaign_id, 25, session),
        "themes_formats": themes_formats(campaign_id, 25, session),
        "time_performance": time_performance(campaign_id, 25, session),
        "followers_history": followers_history(campaign_id, 30, session),
    }
    campaign_context = {
        "name": evidence["overview"]["campaign"]["name"],
        "profiles": [
            {
                "username": profile.get("username"),
                "name": profile.get("full_name"),
                "role": profile.get("role"),
            }
            for profile in evidence["overview"].get("profiles", [])
        ],
    }
    serialized = json.dumps(
        {
            "question": question,
            "conversation_history": history,
            "campaign_context": campaign_context,
            "evidence": evidence,
        },
        ensure_ascii=False,
        default=str,
    )
    if len(serialized) > 60_000:
        serialized = serialized[:60_000]
    if not assistant_lock.acquire(timeout=45):
        raise HTTPException(409, "A IA já está analisando outra pergunta. Tente novamente em instantes.")
    try:
        day = datetime.now(timezone.utc).date().isoformat()
        usage = session.get(AIUsage, day) or AIUsage(day=day)
        daily_limit = max(1, min(100, int(os.getenv("AI_DAILY_LIMIT", "20"))))
        if usage.requests >= daily_limit:
            raise HTTPException(429, "Limite diário da IA atingido.")
        usage.requests += 1
        session.add(usage)
        session.commit()
        try:
            with httpx.Client(timeout=50) as client:
                response = client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "model": model,
                        "max_tokens": 1200,
                        "temperature": 0.5,
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": serialized},
                        ],
                    },
                )
            if response.status_code == 429:
                raise HTTPException(429, "O modelo gratuito está ocupado. Tente novamente mais tarde.")
            if response.status_code in {401, 403}:
                raise HTTPException(503, "A chave OpenRouter não foi aceita.")
            response.raise_for_status()
            payload = response.json()
            answer = payload["choices"][0]["message"]["content"]
            if not isinstance(answer, str) or not answer.strip():
                raise ValueError("empty answer")
        except HTTPException:
            raise
        except httpx.TimeoutException:
            raise HTTPException(504, "A IA demorou para responder. Tente novamente.") from None
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError):
            raise HTTPException(502, "A IA não retornou uma resposta válida.") from None

        chart_groups = _visualizations(evidence)
        sources = [
            {"label": "Visão geral", "path": "/painel", "description": "Métricas observadas da campanha", "visualizations": chart_groups["overview"]},
            {"label": "Temas e formatos", "path": "/temas-formatos", "description": "Distribuição por assunto e formato", "visualizations": chart_groups["themes_formats"]},
            {"label": "Dias e horários", "path": "/dias-horarios", "description": "Desempenho temporal da amostra", "visualizations": chart_groups["time_performance"]},
            {"label": "Audiência", "path": "/audiencia", "description": "Histórico observado nos últimos 30 dias", "visualizations": chart_groups["followers_history"]},
        ]
        tools = [
            {
                "type": f"tool-{source['label'].lower().replace(' ', '_')}",
                "state": "output-available",
                "output": {
                    "description": source["description"],
                    "visualizations": source["visualizations"],
                },
            }
            for source in sources
        ]
        if conversation is None:
            conversation = AssistantConversation(
                id=str(uuid4()), user_id=user_id, campaign_id=campaign_id, title=question[:80].strip()
            )
            session.add(conversation)
        conversation.updated_at = utc_now()
        session.add(AssistantMessage(conversation_id=conversation.id, role="user", content=question))
        session.add(AssistantMessage(
            conversation_id=conversation.id,
            role="assistant",
            content=answer.strip(),
            sources_json=json.dumps(sources, ensure_ascii=False),
        ))
        session.add(conversation)
        session.commit()
        return {
            "conversation_id": conversation.id,
            "text": answer.strip(),
            "model": str(payload.get("model") or model),
            "sources": sources,
            "tools": tools,
        }
    finally:
        assistant_lock.release()
