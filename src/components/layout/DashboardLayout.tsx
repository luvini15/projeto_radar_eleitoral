import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useCampaign } from '@/lib/campaignContext'
import { SidebarInset, SidebarProvider } from '@/components/animate-ui/components/radix/sidebar'

const titles: Record<string, string> = { '/painel': 'Hub de inteligência', '/conteudos': 'Conteúdos publicados', '/temas-formatos': 'Temas e formatos', '/dias-horarios': 'Dias e horários', '/audiencia': 'Audiência', '/insights': 'Inteligência estratégica', '/configuracoes': 'Configurações' }
export function DashboardLayout() {
  const location = useLocation(); const campaign = useCampaign()
  const title = location.pathname.startsWith('/conteudos/') ? 'Detalhes do conteúdo' : titles[location.pathname] ?? titles['/painel']
  return <SidebarProvider className="dashboard-shell bg-black text-white"><Sidebar /><SidebarInset className="flex min-h-svh flex-col bg-black"><Topbar title={title} /><main className="relative flex-1"><div className="page-enter mx-auto w-full"><Outlet key={campaign.selected} /></div></main></SidebarInset></SidebarProvider>
}
