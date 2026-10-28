import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useCampaign } from '@/lib/campaignContext'
import { SidebarInset, SidebarProvider } from '@/components/animate-ui/components/radix/sidebar'

const titles: Record<string, string> = { '/visao-geral': 'Visão Geral', '/concorrentes': 'Comparação entre chapas', '/tendencias': 'Tendências', '/relatorios/novo': 'Criar relatório', '/relatorios': 'Relatórios', '/coletas': 'Coletas', '/inteligencia': 'Inteligência', '/inteligencia-territorial': 'Inteligência', '/painel': 'Hub de inteligência', '/ia': 'Data Sight IA', '/conteudos': 'Conteúdos publicados', '/temas-formatos': 'Temas e formatos', '/dias-horarios': 'Dias e horários', '/audiencia': 'Audiência', '/insights': 'Inteligência estratégica', '/configuracoes': 'Configurações' }
export function DashboardLayout() {
  const location = useLocation(); const campaign = useCampaign()
  const title = location.pathname.startsWith('/conteudos/') ? 'Detalhes do conteúdo' : titles[location.pathname] ?? titles['/painel']
  return <SidebarProvider className="dashboard-shell bg-black text-white"><Sidebar /><SidebarInset className="flex min-h-svh flex-col bg-black"><Topbar title={title} /><main className="relative flex-1"><div className="page-enter mx-auto w-full"><Outlet key={campaign.scopeKey} /></div></main></SidebarInset></SidebarProvider>
}
