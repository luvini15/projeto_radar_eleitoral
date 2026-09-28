import { chromium, expect } from '@playwright/test'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
const root=resolve(process.env.AUDIT_REPORT_DIR||'reports/territorial-audit')
const summary=JSON.parse(readFileSync(resolve(root,'summary.json'),'utf8'))
const browser=await chromium.launch()
try {
 const page=await browser.newPage({viewport:{width:1280,height:900}})
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.route('https://**',r=>r.abort())
 await page.goto(pathToFileURL(resolve(root,'audit.html')).href)
 await expect(page.locator('article')).toHaveCount(summary.total_posts)
 await page.getByLabel('Confiança',{exact:true}).selectOption('HIGH')
 await expect(page.locator('article')).toHaveCount(summary.posts_by_confidence.HIGH)
 await page.getByLabel('Confiança',{exact:true}).selectOption('LOW')
 await expect(page.locator('article')).toHaveCount(summary.posts_by_confidence.LOW)
 await expect(page.locator('article').first()).toContainText('Motivo da baixa confiança')
 await page.getByRole('button',{name:'Limpar filtros'}).click()
 await page.getByLabel('RAs por post').selectOption('yes')
 await expect(page.locator('article')).toHaveCount(summary.posts_multiple_regions)
 await page.getByRole('button',{name:'Limpar filtros'}).click()
 await page.getByLabel('RA',{exact:true}).selectOption('none')
 await expect(page.locator('article')).toHaveCount(summary.posts_without_region)
 await page.getByRole('button',{name:'Limpar filtros'}).click()
 await page.getByLabel('RA',{exact:true}).selectOption({label:'Planaltina'})
 await expect(page.locator('article')).toHaveCount(summary.regions.find(r=>r.region_name==='Planaltina').posts)
 await page.setViewportSize({width:390,height:844})
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow')
 await page.screenshot({path:resolve('node_modules/territorial-audit-report.png'),fullPage:false})
 expect(errors).toEqual([])
 console.log('PASS: audit report HIGH/LOW, multiple RAs, unassigned, region filter, mobile and no external requests.')
} finally {await browser.close()}
