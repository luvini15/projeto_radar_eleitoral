import { chromium, expect } from '@playwright/test'

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.addInitScript(() => {
  const user = { id: '00000000-0000-4000-8000-000000000001', email: 'mapa@datasight.local', factors: [], user_metadata: {}, app_metadata: { provider: 'email' }, aud: 'authenticated', role: 'authenticated', created_at: new Date().toISOString() }
  const encode = value => btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
  const now = Math.floor(Date.now() / 1000)
  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const payload = encode({ sub: user.id, aal: 'aal1', aud: 'authenticated', role: 'authenticated', session_id: '10000000-0000-4000-8000-000000000001', iat: now, exp: now + 3600, iss: 'https://zunxahgmcwktkavstykd.supabase.co/auth/v1' })
  sessionStorage.setItem('sb-zunxahgmcwktkavstykd-auth-token', JSON.stringify({ access_token: `${header}.${payload}.visual`, refresh_token: 'visual-refresh', expires_at: now + 3600, expires_in: 3600, token_type: 'bearer', user }))
})

await page.route('**/auth/v1/user', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', email: 'mapa@datasight.local', factors: [], user_metadata: {}, app_metadata: {}, aud: 'authenticated', role: 'authenticated', created_at: new Date().toISOString() }) }))
await page.route('**/api/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', role: 'admin' }) }))
await page.route('**/api/campaigns', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 1, name: 'Campanha Horizonte', active: true }]) }))

await page.goto('http://127.0.0.1:5173/territorios')
await expect(page.getByRole('heading', { name: 'Desempenho por região' })).toBeVisible({ timeout: 15000 })
await expect(page.getByText('27 regiões')).toBeVisible({ timeout: 15000 })
await expect(page.locator('svg path[role="button"]')).toHaveCount(27)
await page.getByRole('button', { name: 'Engajamento', exact: true }).click()
await expect(page.getByText('Taxa de engajamento', { exact: true })).toBeVisible()
await page.locator('svg path[role="button"]').first().focus()
await expect(page.locator('[aria-live="polite"]')).toHaveClass(/opacity-100/)
await page.getByRole('button', { name: 'São Paulo: 56 pts. Abrir microrregiões.' }).click().catch(async () => {
  await page.getByText('São Paulo', { exact: true }).last().click()
})
await expect(page.getByText('São Paulo · microrregiões')).toBeVisible({ timeout: 15000 })
await expect(page.locator('svg path[role="button"]')).toHaveCount(63)
await page.screenshot({ path: 'node_modules/radar-territorios.png', fullPage: true })

await page.setViewportSize({ width: 390, height: 844 })
await page.reload()
await expect(page.getByRole('heading', { name: 'Desempenho por região' })).toBeVisible({ timeout: 15000 })
if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('A tela territorial tem overflow horizontal no mobile.')
if (errors.length) throw new Error(errors.join('\n'))
await browser.close()
console.log('OK: mapa estadual e microrregional renderizado, filtrado e responsivo.')
