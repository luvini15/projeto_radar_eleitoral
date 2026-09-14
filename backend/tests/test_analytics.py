import os
import unittest
from datetime import datetime, timezone
os.environ['DATABASE_URL'] = 'sqlite://'
from sqlmodel import Session, SQLModel, create_engine
from app.models import Campaign, CampaignProfile, InstagramProfile, InstagramPost, PostSnapshot
from app.routers.analytics import campaign_overview, campaign_posts

class AnalyticsTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://')
        SQLModel.metadata.create_all(self.engine)
        self.session = Session(self.engine)
        self.session.add(Campaign(id=1, name='Teste', slug='teste'))
        self.session.add(InstagramProfile(id=1, username='teste'))
        self.session.commit()
        self.session.add(CampaignProfile(campaign_id=1, profile_id=1, role='CLIENT'))
        self.session.add(InstagramPost(id=1, profile_id=1, shortcode='sem-data', url='https://instagram.com/p/sem-data/'))
        self.session.add(InstagramPost(id=2, profile_id=1, shortcode='com-data', url='https://instagram.com/p/com-data/', published_at=datetime.now(timezone.utc)))
        self.session.commit()

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def test_missing_metrics_remain_null_and_zero_is_preserved(self):
        result = campaign_overview(1, 25, self.session)
        self.assertIsNone(result['summary']['comments'])
        self.assertIsNone(result['summary']['observed_interactions'])
        self.session.add(PostSnapshot(post_id=1, comments_count=0, interactions_count=0))
        self.session.commit()
        result = campaign_overview(1, 25, self.session)
        self.assertEqual(result['summary']['comments'], 0)
        self.assertEqual(result['summary']['observed_interactions'], 0)
        self.assertIsNone(result['summary']['views'])

    def test_posts_without_dates_sort_last(self):
        result = campaign_posts(1, session=self.session)
        self.assertEqual([post['post_id'] for post in result['posts']], [2, 1])

if __name__ == '__main__':
    unittest.main()
