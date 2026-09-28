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
os.environ['COLLECTION_ENABLED'] = 'false'
os.environ['COLLECTION_SCHEDULER_MODE'] = 'disabled'

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

# Territorial fixture uses only synthetic posts in the isolated SQLite database.
from app.routers.territorial import seed_reference_data
from app.models import AdministrativeRegion, ProfileRegion
from app.services.territorial_detection import classify_existing
from sqlmodel import select
with Session(engine) as session:
    seed_reference_data(session)
    region = session.exec(select(AdministrativeRegion).where(AdministrativeRegion.name == 'Ceilândia')).one()
    session.add(ProfileRegion(profile_id=1, region_id=region.id))
    post = session.get(InstagramPost, 1)
    post.caption += '. Moradores de Planaltina e Taguatinga precisam de atendimento.'
    session.add(post)
    post = session.get(InstagramPost, 2)
    post.caption += '. Atendimento na Asa Norte.'
    session.add(post)
    session.commit()
    classify_existing(session)

with Session(engine) as session:
    session.add(Campaign(id=3,name='Comparação de teste',slug='comparison-test'));session.commit()
    for pid,role in enumerate(['COMPETITOR','COMPETITOR','LOCAL_PAGE','DF_GENERAL','MEDIA'],10):
        session.add(InstagramProfile(id=pid,username=f'role_{role.lower()}_{pid}'));session.commit()
        session.add(CampaignProfile(campaign_id=3,profile_id=pid,role=role))
        session.add(InstagramPost(id=pid+100,profile_id=pid,shortcode=f'role{pid}',url=f'https://www.instagram.com/p/role{pid}/',caption='Hospital em Planaltina',content_type='Image',published_at=now-timedelta(days=1)))
        session.commit()
        session.add(PostSnapshot(post_id=pid+100,likes_count=pid,comments_count=2,interactions_count=pid+2,views_count=100,plays_count=50,shares_count=0,saves_count=None))
        session.add(ProfileSnapshot(profile_id=pid,followers_count=pid*100,collected_at=now-timedelta(days=2)))
        session.add(ProfileSnapshot(profile_id=pid,followers_count=pid*100+5,collected_at=now))
    session.commit();classify_existing(session,3)

if __name__ == '__main__':
    try:
        uvicorn.run('app.main:app', host='127.0.0.1', port=int(os.getenv("UI_FIXTURE_PORT", "8001")))
    finally:
        engine.dispose()
        Path(database_path).unlink(missing_ok=True)
