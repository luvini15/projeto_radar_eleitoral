import os
os.environ.setdefault("DATABASE_URL", "sqlite://")
import json
import unittest
from datetime import datetime, timedelta, timezone
from threading import Thread
from unittest.mock import patch
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select
from fastapi import HTTPException
from app.models import (AdministrativeRegion, Campaign, CampaignProfile, InstagramPost, InstagramProfile,
                        PostRegion, PostTheme, PostSnapshot, ProfileMonitoring, ProfileRegion,
                        SchedulerHeartbeat, SyncSchedule, Theme)
from app.routers.territorial import seed_reference_data, classify_posts, trend_posts
from app.routers.filtered_analytics import filtered_analytics
from app.services.profile_import import DF_GENERAL, import_profiles, normalize_username
from app.services.territorial_detection import classify_post, classify_existing, detect_regions, territories_for_posts
from app.services.trends import build_trends
from app.services.auto_sync import next_daily, tick, scheduler_status
from app.services.collection_lock import collection_slot


class DatabaseCase(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        SQLModel.metadata.create_all(self.engine)
        self.s = Session(self.engine)
        seed_reference_data(self.s)
        self.regions = self.s.exec(select(AdministrativeRegion)).all()
        self.r = {region.name: region.id for region in self.regions}
        self.s.add_all([Campaign(id=1,name="Test",slug="test"),Campaign(id=2,name="Other",slug="other"),InstagramProfile(id=1,username="local"),InstagramProfile(id=2,username="general")]); self.s.commit()
        self.s.add_all([CampaignProfile(campaign_id=1,profile_id=1,role="LOCAL_PAGE"),CampaignProfile(campaign_id=1,profile_id=2,role="DF_GENERAL"),ProfileRegion(profile_id=1,region_id=self.r["Planaltina"])]); self.s.commit()
    def tearDown(self): self.s.close(); self.engine.dispose()
    def post(self,caption,profile=2,location=None):
        post=InstagramPost(profile_id=profile,shortcode=str(len(self.s.exec(select(InstagramPost)).all())+1),url="https://www.instagram.com/p/test/",caption=caption,location_name=location,content_type="Image",published_at=datetime(2026,9,10,tzinfo=timezone.utc))
        self.s.add(post);self.s.flush();self.s.add(PostSnapshot(post_id=post.id,interactions_count=12));self.s.commit();return post
    def detect(self,caption,location=None):return detect_regions(caption,location,self.regions)


class TerritorialTests(DatabaseCase):
    def test_campaign_detail_exposes_profile_region_and_monitoring(self):
        from app.routers.campaigns import get_campaign
        detail=get_campaign(1,self.s)
        local=next(p for p in detail["profiles"] if p["id"]==1)
        general=next(p for p in detail["profiles"] if p["id"]==2)
        self.assertEqual(local["profile_region"],"Planaltina")
        self.assertIsNone(general["profile_region_id"])
        self.assertEqual(general["role"],"DF_GENERAL")

    def test_explicit_ra_high_original_evidence_and_theme(self):
        p=self.post("Moradores de Planaltina reclamam da falta de iluminação.")
        items=classify_post(self.s,p)
        self.assertEqual(items[0],{"region_id":self.r["Planaltina"],"source":"EXPLICIT_RA","confidence":"HIGH","evidence":"Moradores de Planaltina"})
        assignment=self.s.exec(select(PostTheme).where(PostTheme.post_id==p.id)).one()
        self.assertEqual(self.s.get(Theme,assignment.theme_id).name,"Infraestrutura")
    def test_geographic_tags_mentions_and_anniversary_evidence(self):
        for text,name in [("#RiachoFundoII", "Riacho Fundo II"),("#Sobradinho_II", "Sobradinho II"),("@planaltina", "Planaltina")]:
            with self.subTest(text=text):self.assertEqual([item["region_id"] for item in self.detect(text)],[self.r[name]])
        self.assertEqual(self.detect("@planaltinanews"),[])
        self.assertEqual(self.detect("Parabéns, Planaltina, pelos seus 167 anos")[0]["evidence"],"Parabéns, Planaltina")

    def test_alias_and_longest_match(self):
        for text,name in [("Obras na Estrutural","SCIA/Estrutural"),("Saúde em Riacho Fundo 2","Riacho Fundo II"),("Obras em Sobradinho II","Sobradinho II")]:
            with self.subTest(text=text):self.assertEqual([x["region_id"] for x in self.detect(text)],[self.r[name]])
    def test_locality_medium(self):
        item=self.detect("Iluminação na Asa Norte")[0]
        self.assertEqual((item["region_id"],item["source"],item["confidence"]),(self.r["Plano Piloto"],"LOCALITY","MEDIUM"))
    def test_location_and_multiple_regions(self):
        self.assertEqual({x["region_id"] for x in self.detect("Obras entre Ceilândia e Taguatinga")},{self.r["Ceilândia"],self.r["Taguatinga"]})
        self.assertEqual(self.detect("Obras", "Planaltina, Distrito Federal")[0]["source"],"LOCATION")
    def test_ambiguous_names_are_low_and_unassigned(self):
        for text in ["Cruzeiro venceu o campeonato", "Vasco da Gama", "Obras em Planaltina-GO", "Lago Paranoá"]:
            with self.subTest(text=text):
                item=self.detect(text)[0];self.assertIsNone(item["region_id"]);self.assertEqual(item["confidence"],"LOW");self.assertIn(item["evidence"],text)
    def test_named_square_does_not_create_homonymous_region(self):
        items=self.detect("Reformas em Planaltina, incluindo a Praça São Sebastião.")
        self.assertEqual([item["region_id"] for item in items],[self.r["Planaltina"]])
        ambiguous=self.detect("Encontro na Praça São Sebastião")[0]
        self.assertIsNone(ambiguous["region_id"]);self.assertEqual(ambiguous["confidence"],"LOW")
    def test_no_evidence_no_guess_for_general(self):
        p=self.post("Notícias de Brasília e do DF")
        result=classify_post(self.s,p)
        self.assertEqual(result[0]["source"],"NONE");self.assertIsNone(result[0]["region_id"])
    def test_general_never_uses_profile_fallback(self):
        self.s.add(ProfileRegion(profile_id=2,region_id=self.r["Planaltina"]));self.s.commit()
        self.assertIsNone(classify_post(self.s,self.post("Bom dia"))[0]["region_id"])
    def test_post_region_overrides_but_does_not_mutate_profile_region(self):
        p=self.post("Obras em Ceilândia",profile=1);result=classify_post(self.s,p)
        self.assertEqual(result[0]["region_id"],self.r["Ceilândia"])
        self.assertEqual(self.s.exec(select(ProfileRegion).where(ProfileRegion.profile_id==1)).one().region_id,self.r["Planaltina"])
    def test_profile_fallback_is_explicit_and_low(self):
        result=classify_post(self.s,self.post("Obras de iluminação",profile=1))[0]
        self.assertEqual((result["source"],result["confidence"]),("PROFILE","LOW"))
    def test_profile_fallback_tracks_changes_without_overwriting_content(self):
        post=self.post("Sem evidência",profile=1);classify_post(self.s,post);self.s.commit()
        link=self.s.exec(select(ProfileRegion).where(ProfileRegion.profile_id==1)).one()
        link.region_id=self.r["Ceilândia"];self.s.add(link);self.s.commit()
        self.assertEqual(territories_for_posts(self.s,[post])[post.id][0]["region_id"],self.r["Ceilândia"])
        self.s.delete(link);self.s.commit()
        self.assertEqual(territories_for_posts(self.s,[post])[post.id],[])
        classify_post(self.s,post);self.s.commit()
        self.s.add(ProfileRegion(profile_id=1,region_id=self.r["Taguatinga"]));self.s.commit()
        self.assertEqual(territories_for_posts(self.s,[post])[post.id][0]["region_id"],self.r["Taguatinga"])

    def test_reclassification_is_idempotent_and_removes_old_inference(self):
        p=self.post("Obras em Planaltina");classify_post(self.s,p);self.s.commit()
        ids=[r.id for r in self.s.exec(select(PostRegion)).all()]
        classify_post(self.s,p);self.s.commit();self.assertEqual(ids,[r.id for r in self.s.exec(select(PostRegion)).all()])
        p.caption="Obras em Taguatinga";classify_post(self.s,p);self.s.commit()
        self.assertEqual([r.region_id for r in self.s.exec(select(PostRegion)).all()],[self.r["Taguatinga"]])
    def test_reviewed_theme_is_preserved(self):
        p=self.post("Iluminação em Planaltina");theme=self.s.exec(select(Theme).where(Theme.name=="Saúde")).one()
        self.s.add(PostTheme(post_id=p.id,theme_id=theme.id,reviewed=True));self.s.commit();classify_post(self.s,p)
        self.assertEqual(self.s.exec(select(PostTheme).where(PostTheme.post_id==p.id)).one().theme_id,theme.id)
    def test_campaign_classification_does_not_touch_unlinked_posts(self):
        p=self.post("Obras em Planaltina");result=classify_posts(2,self.s)
        self.assertEqual(result["posts_processed"],0);self.assertEqual(self.s.exec(select(PostRegion)).all(),[])
        self.assertEqual(classify_existing(self.s)["posts_processed"],1)
    def test_general_and_territorial_import_no_duplicates_preserves_existing(self):
        first=import_profiles(self.s,1,[{"username":"@NEWS","region":"Ceilândia","description":"Texto","relevance":"Alta","active":"ATIVO"}])
        again=import_profiles(self.s,1,[{"username":"news","region":"Ceilândia"}])
        self.assertEqual((first["new"],again["existing"],again["new"]),(1,1,0))
        profile=self.s.get(InstagramProfile,first["profiles"][0]["profile_id"])
        self.assertEqual(self.s.get(ProfileMonitoring,profile.id).description,"Texto")
        self.assertEqual(self.s.exec(select(ProfileRegion).where(ProfileRegion.profile_id==profile.id)).one().region_id,self.r["Ceilândia"])
    def test_all_general_profiles_have_scope_without_fixed_region(self):
        result=import_profiles(self.s,1,[{"username":name} for name in DF_GENERAL],general=True)
        self.assertEqual(result["new"],11)
        for item in result["profiles"]:
            self.assertIsNone(item["region"]);self.assertEqual(item["scope"],"DF_GENERAL");self.assertEqual(item["url"],f'https://www.instagram.com/{item["username"]}/')
        again=import_profiles(self.s,1,[{"username":name} for name in DF_GENERAL],general=True)
        self.assertEqual(again["existing"],11);self.assertEqual(again["new"],0)
    def test_invalid_inactive_and_duplicate_sheet_rows(self):
        result=import_profiles(self.s,1,[{"username":"@inactive","region":"Planaltina","active":"NÃO ATIVO"},{"username":"INACTIVE","region":"Planaltina"},{"username":"bad space"},{"username":"other","url":"https://evil.example/other"}])
        self.assertEqual(result["new"],1);self.assertFalse(result["profiles"][0]["active"]);self.assertEqual(result["duplicate_rows"],1);self.assertEqual(len(result["errors"]),2)
    def test_trends_multiregion_no_double_count_and_post_drilldown(self):
        p=self.post("Obras entre Ceilândia e Taguatinga");classify_post(self.s,p);self.s.commit()
        start=datetime(2026,9,1,tzinfo=timezone.utc);end=datetime(2026,9,30,tzinfo=timezone.utc)
        data=build_trends(self.s,1,start,end)
        self.assertEqual(sum(r["volume"] for r in data["trends"]),1)
        self.assertEqual(len(data["territorial_trends"]),2)
        filtered=build_trends(self.s,1,start,end,self.r["Ceilândia"],territorial_origin="CONTENT")
        self.assertEqual(filtered["trends"][0]["volume"],1)
        empty=build_trends(self.s,1,start,end,self.r["Ceilândia"],territorial_origin="PROFILE")
        self.assertEqual(empty["data_status"],"NO_DATA")
        posts=trend_posts(1,"2026-09-01","2026-09-30",self.r["Ceilândia"],"Infraestrutura",[],None,"CONTENT",0,50,self.s)
        self.assertEqual(posts["total"],1);self.assertEqual(posts["posts"][0]["post_id"],p.id)
    def test_trends_unknown_metrics_remain_null_and_known_zero_is_real(self):
        post=self.post("Hospital em Planaltina")
        classify_post(self.s,post)
        snapshot=self.s.exec(select(PostSnapshot).where(PostSnapshot.post_id==post.id)).one()
        snapshot.interactions_count=None;self.s.add(snapshot);self.s.commit()
        period=(datetime(2026,9,1,tzinfo=timezone.utc),datetime(2026,9,30,tzinfo=timezone.utc))
        data=build_trends(self.s,1,*period)
        self.assertIsNone(data["trends"][0]["interactions"])
        self.assertIsNone(data["trends"][0]["average_interactions"])
        self.assertIsNone(data["territorial_trends"][0]["interactions"])
        snapshot.interactions_count=0;self.s.add(snapshot);self.s.commit()
        data=build_trends(self.s,1,*period)
        self.assertEqual(data["trends"][0]["interactions"],0)
        self.assertEqual(data["trends"][0]["interactions_posts"],1)
    def test_trends_average_uses_only_posts_with_observed_metrics(self):
        self.post("Hospital em Planaltina")
        post=self.post("Hospital em Planaltina")
        snapshot=self.s.exec(select(PostSnapshot).where(PostSnapshot.post_id==post.id)).one()
        snapshot.interactions_count=None;self.s.add(snapshot);self.s.commit()
        data=build_trends(self.s,1,datetime(2026,9,1,tzinfo=timezone.utc),datetime(2026,9,30,tzinfo=timezone.utc))
        self.assertEqual(data["trends"][0]["volume"],2)
        self.assertEqual(data["trends"][0]["average_interactions"],12)
        self.assertEqual(data["trends"][0]["interactions_posts"],1)

    def test_all_analytics_filters_apply_to_content_ra(self):
        p=self.post("Iluminação em Planaltina");classify_post(self.s,p);self.s.commit()
        data=filtered_analytics(1,"2026-09-01","2026-09-30",self.r["Planaltina"],[2],"Infraestrutura","Imagem",self.s,"CONTENT")
        self.assertEqual(data["profiles"][0]["posts"],1)
        empty=filtered_analytics(1,"2026-09-01","2026-09-30",self.r["Planaltina"],[1],"Infraestrutura","Imagem",self.s,"CONTENT")
        self.assertEqual(empty["data_status"],"NO_DATA")


class DailySchedulerTests(DatabaseCase):
    def test_daily_timezone_and_restart_at_due_time(self):
        now=datetime(2026,9,22,5,59,tzinfo=timezone.utc);calls=[]
        with patch.dict(os.environ,{"COLLECTION_ENABLED":"true","APIFY_TOKEN":"test-only","AUTO_SYNC_CAMPAIGN_IDS":"","COLLECTION_DAILY_TIME":"03:00","COLLECTION_TIMEZONE":"America/Sao_Paulo"}):
            self.assertEqual(next_daily(now),datetime(2026,9,22,6,tzinfo=timezone.utc))
            tick(self.engine,lambda **kw:calls.append(kw),now)
            self.assertEqual(calls,[])
            tick(self.engine,lambda **kw:calls.append(kw),now+timedelta(minutes=1))
            tick(self.engine,lambda **kw:calls.append(kw),now+timedelta(minutes=2))
            self.assertEqual(len(calls),1);self.assertEqual(calls[0]["trigger"],"SCHEDULED")
            self.assertEqual(calls[0]["limit"],25)
    def test_daily_missed_window_does_not_start_paid_catchup(self):
        self.s.add(SyncSchedule(campaign_id=1,next_run_at=datetime(2026,9,22,6,tzinfo=timezone.utc)));self.s.commit()
        calls=[]
        with patch.dict(os.environ,{"COLLECTION_ENABLED":"true","APIFY_TOKEN":"test-only","AUTO_SYNC_CAMPAIGN_IDS":"","COLLECTION_DAILY_TIME":"03:00","COLLECTION_TIMEZONE":"America/Sao_Paulo"}):
            tick(self.engine,lambda **kw:calls.append(kw),datetime(2026,9,22,13,tzinfo=timezone.utc))
        self.assertEqual(calls,[])
        self.s.expire_all()
        self.assertEqual(self.s.get(SyncSchedule,1).next_run_at,datetime(2026,9,23,6))

    def test_same_campaign_concurrency_and_independent_campaign(self):
        results=[]
        def concurrent():
            with Session(self.engine) as session:
                try:
                    with collection_slot(session,1):results.append("unexpected")
                except HTTPException as exc:results.append(exc.status_code)
                with collection_slot(session,2):results.append("other-campaign")
        with collection_slot(self.s,1):
            self.s.commit()
            thread=Thread(target=concurrent);thread.start();thread.join(timeout=5)
        self.assertEqual(results,[409,"other-campaign"])
        with collection_slot(self.s,1):pass
    def test_status_requires_fresh_heartbeat_and_token(self):
        with patch.dict(os.environ,{"COLLECTION_ENABLED":"true","APIFY_TOKEN":"test-only","AUTO_SYNC_CAMPAIGN_IDS":""}):
            self.assertFalse(scheduler_status(self.s,1)["enabled"])
            self.s.add(SchedulerHeartbeat(last_seen_at=datetime.now(timezone.utc)));self.s.commit()
            self.assertTrue(scheduler_status(self.s,1)["enabled"])
            with patch.dict(os.environ,{"APIFY_TOKEN":""}):self.assertFalse(scheduler_status(self.s,1)["enabled"])


if __name__ == "__main__": unittest.main()
