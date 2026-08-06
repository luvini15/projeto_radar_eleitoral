import * as React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { StrategicInsight } from '@/types/instagram'
import { Check } from 'lucide-react'

const prioridadeVariant: Record<string, any> = {
  Alta: 'alert',
  Média: 'warning',
  Baixa: 'neutral',
}

const statusVariant: Record<string, any> = {
  Novo: 'blue',
  'Em análise': 'warning',
  Aplicado: 'positive',
  Descartado: 'neutral',
}

interface StrategicInsightCardProps {
  insight: StrategicInsight
  onMarkApplied: (id: string) => void
}

export function StrategicInsightCard({ insight, onMarkApplied }: StrategicInsightCardProps) {
  const [status, setStatus] = React.useState(insight.status)

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={prioridadeVariant[insight.prioridade]}>Prioridade {insight.prioridade}</Badge>
        <Badge variant={statusVariant[status]}>{status}</Badge>
      </div>
      <p className="mt-2.5 text-sm leading-relaxed text-blue-dark">{insight.texto}</p>
      {status !== 'Aplicado' && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => {
            setStatus('Aplicado')
            onMarkApplied(insight.id)
          }}
        >
          <Check className="h-3.5 w-3.5" />
          Marcar como aplicado
        </Button>
      )}
    </Card>
  )
}
