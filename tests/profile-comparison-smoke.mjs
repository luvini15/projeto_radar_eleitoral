import { chromium, expect } from '@playwright/test'

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))

await page.route('**/api/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'local-development', role: 'admin' }) }))
await page.route('**/api/campaigns/1/benchmark?**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
  methodology: { posts_per_profile: 25, latest_posts_only: true, latest_snapshot_only: true },
  profiles: [
    { profile_id: 10, username: 'perfil_principal', full_name: 'Perfil Principal', role: 'CLIENT', followers: 18200, posts_analyzed: 25, reels_analyzed: 14, avg_comments_per_post: 84.4, avg_likes_per_post: 1380, avg_views_per_reel: null, avg_plays_per_reel: 9200, avg_observed_interactions: 1464.4, interaction_coverage: { complete_posts: 0, posts_analyzed: 25 } },
    { profile_id: 20, username: 'perfil_referencia', full_name: 'Perfil de Referência', role: 'REFERENCE', followers: 24100, posts_analyzed: 25, reels_analyzed: 18, avg_comments_per_post: 61.2, avg_likes_per_post: 1740, avg_views_per_reel: null, avg_plays_per_reel: 11300, avg_observed_interactions: 1801.2, interaction_coverage: { complete_posts: 0, posts_analyzed: 25 } },
  ],
}) }))
await page.route('**/api/campaigns', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 1, name: 'Campanha de teste', active: true }]) }))

await page.goto('http://127.0.0.1:5173/comparar-perfis')
await expect(page.getByRole('main').getByRole('heading', { name: 'Comparação de perfis' })).toBeVisible({ timeout: 15000 })
await expect(page.getByText('Perfil Principal', { exact: true })).toBeVisible()
await expect(page.getByText('Perfil de Referência', { exact: true })).toBeVisible()
await expect(page.getByText('Curtidas por post', { exact: true })).toBeVisible()
await expect(page.getByText('1.380', { exact: true })).toBeVisible()
await expect(page.getByText('1.740', { exact: true })).toBeVisible()
await page.screenshot({ path: 'node_modules/radar-comparacao-perfis.png', fullPage: true })

await page.setViewportSize({ width: 390, height: 844 })
await page.reload()
await expect(page.getByRole('main').getByRole('heading', { name: 'Comparação de perfis' })).toBeVisible({ timeout: 15000 })
if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('A comparação tem overflow horizontal no mobile.')
if (errors.length) throw new Error(errors.join('\n'))
await browser.close()
console.log('OK: comparação de perfis renderizada com seleção, métricas e layout responsivo.')
