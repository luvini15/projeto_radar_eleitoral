import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from sqlmodel import Session, SQLModel, create_engine
os.environ.setdefault('DATABASE_URL', 'sqlite://')
from app.models import Campaign, CampaignProfile, InstagramProfile, SyncSchedule
from app.services.auto_sync import tick, collection_lock

class AutoSyncTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://')
        SQLModel.metadata.create_all(self.engine)
        with Session(self.engine) as s:
            s.add(Campaign(id=1,name='Teste',slug='teste'))
            s.add(InstagramProfile(id=1,username='teste'))
            s.commit()
            s.add(CampaignProfile(campaign_id=1,profile_id=1,role='CLIENT'))
            s.commit()
        self.env = patch.dict(os.environ, {'COLLECTION_ENABLED':'true','APIFY_TOKEN':'test-only','AUTO_SYNC_CAMPAIGN_IDS':'1','AUTO_SYNC_INTERVAL_HOURS':'6','AUTO_SYNC_POST_LIMIT':'25'})
        self.env.start()
        self.now = datetime.now(timezone.utc)
    def tearDown(self):
        self.env.stop()
        self.engine.dispose()
    def test_persists_interval_and_does_not_repeat_on_restart(self):
        calls=[]
        def collect(**kwargs): calls.append(kwargs['limit'])
        tick(self.engine, collect, self.now)
        tick(self.engine, collect, self.now + timedelta(hours=1))
        self.assertEqual(calls,[25])
        tick(self.engine, collect, self.now + timedelta(hours=6))
        self.assertEqual(calls,[25,25])
    def test_failure_waits_for_next_interval_and_redacts_provider_error(self):
        calls=[]
        def collect(**kwargs):
            calls.append(1)
            raise RuntimeError('secret-test-token')
        tick(self.engine, collect, self.now)
        tick(self.engine, collect, self.now + timedelta(minutes=1))
        self.assertEqual(len(calls),1)
        with Session(self.engine) as s:
            row=s.get(SyncSchedule,1)
            self.assertEqual(row.status,'error')
            self.assertNotIn('secret-test-token', row.error)
    def test_lock_and_missing_token_prevent_collection(self):
        calls=[]
        collection_lock.acquire()
        try: tick(self.engine, lambda **kwargs: calls.append(1), self.now)
        finally: collection_lock.release()
        with patch.dict(os.environ, {'APIFY_TOKEN':''}):
            tick(self.engine, lambda **kwargs: calls.append(1), self.now)
        self.assertEqual(calls,[])
        with Session(self.engine) as s: self.assertIsNone(s.get(SyncSchedule,1))

if __name__ == '__main__': unittest.main()
