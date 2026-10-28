"""Grouping, scope, weighted averages and additive migration regression coverage."""
import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch
os.environ.setdefault("DATABASE_URL", "sqlite://")
from fastapi import HTTPException, Request
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select
from app import main
from app.database import get_session
from app.models import Campaign, CampaignProfile, CampaignSlate, SlateMember, InstagramProfile, InstagramPost, PostSnapshot, ProfileSnapshot
from app.routers.analytics import campaign_posts, themes_formats, time_performance
from app.routers.campaigns import MemberInput, assign_slate_member, remove_slate_member
from app.services.campaign_scope import campaign_links, slate_payloads
from app.services.executive import executive_summary, slate_comparison
from app.services.trends import build_trends

class SlateTests(unittest.TestCase):
    def setUp(self):
        self.engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
        self.addCleanup(self.engine.dispose)
        SQLModel.metadata.create_all(self.engine)
        self.session=Session(self.engine)
        self.addCleanup(self.session.close)
        db=self.session
        db.add_all([Campaign(id=1,name='Monitoramento de teste',slug='test'),Campaign(id=2,name='Outra campanha',slug='other')])
        db.add_all([InstagramProfile(id=i,username=f'fixture_{i}') for i in range(1,5)])
        db.commit()
        db.add_all([CampaignProfile(campaign_id=1,profile_id=i,role='CLIENT' if i<3 else 'COMPETITOR') for i in range(1,5)])
        db.add_all([CampaignSlate(id=1,campaign_id=1,name='Chapa A'),CampaignSlate(id=2,campaign_id=1,name='Chapa B'),CampaignSlate(id=3,campaign_id=2,name='Chapa externa')])
        db.commit()
        db.add_all([SlateMember(campaign_id=1,slate_id=1,profile_id=1,position='CANDIDATE'),SlateMember(campaign_id=1,slate_id=1,profile_id=2,position='VICE'),SlateMember(campaign_id=1,slate_id=2,profile_id=3,position='CANDIDATE')])
        now=datetime.now(timezone.utc)
        # Candidate has one post, vice has three: correct mean is 40, not 60 or 120.
        for i,pid,interactions in [(1,1,100),(2,2,20),(3,2,20),(4,2,20),(5,3,8000),(6,4,None)]:
            db.add(InstagramPost(id=i,profile_id=pid,shortcode=f'fixture-{i}',url=f'https://instagram.com/p/fixture-{i}/',caption='Saúde',content_type='Image',published_at=now-timedelta(days=1)))
            db.add(PostSnapshot(post_id=i,likes_count=interactions,comments_count=0 if interactions is not None else None,interactions_count=interactions,plays_count=None))
        for pid in range(1,5):
            db.add(ProfileSnapshot(profile_id=pid,followers_count=pid*100,collected_at=now))
        db.commit()

    def test_explicit_candidate_vice_and_unassigned_profile_are_distinct(self):
        self.assertEqual(len(slate_payloads(self.session,1)),2)
        self.session.info['slate_id']=1
        self.assertEqual({link.profile_id for link in campaign_links(self.session,1)},{1,2})
        result=executive_summary(self.session,1)
        self.assertEqual(result['summary']['posts'],4)
        self.assertEqual(result['summary']['observed_interactions'],160)
        self.assertEqual(result['summary']['avg_observed_interactions'],40)
        self.assertEqual(result['summary']['followers'],300)
        self.assertEqual(result['summary']['comments'],0)
        self.assertIsNone(result['summary']['plays'])
        self.assertEqual(result['insights']['top_posts']['observed_interactions']['post_id'],1)
        self.assertEqual({p['position'] for p in result['profiles']},{'CANDIDATE','VICE'})
        self.assertEqual(result['summary']['coverage']['observed_interactions'],4)

    def test_every_analysis_reader_respects_slate_and_nested_profile(self):
        self.session.info['slate_id']=1
        posts=campaign_posts(1,session=self.session)['posts']
        self.assertEqual({p['profile']['id'] for p in posts},{1,2})
        self.assertTrue(all(p['origin']['slate']=='Chapa A' for p in posts))
        self.assertEqual(sum(g['posts'] for g in themes_formats(1,25,self.session)['themes']),4)
        self.assertEqual(sum(c['posts'] for c in time_performance(1,25,self.session)['cells']),4)
        now=datetime.now(timezone.utc)
        trends=build_trends(self.session,1,now-timedelta(days=30),now)
        self.assertEqual(sum(t['volume'] for t in trends['trends']),4)
        self.session.info['scope_profile_id']=2
        self.assertEqual(len(campaign_posts(1,session=self.session)['posts']),3)
        self.session.info['scope_profile_id']=3
        with self.assertRaises(HTTPException):campaign_posts(1,session=self.session)
        self.session.info.clear();self.session.info['slate_id']=3
        with self.assertRaises(HTTPException):campaign_posts(1,session=self.session)

    def test_comparison_restores_scope_and_does_not_include_independent_profiles(self):
        self.session.info.update(slate_id=1,scope_profile_id=2)
        before=dict(self.session.info)
        result=slate_comparison(self.session,1)
        self.assertEqual(self.session.info,before)
        self.assertEqual([r['summary']['observed_interactions'] for r in result['slates']],[160,8000])
        self.assertEqual(sum(r['summary']['posts'] for r in result['slates']),5)
        self.session.info.clear()
        self.assertEqual(executive_summary(self.session,1)['summary']['posts'],6)

    def test_duplicate_candidate_cross_campaign_and_ambiguous_membership_rejected(self):
        for sid,pid,position in [(1,4,'CANDIDATE'),(2,1,'VICE'),(3,1,'ASSOCIATE')]:
            with self.subTest(sid=sid,pid=pid), self.assertRaises(HTTPException):
                assign_slate_member(1,sid,MemberInput(profile_id=pid,position=position),self.session)
        remove_slate_member(1,1,2,self.session)
        self.assertIsNotNone(self.session.get(InstagramProfile,2))
        self.assertEqual(len(self.session.exec(select(InstagramPost).where(InstagramPost.profile_id==2)).all()),3)
        self.assertEqual(len(self.session.exec(select(PostSnapshot)).all()),6)

    def test_no_data_and_missing_metrics_never_become_fake_zeros(self):
        self.session.info['slate_id']=3
        report=executive_summary(self.session,2)
        self.assertEqual(report['data_status'],'NO_DATA')
        self.assertEqual(report['summary']['posts'],0)
        self.assertIsNone(report['summary']['observed_interactions'])
        self.assertIsNone(report['summary']['followers'])
        self.assertIsNone(report['insights']['format'])

    def test_api_routes_share_dependency_scope_and_validate_malformed_values(self):
        original=main.app.dependency_overrides.copy()
        def override(request:Request):
            with Session(self.engine) as session:
                for key in ('slate_id','scope_profile_id','analysis_days'):
                    value=request.query_params.get(key)
                    if value is not None:
                        if not value.isdecimal() or int(value)<1:raise HTTPException(422,'Invalid scope')
                        session.info[key]=int(value)
                yield session
        main.app.dependency_overrides[get_session]=override
        try:
            with patch('app.main.authenticate',return_value=('test-admin','admin')):
                client=TestClient(main.app)
                try:
                    for path in ['posts','themes-formats','time-performance','followers-history','benchmark','executive']:
                        response=client.get(f'/api/campaigns/1/{path}?slate_id=1')
                        self.assertEqual(response.status_code,200,response.text)
                    self.assertEqual(client.get('/api/campaigns/1/executive?slate_id=3').status_code,404)
                    self.assertEqual(client.get('/api/campaigns/1/posts?slate_id=-1').status_code,422)
                    response=client.get('/api/campaigns/1/analytics?start_date=2020-01-01&end_date=2099-01-01&slate_id=1')
                    self.assertEqual(response.status_code,200,response.text)
                    self.assertEqual({p['profile_id'] for p in response.json()['profiles']},{1,2})
                finally:client.close()
        finally:
            main.app.dependency_overrides.clear();main.app.dependency_overrides.update(original)

    def test_additive_migration_preserves_historical_snapshots(self):
        from alembic import command
        from alembic.config import Config
        with tempfile.TemporaryDirectory() as temp:
            url='sqlite:///'+(Path(temp)/'migration.db').as_posix()
            engine=create_engine(url)
            legacy=[t for t in SQLModel.metadata.sorted_tables if t.name not in {'campaign_slates','slate_members'}]
            SQLModel.metadata.create_all(engine,tables=legacy)
            with Session(engine) as db:
                db.add(Campaign(id=1,name='Preservada',slug='preservada'))
                db.add(InstagramProfile(id=1,username='fixture_history'));db.commit()
                db.add(InstagramPost(id=1,profile_id=1,shortcode='history',url='https://instagram.com/p/history/'));db.commit()
                db.add(PostSnapshot(id=1,post_id=1,likes_count=123,comments_count=0,interactions_count=123));db.commit()
            root=Path(__file__).resolve().parents[1]
            config=Config(str(root/'alembic.ini'));config.set_main_option('script_location',str(root/'migrations'))
            with patch.dict(os.environ,{'DATABASE_URL':url,'MIGRATION_DATABASE_URL':url}):
                command.stamp(config,'0005_territorial_monitoring')
                command.upgrade(config,'head')
            with Session(engine) as db:
                self.assertEqual(db.get(PostSnapshot,1).likes_count,123)
                self.assertEqual(db.get(PostSnapshot,1).comments_count,0)
                self.assertEqual(list(db.exec(select(CampaignSlate)).all()),[])
            engine.dispose()

    def test_inactive_profiles_remain_available_in_full_configuration(self):
        from app.routers.campaigns import get_campaign
        link=self.session.exec(select(CampaignProfile).where(CampaignProfile.campaign_id==1,CampaignProfile.profile_id==4)).first()
        link.active=False
        self.session.add(link);self.session.commit()
        detail=get_campaign(1,self.session)
        self.assertIn(4,[profile["id"] for profile in detail["profiles"]])
        self.assertEqual(next(profile for profile in detail["profiles"] if profile["id"]==4)["active"],False)

    def test_executive_daily_uses_same_utc_buckets_as_existing_daily_analytics(self):
        post=self.session.get(InstagramPost,1)
        value=(datetime.now(timezone.utc)-timedelta(days=2)).replace(hour=1,minute=0,second=0,microsecond=0)
        post.published_at=value
        self.session.add(post);self.session.commit()
        self.session.info['slate_id']=1
        report=executive_summary(self.session,1)
        day=next(row for row in report['daily'] if row['date']==value.date().isoformat())
        self.assertEqual(day['observed_interactions'],100)
        self.assertEqual(day['posts'],1)
