import { chromium, expect } from '@playwright/test'

const base = process.env.UI_BASE_URL || 'http://localhost:5173'
const browser = await chromium.launch()
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}})
  page.setDefaultTimeout(15000)
  const errors = []
  const requests = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => sessionStorage.setItem('data-sight:session-simulada', JSON.stringify({nome: 'Teste'})))
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    requests.push(url.pathname + url.search)
    url.hostname = '127.0.0.1'
    url.port = process.env.UI_FIXTURE_PORT || '8001'
    await route.fulfill({response: await route.fetch({url: url.toString()})})
  })
  await page.goto(base + '/concorrentes')
  await page.getByLabel('Campanha do painel').selectOption('3')
  await expect(page.getByText('Comparação detalhada', {exact: true})).toBeVisible()
  await expect(page.getByText('Evolução de seguidores', {exact: true})).toBeVisible()
  await page.getByLabel('Tema', {exact: true}).selectOption('Saúde')
  await expect.poll(() => requests.some(path => path.includes('/3/analytics?') && new URL('http://test'+path).searchParams.get('theme') === 'Saúde')).toBe(true)
  await page.getByLabel('Campanha do painel').selectOption('2')
  await expect(page.getByText('SEM DADOS', {exact: true})).toBeVisible()
  await expect.poll(() => requests.some(path => path.includes('/2/analytics?'))).toBe(true)
  await page.getByLabel('Campanha do painel').selectOption('3')
  await expect(page.getByText('Comparação detalhada', {exact: true})).toBeVisible()
  await page.getByRole('link', {name: 'Tendências', exact: true}).click()
  await expect(page.getByText('Volume de publicações por tema', {exact: true})).toBeVisible()
  await page.getByRole('link', {name: 'Inteligência territorial', exact: true}).click()
  await expect(page.getByRole('heading', {name: 'Alertas', exact: true})).toBeVisible()
  await page.getByRole('link', {name: 'Coletas', exact: true}).click()
  await expect(page.getByText('Histórico das coletas', {exact: true})).toBeVisible()
  await page.getByLabel('Campanha do painel').selectOption('2')
  await expect.poll(() => requests.some(path => path.includes('/2/collections'))).toBe(true)
  await page.getByRole('link', {name: 'Relatórios', exact: true}).click()
  await expect(page.getByText('Gerador de relatório executivo', {exact: true})).toBeVisible()
  const generated = page.waitForResponse(r => r.url().includes('/2/reports') && r.request().method() === 'POST')
  await page.getByRole('button', {name: 'Gerar HTML / PDF'}).click()
  expect((await generated).status()).toBe(200)
  for (const path of ['/concorrentes', '/tendencias', '/insights', '/coletas', '/relatorios']) {
    await page.setViewportSize({width: 390, height: 844})
    await page.goto(base + path)
    await expect(page.getByLabel('Campanha do painel')).toHaveValue('2')
    await expect(page.getByRole('heading', {level: 1})).toBeVisible()
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('Mobile overflow: ' + path)
  }
  expect(errors).toEqual([])
  console.log('OK: telas integradas, filtros, seguidores, troca de campanha, relatórios e mobile.')
  await page.unrouteAll({behavior: 'ignoreErrors'})
} finally {
  await browser.close()
}
