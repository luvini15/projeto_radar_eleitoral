import { chromium, expect } from '@playwright/test'

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => sessionStorage.setItem(
    'data-sight:session-simulada',
    JSON.stringify({ nome: 'Teste' }),
  ))
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/thumbnail')) return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#333"/></svg>' })
    if (url.pathname.endsWith('/analysis')) {
      if (route.request().method() !== 'POST') throw new Error('A análise deve usar POST')
      return route.fulfill({
        json: {
          text: 'Visão geral\nO post possui dados observados.\n\nEvolução\nHá mais de uma coleta.\n\nComentários\nA amostra menciona saúde.\n\nLimitações\nA amostra não representa todo o público.',
          model: 'openrouter/free',
          created_at: '2026-09-13T12:00:00Z',
          cached: false,
          evidence: { comments: { sample_size: 2 } },
        },
      })
    }
    url.port = '8001'
    return route.fulfill({ response: await route.fetch({ url: url.toString() }) })
  })

  await page.goto('http://localhost:5173/conteudos/2')
  await expect(page.getByRole('heading', { name: 'Leitura do post' })).toBeVisible()
  await expect(page.getByText('A amostra menciona saúde.')).toBeVisible()
  await expect(page.getByText('Baseado em 2 comentário(s) coletado(s).', { exact: false })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Comentários coletados' })).toBeVisible()
  await expect(page.getByText('2 texto(s) disponíveis na amostra', { exact: false })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Evolução de Comentários nos últimos 30 dias' })).toBeVisible()
  await expect(page.getByText('Variação entre coletas:', { exact: false })).toContainText('+1')

  await page.getByLabel('Período da evolução').selectOption('7')
  await expect(page.getByRole('img', { name: 'Evolução de Comentários nos últimos 7 dias' })).toBeVisible()
  await expect(page.getByText('Só existe uma coleta com esta métrica', { exact: false })).toBeVisible()
  await page.getByLabel('Métrica da evolução').selectOption('views_count')
  await expect(page.getByRole('img', { name: 'Evolução de Visualizações nos últimos 7 dias' })).toBeVisible()

  if (errors.length) throw new Error(errors.join('\n'))
  console.log('OK: análise por IA, amostra de comentários, linha evolutiva e filtros de período/métrica.')
} finally {
  await browser.close()
}
