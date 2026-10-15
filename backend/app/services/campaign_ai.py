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
SYSTEM_PROMPT = """Você é a IA do Data Sight. Responda em português claro e direto usando somente o JSON fornecido.
O JSON contém dados observados de uma campanha e pode ter valores null, amostras parciais e períodos diferentes.
Não invente números nem trate interação como apoio eleitoral. Não deduza crenças, intenção de voto ou atributos pessoais.
Não crie persuasão política, segmentação de eleitores ou mensagens manipulativas. Você pode resumir desempenho,
comparar dados disponíveis, apontar limitações e indicar onde o usuário encontra a informação no produto.
Quando faltarem dados, diga o que falta. Responda em até 350 palavras, sem HTML e sem fingir que executou ações."""


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
                "sources": json.loads(message.sources_json) if message.sources_json else [],
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
    serialized = json.dumps(
        {"question": question, "conversation_history": history, "evidence": evidence},
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
                        "temperature": 0.15,
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

        sources = [
            {"label": "Visão geral", "path": "/painel", "description": "Métricas observadas da campanha"},
            {"label": "Temas e formatos", "path": "/temas-formatos", "description": "Distribuição por assunto e formato"},
            {"label": "Dias e horários", "path": "/dias-horarios", "description": "Desempenho temporal da amostra"},
            {"label": "Audiência", "path": "/audiencia", "description": "Histórico observado nos últimos 30 dias"},
        ]
        tools = [
            {
                "type": f"tool-{source['label'].lower().replace(' ', '_')}",
                "state": "output-available",
                "input": {"campaign_id": campaign_id},
                "output": {"leitura": source["description"]},
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
