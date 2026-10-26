import {chromium,expect} from '@playwright/test'
import {createHash} from 'node:crypto'
import {writeFile,mkdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
const artifactDir=process.env.REPORT_ARTIFACT_DIR||path.join(tmpdir(),'data-sight-editorial-review')
await mkdir(artifactDir,{recursive:true})
const browser=await chromium.launch()
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050},acceptDownloads:true}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 const live=await (await page.request.get('http://127.0.0.1:8000/api/digital-reports/38')).json()
 const fingerprint=createHash('sha256').update(JSON.stringify(live)).digest('hex')
 let mock
 await page.route('**/api/digital-reports/38',r=>r.fulfill({json:mock}))
 await page.route('**/38/export/pdf',async route=>{await writeFile(path.join(artifactDir,`tmp-generic-${mock.analysis.profiles.length}.html`),route.request().postData());await route.continue()})
 for(const count of [0,1,4,10]){
  mock=structuredClone(live);mock.title=`Campanha de teste · ${count} perfis`;mock.campaign={id:997,name:'Campanha de teste'};mock.slates=[];mock.comparisons=[];mock.highlights=[];mock.filters.slate_ids=[];mock.filters.profile_id=null
  const base=live.analysis.profiles[0]
  mock.analysis.profiles=Array.from({length:count},(_,i)=>({...structuredClone(base),id:100+i,username:`perfil_teste_${i}`,slate_id:null,position:i===0?'CANDIDATE':i===1?'VICE':'ASSOCIATE'}))
  mock.profile_ids=mock.analysis.profiles.map(p=>p.id);mock.analysis.summary.profiles=count;mock.analysis.summary.followers_profiles_with_data=count
  mock.analysis.insights.top_posts={};mock.analysis.follower_history=[]
  mock.editorial_insights.forEach(item=>{item.facts=[];item.value=null;item.headline='Informação indisponível';item.interpretation='Informação indisponível neste recorte.';item.implication='Não há evidência adicional neste recorte.'})
  if(!count){mock.analysis.formats=[];mock.analysis.weekdays=[];mock.analysis.hours=[];mock.analysis.insights.format=null;mock.analysis.summary.posts=0;mock.analysis.data_status='NO_DATA'}
  const saved=JSON.stringify(mock)
  await page.goto('http://localhost:5173/relatorios/38')
  await expect(page.locator('.report-cover h1')).toHaveText(mock.title)
  await expect(page.locator('.report-brand-mark')).toHaveCount(2)
  await expect(page.locator('#insights [data-insight]')).toHaveCount(7)
  await expect(page.locator('#insights .insight-profile-grid>article')).toHaveCount(count)
  await expect(page.locator('#insights .insight-growth')).toHaveCount(count)
  await expect(page.locator('.report-indicator')).toHaveCount(7)
  expect(await page.locator('.report-paper').innerText()).not.toMatch(/celina|grass|gustavo|dora|temas/i)
  const ids=await page.locator('.report-section').evaluateAll(nodes=>nodes.map(n=>n.id));expect(ids.slice(-2)).toEqual(['limites','metodologia'])
  if(count===1)await expect(page.locator('[data-insight="profile"]')).toContainText('não contém outro perfil')
  if(count>8)await expect(page.locator('#desempenho .report-chart')).toHaveCount(Math.ceil(count/8))
  expect(JSON.stringify(mock)).toBe(saved)
  if([1,10].includes(count)){
   await page.locator('[data-insight="profile"]').screenshot({path:`tmp-generic-${count}-profile.png`})
   await page.getByRole('button',{name:'Exportar relatório',exact:true}).click();const pending=page.waitForEvent('download',{timeout:180000});await page.getByRole('menuitem',{name:'Baixar PDF',exact:true}).click();const download=await pending;await download.saveAs(path.join(artifactDir,`tmp-generic-${count}.pdf`))
  }
  await page.setViewportSize({width:390,height:950});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.setViewportSize({width:1440,height:1050})
  console.log('PASS generic report:',count,'profiles; dynamic names; seven readings; responsive')
 }
 const after=await (await page.request.get('http://127.0.0.1:8000/api/digital-reports/38')).json();expect(createHash('sha256').update(JSON.stringify(after)).digest('hex')).toBe(fingerprint)
 expect(errors).toEqual([])
}finally{await browser.close()}
