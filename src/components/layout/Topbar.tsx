import { Menu, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import type { PeriodoFiltro } from '@/types/instagram'

interface TopbarProps {
  title: string
  subtitle: string
  periodo: PeriodoFiltro
  onPeriodoChange: (p: PeriodoFiltro) => void
  onOpenMobileMenu: () => void
}

export function Topbar({ title, subtitle, periodo, onPeriodoChange, onOpenMobileMenu }: TopbarProps) {
  const { show } = useToast()

  return (
    <div className="border-b border-border bg-white/90 backdrop-blur px-4 py-4 md:px-8 md:py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden mt-1 rounded-md border border-border p-1.5 text-slate"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-blue-dark">
              {title}
            </h1>
            <p className="mt-0.5 text-sm text-slate">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={periodo} onChange={(e) => onPeriodoChange(e.target.value as PeriodoFiltro)}>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="custom">Período personalizado</option>
          </Select>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => show('Dados demonstrativos atualizados.')}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar dados
          </Button>
        </div>
      </div>
    </div>
  )
}
