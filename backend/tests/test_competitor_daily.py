"""Regression tests use isolated SQLite and never call providers or worker threads."""
import os
import unittest
from datetime import datetime, timezone
from unittest.mock import patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine
from app.database import get_session
from app.models import Campaign, CampaignProfile, InstagramProfile, InstagramPost, PostSnapshot, ProfileSnapshot
from app.routers.filtered_analytics import router
from app.services.auto_sync import start_scheduler, tick

class CompetitorDailyTests(unittest.TestCase):
    def setUp(self):
        self.engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
        SQLModel.metadata.create_all(self.engine)
        self.s=Session(self.engine)
        self.addCleanup(self.engine.dispose);self.addCleanup(self.s.close)
        self.s.add_all([Campaign(id=1,name='Test',slug='test'),Campaign(id=2,name='Other',slug='other')]);self.s.commit()
        for pid,role in enumerate(['COMPETITOR','COMPETITOR','CLIENT','LOCAL_PAGE','DF_GENERAL','MEDIA','COMPETITOR'],1):
            self.s.add(InstagramProfile(id=pid,username=f'profile{pid}',profile_type='COMPETITOR'))
            self.s.commit()
            self.s.add(CampaignProfile(campaign_id=1,profile_id=pid,role=role,active=pid!=7))
            self.s.add(InstagramPost(id=pid,profile_id=pid,shortcode=f'post{pid}',url=f'https://instagram.com/p/post{pid}/',caption='Hospital',content_type='Image',published_at=datetime(2026,9,10,12,tzinfo=timezone.utc)))
        self.s.commit()
        for pid in range(1,8):
            self.s.add(PostSnapshot(post_id=pid,likes_count=10*pid,comments_count=pid,interactions_count=11*pid,views_count=100*pid,plays_count=None,shares_count=0,saves_count=None,collected_at=datetime(2026,9,12,tzinfo=timezone.utc)))
        self.s.add(PostSnapshot(post_id=1,likes_count=999,collected_at=datetime(2026,9,11,tzinfo=timezone.utc)))
        self.s.add(InstagramPost(id=8,profile_id=1,shortcode='no-snapshot',url='https://instagram.com/p/no-snapshot/',published_at=datetime(2026,9,11,tzinfo=timezone.utc)))
        self.s.add(ProfileSnapshot(profile_id=1,followers_count=123,collected_at=datetime(2026,9,10,tzinfo=timezone.utc)))
        self.s.commit()
        api=FastAPI();api.include_router(router)
        def session():
            with Session(self.engine) as value:yield value
        api.dependency_overrides[get_session]=session
        self.client=TestClient(api);self.addCleanup(self.client.close)
        self.addCleanup(patch.stopall)
        patch('app.integrations.apify.get_client',side_effect=AssertionError('Provider forbidden')).start()
    def call(self,**params):
        return self.client.get('/api/campaigns/1/analytics',params={k:v for k,v in {'start_date':'2026-09-01','end_date':'2026-09-30','role':'COMPETITOR',**params}.items() if v is not None})
    def test_role_is_campaign_source_of_truth_even_with_explicit_ids(self):
        data=self.call(profile_id=[1,2,3,4,5,6,7]).json()
        self.assertEqual({p['profile_id'] for p in data['profiles']},{1,2})
        self.assertEqual({p['role'] for p in data['profiles']},{'COMPETITOR'})
        self.assertEqual(self.call(profile_id=[4,5,6]).json()['data_status'],'NO_DATA')
    def test_daily_sums_latest_snapshot_all_metrics_and_nulls(self):
        data=self.call().json();day=data['daily'][0]
        self.assertEqual([x['date'] for x in data['daily']],['2026-09-10','2026-09-11'])
        for key,value in {'posts':2,'likes':30,'comments':3,'interactions':33,'views':300,'plays':None,'shares':0,'saves':None}.items():self.assertEqual(day[key],value,key)
        self.assertEqual(day['profiles']['profile1']['likes'],10)
        self.assertEqual(day['metric_samples']['likes'],2)
        self.assertEqual(data['daily'][1]['posts'],1)
        self.assertIsNone(data['daily'][1]['interactions'])
        self.assertEqual(data['daily'][1]['metric_samples']['interactions'],0)
    def test_empty_selection_is_not_all_and_other_pages_retain_all_roles(self):
        self.assertEqual(self.call(profile_selection='selected').json()['data_status'],'NO_DATA')
        self.assertEqual(len(self.call(role=None).json()['profiles']),6)
    def test_filters_and_invalid_dates(self):
        data=self.call(profile_id=2,theme='Saúde',format='Imagem',end_date='2026-09-10').json()
        self.assertEqual(data['daily'][0]['likes'],20)
        self.assertEqual(self.call(format='Reels').json()['daily'],[])
        self.assertEqual(self.call(start_date='bad').status_code,422)
        self.assertEqual(self.call(start_date='2026-10-01').status_code,422)
    def test_followers_remain_actual_snapshots(self):
        history=self.call().json()['follower_history']
        self.assertEqual(len(history),1);self.assertEqual(history[0]['points'][0]['followers'],123)
        self.assertEqual(len(history[0]['points']),1)
    def test_development_never_starts_scheduler_even_with_enabled_config(self):
        with patch.dict(os.environ,{'APP_ENV':'development','COLLECTION_ENABLED':'true','COLLECTION_SCHEDULER_MODE':'embedded','APIFY_TOKEN':'test-only'}),patch('app.services.auto_sync.Thread') as thread,patch('app.services.auto_sync.collect_campaign') as collect:
            start_scheduler();tick(self.engine)
            thread.assert_not_called();collect.assert_not_called()
