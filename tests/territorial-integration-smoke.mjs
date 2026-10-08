import {chromium,expect} from '@playwright/test'
const browser=await chromium.launch()
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}})
  page.setDefaultTimeout(15000)
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.addInitScript(()=>sessionStorage.setItem('data-sight:session-simulada',JSON.stringify({nome:'Teste'})))
  let mode='normal', replacement
  await page.route('**/api/**',async route=>{
    const url=new URL(route.request().url());url.hostname='127.0.0.1';url.port=process.env.UI_FIXTURE_PORT||'8001'
    const response=await route.fetch({url:url.toString()})
    if(url.pathname.endsWith('/analytics')&&mode!=='normal'){
      const body=await response.json()
      if(mode==='old')delete body.filters
      else body.daily=replacement
      return route.fulfill({json:body})
    }
    await route.fulfill({response})
  })
  const base=process.env.UI_BASE_URL||'http://127.0.0.1:5187'
  await page.goto(base+'/concorrentes')
  await page.getByLabel('Campanha do painel').selectOption('3')
  await expect(page.getByText('Desempenho por dia',{exact:true})).toBeVisible()
  mode='partial'
  for(const daily of [undefined,null,[],[null],[{date:'2026-09-10'}],[{date:'2026-09-10',profiles:null,metric_samples:null}],[{date:'2026-09-10',profiles:{role_competitor_10:null}}]]){
    replacement=daily;await page.reload()
    await expect(page.getByText('Desempenho por dia',{exact:true})).toBeVisible()
    for(const metric of ['interactions','likes','comments','views','plays','shares','saves','posts']){
      await page.getByLabel('Métrica do desempenho por dia').selectOption(metric)
      await expect(page.getByText(/Sem dados históricos disponíveis para/)).toBeVisible()
    }
  }
  replacement=[{date:'2026-09-10',interactions:0}];await page.reload()
  await expect(page.getByRole('img',{name:'Desempenho por dia: Interações',exact:true})).toBeVisible()
  await expect(page.getByText(/Cobertura da métrica não informada/)).toBeVisible()
  replacement=[{date:'2026-09-10',profiles:{role_competitor_10:{interactions:5},role_competitor_11:{}}}];await page.reload()
  await page.getByLabel('Comparar perfis',{exact:true}).check()
  await expect(page.getByRole('img',{name:'Desempenho por dia: Interações',exact:true})).toBeVisible()
  mode='old';await page.reload()
  await expect(page.getByRole('alert')).toContainText('API está desatualizada')
  mode='normal';await page.goto(base+'/tendencias')
  await expect(page.getByLabel('Grupo de perfis')).toHaveValue('TERRITORIAL')
  await expect(page.getByText('Tendências por RA e tema',{exact:true})).toBeVisible()
  const profiles=page.getByLabel('Perfil territorial',{exact:true})
  await expect(profiles.locator('option')).toHaveCount(3)
  await expect(profiles).not.toContainText('role_competitor')
  await page.getByRole('button',{name:'Ver posts',exact:true}).first().click()
  await expect(page.getByText('3 posts sustentam esta tendência.',{exact:true})).toBeVisible()
  await page.getByLabel('Grupo de perfis').selectOption('COMPETITOR')
  await expect(profiles.locator('option')).toHaveCount(2)
  await expect(profiles).not.toContainText('role_local_page')
  await page.getByRole('button',{name:'Ver posts',exact:true}).first().click()
  await expect(page.getByText('2 posts sustentam esta tendência.',{exact:true})).toBeVisible()
  await page.getByRole('link',{name:'Inteligência territorial',exact:true}).click()
  await expect(page.getByText('RAs e temas identificados',{exact:true})).toBeVisible()
  await expect(page.getByText('Planaltina · Saúde',{exact:true})).toBeVisible()
  await expect(page.getByText('“Hospital em Planaltina”',{exact:true}).first()).toBeVisible()
  await expect(page.getByRole('link',{name:/role_competitor/})).toHaveCount(0)
  expect(errors).toEqual([])
  console.log('OK: dados diários incompletos, oito métricas, comparação parcial, API antiga, grupos e evidências integradas.')
  await page.unrouteAll({behavior:'ignoreErrors'})
} finally {await browser.close()}
