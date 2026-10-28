"""Saved report contracts and preservation; all writes use disposable SQLite."""
import json,hashlib,os,tempfile,unittest
from pathlib import Path
from datetime import datetime
from unittest.mock import patch
from fastapi import HTTPException
from sqlmodel import Session,SQLModel,select
from tests import test_temporal_comparison as fixtures
from app.models import GeneratedReport,PostSnapshot,InstagramPost,CampaignSlate
from app.services.executive import executive_summary
from app.services.digital_reports import REPORT_TYPE

class DigitalReportTests(unittest.TestCase):
 def setUp(self):
  fixtures.TemporalTests.setUp(self)
  self.input={'start_date':'2026-10-05','end_date':'2026-10-21','slate_ids':[1],'profile_id':None,'compare_slates':False,'limit_per_profile':25}
  self.history_before=self.fingerprint()
 def fingerprint(self):
  with self.engine.connect() as conn:
   values={name:[list(r) for r in conn.execute(select(table).order_by(*table.primary_key.columns))] for name,table in SQLModel.metadata.tables.items() if name!='generated_reports'}
  return hashlib.sha256(json.dumps(values,default=str,sort_keys=True).encode()).hexdigest()
 def generate(self,**overrides):
  r=self.client.post('/api/campaigns/1/digital-reports',json={**self.input,**overrides})
  self.assertEqual(r.status_code,200,r.text);self.assertEqual(self.fingerprint(),self.history_before)
  response=self.client.get('/api/digital-reports/'+str(r.json()['id']));self.assertEqual(response.status_code,200,response.text)
  return response.json()
 def test_pdf_endpoint_uses_snapshot_without_changing_saved_document(self):
  r=self.generate();html='<main class="report-paper">Snapshot selecionado</main>'
  with patch('app.services.report_pdf.render_pdf',return_value=b'%PDF-1.7 test') as render:
   response=self.client.post(f"/api/digital-reports/{r['id']}/export/pdf",content=html,headers={'Content-Type':'text/html'})
  self.assertEqual(response.status_code,200,response.text)
  self.assertEqual(response.headers['content-type'],'application/pdf')
  render.assert_called_once_with(html.encode())
  self.assertEqual(self.client.get(f"/api/digital-reports/{r['id']}").json(),r)
  self.assertEqual(self.fingerprint(),self.history_before)
 def test_pdf_limits_content_type_and_unknown_report(self):
  r=self.generate();url=f"/api/digital-reports/{r['id']}/export/pdf"
  self.assertEqual(self.client.post(url,json={}).status_code,415)
  self.assertEqual(self.client.post(url,content='not a report',headers={'Content-Type':'text/html'}).status_code,422)
  self.assertEqual(self.client.post(url,content='x',headers={'Content-Type':'text/html','Content-Length':str(16*1024*1024+1)}).status_code,413)
  self.assertEqual(self.client.post('/api/digital-reports/999/export/pdf',content='x',headers={'Content-Type':'text/html'}).status_code,404)
 def test_pdf_renderer_errors_do_not_expose_document_or_process_output(self):
  from app.services.report_pdf import render_pdf
  import subprocess
  html=b'<main class="report-paper">private content</main>'
  with patch('app.services.report_pdf.shutil.which',return_value='node'),patch('app.services.report_pdf.subprocess.run',side_effect=subprocess.TimeoutExpired('node',65)):
   with self.assertRaises(HTTPException) as error:render_pdf(html)
   self.assertEqual(error.exception.status_code,504)
  with patch('app.services.report_pdf.shutil.which',return_value=None):
   with self.assertRaises(HTTPException) as error:render_pdf(html)
   self.assertEqual(error.exception.status_code,503)
  with self.assertRaises(HTTPException) as error:render_pdf(b'\xff')
  self.assertEqual(error.exception.status_code,422)

 def test_exact_period_weighted_means_zero_and_missing(self):
  r=self.generate();s=r['analysis']['summary']
  self.assertEqual(r['profile_ids'],[1,4]);self.assertEqual(s['posts'],4);self.assertEqual(s['observed_interactions'],160);self.assertEqual(s['avg_observed_interactions'],40);self.assertEqual(s['comments'],0);self.assertIsNone(s['plays']);self.assertEqual(s['coverage']['observed_interactions'],4)
  self.assertEqual(r['analysis']['period']['from'],'2026-10-05');self.assertEqual(r['analysis']['period']['to'],'2026-10-21')
 def test_comparison_uses_only_requested_slates_and_shared_aggregation(self):
  r=self.generate(slate_ids=[1,2],compare_slates=True)
  self.assertEqual(len(r['comparisons']),2);self.assertEqual(r['analysis']['summary']['posts'],5)
  self.assertEqual(r['analysis']['summary']['avg_observed_interactions'],40)
  self.assertEqual([x['summary']['posts'] for x in r['comparisons']],[4,1]);self.assertIsNone(r['comparisons'][1]['summary']['observed_interactions'])
 def test_individual_scope_and_invalid_nested_profile(self):
  r=self.generate(profile_id=4);self.assertEqual(r['profile_ids'],[4]);self.assertEqual(r['analysis']['summary']['posts'],3)
  for payload in [{'profile_id':2},{'slate_ids':[999]},{'compare_slates':True,'profile_id':4},{'compare_slates':True}]:
   response=self.client.post('/api/campaigns/1/digital-reports',json={**self.input,**payload});self.assertIn(response.status_code,[404,422],response.text)
 def test_invalid_period_sample_and_campaign_write_nothing(self):
  for payload in [{'start_date':'bad'},{'end_date':'2026-10-01'},{'limit_per_profile':0},{'limit_per_profile':201}]:
   self.assertEqual(self.client.post('/api/campaigns/1/digital-reports',json={**self.input,**payload}).status_code,422)
  self.assertEqual(self.client.post('/api/campaigns/999/digital-reports',json=self.input).status_code,404)
  with Session(self.engine) as db:self.assertEqual(len(db.exec(select(GeneratedReport)).all()),0)
 def test_body_filters_override_unrelated_dashboard_query(self):
  response=self.client.post('/api/campaigns/1/digital-reports?slate_id=2&scope_profile_id=3&sample_limit=1&period_start=2026-10-22&period_end=2026-10-22',json=self.input)
  self.assertEqual(response.status_code,200,response.text)
  r=self.client.get('/api/digital-reports/'+str(response.json()['id'])).json();self.assertEqual(r['analysis']['summary']['posts'],4);self.assertEqual(r['profile_ids'],[1,4])
 def test_report_is_immutable_after_new_snapshot_and_association_rename(self):
  r=self.generate()
  with Session(self.engine) as db:
   db.add(PostSnapshot(post_id=1,interactions_count=999999));slate=db.get(CampaignSlate,1);slate.name='Renamed after generation';db.add(slate);db.commit()
  self.assertEqual(self.client.get('/api/digital-reports/'+str(r['id'])).json(),r)
 def test_manual_history_origin_growth_and_no_fabricated_22(self):
  fixtures.TemporalTests.load(self);self.history_before=self.fingerprint()
  r=self.generate();self.assertEqual(r['analysis']['summary']['growth_absolute'],12618)
  self.assertEqual(len(r['analysis']['follower_history']),17);self.assertEqual(r['analysis']['follower_history'][-1]['date'],'2026-10-21')
  self.assertEqual(r['analysis']['follower_history'][0]['source_label'],'Histórico manual')
  self.assertTrue(any('MANUAL_HISTORICAL' in m['text'] for m in r['methodology']))
 def test_single_observation_and_empty_report_have_no_fake_growth_or_insights(self):
  r=self.generate(start_date='2026-10-22',end_date='2026-10-22',profile_id=1)
  self.assertIsNone(r['analysis']['summary']['growth_absolute']);self.assertIsNone(r['analysis']['summary']['growth_percent'])
  empty=self.generate(start_date='2020-01-01',end_date='2020-01-02')
  self.assertEqual(empty['analysis']['summary']['posts'],0);self.assertIsNone(empty['analysis']['summary']['observed_interactions']);self.assertEqual(len(empty['editorial_insights']),7);self.assertTrue(all(i['value'] is None for i in empty['editorial_insights']));self.assertEqual(empty['highlights'],[])
 def test_highlights_reuse_actual_payload_and_are_deduplicated(self):
  r=self.generate();ids=[h['post']['post_id'] for h in r['highlights']]
  self.assertEqual(len(ids),len(set(ids)));self.assertIn(1,ids);self.assertNotIn(6,ids)
  first=next(h for h in r['highlights'] if h['post']['post_id']==1)
  self.assertIn('Maior interação',first['distinctions']);self.assertIn('Mais curtidas',first['distinctions']);self.assertEqual(first['post']['metrics']['likes'],100)
 def test_insights_are_deterministic_and_include_no_unavailable_metrics(self):
  a=self.generate();b=self.generate();self.assertEqual(a['editorial_insights'],b['editorial_insights']);self.assertGreaterEqual(len(a['editorial_insights']),5);self.assertLessEqual(len(a['editorial_insights']),8)
  self.assertEqual(len({i['id'] for i in a['editorial_insights']}),len(a['editorial_insights']))
  self.assertTrue(all(i['value'] is not None or i['status']=='insufficient' for i in a['editorial_insights']))

 def test_seven_executive_insights_have_evidence_interpretation_implication_and_no_themes(self):
  r=self.generate();cards=r['editorial_insights']
  self.assertEqual([c['id'] for c in cards],['format','profile','growth','content','weekday','hour','peaks'])
  for c in cards:
   self.assertTrue(c['headline']);self.assertIsInstance(c['facts'],list)
   self.assertTrue(c['interpretation']);self.assertTrue(c['implication'])
  weighted=next(c for c in cards if c['id']=='profile')
  self.assertEqual(weighted['value'],160/4)
  means=[p['avg_observed_interactions'] for p in r['analysis']['profiles'] if p['avg_observed_interactions'] is not None]
  self.assertNotEqual(weighted['value'],sum(means)/len(means))
 def test_peak_context_uses_real_highlight_and_exact_total(self):
  r=self.generate();top=r['analysis']['insights']['top_posts']['observed_interactions']
  content=next(c for c in r['editorial_insights'] if c['id']=='content')
  peak=next(c for c in r['editorial_insights'] if c['id']=='peaks')
  self.assertEqual(content['post_id'],top['post_id']);self.assertEqual(content['value'],top['metrics']['observed_interactions'])
  self.assertIn(content['post_id'],[h['post']['post_id'] for h in r['highlights']])
  self.assertEqual(peak['value'],top['metrics']['observed_interactions']/r['analysis']['summary']['observed_interactions']*100)
 def test_legacy_reading_uses_only_saved_metrics_without_rewriting_document(self):
  r=self.generate()
  with Session(self.engine) as db:
   row=db.get(GeneratedReport,r['id']);doc=json.loads(row.structured_content)
   doc['editorial_version']=3;doc['editorial_insights']=[{'id':'theme-average','title':'Legacy theme'}]
   original=json.dumps(doc,default=str);row.structured_content=original;db.add(row);db.commit()
  loaded=self.client.get(f"/api/digital-reports/{r['id']}").json()
  self.assertEqual(len(loaded['editorial_insights']),7)
  self.assertEqual(loaded['analysis'],r['analysis'])
  with Session(self.engine) as db:self.assertEqual(db.get(GeneratedReport,r['id']).structured_content,original)
 def test_reading_handles_ties_zero_missing_and_does_not_assume_reels_or_sunday(self):
  from copy import deepcopy
  from app.services.report_interpretation import executive_reading
  report=deepcopy(self.generate()['analysis'])
  report['formats']=[{'format':'Imagem','posts':4,'avg_observed_interactions':10},{'format':'Carrossel','posts':4,'avg_observed_interactions':10}]
  report['weekdays']=[{'weekday':1,'posts':1,'avg_observed_interactions':0}]
  report['hours']=[{'hour':18,'posts':1,'avg_observed_interactions':0}]
  cards=executive_reading(report)
  self.assertIn('empate',cards[0]['interpretation']);self.assertIn('Imagem',cards[0]['headline'])
  self.assertEqual(cards[4]['headline'],'Terça');self.assertEqual(cards[4]['value'],0)
  self.assertIn('não disponível',cards[4]['facts'][0])
  self.assertEqual(cards[5]['headline'],'18h–21h');self.assertEqual(cards[5]['value'],0)
  report['summary']['observed_interactions']=0
  peak=executive_reading(report)[6];self.assertIsNone(peak['value'])
  self.assertEqual(self.fingerprint(),self.history_before)
 def test_generation_never_starts_collection_or_media_scraping(self):
  with patch('app.services.media_preview.get_post_preview',side_effect=AssertionError('No scraping')) as preview,patch('app.services.monitoring_sync.collect_campaign',side_effect=AssertionError('No collection')) as collect:
   self.generate();preview.assert_not_called();collect.assert_not_called()
 def test_images_only_use_stored_cache_and_belong_to_the_report(self):
  with tempfile.TemporaryDirectory() as folder,patch.dict(os.environ,{'PREVIEW_CACHE_DIR':folder}):
   Path(folder,'1.png').write_bytes(b'cached-test-bytes')
   r=self.generate();first=next(h for h in r['highlights'] if h['post']['post_id']==1);self.assertTrue(first['image']['cached'])
   response=self.client.get(f"/api/digital-reports/{r['id']}/images/1");self.assertEqual(response.status_code,200);self.assertEqual(response.content,b'cached-test-bytes')
   self.assertEqual(self.client.get(f"/api/digital-reports/{r['id']}/images/6").status_code,404)
 def test_listing_and_reading_keep_legacy_reports_separate(self):
  r=self.generate()
  with Session(self.engine) as db:db.add(GeneratedReport(campaign_id=1,period_start=datetime(2026,10,5),period_end=datetime(2026,10,21),report_type='legacy',html_content='<p>legacy</p>'));db.commit()
  rows=self.client.get('/api/campaigns/1/digital-reports').json();self.assertEqual([x['id'] for x in rows],[r['id']])
  self.assertEqual(self.client.get('/api/digital-reports/999').status_code,404)
 def test_all_report_endpoints_still_require_real_auth_when_disabled(self):
  with patch('app.main.authenticate',side_effect=HTTPException(401,'Required')):
   for method,url in [('GET','/api/digital-reports/1'),('GET','/api/campaigns/1/digital-reports'),('POST','/api/campaigns/1/digital-reports'),('GET','/api/digital-reports/1/images/1')]:
    self.assertEqual(self.client.request(method,url,json=self.input if method=='POST' else None).status_code,401)

 def test_cover_prefers_a_real_cached_post_inside_the_sample(self):
  with tempfile.TemporaryDirectory() as folder,patch.dict(os.environ,{'PREVIEW_CACHE_DIR':folder}):
   Path(folder,'3.jpg').write_bytes(b'cached-visual-fixture')
   r=self.generate();self.assertEqual(r['cover']['post']['post_id'],3);self.assertTrue(r['cover']['image']['cached'])
   self.assertEqual(self.client.get(f"/api/digital-reports/{r['id']}/images/3").status_code,200)
