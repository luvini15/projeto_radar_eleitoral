import unittest
from unittest.mock import patch

from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.models import Campaign, CampaignProfile, CollectionRun, InstagramPost, InstagramProfile, PostSnapshot, ProfileSnapshot
from app.services.monitoring_sync import collect_campaign


RAW_POST = {"id":"1","shortCode":"stable-code","ownerId":"owner","ownerUsername":"profile","ownerFullName":"Profile","url":"https://instagram.com/p/stable-code","caption":"ônibus e mobilidade","type":"Image","timestamp":"2026-09-05T12:00:00Z","likesCount":10,"commentsCount":2}


class MonitoringTest(unittest.TestCase):
    def setUp(self):
        self.engine=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool)
        SQLModel.metadata.create_all(self.engine)
        self.session=Session(self.engine)
        campaign=Campaign(name="Test",slug="test"); profile=InstagramProfile(username="profile")
        self.session.add(campaign);self.session.add(profile);self.session.commit();self.session.refresh(campaign);self.session.refresh(profile)
        self.campaign_id=campaign.id;self.profile_id=profile.id
        self.session.add(CampaignProfile(campaign_id=campaign.id,profile_id=profile.id,role="CLIENT"));self.session.commit()

    def tearDown(self): self.session.close(); self.engine.dispose()

    @patch("app.services.monitoring_sync.collect_posts",return_value=[RAW_POST])
    @patch("app.services.monitoring_sync.collect_profile",return_value={"followersCount":100,"followingCount":3,"postsCount":8})
    def test_reprocessing_does_not_duplicate_posts_but_preserves_snapshots(self,_profile,_posts):
        first=collect_campaign(self.session,self.campaign_id);second=collect_campaign(self.session,self.campaign_id)
        self.assertEqual(first["new_posts"],1);self.assertEqual(second["new_posts"],0)
        self.assertEqual(len(self.session.exec(select(InstagramPost)).all()),1)
        self.assertEqual(len(self.session.exec(select(PostSnapshot)).all()),2)
        self.assertEqual(len(self.session.exec(select(ProfileSnapshot)).all()),2)

    @patch("app.services.monitoring_sync.collect_posts",return_value=[RAW_POST])
    @patch("app.services.monitoring_sync.collect_profile",side_effect=RuntimeError("profile unavailable"))
    def test_partial_collection_is_recorded(self,_profile,_posts):
        result=collect_campaign(self.session,self.campaign_id)
        self.assertEqual(result["status"],"PARTIAL");self.assertEqual(result["profiles_succeeded"],1);self.assertEqual(result["followers_updated"],0)

    @patch("app.services.monitoring_sync.collect_posts",side_effect=RuntimeError("actor failed"))
    @patch("app.services.monitoring_sync.collect_profile",return_value={"followersCount":100})
    def test_failed_collection_isolated_and_recorded(self,_profile,_posts):
        result=collect_campaign(self.session,self.campaign_id)
        self.assertEqual(result["status"],"FAILED");self.assertEqual(result["profiles_failed"],1)
        self.assertEqual(self.session.exec(select(CollectionRun)).all()[-1].status,"FAILED")


if __name__ == "__main__": unittest.main()
