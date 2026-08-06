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
    Promise.all([instagramService.getTopics(), instagramService.getFormats()]).then(
      ([t, f]) => {
        setTopicos(t)
        setFormatos(f)
      }
    )
  }, [])

  if (!topicos) return <PageLoader />

  return (
    <div className="space-y-6">
      <Card className="flex items-start gap-3 border-blue/20 bg-blue/5 p-4">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
        <p className="text-sm text-blue-dark">
          A API da Meta entrega mídia, legenda, formato e métricas. O campo <strong>tema</strong> é uma camada do Radar: classificação por IA a partir da legenda, com possibilidade de revisão manual.
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

      <Card className="flex items-start gap-3 border-blue/20 bg-blue/5 p-4">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
        <p className="text-sm text-blue-dark">
          Análise do Radar: formatos são comparados a partir das métricas oficiais de mídia disponíveis para cada tipo de conteúdo.
        </p>
      </Card>
    </div>
  )
}
