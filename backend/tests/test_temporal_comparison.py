"""Calendar scope, manual provenance, continuity and weighted comparisons on isolated data."""
import os,json,unittest
from datetime import datetime,timezone,timedelta
from pathlib import Path
from unittest.mock import patch
os.environ.setdefault("DATABASE_URL","sqlite://")
from fastapi import Request,HTTPException
from fastapi.testclient import TestClient
from sqlmodel import SQLModel,Session,create_engine,select
from sqlalchemy.pool import StaticPool
from app import main
from app.database import get_session
from app.models import Campaign,CampaignProfile,CampaignSlate,SlateMember,InstagramProfile,InstagramPost,PostSnapshot,ProfileSnapshot
from app.services.analysis_period import calendar_bounds,analysis_bounds
from app.services.manual_followers import import_observations
from app.services.follower_history import aggregate_history,daily_observations,growth_metrics
from app.services.executive import executive_summary
from app.security import _hits

class TemporalTests(unittest.TestCase):
 def setUp(self):
  self.engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
  self.addCleanup(self.engine.dispose);SQLModel.metadata.create_all(self.engine)
  self.dataset=json.loads((Path(__file__).parents[1]/'data/manual_followers_2026_10.json').read_text(encoding='utf-8'))
  with Session(self.engine) as db:
   db.add(Campaign(id=1,name='Temporal fixture',slug='temporal'))
   db.add_all([InstagramProfile(id=i,username=p['username']) for i,p in enumerate(self.dataset['profiles'],1)]);db.commit()
   db.add_all([CampaignProfile(campaign_id=1,profile_id=i,role='CLIENT') for i in range(1,5)])
   db.add_all([CampaignSlate(id=1,campaign_id=1,name='Celina'),CampaignSlate(id=2,campaign_id=1,name='Grass')]);db.commit()
   for sid,pid,pos in [(1,1,'CANDIDATE'),(1,4,'VICE'),(2,2,'CANDIDATE'),(2,3,'VICE')]:db.add(SlateMember(campaign_id=1,slate_id=sid,profile_id=pid,position=pos))
   for i,pid,at,value in [(1,1,'2026-10-05T00:00:00',100),(2,4,'2026-10-21T23:59:59.999999',20),(3,4,'2026-10-10T12:00:00',20),(4,4,'2026-10-10T13:00:00',20),(5,2,'2026-10-04T23:59:59',9000),(6,1,'2026-10-22T00:00:00',8000),(7,3,'2026-10-10T12:00:00',None)]:
    db.add(InstagramPost(id=i,profile_id=pid,shortcode='temporal-'+str(i),url='https://instagram.com/p/temporal-'+str(i)+'/',published_at=datetime.fromisoformat(at),content_type='Image',caption='Saúde'))
    db.add(PostSnapshot(post_id=i,likes_count=value,interactions_count=value,comments_count=0 if value is not None else None))
   db.add(ProfileSnapshot(id=1,profile_id=1,followers_count=354636,collected_at=datetime(2026,10,22,12),source='APIFY_PUBLIC'));db.commit()
  self.original=main.app.dependency_overrides.copy()
  def restore():main.app.dependency_overrides.clear();main.app.dependency_overrides.update(self.original)
  self.addCleanup(restore)
  # Exercise the real parameter dependency using the isolated engine.
  self.engine_patch=patch('app.database.engine',self.engine);self.engine_patch.start();self.addCleanup(self.engine_patch.stop)
  self.auth=patch('app.main.authenticate',return_value=('temporal-fixture','admin'));self.auth.start();self.addCleanup(self.auth.stop)
  _hits.clear();self.addCleanup(_hits.clear)
  self.client=TestClient(main.app);self.addCleanup(self.client.close)
  self.query='period_start=2026-10-05&period_end=2026-10-21'
 def load(self):
  with Session(self.engine) as db:return import_observations(db,self.dataset,1,True)
 def test_calendar_validation_and_inclusive_utc_boundaries(self):
  for a,b in [('2026-10-22','2026-10-05'),('bad','2026-10-05'),('2026-02-30','2026-03-01')]:
   with self.subTest(a=a),self.assertRaises(HTTPException):calendar_bounds(a,b)
  start,end=calendar_bounds('2026-10-05','2026-10-21');self.assertEqual((end-start).days,17);self.assertEqual(end,datetime(2026,10,22,tzinfo=timezone.utc))
  for query in ['period_start=2026-10-21&period_end=2026-10-05','period_start=2026-10-05','analysis_days=0']:
   self.assertEqual(self.client.get('/api/campaigns/1/executive?'+query).status_code,422)
 def test_fifteen_days_and_long_custom_range(self):
  with Session(self.engine) as db:
   db.info['analysis_days']=15;start,end=analysis_bounds(db);self.assertEqual((end-start).days,15)
  result=self.client.get('/api/campaigns/1/executive?period_start=2020-01-01&period_end=2026-10-21');self.assertEqual(result.status_code,200);self.assertGreater(result.json()['period']['days'],365)
 def test_all_post_readers_limit_before_aggregation_and_exact_period(self):
  for endpoint in ['posts','themes-formats','time-performance','executive']:
   r=self.client.get('/api/campaigns/1/'+endpoint+'?'+self.query+'&slate_id=1');self.assertEqual(r.status_code,200,r.text)
   if endpoint=='posts':self.assertEqual({p['post_id'] for p in r.json()['posts']},{1,2,3,4})
  report=self.client.get('/api/campaigns/1/executive?'+self.query+'&slate_id=1').json()
  self.assertEqual(report['summary']['posts'],4);self.assertEqual(report['summary']['observed_interactions'],160);self.assertEqual(report['summary']['avg_observed_interactions'],40)
  report=self.client.get('/api/campaigns/1/executive?'+self.query+'&slate_id=1&sample_limit=1').json();self.assertEqual(report['summary']['posts'],2);self.assertEqual(report['summary']['avg_observed_interactions'],60)
 def test_nested_profile_scope_validation(self):
  response=self.client.get('/api/campaigns/1/executive?'+self.query+'&slate_id=1&scope_profile_id=4');self.assertEqual(response.json()['summary']['posts'],3)
  self.assertEqual(self.client.get('/api/campaigns/1/executive?'+self.query+'&slate_id=1&scope_profile_id=2').status_code,404)
 def test_manual_import_add_only_idempotent_and_no_dora_22(self):
  with Session(self.engine) as db:
   original=db.get(ProfileSnapshot,1).model_dump();preview=import_observations(db,self.dataset,1,False);self.assertEqual(preview['would_insert'],68);self.assertEqual(len(db.exec(select(ProfileSnapshot)).all()),1)
  self.assertEqual(self.load()['inserted'],68);self.assertEqual(self.load()['inserted'],0)
  with Session(self.engine) as db:
   self.assertEqual(db.get(ProfileSnapshot,1).model_dump(),original)
   rows=db.exec(select(ProfileSnapshot).where(ProfileSnapshot.source=='MANUAL_HISTORICAL')).all();self.assertEqual(len(rows),68);self.assertTrue(all(p.collected_at.date().isoformat()<='2026-10-21' for p in rows))
 def test_manual_growth_and_exact_slate_totals(self):
  self.load()
  result=self.client.get('/api/campaigns/1/comparison?'+self.query).json();a,b=result['slates']
  self.assertEqual([p['followers'] for p in [a['follower_history'][0],a['follower_history'][-1]]],[350773,363391]);self.assertEqual(a['summary']['growth_absolute'],12618)
  self.assertEqual([b['follower_history'][0]['followers'],b['follower_history'][-1]['followers']],[147816,171929]);self.assertEqual(b['summary']['growth_absolute'],24113)
  self.assertEqual(a['follower_history'][0]['source_label'],'Histórico manual');self.assertEqual(len(result['profiles']),4)
 def test_profile_comparison_is_subordinate_but_slate_comparison_is_explicit(self):
  r=self.client.get('/api/campaigns/1/comparison?'+self.query+'&slate_id=1').json();self.assertEqual({p['id'] for p in r['profiles']},{1,4});self.assertEqual(len(r['slates']),2)
 def test_real_priority_same_day_continuity_no_duplicates(self):
  self.load()
  with Session(self.engine) as db:
   db.add(ProfileSnapshot(profile_id=1,followers_count=999,collected_at=datetime(2026,10,21,8),source='APIFY_PUBLIC'));db.commit()
  r=self.client.get('/api/campaigns/1/followers-history?period_start=2026-10-05&period_end=2026-10-22&scope_profile_id=1').json()['profiles'][0]
  self.assertEqual(len(r['history']),18);self.assertEqual(r['history'][-2]['followers'],999);self.assertEqual(r['history'][-2]['source'],'APIFY_PUBLIC');self.assertEqual(r['history'][-1]['followers'],354636)
  with Session(self.engine) as db:self.assertEqual(len(db.exec(select(ProfileSnapshot).where(ProfileSnapshot.source=='MANUAL_HISTORICAL')).all()),68)
 def test_missing_common_date_never_interpolates_and_single_has_no_growth(self):
  points=[{'profile_id':1,'history':[{'date':'2026-10-05','followers':0,'source':'MANUAL_HISTORICAL'}]},{'profile_id':2,'history':[{'date':'2026-10-06','followers':10,'source':'APIFY_PUBLIC'}]}]
  self.assertEqual(aggregate_history(points),[]);self.assertIsNone(growth_metrics(points[0]['history'])['growth_absolute'])
  points[1]['history'][0]['date']='2026-10-05';self.assertEqual(aggregate_history(points)[0]['followers'],10)
 def test_missing_metrics_zero_and_weighted_comparison(self):
  r=self.client.get('/api/campaigns/1/comparison?'+self.query).json()
  self.assertEqual(r['slates'][0]['summary']['comments'],0);self.assertIsNone(r['slates'][0]['summary']['plays']);self.assertEqual(r['slates'][0]['summary']['avg_observed_interactions'],40)
 def test_comparison_keeps_real_authentication(self):
  with patch('app.main.authenticate',side_effect=HTTPException(401,'Required')):
   self.assertEqual(self.client.get('/api/campaigns/1/comparison').status_code,401)

 def test_trends_explicit_window_never_infers_emergence_from_unqueried_prior_period(self):
  r=self.client.get('/api/campaigns/1/trends?start_date=2026-10-05&end_date=2026-10-21&'+self.query).json()
  self.assertEqual(sum(row['volume'] for row in r['trends']),5)
  self.assertTrue(all(row['growth'] is None and not row['emerging'] for row in r['trends']))
  self.assertIn('não são consultadas',r['methodology']['growth'])
 def test_collection_read_scope_keeps_selected_errors_and_counts(self):
  from app.models import CollectionRun,ProfileCollectionRun
  with Session(self.engine) as db:
   db.add(CollectionRun(id=1,campaign_id=1,status='PARTIAL',started_at=datetime(2026,10,10),profiles_total=3));db.commit()
   db.add_all([ProfileCollectionRun(collection_run_id=1,profile_id=1,status='PARTIAL',posts_found=10,error='Falha no contador de seguidores'),ProfileCollectionRun(collection_run_id=1,profile_id=4,status='SUCCESS',posts_found=20),ProfileCollectionRun(collection_run_id=1,profile_id=2,status='SUCCESS',posts_found=100)]);db.commit()
  r=self.client.get('/api/campaigns/1/collections?'+self.query+'&slate_id=1')
  self.assertEqual(r.status_code,200,r.text)
  row=r.json()['collections'][0];self.assertEqual(row['posts_found'],30);self.assertEqual(row['profiles_total'],2);self.assertEqual(row['profiles_succeeded'],2);self.assertIn('Falha no contador',row['errors']);self.assertEqual(row['status'],'PARTIAL')
