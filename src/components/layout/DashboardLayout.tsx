import * as React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ConfidentialBanner } from './ConfidentialBanner'
import { Footer } from './Footer'
import { useCampaign } from '@/lib/campaignContext'

const pageMeta: Record<string, { title: string }> = {
  '/': {
    title: 'Sala de situacao digital',
  },
  '/conteudos': {
    title: 'Conteudos publicados',
  },
  '/temas-formatos': {
    title: 'Temas e formatos',
  },
  '/dias-horarios': {
    title: 'Dias e horarios',
  },
  '/audiencia': {
    title: 'Audiencia',
  },
  '/insights': {
    title: 'Inteligência territorial',
  },
  '/analise-estrategica': { title: 'Análise estratégica' },
  '/tendencias': { title: 'Tendências' },
  '/concorrentes': { title: 'Concorrentes' },
  '/relatorios': { title: 'Relatórios' },
  '/coletas': { title: 'Coletas' },
  '/configuracoes': {
    title: 'Configuracoes',
  },
}

export function DashboardLayout() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const campaign = useCampaign()
  const [desktopOpen, setDesktopOpen] = React.useState(() => {
    try { return localStorage.getItem('radar:sidebar:v1') !== 'closed' } catch { return true }
  })
  function toggleDesktop() {
    setDesktopOpen(open => {
      try { localStorage.setItem('radar:sidebar:v1', open ? 'closed' : 'open') } catch { /* Works without storage. */ }
      return !open
    })
  }
  React.useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])

  const meta = location.pathname.startsWith('/conteudos/') ? {title: 'Detalhes do conteúdo'} : pageMeta[location.pathname] ?? pageMeta['/']

  return (
    <div className="intel-grid-bg flex min-h-screen bg-bg text-ink">
      <Sidebar desktopOpen={desktopOpen} onCloseDesktop={toggleDesktop} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <ConfidentialBanner />
        <Topbar
          title={meta.title}
          desktopOpen={desktopOpen}
          onToggleDesktop={toggleDesktop}


          onOpenMobileMenu={() => setMobileOpen(true)}
        />
        <main className="flex-1 px-4 py-5 md:px-7 md:py-7">
          <Outlet key={campaign.selected} />
        </main>
        <Footer />
      </div>
    </div>
  )
}
