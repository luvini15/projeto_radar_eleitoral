import { Menu, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import type { PeriodoFiltro } from '@/types/instagram'

interface TopbarProps {
  title: string
  periodo: PeriodoFiltro
  onPeriodoChange: (p: PeriodoFiltro) => void
  onOpenMobileMenu: () => void
}

export function Topbar({ title, periodo, onPeriodoChange, onOpenMobileMenu }: TopbarProps) {
  const { show } = useToast()

  return (
    <div className="border-b border-border bg-bg/55 px-4 py-4 backdrop-blur-md md:px-7 md:py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="mt-1 rounded-md border border-border bg-paper p-1.5 text-slate md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold leading-tight text-ink md:text-3xl">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={periodo} onChange={(e) => onPeriodoChange(e.target.value as PeriodoFiltro)}>
            <option value="7d">Ultimos 7 dias</option>
            <option value="30d">Ultimos 30 dias</option>
            <option value="90d">Ultimos 90 dias</option>
            <option value="custom">Periodo personalizado</option>
          </Select>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => show('Dados atualizados.')}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar
          </Button>
        </div>
      </div>
    </div>
  )
}
