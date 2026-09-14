import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  CalendarClock,
  FileStack,
  Layers3,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/authContext'
import { DataSightLogo } from '@/components/brand/DataSightLogo'

const navItems = [
  { to: '/', label: 'Visao geral', icon: BarChart3, end: true },
  { to: '/conteudos', label: 'Conteudos', icon: FileStack },
  { to: '/temas-formatos', label: 'Temas e formatos', icon: Layers3 },
  { to: '/dias-horarios', label: 'Dias e horarios', icon: CalendarClock },
  { to: '/audiencia', label: 'Audiencia', icon: Users },
  { to: '/insights', label: 'Inteligencia', icon: Sparkles },
]

interface SidebarProps {
  desktopOpen: boolean
  onCloseDesktop: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ desktopOpen, onCloseDesktop, mobileOpen, onCloseMobile }: SidebarProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  function handleSignOut() {
    signOut()
    onCloseMobile()
    navigate('/login', { replace: true })
  }

  const content = (
    <div className="flex h-full min-h-0 flex-col bg-bg/86 text-ink backdrop-blur-xl">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3">
        <button
          type="button"
          className="flex min-w-0 items-center rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/8"
          onClick={() => navigate('/')}
        >
          <DataSightLogo markClassName="h-8 w-8" />
        </button>

        <button type="button" onClick={onCloseDesktop} className="hidden rounded-md p-1.5 text-slate hover:bg-white/8 md:block" aria-label="Recolher sidebar"><X className="h-4 w-4" /></button>
        <button
          onClick={onCloseMobile}
          className="rounded-md p-1.5 text-slate transition-colors hover:bg-white/8 hover:text-ink md:hidden"
          aria-label="Fechar menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="shrink-0 px-3 py-3">
        <div className="rounded-xl border border-border bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-ink">
              CB
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{user?.nome ?? 'Claudio Borcem'}</p>
              <p className="truncate text-xs text-slate">{user?.email ?? 'perfil monitorado'}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue/20 bg-blue/10 px-2.5 py-2 text-xs text-blue">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Acesso restrito da campanha</span>
          </div>
        </div>
      </div>

      <div className="dashed-line-x mx-3 shrink-0" />

      <nav className="thin-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              cn(
                'group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/10 text-ink'
                  : 'text-slate hover:bg-white/8 hover:text-ink'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <NavLink
          to="/configuracoes"
          onClick={onCloseMobile}
          className={({ isActive }) =>
            cn(
              'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-white/10 text-ink' : 'text-slate hover:bg-white/8 hover:text-ink'
            )
          }
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span className="truncate">Configuracoes</span>
        </NavLink>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-1 flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-slate transition-colors hover:bg-white/8 hover:text-ink"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="truncate">Sair</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {desktopOpen ? <aside id="desktop-sidebar" className="sticky top-0 hidden h-screen shrink-0 border-r border-border md:flex md:w-72 md:flex-col">
        {content}
      </aside> : null}

      {mobileOpen ? <div
        className={cn(
          'fixed inset-0 z-50 transition-opacity md:hidden',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <div className="absolute inset-0 bg-black/65" onClick={onCloseMobile} />
        <div
          className={cn(
            'absolute inset-y-0 left-0 w-80 max-w-[88%] transition-transform duration-200',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {content}
        </div>
      </div> : null}
    </>
  )
}
