import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, AlertTriangle, Lightbulb, FileText } from 'lucide-react'

export function ExecutiveSummaryCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue" />
          <CardTitle>Análise do Radar</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-slate">
          Com base nas métricas oficiais da conta autorizada, o Radar identificou crescimento consistente no período. Reels relacionados a mobilidade urbana e fiscalização ficaram acima da mediana do perfil. A classificação por tema é uma camada do Radar, feita a partir da legenda e passível de revisão manual.
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
    label: 'Análise do Radar',
    icon: TrendingUp,
    color: 'text-positive',
    bg: 'bg-positive/10',
  },
  atencao: {
    label: 'Alerta baseado em métrica',
    icon: AlertTriangle,
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  recomendacao: {
    label: 'Recomendação estratégica',
    icon: Lightbulb,
    color: 'text-blue',
    bg: 'bg-blue/10',
  },
} as const

export function HighlightCard({ kind, text }: HighlightCardProps) {
  const { label, icon: Icon, color, bg } = kindConfig[kind]
  return (
    <Card className="p-5">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg} ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate">{label}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-blue-dark">{text}</p>
    </Card>
  )
}
