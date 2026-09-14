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
    title: 'Inteligencia estrategica',
  },
  '/configuracoes': {
    title: 'Configuracoes',
  },
}

export function DashboardLayout() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const campaign = useCampaign()

  const meta = pageMeta[location.pathname] ?? pageMeta['/']

  return (
    <div className="intel-grid-bg flex min-h-screen bg-bg text-ink">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <ConfidentialBanner />
        <Topbar
          title={meta.title}


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
