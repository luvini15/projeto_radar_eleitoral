import unittest
from datetime import datetime, timezone

from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.models import AdministrativeRegion, Campaign, CampaignProfile, InstagramPost, InstagramProfile, PostSnapshot, ProfileRegion, Theme, PostTheme
from app.routers.filtered_analytics import filtered_analytics


class AnalyticsFiltersTest(unittest.TestCase):
    def setUp(self):
        self.engine=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool);SQLModel.metadata.create_all(self.engine);self.session=Session(self.engine)
        campaign=Campaign(name="Campaign",slug="filters");p1=InstagramProfile(username="one");p2=InstagramProfile(username="two");region=AdministrativeRegion(name="Brazlândia");theme=Theme(name="Saúde")
        self.session.add_all([campaign,p1,p2,region,theme]);self.session.commit()
        for x in [campaign,p1,p2,region,theme]:self.session.refresh(x)
        self.campaign,self.p1,self.p2,self.region,self.theme=campaign,p1,p2,region,theme
        self.session.add_all([CampaignProfile(campaign_id=campaign.id,profile_id=p1.id,role="CLIENT"),CampaignProfile(campaign_id=campaign.id,profile_id=p2.id,role="COMPETITOR"),ProfileRegion(profile_id=p1.id,region_id=region.id)]);self.session.commit()
        post=InstagramPost(shortcode="health",profile_id=p1.id,url="https://instagram.com/p/health",caption="hospital e saúde",content_type="Image",published_at=datetime(2026,8,10,tzinfo=timezone.utc));outside=InstagramPost(shortcode="outside",profile_id=p2.id,url="https://instagram.com/p/outside",caption="obra",content_type="Video",published_at=datetime(2026,7,10,tzinfo=timezone.utc))
        self.session.add_all([post,outside]);self.session.commit();self.session.refresh(post);self.session.refresh(outside)
        self.session.add_all([PostSnapshot(post_id=post.id,likes_count=None,comments_count=2,interactions_count=2),PostSnapshot(post_id=outside.id,likes_count=5,comments_count=1,interactions_count=6),PostTheme(post_id=post.id,theme_id=theme.id)]);self.session.commit()

    def tearDown(self):self.session.close();self.engine.dispose()

    def call(self,region=None,profiles=None,theme=None,fmt=None):return filtered_analytics(self.campaign.id,"2026-08-01","2026-08-31",region,profiles or [],theme,fmt,self.session)

    def test_period_profile_region_and_theme_filters(self):
        data=self.call(self.region.id,[self.p1.id],"Saúde","Imagem")
        self.assertEqual(len(data["profiles"]),1);self.assertEqual(data["profiles"][0]["posts"],1);self.assertEqual(data["themes"][0]["theme"],"Saúde")

    def test_missing_metric_remains_null(self):
        self.assertIsNone(self.call()["profiles"][0]["likes_average"])

    def test_unassigned_profile_is_not_attributed_to_region(self):
        self.assertEqual(self.call(self.region.id,[self.p2.id])["data_status"],"NO_DATA")


if __name__ == "__main__":unittest.main()
