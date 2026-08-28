import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, TrendingUp, AlertCircle, Clock } from 'lucide-react'
import type { AlertaItem } from '@/types/instagram'
import { cn } from '@/lib/utils'

const iconByTipo = {
  positivo: TrendingUp,
  atencao: AlertCircle,
  neutro: Clock,
}

const colorByTipo = {
  positivo: 'text-positive bg-positive/10',
  atencao: 'text-warning bg-warning/10',
  neutro: 'text-blue bg-blue/10',
}

export function AlertList({ alertas }: { alertas: AlertaItem[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-ballot" />
          <CardTitle>Alertas da propria conta</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {alertas.map((alerta) => {
            const Icon = iconByTipo[alerta.tipo]
            return (
              <li key={alerta.id} className="flex items-start gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
                <div
                  className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                    colorByTipo[alerta.tipo]
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm leading-6 text-ink">{alerta.texto}</span>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
