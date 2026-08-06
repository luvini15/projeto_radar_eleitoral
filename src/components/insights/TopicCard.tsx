import { Card } from '@/components/ui/card'
import type { TopicoResumo } from '@/types/instagram'
import { formatCompact, formatPercent } from '@/utils/metrics'
import { cn } from '@/lib/utils'

const icones: Record<string, string> = {
  Mobilidade: '🚌',
  Segurança: '🛡️',
  Saúde: '🏥',
  Educação: '🎓',
  Infraestrutura: '🏗️',
  Emprego: '💼',
  Fiscalização: '🔍',
  'Ações comunitárias': '🤝',
  Institucional: '🏛️',
  Bastidores: '🎬',
}

export function TopicCard({ topico }: { topico: TopicoResumo }) {
  const positivo = topico.variacaoPercentual >= 0
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-lg leading-none">{icones[topico.tema] ?? '📌'}</span>
        <span
          className={cn(
            'text-xs font-semibold',
            positivo ? 'text-positive' : 'text-alert'
          )}
        >
          {formatPercent(topico.variacaoPercentual)}
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold text-blue-dark">{topico.tema}</p>
      <p className="text-[11px] text-slate">{topico.quantidadeConteudos} conteúdos no período</p>

      <div className="mt-3 space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate">Alcance médio</span>
          <span className="font-medium text-blue-dark">{formatCompact(topico.alcanceMedio)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate">Engajamento médio</span>
          <span className="font-medium text-blue-dark">{topico.engajamentoMedio}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate">Compart. médios</span>
          <span className="font-medium text-blue-dark">{formatCompact(topico.compartilhamentosMedios)}</span>
        </div>
      </div>
    </Card>
  )
}
