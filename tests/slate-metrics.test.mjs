import test from 'node:test'
import assert from 'node:assert/strict'
import {aggregateFollowerHistory} from '../src/utils/followerAggregation.ts'
import {scopedCampaignUrl} from '../src/services/campaignScope.ts'
const profile=(id,history)=>({profile_id:id,history:history.map(([date,followers])=>({date,followers}))})
test('aggregate history needs complete common dates and preserves observed zero',()=>{
 const data=[profile(1,[['2026-10-01',100],['2026-10-02',0],['2026-10-03',null]]),profile(2,[['2026-10-01',200],['2026-10-02',0],['2026-10-04',300]])]
 assert.deepEqual(aggregateFollowerHistory(data),[{date:'2026-10-01',followers:300},{date:'2026-10-02',followers:0}])
 assert.deepEqual(aggregateFollowerHistory([]),[])
})
test('single collection stays one observation; missing dates are never interpolated',()=>{
 assert.deepEqual(aggregateFollowerHistory([profile(1,[['2026-10-01',100]]),profile(2,[['2026-10-02',200]])]),[])
 assert.equal(aggregateFollowerHistory([profile(1,[['2026-10-01',100]]),profile(2,[['2026-10-01',200]])]).length,1)
})
test('scope follows the campaign in the requested URL and preserves explicit nested filters',()=>{
 const values={'radar:slate:v1':JSON.stringify({'1':'7','2':'9'}),'radar:days:v1':'60'}
 globalThis.localStorage={getItem:key=>values[key]??null}
 globalThis.window={location:{origin:'http://localhost:5173'}}
 const first=new URL(scopedCampaignUrl('/api/campaigns/1/posts?scope_profile_id=3'),window.location.origin)
 assert.equal(first.searchParams.get('slate_id'),'7')
 assert.equal(first.searchParams.get('scope_profile_id'),'3')
 assert.equal(first.searchParams.get('analysis_days'),'60')
 assert.equal(new URL(scopedCampaignUrl('/api/campaigns/2/executive'),window.location.origin).searchParams.get('slate_id'),'9')
 for(const path of ['/api/campaigns/1/slates','/api/campaigns/1/sync','/api/campaigns/1?full_campaign=1'])assert.equal(scopedCampaignUrl(path),path)
 values['radar:slate:v1']='invalid JSON'
 assert.equal(scopedCampaignUrl('/api/campaigns/1/posts'),'/api/campaigns/1/posts')
})
