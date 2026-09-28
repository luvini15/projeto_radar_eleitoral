import os
os.environ.setdefault("DATABASE_URL","sqlite://")
import unittest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine, select
from app.database import get_session
from app.models import (AdministrativeRegion, Campaign, CampaignProfile, InstagramProfile, InstagramPost,
                        PostRegion, PostSnapshot, PostTheme, ProfileRegion, ProfileMonitoring)
from app.routers.territorial import seed_reference_data
from app.routers.territorial_audit import router
from app.services.profile_import import PLANALTINA_PROFILES, register_planaltina_profiles
from app.services.territorial_detection import classify_post
from app.services.territorial_audit import audit_rows, audit_summary
from app.services.trends import build_trends


class AuditTests(unittest.TestCase):
    def setUp(self):
        self.engine=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool)
        SQLModel.metadata.create_all(self.engine)
        self.s=Session(self.engine);seed_reference_data(self.s)
        self.r={r.name:r.id for r in self.s.exec(select(AdministrativeRegion)).all()}
        self.s.add_all([Campaign(id=1,name="Test",slug="test"),Campaign(id=2,name="Other",slug="other"),InstagramProfile(id=1,username="news")]);self.s.commit()
        self.s.add(CampaignProfile(campaign_id=1,profile_id=1,role="DF_GENERAL"));self.s.commit()
        self.provider=patch("app.integrations.apify.get_client",side_effect=AssertionError("External collection forbidden"));self.provider.start();self.addCleanup(self.provider.stop)
        api=FastAPI();api.include_router(router)
        def session_override():
            with Session(self.engine) as session:yield session
        api.dependency_overrides[get_session]=session_override
        self.client=TestClient(api)
        self.addCleanup(self.client.close);self.addCleanup(self.engine.dispose);self.addCleanup(self.s.close)
    def post(self,caption,profile=1,days=0,classify=True):
        p=InstagramPost(profile_id=profile,shortcode=str(len(self.s.exec(select(InstagramPost)).all())+1),url="https://www.instagram.com/p/test/",caption=caption,published_at=datetime(2026,9,10,12,tzinfo=timezone.utc)+timedelta(days=days),content_type="Image")
        self.s.add(p);self.s.commit()
        if classify:classify_post(self.s,p);self.s.commit()
        return p
    def rows(self,**kwargs):return audit_rows(self.s,**kwargs)
    def test_register_four_profiles_idempotent_and_active(self):
        first=register_planaltina_profiles(self.s,1);second=register_planaltina_profiles(self.s,1)
        self.assertEqual((first["new"],first["existing"],second["new"],second["existing"]),(4,0,0,4))
        self.assertEqual(first["posts_processed"],0)
        self.assertEqual(len(self.s.exec(select(CampaignProfile)).all()),5)
        for item in first["profiles"]:
            self.assertEqual(item["region"],"Planaltina");self.assertTrue(item["active"]);self.assertEqual(item["posts_local"],0)
            link=self.s.exec(select(CampaignProfile).where(CampaignProfile.profile_id==item["profile_id"])).one()
            self.assertEqual(link.role,"LOCAL_PAGE")
    def test_existing_profile_region_role_and_active_confirmed_history_preserved(self):
        p=InstagramProfile(username=PLANALTINA_PROFILES[0],profile_type="MEDIA");self.s.add(p);self.s.commit()
        self.s.add(ProfileRegion(profile_id=p.id,region_id=self.r["Ceilândia"]));self.s.add(CampaignProfile(campaign_id=1,profile_id=p.id,role="COMPETITOR",active=False));self.s.commit()
        post=self.post("Obras em Taguatinga",profile=p.id)
        self.s.add(PostSnapshot(post_id=post.id,likes_count=7));self.s.commit()
        result=register_planaltina_profiles(self.s,1)
        self.assertEqual((result["new"],result["existing"],result["posts_processed"]),(3,1,1))
        self.assertEqual(self.s.get(InstagramProfile,p.id).profile_type,"MEDIA")
        self.assertEqual(self.s.exec(select(ProfileRegion).where(ProfileRegion.profile_id==p.id)).one().region_id,self.r["Planaltina"])
        links=self.s.exec(select(CampaignProfile).where(CampaignProfile.profile_id==p.id)).all()
        self.assertEqual(len(links),1);self.assertEqual(links[0].role,"LOCAL_PAGE");self.assertTrue(links[0].active)
        self.assertEqual(self.s.exec(select(PostSnapshot)).one().likes_count,7)
        self.assertEqual(self.rows(profile_id=p.id)[0]["region_name"],"Taguatinga")
    def test_new_profile_posts_feed_trends_only_when_present(self):
        result=register_planaltina_profiles(self.s,1);pid=result["profiles"][0]["profile_id"]
        start=datetime(2026,9,1,tzinfo=timezone.utc);end=datetime(2026,9,30,tzinfo=timezone.utc)
        self.assertEqual(build_trends(self.s,1,start,end,self.r["Planaltina"])["data_status"],"NO_DATA")
        p=self.post("Iluminação em Planaltina",profile=pid)
        self.s.add(PostSnapshot(post_id=p.id,interactions_count=17));self.s.commit()
        row=build_trends(self.s,1,start,end,self.r["Planaltina"])["territorial_trends"][0]
        self.assertEqual((row["theme"],row["volume"],row["interactions"]),("Infraestrutura",1,17))
    def test_endpoint_contract_latest_snapshot_zero_and_null(self):
        p=self.post("Obras em Planaltina")
        self.s.add_all([PostSnapshot(post_id=p.id,likes_count=99,views_count=900,collected_at=datetime(2026,9,10)),PostSnapshot(post_id=p.id,likes_count=0,comments_count=2,interactions_count=2,views_count=None,plays_count=10,collected_at=datetime(2026,9,11))]);self.s.commit()
        response=self.client.get("/api/territorial/audit");self.assertEqual(response.status_code,200)
        row=response.json()["items"][0]
        self.assertTrue(set("post_id shortcode profile_id username caption published_at url region_id region_name detection_source confidence evidence theme interactions likes comments views plays".split()) <= row.keys())
        self.assertEqual(row["likes"],0);self.assertIsNone(row["views"]);self.assertEqual(row["plays"],10);self.assertTrue(row["evidence_is_literal"])
    def test_region_and_confidence_filters_keep_all_evidence(self):
        self.post("Obras entre Ceilândia e Taguatinga")
        data=self.client.get("/api/territorial/audit",params={"region_id":self.r["Ceilândia"],"confidence":"HIGH"}).json()
        self.assertEqual(data["total"],1);self.assertEqual(len(data["items"][0]["territories"]),2)
    def test_multiple_regions_counts_unique_posts(self):
        self.post("Obras entre Ceilândia e Taguatinga");self.post("Obras em Planaltina")
        data=self.client.get("/api/territorial/audit",params={"multiple_regions":"true"}).json()
        self.assertEqual(data["total"],2);self.assertEqual(data["summary"]["total_posts"],1);self.assertEqual(data["summary"]["posts_multiple_regions"],1)
    def test_low_audit_reason_and_no_reclassification(self):
        self.post("Local: Santa Maria - encontro");self.post("Bom dia Brasília")
        before=[r.model_dump() for r in self.s.exec(select(PostRegion)).all()]
        data=self.client.get("/api/territorial/audit",params={"confidence":"LOW"}).json()
        self.assertEqual(data["total"],1);self.assertIsNone(data["items"][0]["region_id"]);self.assertIn("Local:",data["items"][0]["low_confidence_reason"])
        self.s.expire_all();self.assertEqual(before,[r.model_dump() for r in self.s.exec(select(PostRegion)).all()])
    def test_no_region_includes_none_ambiguous_and_unclassified(self):
        self.post("Sem pistas");self.post("Cruzeiro venceu o campeonato");self.post("Nada",classify=False);self.post("Planaltina")
        data=self.client.get("/api/territorial/audit",params={"has_region":"false"}).json()
        self.assertEqual(data["summary"]["posts_without_region"],3)
        for row in data["items"]:self.assertIsNone(row["region_id"]);self.assertEqual(row["status_message"],"Sem evidência territorial suficiente")
        self.assertEqual(data["summary"]["posts_by_confidence"]["LOW"],1)
    def test_profile_theme_dates_and_campaign_filters(self):
        p=self.post("Hospital em Planaltina",days=1);self.post("Obras em Planaltina",days=2)
        data=self.client.get("/api/territorial/audit",params={"profile_id":1,"theme":"Saúde","start_date":"2026-09-11","end_date":"2026-09-11","campaign_id":1}).json()
        self.assertEqual([r["post_id"] for r in data["items"]],[p.id])
        self.assertEqual(self.client.get("/api/territorial/audit",params={"campaign_id":2}).json()["total"],0)
    def test_sort_semantic_confidence_then_date_and_pagination(self):
        high_old=self.post("Planaltina",days=-2);high_new=self.post("Ceilândia",days=-1);self.post("Asa Norte",days=4);self.post("Vasco da Gama",days=5);self.post("Sem pistas",days=6)
        rows=self.client.get("/api/territorial/audit").json()["items"]
        self.assertEqual([r["confidence"] for r in rows],["HIGH","HIGH","MEDIUM","LOW",None])
        self.assertEqual([r["post_id"] for r in rows[:2]],[high_new.id,high_old.id])
        paged=self.client.get("/api/territorial/audit",params={"limit":1,"offset":1}).json()
        self.assertEqual(paged["total"],5);self.assertEqual(paged["items"][0]["post_id"],high_old.id)
    def test_missing_metrics_and_null_dates(self):
        p=self.post("Planaltina");p.published_at=None;self.s.add(p);self.s.commit()
        row=self.client.get("/api/territorial/audit").json()["items"][0]
        self.assertIsNone(row["published_at"]);self.assertIsNone(row["interactions"])
    def test_summary_matches_rows_not_none_placeholder_confidence(self):
        self.post("Obras entre Ceilândia e Taguatinga");self.post("Sem pistas");self.post("Cruzeiro venceu")
        s=self.client.get("/api/territorial/audit/summary").json()
        self.assertEqual((s["total_posts"],s["posts_with_region"],s["posts_without_region"]),(3,1,2))
        self.assertEqual(s["posts_by_confidence"],{"HIGH":1,"MEDIUM":0,"LOW":1});self.assertEqual(s["assignments_by_confidence"]["HIGH"],2)
        self.assertEqual(s["detection_sources"]["NONE"],1)
        self.assertEqual(s["posts_by_detection_source"]["EXPLICIT_RA"],2)
    def test_validation_and_empty_profile(self):
        self.assertEqual(self.client.get("/api/territorial/audit",params={"confidence":"WRONG"}).status_code,422)
        self.assertEqual(self.client.get("/api/territorial/audit",params={"start_date":"2026-09-12","end_date":"2026-09-11"}).status_code,400)
        self.assertEqual(self.client.get("/api/territorial/audit",params={"limit":0}).status_code,422)
        self.assertEqual(self.client.get("/api/territorial/audit",params={"profile_id":999}).json()["total"],0)
    def test_location_high_exposes_geotag_evidence(self):
        p=self.post("Sem RA na legenda",classify=False);p.location_name="Planaltina, DF";self.s.add(p);self.s.commit();classify_post(self.s,p);self.s.commit()
        row=self.rows()[0];self.assertEqual(row["detection_source"],"LOCATION");self.assertTrue(row["evidence_is_literal"])
    def test_no_dynamic_profile_fallback_in_read_only_audit(self):
        p=self.post("Sem RA")
        self.s.add(ProfileRegion(profile_id=1,region_id=self.r["Planaltina"]));self.s.commit()
        self.assertIsNone(self.rows()[0]["region_id"])


if __name__ == "__main__":unittest.main()
