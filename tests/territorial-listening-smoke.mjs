import { chromium, expect } from '@playwright/test'

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))

await page.route('**/api/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'local-development', role: 'admin' }) }))
await page.route('**/api/campaigns/1/listening?**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
  collected_at: new Date().toISOString(), cached: false,
  coverage: { sources_configured: 3, sources_available: 3, items_collected: 3, items_with_ra: 3, items_with_issue_signal: 2 },
  methodology: { scope: 'Manchetes e resumos públicos.', issue_signal: 'Termos determinísticos.', not_public_opinion: true, cache_minutes: 15 },
  sources: [{ id: 'df-samambaia', name: 'DF Samambaia', status: 'ok', items: 1 }, { id: 'df-taguatinga', name: 'DF Taguatinga', status: 'ok', items: 1 }, { id: 'noticiario-df', name: 'Noticiário DF', status: 'ok', items: 1 }],
  topics: [{ name: 'Infraestrutura urbana', count: 2 }, { name: 'Transporte e mobilidade', count: 1 }],
  regions: [{ name: 'Samambaia', count: 1 }, { name: 'Taguatinga', count: 1 }, { name: 'Ceilândia', count: 1 }],
  timeline: [{ date: '2026-10-20', count: 3 }],
  items: [
    { id: '1', source_id: 'df-samambaia', source_name: 'DF Samambaia', source_type: 'LOCAL_NEWS', title: 'Moradores reclamam de buracos em avenida de Samambaia', excerpt: 'A via apresenta problemas de pavimentação.', url: 'https://dfsamambaia.com.br/noticia', published_at: '2026-10-20T12:00:00', ra: 'Samambaia', ra_method: 'text_mention', topics: ['Infraestrutura urbana'], issue_signal: true },
    { id: '2', source_id: 'df-taguatinga', source_name: 'DF Taguatinga', source_type: 'LOCAL_NEWS', title: 'Obra modifica trânsito no centro de Taguatinga', excerpt: 'Motoristas devem observar os desvios.', url: 'https://dftaguatinga.com.br/noticia', published_at: '2026-10-20T11:00:00', ra: 'Taguatinga', ra_method: 'text_mention', topics: ['Transporte e mobilidade'], issue_signal: false },
    { id: '3', source_id: 'noticiario-df', source_name: 'Noticiário DF', source_type: 'LOCAL_NEWS', title: 'Falta de iluminação preocupa moradores da Ceilândia', excerpt: 'Postes permanecem apagados.', url: 'https://noticiariodf.com.br/noticia', published_at: '2026-10-20T10:00:00', ra: 'Ceilândia', ra_method: 'text_mention', topics: ['Infraestrutura urbana'], issue_signal: true },
  ],
}) }))
await page.route('**/api/campaigns', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 1, name: 'Campanha de teste', active: true }]) }))

await page.goto('http://127.0.0.1:5173/escuta-df')
await expect(page.getByRole('main').getByRole('heading', { name: 'Sinais e demandas do DF' })).toBeVisible({ timeout: 15000 })
await expect(page.getByText('Moradores reclamam de buracos em avenida de Samambaia')).toBeVisible()
await page.getByLabel('Filtrar por região').selectOption('Taguatinga')
await expect(page.getByText('Obra modifica trânsito no centro de Taguatinga')).toBeVisible()
await expect(page.getByText('Moradores reclamam de buracos em avenida de Samambaia')).toHaveCount(0)
await page.getByLabel('Filtrar por região').selectOption('')
await page.screenshot({ path: 'node_modules/radar-escuta-df.png', fullPage: true })

await page.setViewportSize({ width: 390, height: 844 })
await page.reload()
await expect(page.getByRole('main').getByRole('heading', { name: 'Sinais e demandas do DF' })).toBeVisible({ timeout: 15000 })
if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('A Escuta DF tem overflow horizontal no mobile.')
if (errors.length) throw new Error(errors.join('\n'))
await browser.close()
console.log('OK: Escuta DF renderizada com fontes, filtros, evidências e layout responsivo.')
