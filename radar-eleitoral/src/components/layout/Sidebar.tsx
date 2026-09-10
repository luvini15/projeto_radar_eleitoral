import { NavLink } from 'react-router-dom'
import {
  LayoutGrid,
  FileStack,
  Layers3,
  CalendarClock,
  Users,
  Swords,
  Sparkles,
  TrendingUp,
  FileText,
  Activity,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/authContext'

const navItems = [
  { to: '/coletas', label: 'Coletas', icon: Activity },
  { to: '/tendencias', label: 'Tendências', icon: TrendingUp },
  { to: '/relatorios', label: 'Relatórios', icon: FileText },
  { to: '/', label: 'Visão Geral', icon: LayoutGrid, end: true },
  { to: '/conteudos', label: 'Conteúdos', icon: FileStack },
  { to: '/concorrentes', label: 'Concorrentes', icon: Swords },
  { to: '/temas-formatos', label: 'Temas e Formatos', icon: Layers3 },
  { to: '/dias-horarios', label: 'Desempenho por Horário', icon: CalendarClock },
  { to: '/audiencia', label: 'Audiência', icon: Users },
  { to: '/insights', label: 'Inteligência Estratégica', icon: Sparkles },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

interface SidebarProps {
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { user } = useAuth()

  const content = (
    <div className="flex h-full flex-col bg-blue-dark text-white">
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div>
          <p className="font-display text-2xl font-bold leading-none tracking-tight">Radar Eleitoral</p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/50">
            Instagram Intelligence
          </p>
        </div>
        <button onClick={onCloseMobile} className="md:hidden text-white/60 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-5 mb-5 flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1.5">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-warning" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-warning">
          Ambiente confidencial
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 thin-scrollbar overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue text-white shadow-sm'
                  : 'text-white/65 hover:bg-white/5 hover:text-white'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mx-3 mb-4 mt-2 flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue font-display text-sm font-bold text-white">
          CB
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user?.nome ?? 'Cláudio Borcem'}</p>
          <p className="truncate text-[11px] text-white/50">Deputado Distrital — DF</p>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col">{content}</aside>

      {/* Mobile */}
      <div
        className={cn(
          'fixed inset-0 z-50 md:hidden transition-opacity',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <div className="absolute inset-0 bg-black/40" onClick={onCloseMobile} />
        <div
          className={cn(
            'absolute inset-y-0 left-0 w-72 max-w-[85%] transition-transform duration-200',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {content}
        </div>
      </div>
    </>
  )
}
