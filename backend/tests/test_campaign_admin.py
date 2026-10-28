"""Generic administration contract and historical preservation, using only isolated SQLite."""
import os,json,hashlib,unittest
from contextlib import ExitStack
from datetime import datetime,timezone
from unittest.mock import patch
os.environ.setdefault('DATABASE_URL','sqlite://')
from fastapi import Request,HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session,SQLModel,create_engine,select
from app import main
from app.database import get_session
from app.models import Campaign,CampaignProfile,CampaignSlate,SlateMember,InstagramProfile,InstagramPost,PostSnapshot,ProfileSnapshot,ProfileMonitoring
from app.security import _hits

class CampaignAdminTests(unittest.TestCase):
    def setUp(self):
        self.stack=ExitStack();self.addCleanup(self.stack.close)
        self.engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
        self.addCleanup(self.engine.dispose)
        SQLModel.metadata.create_all(self.engine)
        with Session(self.engine) as db:
            db.add_all([Campaign(id=1,name='Monitoramento A',slug='monitor-a'),Campaign(id=2,name='Monitoramento B',slug='monitor-b')])
            db.add_all([InstagramProfile(id=i,username=f'admin_fixture_{i}') for i in range(1,7)])
            db.commit()
            db.add_all([CampaignProfile(campaign_id=1,profile_id=i,role='CLIENT' if i<3 else 'COMPETITOR') for i in range(1,7)])
            db.add_all([CampaignSlate(id=1,campaign_id=1,name='Chapa A'),CampaignSlate(id=2,campaign_id=1,name='Chapa B'),CampaignSlate(id=3,campaign_id=2,name='Chapa externa')]);db.commit()
            db.add_all([SlateMember(campaign_id=1,slate_id=1,profile_id=1,position='CANDIDATE'),SlateMember(campaign_id=1,slate_id=1,profile_id=2,position='VICE'),SlateMember(campaign_id=1,slate_id=2,profile_id=3,position='CANDIDATE'),SlateMember(campaign_id=1,slate_id=2,profile_id=4,position='VICE')])
            for i in range(1,4):
                db.add(InstagramPost(id=i,profile_id=i,shortcode=f'admin-{i}',url=f'https://instagram.com/p/admin-{i}/',caption='Saúde',published_at=datetime.now(timezone.utc)))
                db.add(PostSnapshot(post_id=i,likes_count=i*10,comments_count=0,interactions_count=i*10))
                db.add(ProfileSnapshot(profile_id=i,followers_count=i*100))
            db.commit()
        self.before=self.history()
        self.original=main.app.dependency_overrides.copy()
        def session(request:Request):
            with Session(self.engine) as db:
                for key in ['slate_id','scope_profile_id','analysis_days']:
                    if key in request.query_params:db.info[key]=int(request.query_params[key])
                yield db
        main.app.dependency_overrides[get_session]=session
        def restore():
            main.app.dependency_overrides.clear();main.app.dependency_overrides.update(self.original)
        self.addCleanup(restore)
        self.stack.enter_context(patch('app.main.authenticate',return_value=('admin-fixture','admin')))
        _hits.clear();self.addCleanup(_hits.clear)
        self.client=TestClient(main.app);self.addCleanup(self.client.close)

    def history(self):
        names=['instagram_posts','post_snapshots','profile_snapshots','post_comment_samples','collection_runs','profile_collection_runs']
        with self.engine.connect() as connection:
            values={name:[list(row) for row in connection.execute(select(SQLModel.metadata.tables[name]).order_by(*SQLModel.metadata.tables[name].primary_key.columns))] for name in names}
        return hashlib.sha256(json.dumps(values,default=str,sort_keys=True).encode()).hexdigest()

    def check(self,response,status=200):
        self.assertEqual(response.status_code,status,response.text)
        self.assertEqual(self.history(),self.before)
        return response.json()

    def test_create_edit_and_archive_campaign_preserve_identity_and_history(self):
        item=self.check(self.client.post('/api/campaigns',json={'name':'Nova campanha','slug':'new-monitor'}))
        saved=self.check(self.client.put(f"/api/campaigns/{item['id']}",json={'name':'Campanha editada','slug':'edited-monitor'}))
        self.assertEqual(saved['id'],item['id']);self.assertEqual(saved['slug'],'edited-monitor')
        self.check(self.client.delete('/api/campaigns/1'),422)
        self.check(self.client.delete('/api/campaigns/1?confirmation=wrong'),422)
        self.check(self.client.delete('/api/campaigns/1?confirmation=monitor-a'))
        result=self.check(self.client.get('/api/campaigns/1'))
        self.assertFalse(result['active']);self.assertEqual(len(result['profiles']),6);self.assertEqual(len(result['slates']),2)
        self.check(self.client.post('/api/campaigns/1/restore'))
        self.assertTrue(self.client.get('/api/campaigns/1').json()['active'])

    def test_duplicate_identifiers_and_empty_names_rejected(self):
        self.check(self.client.put('/api/campaigns/1',json={'name':'A válido','slug':'monitor-b'}),409)
        self.check(self.client.put('/api/campaigns/1',json={'name':'  ','slug':'new'}),422)
        self.assertEqual(self.client.get('/api/campaigns/1').json()['slug'],'monitor-a')

    def test_slate_crud_only_removes_group_and_memberships(self):
        self.check(self.client.get('/api/campaigns/1/slates'))
        created=self.check(self.client.post('/api/campaigns/1/slates',json={'name':'Chapa C'}))
        self.check(self.client.put(f"/api/campaigns/1/slates/{created['id']}",json={'name':'Chapa C editada'}))
        self.check(self.client.put('/api/campaigns/1/slates/1',json={'name':'Chapa B'}),409)
        self.check(self.client.delete('/api/campaigns/1/slates/1?confirmation=wrong'),422)
        self.check(self.client.delete('/api/campaigns/1/slates/1?confirmation=Chapa%20A'))
        detail=self.check(self.client.get('/api/campaigns/1'))
        self.assertEqual(len(detail['profiles']),6)
        self.assertTrue(all(p['active'] for p in detail['profiles']))
        self.assertTrue(all(p['slate_id'] is None for p in detail['profiles'] if p['id'] in [1,2]))

    def test_candidate_vice_unique_and_multiple_associates_allowed(self):
        for position in ['CANDIDATE','VICE']:
            self.check(self.client.put('/api/campaigns/1/slates/1/members',json={'profile_id':5,'position':position}),409)
        for profile_id in [5,6]:
            self.check(self.client.put('/api/campaigns/1/slates/1/members',json={'profile_id':profile_id,'position':'ASSOCIATE'}))
        members=self.client.get('/api/campaigns/1/slates').json()[0]['members']
        self.assertEqual(sum(m['position']=='ASSOCIATE' for m in members),2)
        self.check(self.client.put('/api/campaigns/1/slates/2/members',json={'profile_id':5,'position':'ASSOCIATE'}),409)
        self.check(self.client.put('/api/campaigns/1/slates/3/members',json={'profile_id':5,'position':'ASSOCIATE'}),404)

    def test_transfer_is_atomic_when_target_slot_occupied(self):
        self.check(self.client.put('/api/campaigns/1/profiles/2',json={'full_name':'Should roll back','role':'MEDIA','slate_id':2,'position':'VICE'}),409)
        profile=next(p for p in self.client.get('/api/campaigns/1').json()['profiles'] if p['id']==2)
        self.assertEqual(profile['role'],'CLIENT');self.assertIsNone(profile['full_name']);self.assertEqual(profile['slate_id'],1);self.assertEqual(profile['position'],'VICE')
        self.check(self.client.delete('/api/campaigns/1/slates/2/members/4'))
        self.check(self.client.put('/api/campaigns/1/profiles/2',json={'slate_id':2,'position':'VICE'}))
        profile=next(p for p in self.client.get('/api/campaigns/1').json()['profiles'] if p['id']==2)
        self.assertEqual(profile['slate_id'],2);self.assertEqual(profile['id'],2)

    def test_monitoring_role_is_independent_of_slate_position(self):
        self.check(self.client.put('/api/campaigns/1/profiles/1',json={'role':'MEDIA','full_name':'Nome corrigido'}))
        p=next(p for p in self.client.get('/api/campaigns/1').json()['profiles'] if p['id']==1)
        self.assertEqual(p['role'],'MEDIA');self.assertEqual(p['position'],'CANDIDATE');self.assertEqual(p['full_name'],'Nome corrigido')
        self.check(self.client.put('/api/campaigns/1/profiles/1',json={'role':'INVALID'}),422)
        self.check(self.client.put('/api/campaigns/1/profiles/1',json={'slate_id':None,'position':None}))
        self.assertIsNone(next(p for p in self.client.get('/api/campaigns/1').json()['profiles'] if p['id']==1)['slate_id'])

    def test_position_can_change_without_replacing_profile(self):
        self.check(self.client.put('/api/campaigns/1/profiles/2',json={'position':'ASSOCIATE'}))
        self.check(self.client.put('/api/campaigns/1/slates/1/members',json={'profile_id':5,'position':'VICE'}))
        p=next(p for p in self.client.get('/api/campaigns/1').json()['profiles'] if p['id']==2)
        self.assertEqual(p['position'],'ASSOCIATE');self.assertEqual(p['slate_id'],1)

    def test_collected_and_shared_usernames_are_protected(self):
        self.check(self.client.put('/api/campaigns/1/profiles/1',json={'username':'new_collected_name'}),409)
        with Session(self.engine) as db:
            db.add(CampaignProfile(campaign_id=2,profile_id=5,role='CLIENT'));db.commit()
        self.check(self.client.put('/api/campaigns/1/profiles/5',json={'username':'new_shared_name'}),409)
        self.check(self.client.put('/api/campaigns/1/profiles/6',json={'username':'admin_fixture_5'}),409)

    def test_safe_username_edit_keeps_profile_id_and_updates_monitoring_url(self):
        with Session(self.engine) as db:
            db.add(ProfileMonitoring(profile_id=5,scope='TERRITORIAL',url='https://www.instagram.com/admin_fixture_5/'));db.commit()
        data=self.check(self.client.put('/api/campaigns/1/profiles/5',json={'username':'@New_Uncollected_Name'}))
        self.assertEqual(data['id'],5);self.assertEqual(data['username'],'new_uncollected_name')
        with Session(self.engine) as db:
            self.assertEqual(db.get(ProfileMonitoring,5).url,'https://www.instagram.com/new_uncollected_name/')
        self.check(self.client.put('/api/campaigns/1/profiles/5',json={'username':'invalid space'}),422)

    def test_remove_and_restore_profile_preserve_link_and_all_history(self):
        with Session(self.engine) as db:
            original=db.exec(select(CampaignProfile).where(CampaignProfile.campaign_id==1,CampaignProfile.profile_id==2)).first().id
        self.check(self.client.delete('/api/campaigns/1/profiles/2?confirmation=wrong'),422)
        self.check(self.client.delete('/api/campaigns/1/profiles/2?confirmation=admin_fixture_2'))
        p=next(p for p in self.client.get('/api/campaigns/1').json()['profiles'] if p['id']==2)
        self.assertFalse(p['active']);self.assertIsNone(p['slate_id'])
        self.check(self.client.put('/api/campaigns/1/profiles/2',json={'active':True}))
        with Session(self.engine) as db:
            self.assertEqual(db.exec(select(CampaignProfile).where(CampaignProfile.campaign_id==1,CampaignProfile.profile_id==2)).first().id,original)

    def test_link_existing_profiles_never_creates_another_identity(self):
        values=self.check(self.client.get('/api/campaigns/2/available-profiles'))
        self.assertEqual(len(values),6)
        self.check(self.client.post('/api/campaigns/2/profile-links',json={'profile_id':1,'role':'COMPETITOR'}))
        self.check(self.client.post('/api/campaigns/2/profile-links',json={'profile_id':1,'role':'COMPETITOR'}),409)
        self.check(self.client.delete('/api/campaigns/2/profiles/1?confirmation=admin_fixture_1'))
        self.check(self.client.post('/api/campaigns/2/profile-links',json={'profile_id':1,'role':'CLIENT'}))
        with Session(self.engine) as db:self.assertEqual(len(db.exec(select(InstagramProfile)).all()),6)

    def test_scope_and_metrics_still_respect_current_members_and_missing_values(self):
        report=self.check(self.client.get('/api/campaigns/1/executive?slate_id=1'))
        self.assertEqual(report['summary']['followers'],300);self.assertEqual(report['summary']['posts'],2)
        self.assertEqual(report['summary']['avg_observed_interactions'],15)
        self.assertEqual(report['summary']['comments'],0);self.assertIsNone(report['summary']['plays'])
        self.assertEqual(len(self.client.get('/api/campaigns/1/posts?slate_id=1&scope_profile_id=2').json()['posts']),1)
        self.check(self.client.get('/api/campaigns/1/posts?slate_id=1&scope_profile_id=3'),404)
        self.check(self.client.put('/api/campaigns/1/profiles/1',json={'slate_id':3,'position':'ASSOCIATE'}),404)

    def test_new_admin_routes_require_authentication(self):
        from app.security import authenticate
        with patch('app.main.authenticate',side_effect=authenticate),patch.dict(os.environ,{'DEV_AUTH_BYPASS':'false'}):
            for method,path,body in [('PUT','/api/campaigns/1',{'name':'Denied','slug':'denied'}),('DELETE','/api/campaigns/1?confirmation=monitor-a',None),('DELETE','/api/campaigns/1/slates/1?confirmation=Chapa%20A',None),('PUT','/api/campaigns/1/profiles/1',{'role':'MEDIA'}),('DELETE','/api/campaigns/1/profiles/1?confirmation=admin_fixture_1',None),('POST','/api/campaigns/1/restore',None),('GET','/api/campaigns/1/slates',None)]:
                self.check(self.client.request(method,path,json=body),401)
