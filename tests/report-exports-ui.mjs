import {chromium,expect} from '@playwright/test'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {pathToFileURL} from 'node:url'
import path from 'node:path'
const artifactDir=process.env.REPORT_ARTIFACT_DIR||path.join(tmpdir(),'data-sight-editorial-review')
await mkdir(artifactDir,{recursive:true})
const browser=await chromium.launch(),errors=[]
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050},acceptDownloads:true})
 page.on('pageerror',e=>{errors.push(e.message);console.error('Browser error:',e.message)})
 await page.addInitScript(()=>{window.print=()=>{throw new Error('Browser print must never be called')}})
 for(const [id,name] of [[Number(process.env.REPORT_SINGLE_ID||7),'single'],[Number(process.env.REPORT_COMPARISON_ID||8),'comparative']]){
  await page.goto(`http://localhost:5173/relatorios/${id}`)
  await expect(page.locator('.report-cover h1')).toBeVisible()
  await expect(page.locator('.report-indicator')).toHaveCount(7)
  await expect(page.locator('#temas,[href="#temas"]')).toHaveCount(0)
  expect(await page.locator('.report-paper').innerText()).not.toMatch(/temas|por tema/i)
  const sectionIds=await page.locator('.report-paper .report-section').evaluateAll(nodes=>nodes.map(node=>node.id))
  expect(sectionIds.slice(0,4)).toEqual(['resumo','desempenho','base','insights'])
  expect(sectionIds.slice(-2)).toEqual(['limites','metodologia'])
  expect(await page.locator('#metodologia').innerText()).not.toMatch(/interactions_count|APIFY_PUBLIC|MANUAL_HISTORICAL|backend|scraping|snapshot|cache/i)
  await expect(page.locator('#insights .insight-evidence')).toHaveCount((await page.locator('#insights .insight-profile-grid').count())+1)
  await expect(page.locator('#insights .insight-growth')).toHaveCount(await page.locator('#insights .insight-profile-grid>article').count())
  await page.locator('#insights [data-insight="profile"]').screenshot({path:`tmp-editorial-profile-${name}.png`})
  await page.locator('#metodologia').screenshot({path:`tmp-editorial-methodology-${name}.png`})
  const headings=await page.locator('.report-section-heading>span').allTextContents()
  expect(headings).toEqual(headings.map((_,i)=>String(i+1).padStart(2,'0')+' /'))
  const document=await (await page.request.get('http://127.0.0.1:8000/api/digital-reports/'+id)).json()
  expect(document.editorial_insights.map(c=>c.id)).toEqual(['format','profile','growth','content','weekday','hour','peaks'])
  if(document.highlights.length===2){
   await expect(page.locator('.report-content-formats-group>#conteudos .report-post')).toHaveCount(2)
   await expect(page.locator('.report-content-formats-group>#formatos .report-chart')).toHaveCount(2)
   await page.emulateMedia({media:'print'})
   expect(await page.locator('.report-content-formats-group').evaluate(node=>getComputedStyle(node).breakInside)).toMatch(/avoid/)
   expect(await page.locator('#formatos').evaluate(node=>getComputedStyle(node).breakBefore)).toBe('auto')
   await page.emulateMedia({media:'screen'})
  }
  await page.emulateMedia({media:'print'})
  const printRules=await page.locator('.report-paper').evaluate(root=>({
   formatsInside:getComputedStyle(root.querySelector('#formatos')).breakInside,
   sections:[...root.querySelectorAll('.report-section:not(#metodologia)')].map(node=>({before:getComputedStyle(node).breakBefore,after:getComputedStyle(node).breakAfter})),
   methodology:getComputedStyle(root.querySelector('#metodologia')).breakBefore
  }))
  expect(printRules.formatsInside).toMatch(/avoid/)
  await expect(page.locator('.report-final-notes>#limites')).toHaveCount(1)
  await expect(page.locator('.report-final-notes>#metodologia')).toHaveCount(1)
  expect(await page.locator('#indicadores').evaluate(node=>getComputedStyle(node).breakInside)).toMatch(/avoid/)
  expect(printRules.sections.every(rule=>rule.before==='auto'&&rule.after==='auto')).toBe(true)
  expect(printRules.methodology).toBe('auto')
  await page.emulateMedia({media:'screen'})
  const profileCard=document.editorial_insights.find(c=>c.id==='profile')
  const formatCard=document.editorial_insights.find(c=>c.id==='format')
  for(const profile of document.analysis.profiles) expect(profileCard.facts.some(text=>text.includes('@'+profile.username))).toBe(true)
  for(const format of document.analysis.formats) expect(formatCard.facts.some(text=>text.startsWith(format.format+':'))).toBe(true)
  await expect(page.locator('#insights [data-insight]')).toHaveCount(7)
  await expect(page.locator('.report-cover img,.report-cover-media,.report-screen-meta')).toHaveCount(0)
  await expect(page.getByRole('link',{name:'Alterar filtros'})).toHaveAttribute('href',`/relatorios/novo?from=${id}`)
  if(name==='comparative'){await page.locator('#chapas').getByRole('combobox',{name:'Métrica: Comparação entre chapas',exact:true}).selectOption(process.env.REPORT_COMPARISON_METRIC||'posts');await page.locator('#chapas').getByRole('combobox',{name:'Visualização: Comparação entre chapas',exact:true}).selectOption('pie')}
  await page.getByRole('button',{name:'Exportar relatório',exact:true}).click()
  await expect(page.getByRole('menuitem',{name:'Baixar HTML'})).toBeVisible()
  await page.keyboard.press('Escape');await expect(page.getByRole('menu')).toHaveCount(0)
  await page.route('**/api/digital-reports/'+id+'/export/pdf',async route=>{const html=route.request().postData();if(name==='comparative')expect(html).toContain('recharts-pie-sector');await writeFile(path.join(artifactDir,`tmp-report-export-${name}-pdf-source.html`),html);await route.continue()})
  for(const ext of ['HTML','PDF']){
   await page.getByRole('button',{name:'Exportar relatório',exact:true}).click()
   const pending=page.waitForEvent('download',{timeout:180000})
   await page.getByRole('menuitem',{name:`Baixar ${ext}`}).click()
   await expect(page.getByRole('menu')).toHaveCount(0)
   const download=await pending.catch(async error=>{console.log('Export failed:',page.url(),await page.locator('body').innerText({timeout:3000}).catch(()=>''));throw error})
   expect(download.suggestedFilename()).toMatch(new RegExp(`^data-sight-relatorio-[a-z0-9-]+-${document.filters.start_date}-${document.filters.end_date}\\.${ext.toLowerCase()}$`))
   const file=path.join(artifactDir,`tmp-report-export-${name}.${ext.toLowerCase()}`);await download.saveAs(file)
   await expect(page.getByRole('status')).toHaveText(`${ext} baixado com sucesso.`)
   if(ext==='HTML'){
    const html=await readFile(file,'utf8');expect(html).not.toContain('<script');expect(html).toContain('data:font/');expect(html).not.toContain('Salvar como PDF');expect(html).toContain('Como interpretar os indicadores');expect(html).toContain('O que acompanhar');expect(html).not.toContain('id="temas"');expect(html).not.toContain('Temas usam')
    const offline=await browser.newContext({offline:true,viewport:{width:1440,height:1050}}),saved=await offline.newPage()
    const requests=[];saved.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())})
    await saved.goto(pathToFileURL(file).href)
    await expect(saved.locator('.report-cover h1')).toHaveText(await page.locator('.report-cover h1').innerText())
    expect(await saved.locator('svg.recharts-surface').count()).toBeGreaterThan(10)
    expect(await saved.locator('.report-plot > .recharts-wrapper > svg').evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().width>100&&n.getBoundingClientRect().height>100))).toBe(true)
    if(name==='comparative')expect(await saved.locator('#chapas .recharts-pie-sector').count()).toBeGreaterThan(0)
    expect(requests).toEqual([]);await saved.screenshot({path:`tmp-export-offline-${name}.png`})
    await saved.locator('#formatos').screenshot({path:`tmp-export-charts-${name}.png`})
    await saved.setViewportSize({width:390,height:950});expect(await saved.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
    await offline.close()
   }else{const pdf=await readFile(file);expect(pdf.subarray(0,5).toString()).toBe('%PDF-');expect(pdf.length).toBeGreaterThan(50000)}
  }
  await page.setViewportSize({width:390,height:950})
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  expect(await page.locator('.report-cover h1').evaluate(n=>parseFloat(getComputedStyle(n).fontSize))).toBeGreaterThanOrEqual(40)
  await page.getByRole('button',{name:'Exportar relatório',exact:true}).click()
  const box=await page.getByRole('menu').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390)
  await page.keyboard.press('Escape');await page.screenshot({path:`tmp-export-mobile-${name}.png`})
  await page.setViewportSize({width:1440,height:1050})
  console.log(`PASS ${name}: menu, HTML offline, SVGs, PDF download, current state, 390px`)
 }
 // Exercise image embedding with an actual already-cached content image, without changing the saved report.
 const response=await page.request.get('http://127.0.0.1:8000/api/digital-reports/7'),doc=await response.json()
 doc.highlights=[{...doc.cover,distinctions:['Conteúdo armazenado']}]
 await page.route('**/api/digital-reports/7',r=>r.fulfill({json:doc}))
 await page.goto('http://localhost:5173/relatorios/7');await expect(page.locator('.report-post-image')).toBeVisible()
 await page.getByRole('button',{name:'Exportar relatório',exact:true}).click()
 const downloadEvent=page.waitForEvent('download');await page.getByRole('menuitem',{name:'Baixar HTML'}).click();const downloaded=await downloadEvent
 const file=path.join(artifactDir,'tmp-report-export-content-image.html');await downloaded.saveAs(file)
 const saved=await browser.newPage();await saved.route('http**://**/*',r=>r.abort());await saved.goto(pathToFileURL(file).href)
 expect(await saved.locator('.report-post-image').evaluate(img=>img.src.startsWith('data:')&&img.naturalWidth>0)).toBe(true)
 await saved.locator('#conteudos').screenshot({path:'tmp-export-content-image.png'})
 // Explicit error path is recoverable and never triggers printing.
 await page.route('**/api/digital-reports/7/export/pdf',r=>r.fulfill({status:503,json:{detail:'Renderizador temporariamente indisponível.'}}))
 await page.getByRole('button',{name:'Exportar relatório',exact:true}).click();await page.getByRole('menuitem',{name:'Baixar PDF'}).click()
 await expect(page.getByRole('status')).toContainText('Renderizador temporariamente indisponível.')
 await expect(page.getByRole('button',{name:'Exportar relatório',exact:true})).toBeEnabled()
 expect(errors).toEqual([])
 console.log('PASS cached content image embedded, discreet error and retry; no browser print or runtime errors')
 console.log('Artifacts:',artifactDir)
}finally{await browser.close()}
