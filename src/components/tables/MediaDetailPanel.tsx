import * as React from 'react'
import { Sheet } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { MediaItem, MediaInsight } from '@/types/instagram'
import { instagramService } from '@/services/instagramService'
import { classificacaoBadgeVariant, formatNumber } from '@/utils/metrics'
import { Lightbulb } from 'lucide-react'

interface MediaDetailPanelProps {
  item: MediaItem | null
  onClose: () => void
}

const metricRows = (item: MediaItem) => [
  { label: 'Alcance', value: item.alcance },
  { label: 'Visualizacoes', value: item.visualizacoes },
  { label: 'Curtidas', value: item.curtidas },
  { label: 'Comentarios', value: item.comentarios },
  { label: 'Compartilhamentos', value: item.compartilhamentos },
  { label: 'Salvamentos', value: item.salvamentos },
]

export function MediaDetailPanel({ item, onClose }: MediaDetailPanelProps) {
  const [insight, setInsight] = React.useState<MediaInsight | null>(null)

  React.useEffect(() => {
    if (!item) {
      setInsight(null)
      return
    }
    let active = true
    instagramService.getMediaInsights(item.id).then((res) => {
      if (active) setInsight(res)
    })
    return () => {
      active = false
    }
  }, [item])

  return (
    <Sheet open={!!item} onClose={onClose} title="Detalhe do conteudo">
      {item && (
        <div className="space-y-6">
          <div>
            <div className="h-40 w-full rounded-lg border border-border" style={{ backgroundColor: item.miniaturaCor }} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="blue">{item.formato}</Badge>
              <Badge variant="neutral">{item.tema}</Badge>
              <Badge variant={classificacaoBadgeVariant(item.classificacao) as any}>
                {item.classificacao}
              </Badge>
              <span className="text-xs text-slate">
                {item.data.slice(8, 10)}/{item.data.slice(5, 7)}/{item.data.slice(0, 4)}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink">{item.legenda}</p>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate">
              Metricas
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {metricRows(item).map((row) => (
                <div key={row.label} className="rounded-lg border border-border bg-muted/70 p-3">
                  <p className="text-[11px] text-slate">{row.label}</p>
                  <p className="font-display text-lg font-bold text-ink">
                    {formatNumber(row.value)}
                  </p>
                </div>
              ))}
              <div className="col-span-2 rounded-lg border border-border bg-muted/70 p-3">
                <p className="text-[11px] text-slate">Taxa de engajamento</p>
                <p className="font-display text-lg font-bold text-ink">{item.engajamento}%</p>
              </div>
            </div>
          </div>

          {insight && (
            <>
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate">
                  Comparacao com a mediana do formato
                </h3>
                <div className="rounded-lg border border-border bg-muted/45 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate">Mediana de {item.formato}</span>
                    <span className="font-medium text-ink">
                      {formatNumber(insight.medianaFormatoAlcance)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-slate">Este conteudo</span>
                    <span className="font-medium text-ink">{formatNumber(item.alcance)}</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full bg-blue"
                      style={{ width: `${Math.min(100, insight.razaoVsMediana * 50)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate">
                  Historico de alcance
                </h3>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={insight.historico} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="hora" tick={{ fontSize: 10, fill: '#8B949E' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#8B949E' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#101216',
                        borderRadius: 8,
                        borderColor: 'rgba(255,255,255,0.14)',
                        color: '#F5F7FA',
                        fontSize: 12,
                      }}
                    />
                    <Line type="monotone" dataKey="alcanceAcumulado" stroke="#8EA4FF" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-blue/20 bg-blue/10 p-3">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
                <p className="text-sm leading-6 text-ink">{insight.insight}</p>
              </div>
            </>
          )}
        </div>
      )}
    </Sheet>
  )
}
