"""Servidor isolado para tests/ui-smoke.mjs. Não executa Actors da Apify."""
import os
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

fd, database_path = tempfile.mkstemp(suffix='.db', prefix='radar-ui-')
os.close(fd)
os.environ['DATABASE_URL'] = 'sqlite:///' + database_path.replace('\\', '/')
os.environ['APIFY_TOKEN'] = ''
os.environ['OPENROUTER_API_KEY'] = ''
os.environ['AUTO_SYNC_CAMPAIGN_IDS'] = ''

from app.database import create_db_and_tables, engine
from app.models import Campaign, CampaignProfile, InstagramProfile, InstagramPost, PostSnapshot, ProfileSnapshot
from sqlmodel import Session
import uvicorn
from app.services.comments import save_comment_sample

create_db_and_tables()
with Session(engine) as session:
    session.add_all([Campaign(id=1, name='Campanha de teste', slug='teste'), Campaign(id=2, name='Campanha vazia', slug='vazia')])
    session.add(InstagramProfile(id=1, username='perfil_teste'))
    session.commit()
    session.add(CampaignProfile(campaign_id=1, profile_id=1, role='CLIENT'))
    now = datetime.now(timezone.utc)
    for i in range(12):
        session.add(InstagramPost(id=i+1, profile_id=1, shortcode=f'test{i}', url=f'https://www.instagram.com/p/test{i}/', caption=f'Saúde e hospital publicação {i}', content_type='Video' if i % 2 else 'Image', published_at=now-timedelta(days=i)))
    session.commit()
    for i in range(12):
        session.add(PostSnapshot(post_id=i+1, likes_count=None if i == 0 else i*10, comments_count=i, interactions_count=i*11, views_count=100 if i % 2 else None))
    session.add(ProfileSnapshot(profile_id=1, followers_count=1000, collected_at=now-timedelta(days=10)))
    session.add(ProfileSnapshot(profile_id=1, followers_count=1050, collected_at=now))
    session.commit()

with Session(engine) as session:
    session.add(PostSnapshot(post_id=2, comments_count=0, collected_at=now-timedelta(days=10)))
    session.add(PostSnapshot(post_id=2, comments_count=None, collected_at=now-timedelta(days=2)))
    session.commit()
    save_comment_sample(session,2,{'latestComments':[{'text':'Comentário de teste sobre o evento.'},{'text':'Onde encontro os dados citados?'}]})

if __name__ == '__main__':
    try:
        uvicorn.run('app.main:app', host='127.0.0.1', port=8001)
    finally:
        engine.dispose()
        Path(database_path).unlink(missing_ok=True)
