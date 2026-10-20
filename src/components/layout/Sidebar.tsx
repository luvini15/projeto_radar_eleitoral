import { NavLink, useNavigate } from 'react-router-dom'
import { CalendarClock, FileStack, House, Layers3, LogOut, MapPinned, Settings, Sparkles, Users } from 'lucide-react'
import { useAuth } from '@/lib/authContext'
import { DataSightLogo } from '@/components/brand/DataSightLogo'
import { Sidebar as AnimatedSidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, SidebarSeparator, useSidebar } from '@/components/animate-ui/components/radix/sidebar'

const navItems = [
  { to: '/painel', label: 'Início', icon: House, end: true },
  { to: '/ia', label: 'IA Data Sight', icon: Sparkles, end: true },
  { to: '/conteudos', label: 'Conteúdos', icon: FileStack },
  { to: '/temas-formatos', label: 'Temas e formatos', icon: Layers3 },
  { to: '/dias-horarios', label: 'Dias e horários', icon: CalendarClock },
  { to: '/audiencia', label: 'Audiência', icon: Users },
  { to: '/territorios', label: 'Territórios', icon: MapPinned },
  { to: '/insights', label: 'Inteligência', icon: Sparkles },
]

export function Sidebar() {
  const { user, signOut } = useAuth()
  const { setMobileOpen } = useSidebar()
  const navigate = useNavigate()
  async function leave() { await signOut(); setMobileOpen(false); navigate('/login', { replace: true }) }
  return <AnimatedSidebar>
    <SidebarHeader className="flex h-[72px] items-center border-b border-white/10 px-4">
      <button type="button" onClick={() => navigate('/painel')} className="flex min-w-0 items-center gap-3 text-left"><DataSightLogo showText={false} markClassName="h-8 w-8 shrink-0" /><span className="min-w-0 group-data-[state=collapsed]/sidebar:hidden"><strong className="block truncate text-sm font-semibold text-white">Data Sight</strong><small className="mt-1 block truncate font-mono text-[8px] uppercase tracking-[.2em] text-[#ff6a2b]">inteligência de rede</small></span></button>
    </SidebarHeader>
    <SidebarContent><SidebarGroup><SidebarGroupLabel>Hub</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>{navItems.map(({ to, label, icon: Icon, end }) => <SidebarMenuItem key={to}><NavLink to={to} end={end} onClick={() => setMobileOpen(false)}>{({ isActive }) => <SidebarMenuButton asChild isActive={isActive}><span><Icon /><span>{label}</span></span></SidebarMenuButton>}</NavLink></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent>
    <SidebarSeparator />
    <SidebarFooter className="p-3">
      <div className="mb-3 flex items-center gap-3 px-3 group-data-[state=collapsed]/sidebar:justify-center group-data-[state=collapsed]/sidebar:px-0"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[10px] font-bold text-black">{user?.nome?.slice(0, 2).toUpperCase() || 'DS'}</span><span className="min-w-0 group-data-[state=collapsed]/sidebar:hidden"><strong className="block truncate text-xs font-medium text-white">{user?.nome}</strong><small className="block truncate text-[10px] text-white/35">{user?.email}</small></span></div>
      <SidebarMenu><SidebarMenuItem><NavLink to="/configuracoes">{({ isActive }) => <SidebarMenuButton asChild isActive={isActive}><span><Settings /><span>Configurações</span></span></SidebarMenuButton>}</NavLink></SidebarMenuItem><SidebarMenuItem><SidebarMenuButton onClick={() => void leave()}><LogOut /><span>Sair</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
    </SidebarFooter><SidebarRail />
  </AnimatedSidebar>
}
