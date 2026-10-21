import { chromium, expect } from '@playwright/test'

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const supabaseRequests = []
page.on('request', request => {
  if (request.url().includes('.supabase.co')) supabaseRequests.push(request.url())
})

await page.goto('http://127.0.0.1:5173/login')
await expect(page).toHaveURL(/\/painel$/, { timeout: 15000 })
await expect(page.getByText('Desenvolvimento', { exact: true })).toBeVisible()
await page.goto('http://127.0.0.1:5173/territorios')
await expect(page.getByRole('heading', { name: 'Desempenho por região' })).toBeVisible()

if (supabaseRequests.length) throw new Error(`O modo local ainda acessou o Supabase: ${supabaseRequests.length} requisição(ões).`)
await browser.close()
console.log('OK: login local automático sem requisições ao Supabase.')
