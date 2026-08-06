import * as React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ConfidentialBanner } from './ConfidentialBanner'
import { Footer } from './Footer'
import type { PeriodoFiltro } from '@/types/instagram'

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Central de Inteligência do Instagram',
    subtitle: 'Acompanhamento estratégico da comunicação digital da campanha.',
  },
  '/conteudos': {
    title: 'Conteúdos',
    subtitle: 'Todas as publicações do período, com desempenho e classificação.',
  },
  '/temas-formatos': {
    title: 'Temas e Formatos',
    subtitle: 'Temas classificados pelo Radar a partir da legenda e formatos alimentados pela API oficial.',
  },
  '/dias-horarios': {
    title: 'Desempenho por Dia e Horário',
    subtitle: 'Padrões históricos calculados a partir do horário das publicações e suas métricas oficiais.',
  },
  '/audiencia': {
    title: 'Audiência',
    subtitle: 'Dados agregados de audiência quando disponibilizados pela Meta e elegíveis por volume mínimo.',
  },
  '/insights': {
    title: 'Inteligência Estratégica',
    subtitle: 'Separação clara entre dado oficial da Meta, análise do Radar e recomendação estratégica.',
  },
  '/configuracoes': {
    title: 'Configurações',
    subtitle: 'Campanha, integração de dados e usuários autorizados.',
  },
}

export function DashboardLayout() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [periodo, setPeriodo] = React.useState<PeriodoFiltro>('30d')

  const meta = pageMeta[location.pathname] ?? pageMeta['/']

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col">
        <ConfidentialBanner />
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          periodo={periodo}
          onPeriodoChange={setPeriodo}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet context={{ periodo } satisfies { periodo: PeriodoFiltro }} />
        </main>
        <Footer />
      </div>
    </div>
  )
}
