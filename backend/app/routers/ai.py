from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field, field_validator
from sqlmodel import Session

from app.database import get_session
from app.routers.analytics import campaign_post_detail
from app.services.campaign_ai import ask_campaign, get_conversation, list_conversations
from app.services.post_ai import generate_analysis

router = APIRouter(prefix="/api/campaigns", tags=["IA"])


class AssistantQuestion(BaseModel):
    question: str = Field(min_length=3, max_length=800)
    conversation_id: str | None = Field(default=None, max_length=64)

    @field_validator("question")
    @classmethod
    def clean_question(cls, value: str) -> str:
        return " ".join(value.split())


@router.post("/{campaign_id}/assistant", summary="Perguntar à IA sobre os dados observados da campanha")
def campaign_assistant(
    campaign_id: int,
    data: AssistantQuestion,
    request: Request,
    session: Session = Depends(get_session),
):
    return ask_campaign(session, campaign_id, data.question, request.state.user_id, data.conversation_id)


@router.get("/{campaign_id}/assistant/conversations", summary="Listar o histórico de conversas da IA")
def assistant_conversations(campaign_id: int, request: Request, session: Session = Depends(get_session)):
    return list_conversations(session, campaign_id, request.state.user_id)


@router.get("/{campaign_id}/assistant/conversations/{conversation_id}", summary="Abrir uma conversa da IA")
def assistant_conversation(
    campaign_id: int,
    conversation_id: str,
    request: Request,
    session: Session = Depends(get_session),
):
    return get_conversation(session, campaign_id, request.state.user_id, conversation_id)


@router.post("/{campaign_id}/posts/{post_id}/analysis", summary="Analisar publicação com modelo gratuito via OpenRouter")
def analyze_post(campaign_id: int, post_id: int, session: Session = Depends(get_session)):
    """Reutiliza análise salva se a evidência não mudou. Envia texto e métricas ao OpenRouter; não executa Apify."""
    detail = campaign_post_detail(campaign_id, post_id, session, days=90)
    return generate_analysis(session, detail)
