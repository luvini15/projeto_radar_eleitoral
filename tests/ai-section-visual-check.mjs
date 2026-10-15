import { chromium } from '@playwright/test'

const browser = await chromium.launch({ headless: true })
for (const viewport of [{ width: 1440, height: 900, name: 'desktop' }, { width: 390, height: 844, name: 'mobile' }]) {
  const page = await browser.newPage({ viewport })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
  await page.locator('#inteligencia').scrollIntoViewIfNeeded()
  await page.waitForTimeout(1600)
  await page.screenshot({ path: `tmp-ai-typing-${viewport.name}.png` })
  await page.waitForTimeout(5200)
  await page.screenshot({ path: `tmp-ai-answer-${viewport.name}.png`, fullPage: false })
  console.log(viewport.name, JSON.stringify({ errors, answer: await page.getByText('Sua audiência quer respostas práticas.').count() }))
  await page.close()
}
await browser.close()
