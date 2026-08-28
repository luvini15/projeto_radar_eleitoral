import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, AlertTriangle, Lightbulb, FileText } from 'lucide-react'

export function ExecutiveSummaryCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-ballot" />
          <CardTitle>Analise do Radar</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-7 text-slate">
          Com base nas metricas oficiais da conta autorizada, o Radar identificou crescimento consistente no periodo. Reels relacionados a mobilidade urbana e fiscalizacao ficaram acima da mediana do perfil. A classificacao por tema e uma camada do Radar, feita a partir da legenda e passivel de revisao manual.
        </p>
      </CardContent>
    </Card>
  )
}

interface HighlightCardProps {
  kind: 'oportunidade' | 'atencao' | 'recomendacao'
  text: string
}

const kindConfig = {
  oportunidade: {
    label: 'Analise do Radar',
    icon: TrendingUp,
    color: 'text-positive',
    bg: 'bg-positive/10',
  },
  atencao: {
    label: 'Alerta baseado em metrica',
    icon: AlertTriangle,
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  recomendacao: {
    label: 'Recomendacao estrategica',
    icon: Lightbulb,
    color: 'text-ballot',
    bg: 'bg-ballot/10',
  },
} as const

export function HighlightCard({ kind, text }: HighlightCardProps) {
  const { label, icon: Icon, color, bg } = kindConfig[kind]
  return (
    <Card className="p-5">
      <div className={`flex h-8 w-8 items-center justify-center rounded-md ${bg} ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-4 font-mono text-[10px] uppercase text-slate">{label}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-ink">{text}</p>
    </Card>
  )
}
