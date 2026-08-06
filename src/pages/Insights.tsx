import * as React from 'react'
import { instagramService } from '@/services/instagramService'
import type { StrategicInsight, CategoriaInsight } from '@/types/instagram'
import { StrategicInsightCard } from '@/components/insights/StrategicInsightCard'
import { ExecutiveSummaryCard } from '@/components/dashboard/ExecutiveSummary'
import { PageLoader } from '@/components/dashboard/PageLoader'

const secoes: CategoriaInsight[] = [
  'O que funcionou',
  'O que não funcionou',
  'Oportunidade',
  'Ponto de atenção',
  'Recomendação',
  'Teste sugerido',
]

export default function Insights() {
  const [insights, setInsights] = React.useState<StrategicInsight[] | null>(null)

  React.useEffect(() => {
    instagramService.getStrategicInsights().then(setInsights)
  }, [])

  if (!insights) return <PageLoader />

  function handleMarkApplied(id: string) {
    setInsights((prev) =>
      prev ? prev.map((i) => (i.id === id ? { ...i, status: 'Aplicado' } : i)) : prev
    )
  }

  return (
    <div className="space-y-8">
      <ExecutiveSummaryCard />

      {secoes.map((secao) => {
        const items = insights.filter((i) => i.categoria === secao)
        if (items.length === 0) return null
        return (
          <section key={secao}>
            <h2 className="mb-3 font-display text-xl font-bold tracking-tight text-blue-dark">
              {secao}
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {items.map((item) => (
                <StrategicInsightCard key={item.id} insight={item} onMarkApplied={handleMarkApplied} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
