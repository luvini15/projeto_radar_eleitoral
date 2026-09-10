import * as React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ConfidentialBanner } from './ConfidentialBanner'
import { Footer } from './Footer'

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  '/coletas': {
    title: 'Saúde das Coletas',
    subtitle: 'Execuções automáticas e manuais, novos posts, snapshots e falhas por período.',
  },
  '/tendencias': {
    title: 'Tendências',
    subtitle: 'O que está acontecendo por região, tema e período, com comparação e evidências.',
  },
  '/relatorios': {
    title: 'Relatórios',
    subtitle: 'Diagnósticos executivos gerados com dados reais, evidências e metodologia.',
  },
  '/': {
    title: 'Central de Inteligência do Instagram',
    subtitle: 'Acompanhamento estratégico da comunicação digital da campanha.',
  },
  '/conteudos': {
    title: 'Conteúdos',
    subtitle: 'Todas as publicações do período, com desempenho e classificação.',
  },
  '/concorrentes': {
    title: 'Concorrentes',
    subtitle: 'Comparação direta entre o perfil do cliente e os perfis monitorados.',
  },
  '/temas-formatos': {
    title: 'Temas e Formatos',
    subtitle: 'Temas classificados pelo Radar a partir das legendas e formatos observados nos posts reais.',
  },
  '/dias-horarios': {
    title: 'Desempenho por Dia e Horário',
    subtitle: 'Padrões observados calculados a partir dos horários e métricas públicas armazenadas.',
  },
  '/audiencia': {
    title: 'Audiência',
    subtitle: 'Seguidores públicos disponíveis agora e indicação clara do que depende da Meta API.',
  },
  '/insights': {
    title: 'Inteligência Estratégica',
    subtitle: 'Observações analíticas calculadas a partir do benchmark e dos rankings reais.',
  },
  '/configuracoes': {
    title: 'Configurações',
    subtitle: 'Campanha, integração de dados e usuários autorizados.',
  },
}

export function DashboardLayout() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const meta = pageMeta[location.pathname] ?? pageMeta['/']

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col">
        <ConfidentialBanner />
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}
