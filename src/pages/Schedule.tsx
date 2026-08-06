import * as React from 'react'
import { instagramService } from '@/services/instagramService'
import type { HeatmapCelula } from '@/types/instagram'
import { EngagementHeatmap } from '@/components/charts/EngagementHeatmap'
import { PageLoader } from '@/components/dashboard/PageLoader'
import { Card } from '@/components/ui/card'
import { CalendarDays, Clock, TrendingDown, Info } from 'lucide-react'

export default function Schedule() {
  const [heatmap, setHeatmap] = React.useState<HeatmapCelula[] | null>(null)

  React.useEffect(() => {
    instagramService.getHeatmap().then(setHeatmap)
  }, [])

  if (!heatmap) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-positive/10 text-positive">
            <CalendarDays className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate">
            Melhor dia histórico
          </p>
          <p className="font-display text-2xl font-bold text-blue-dark">Quinta-feira</p>
        </Card>
        <Card className="p-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue/10 text-blue">
            <Clock className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate">
            Melhor horário histórico
          </p>
          <p className="font-display text-2xl font-bold text-blue-dark">19h</p>
        </Card>
        <Card className="p-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-alert/10 text-alert">
            <TrendingDown className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate">
            Faixa de menor desempenho
          </p>
          <p className="font-display text-xl font-bold text-blue-dark">
            Segunda-feira, 9h–12h
          </p>
        </Card>
      </div>

      <EngagementHeatmap data={heatmap} />

      <Card className="flex items-start gap-3 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate" />
        <p className="text-sm text-slate">
          Os resultados representam associações históricas entre data/hora de publicação e métricas oficiais do conteúdo. O horário não deve ser interpretado isoladamente como causa do desempenho futuro.
        </p>
      </Card>
    </div>
  )
}
