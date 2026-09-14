import {chromium,expect} from '@playwright/test'
const browser=await chromium.launch()
try {
 const page=await browser.newPage({viewport:{width:390,height:844}})
 await page.addInitScript(()=>sessionStorage.setItem('data-sight:session-simulada',JSON.stringify({nome:'Teste'})))
 let format='Reels', empty=false
 await page.route('https://www.instagram.com/**',r=>r.fulfill({contentType:'text/html',body:'<p>Publicação incorporada de teste</p>'}))
 await page.route('**/api/**',r=>{
  const u=new URL(r.request().url())
  if(u.pathname==='/api/campaigns') return r.fulfill({json:[{id:1,name:'Teste',active:true}]})
  if(u.pathname.endsWith('/overview')) return r.fulfill({json:{summary:{posts_analyzed:2,profiles_monitored:1,comments:999,observed_interactions:999},profiles:[]}})
  if(u.pathname.endsWith('/posts')) {
   if(u.searchParams.get('role')!=='CLIENT'||u.searchParams.get('limit_per_profile')!=='1') throw Error('Consulta não limita o perfil principal')
   return r.fulfill({json:{posts:empty?[]:[{post_id:1,profile:{username:'principal',role:'CLIENT'},content:{format,caption:'Legenda de teste',published_at:'2026-09-13T10:00:00Z',thumbnail_url:null,url:'https://www.instagram.com/reel/test123/'},metrics:{likes:0,comments:12,views:420,plays:500,shares:null,saves:null,observed_interactions:12,collected_at:'2026-09-13T11:00:00Z',interactions_complete:false}}]}})
  }
  return r.fulfill({json:{}})
 })
 await page.goto('http://localhost:5173/')
 const card=page.getByRole('article',{name:'Último post do perfil'})
 await expect(card.getByText('Visualizações',{exact:true}).locator('..')).toContainText('420')
 await expect(card.getByText('Curtidas',{exact:true}).locator('..')).toContainText('0')
 await expect(card.getByText('Compartilhamentos',{exact:true}).locator('..')).toContainText('—')
 await expect(card).not.toContainText('999')
 await card.getByRole('button',{name:'Reproduzir Reel'}).click()
 await expect(card.locator('iframe')).toHaveAttribute('src','https://www.instagram.com/reel/test123/embed/')
 format='Carrossel'
 await page.reload()
 await expect(card.getByRole('button',{name:'Abrir carrossel'})).toBeVisible()
 await expect(card.getByText('Visualizações',{exact:true})).toHaveCount(0)
 await expect(card.getByText('Capa do carrossel.',{exact:false})).toBeVisible()
 empty=true
 await page.reload()
 await expect(card.getByText('Ainda não há publicações coletadas',{exact:false})).toBeVisible()
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw Error('Overflow mobile')
 console.log('OK: Reel, carrossel, incorporação, métricas do post, valores nulos/zero, vazio e mobile.')
} finally {await browser.close()}
