import * as React from 'react'
import { instagramService } from '@/services/instagramService'
import type { TopicoResumo, FormatoResumo } from '@/types/instagram'
import { TopicCard } from '@/components/insights/TopicCard'
import { FormatComparison } from '@/components/insights/FormatComparison'
import { EngagementByTopicChart } from '@/components/charts/EngagementByTopicChart'
import { TopicOpportunityScatter } from '@/components/charts/TopicOpportunityScatter'
import { PageLoader } from '@/components/dashboard/PageLoader'
import { Card } from '@/components/ui/card'
import { Lightbulb } from 'lucide-react'

export default function Topics() {
  const [topicos, setTopicos] = React.useState<TopicoResumo[] | null>(null)
  const [formatos, setFormatos] = React.useState<FormatoResumo[]>([])

  React.useEffect(() => {
    Promise.all([instagramService.getTopics(), instagramService.getFormats()]).then(([t, f]) => {
      setTopicos(t)
      setFormatos(f)
    })
  }, [])

  if (!topicos) return <PageLoader />

  return (
    <div className="space-y-6">
      <Card className="flex items-start gap-3 border-blue/20 bg-blue/10 p-4">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
        <p className="text-sm leading-6 text-ink">
          A API da Meta entrega midia, legenda, formato e metricas. O campo <strong>tema</strong> e uma camada do Radar: classificacao por IA a partir da legenda, com revisao manual.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {topicos.map((t) => (
          <TopicCard key={t.tema} topico={t} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EngagementByTopicChart data={topicos} />
        <TopicOpportunityScatter data={topicos} />
      </div>

      <FormatComparison data={formatos} />

      <Card className="flex items-start gap-3 border-blue/20 bg-blue/10 p-4">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
        <p className="text-sm leading-6 text-ink">
          Analise do Radar: formatos sao comparados a partir das metricas oficiais de midia disponiveis para cada tipo de conteudo.
        </p>
      </Card>
    </div>
  )
}
