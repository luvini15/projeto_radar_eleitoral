import { chromium, expect } from '@playwright/test'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', error => errors.push(error.message))
await page.addInitScript(() => {
  const user = { id: '00000000-0000-4000-8000-000000000001', email: 'visual@datasight.local', factors: [], user_metadata: {}, app_metadata: { provider: 'email' }, aud: 'authenticated', role: 'authenticated', created_at: new Date().toISOString() }
  const encode = value => btoa(JSON.stringify(value)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')
  const now = Math.floor(Date.now()/1000)
  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const payload = encode({ sub: user.id, aal: 'aal1', aud: 'authenticated', role: 'authenticated', session_id: '10000000-0000-4000-8000-000000000001', iat: now, exp: now+3600, iss: 'https://zunxahgmcwktkavstykd.supabase.co/auth/v1' })
  sessionStorage.setItem('sb-zunxahgmcwktkavstykd-auth-token', JSON.stringify({ access_token: `${header}.${payload}.visual`, refresh_token: 'visual-refresh', expires_at: now+3600, expires_in: 3600, token_type: 'bearer', user }))
})
await page.route('**/auth/v1/user', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', email: 'visual@datasight.local', factors: [], user_metadata: {}, app_metadata: {}, aud: 'authenticated', role: 'authenticated', created_at: new Date().toISOString() }) }))
await page.route('**/api/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: userId, role: 'admin' }) }))
const userId = '00000000-0000-4000-8000-000000000001'
await page.route('**/api/campaigns', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 1, name: 'Campanha Horizonte', active: true }]) }))
await page.route('**/api/campaigns/1/assistant**', async route => {
  const path = new URL(route.request().url()).pathname
  if (path.endsWith('/conversations')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'thread-1', title: 'O que mais chama atenção nesta campanha?', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), message_count: 2 }]) })
  if (path.includes('/conversations/thread-1')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'thread-1', title: 'O que mais chama atenção nesta campanha?', messages: [{ id: 1, role: 'user', content: 'O que mais chama atenção nesta campanha?', sources: [] }, { id: 2, role: 'assistant', content: 'A frequência de publicações cresceu no período observado.', sources: [] }] }) })
  await new Promise(resolve => setTimeout(resolve, 120))
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ conversation_id: 'thread-1', text: 'A frequência de publicações cresceu no período observado.', model: 'visual-test', sources: [{ label: 'Visão geral', path: '/painel', description: 'Métricas observadas' }], tools: [{ type: 'tool-visão_geral', state: 'output-available', input: { campaign_id: 1 }, output: { leitura: 'Métricas observadas' } }] }) })
})

await page.goto((process.env.UI_BASE_URL || 'http://localhost:5173') + '/painel')
await expect(page.getByRole('heading', { name: /O que você quer/ })).toBeVisible({ timeout: 15000 })
await expect(page.getByRole('button', { name: /Histórico/ })).toHaveCount(0)
await page.screenshot({ path: 'tmp-hub-desktop.png', fullPage: true })

await page.getByRole('button', { name: 'O que mais chama atenção nesta campanha?' }).click()
await expect(page).toHaveURL(/\/ia$/)
await expect(page.getByRole('button', { name: /Histórico/ })).toBeVisible()
await expect(page.getByText('A frequência de publicações cresceu no período observado.')).toBeVisible()
await expect(page.locator('.ai-tool')).toBeVisible()
const userMessage = await page.locator('.ai-message--user').boundingBox()
const assistantMessage = await page.locator('.ai-message--assistant').first().boundingBox()
const composer = await page.locator('.ai-composer').boundingBox()
if (!userMessage || !assistantMessage || !composer || !(userMessage.y < assistantMessage.y && assistantMessage.y < composer.y)) throw new Error('A ordem visual do chat está incorreta')
await page.screenshot({ path: 'tmp-ia-chat-desktop.png' })

await page.getByRole('button', { name: /Histórico/ }).click()
await expect(page.getByRole('heading', { name: 'Conversas' })).toBeVisible()
await page.screenshot({ path: 'tmp-ia-history-desktop.png' })

await page.getByRole('button', { name: 'Fechar histórico' }).click()
await page.setViewportSize({ width: 390, height: 844 })
await page.reload()
await expect(page.getByPlaceholder('Pergunte sobre os dados da campanha')).toBeVisible({ timeout: 15000 })
if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('A tela da IA tem overflow horizontal no mobile')
await page.screenshot({ path: 'tmp-ia-mobile.png' })
if (errors.length) throw new Error(errors.join('\n'))
await browser.close()
console.log('OK: hub e rota dedicada da IA renderizados sem quebra.')
