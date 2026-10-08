import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
const source=readFileSync(new URL('../src/utils/dailyAnalytics.ts',import.meta.url),'utf8')
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText
const {normalizeDailyAnalytics:normalize}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))

test('empty, omitted and invalid daily collections are safe',()=>{
  for(const value of [undefined,null,[],{},'invalid',[null,undefined,{},7]])assert.deepEqual(normalize(value),[])
})
test('days without metrics preserve unknown values, not zero',()=>{
  const [day]=normalize([{date:'2026-09-10'}])
  for(const metric of ['posts','interactions','likes','comments','views','plays','shares','saves'])assert.equal(day[metric],null)
  assert.equal(day.metric_samples.interactions,null);assert.deepEqual(day.profiles,{})
})
test('missing profile objects and missing interactions are safe',()=>{
  const [day]=normalize([{date:'2026-09-10',profiles:{empty:null,partial:{likes:4},zero:{interactions:0}}}])
  assert.equal(day.profiles.empty.interactions,null)
  assert.equal(day.profiles.partial.interactions,null)
  assert.equal(day.profiles.partial.likes,4)
  assert.equal(day.profiles.zero.interactions,0)
  assert.equal(day.interactions,null)
})
test('null coverage is unknown and reported zero coverage is retained',()=>{
  const rows=normalize([{date:'2026-09-10',metric_samples:null},{date:'2026-09-11',metric_samples:{interactions:0}}])
  assert.equal(rows[0].metric_samples.interactions,null);assert.equal(rows[1].metric_samples.interactions,0)
})
test('invalid numbers never reach Recharts or become artificial zeros',()=>{
  const [day]=normalize([{date:'2026-09-10',likes:NaN,interactions:'12',views:Infinity,plays:-1,comments:0}])
  for(const key of ['likes','interactions','views','plays'])assert.equal(day[key],null)
  assert.equal(day.comments,0)
})
test('dates are sorted without filling gaps or mutating API input',()=>{
  const input=[{date:'2026-09-20',interactions:7},{date:'bad',interactions:50},{date:'2026-09-10',interactions:0}]
  const copy=structuredClone(input)
  assert.deepEqual(normalize(input).map(d=>[d.date,d.interactions]),[['2026-09-10',0],['2026-09-20',7]])
  assert.deepEqual(input,copy)
})
