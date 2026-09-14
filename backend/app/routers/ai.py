from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.database import get_session
from app.routers.analytics import campaign_post_detail
from app.services.post_ai import generate_analysis
router = APIRouter(prefix='/api/campaigns', tags=['IA'])

@router.post('/{campaign_id}/posts/{post_id}/analysis', summary='Analisar publicação com modelo gratuito via OpenRouter')
def analyze_post(campaign_id: int, post_id: int, session: Session = Depends(get_session)):
    """Reutiliza análise salva se a evidência não mudou. Envia texto e métricas ao OpenRouter; não executa Apify."""
    detail = campaign_post_detail(campaign_id, post_id, session, days=90)
    return generate_analysis(session, detail)
