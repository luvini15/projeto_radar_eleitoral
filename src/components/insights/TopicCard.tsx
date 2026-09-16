import { Hash } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { TopicoResumo } from '@/types/instagram'
import { formatCompact, formatPercent } from '@/utils/metrics'
import { cn } from '@/lib/utils'

export function TopicCard({ topico }: { topico: TopicoResumo }) {
  const positivo = topico.variacaoPercentual >= 0

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white/5 text-blue">
          <Hash className="h-4 w-4" />
        </div>
        <span className={cn('text-xs font-semibold', positivo ? 'text-positive' : 'text-alert')}>
          {formatPercent(topico.variacaoPercentual)}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold text-ink">{topico.tema}</p>
      <p className="text-[11px] text-slate">{topico.quantidadeConteudos} conteudos no periodo</p>

      <div className="mt-4 space-y-2 border-t border-border pt-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate">Alcance medio</span>
          <span className="font-medium text-ink">{formatCompact(topico.alcanceMedio)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate">Engajamento medio</span>
          <span className="font-medium text-ink">{topico.engajamentoMedio}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate">Compart. medios</span>
          <span className="font-medium text-ink">{formatCompact(topico.compartilhamentosMedios)}</span>
        </div>
      </div>
    </Card>
  )
}
