import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
import httpx
from fastapi import HTTPException
from sqlmodel import Session, SQLModel, create_engine
os.environ.setdefault('DATABASE_URL', 'sqlite://')
from app.models import Campaign, CampaignProfile, InstagramProfile, InstagramPost, PostSnapshot, AIUsage
from app.routers.analytics import campaign_post_detail
from app.services.post_ai import generate_analysis, evidence_from
from app.services.comments import save_comment_sample

class PostAITests(unittest.TestCase):
    def setUp(self):
        self.engine=create_engine('sqlite://')
        SQLModel.metadata.create_all(self.engine)
        self.session=Session(self.engine)
        self.session.add(Campaign(id=1,name='Teste',slug='teste'))
        self.session.add(InstagramProfile(id=1,username='teste'))
        self.session.commit()
        self.session.add(CampaignProfile(campaign_id=1,profile_id=1,role='CLIENT'))
        self.session.add(InstagramPost(id=1,profile_id=1,shortcode='teste',url='https://instagram.com/p/teste/'))
        self.session.commit()
        now=datetime.now(timezone.utc)
        self.session.add(PostSnapshot(post_id=1,comments_count=2,collected_at=now-timedelta(days=10)))
        self.session.add(PostSnapshot(post_id=1,comments_count=5,collected_at=now))
        self.session.commit()
        self.env=patch.dict(os.environ,{'OPENROUTER_API_KEY':'test-only','OPENROUTER_MODEL':'openrouter/free','AI_DAILY_LIMIT':'2'})
        self.env.start()
    def tearDown(self):
        self.env.stop();self.session.close();self.engine.dispose()
    def detail(self,days=90): return campaign_post_detail(1,1,self.session,days)
    def provider(self):
        fake=MagicMock()
        fake.__enter__.return_value.post.return_value=httpx.Response(200,request=httpx.Request('POST','https://openrouter.ai'),json={'model':'test/free','choices':[{'message':{'content':'Resumo descritivo de teste.'},'finish_reason':'stop'}]})
        return fake
    def test_cached_analysis_avoids_duplicate_requests_and_tracks_budget(self):
        with patch('app.services.post_ai.httpx.Client',return_value=self.provider()) as client:
            first=generate_analysis(self.session,self.detail())
            second=generate_analysis(self.session,self.detail())
            self.assertFalse(first['cached']);self.assertTrue(second['cached']);self.assertEqual(client.call_count,1)
    def test_comments_change_invalidates_cache_and_are_limited(self):
        with patch('app.services.post_ai.httpx.Client',return_value=self.provider()) as client:
            generate_analysis(self.session,self.detail())
            save_comment_sample(self.session,1,{'latestComments':[{'text':'@autor comentário de teste'}]*60})
            result=generate_analysis(self.session,self.detail())
            self.assertEqual(client.call_count,2)
            self.assertEqual(result['evidence']['comments']['sample_size'],30)
            self.assertNotIn('@autor',result['evidence']['comments']['texts'][0])
    def test_absent_key_does_not_call_provider(self):
        with patch.dict(os.environ,{'OPENROUTER_API_KEY':''}), patch('app.services.post_ai.httpx.Client') as client:
            with self.assertRaises(HTTPException) as error: generate_analysis(self.session,self.detail())
            self.assertEqual(error.exception.status_code,503);client.assert_not_called()
    def test_rate_limit_and_paid_model_are_blocked(self):
        self.session.add(AIUsage(day=datetime.now(timezone.utc).date().isoformat(),requests=2));self.session.commit()
        with self.assertRaises(HTTPException) as error: generate_analysis(self.session,self.detail())
        self.assertEqual(error.exception.status_code,429)
        with patch.dict(os.environ,{'OPENROUTER_MODEL':'paid/model'}):
            with self.assertRaises(HTTPException) as error: generate_analysis(self.session,self.detail())
            self.assertEqual(error.exception.status_code,503)
    def test_week_filter_does_not_replace_latest_metrics(self):
        self.assertEqual(len(self.detail(7)['history']),1)
        self.assertEqual(len(self.detail(30)['history']),2)
        self.assertEqual(self.detail(7)['post']['metrics']['comments'],5)
    def test_provider_error_is_sanitized(self):
        fake=self.provider()
        fake.__enter__.return_value.post.side_effect=httpx.ConnectError('secret-test-only')
        with patch('app.services.post_ai.httpx.Client',return_value=fake):
            with self.assertRaises(HTTPException) as error: generate_analysis(self.session,self.detail())
            self.assertEqual(error.exception.status_code,502)
            self.assertNotIn('secret',error.exception.detail)
