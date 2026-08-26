import * as React from 'react'
import { CalendarDays, Clock3, MessageCircle, PlayCircle } from 'lucide-react'
import { getTimePerformance } from '@/services/api'
import type { TimePerformanceResponse } from '@/types/api'
import { PageLoader } from '@/components/dashboard/PageLoader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { formatNumber } from '@/utils/metrics'

const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const hours = [0,3,6,9,12,15,18,21]
export default function Schedule() {
  const [data, setData] = React.useState<TimePerformanceResponse | null>(null)
  const load = React.useCallback(() => getTimePerformance().then(setData), [])
  React.useEffect(() => { load() }, [load])
  React.useEffect(() => { const h = () => load(); window.addEventListener('radar:data-updated', h); return () => window.removeEventListener('radar:data-updated', h) }, [load])
  if (!data) return <PageLoader />
  const max = Math.max(1, ...data.cells.map(c => c.avg_observed_interactions ?? 0))
  const lookup = new Map(data.cells.map(c => [`${c.weekday_index}-${c.hour}`, c]))
  const best = data.best_observed_interactions

  return <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-4"><MetricCard label="Melhor faixa observada" value={best ? `${best.weekday}, ${best.hour_label}` : 'N/D'} deltaLabel="Por interações observadas médias" icon={Clock3}/><MetricCard label="Interações médias" value={best?.avg_observed_interactions != null ? formatNumber(Math.round(best.avg_observed_interactions)) : 'N/D'} deltaLabel="Na melhor faixa" icon={CalendarDays}/><MetricCard label="Melhor p/ comentários" value={data.best_comments ? `${data.best_comments.weekday}, ${data.best_comments.hour_label}` : 'N/D'} deltaLabel="Média de comentários" icon={MessageCircle}/><MetricCard label="Melhor p/ plays" value={data.best_plays ? `${data.best_plays.weekday}, ${data.best_plays.hour_label}` : 'N/D'} deltaLabel="Apenas vídeos com métrica" icon={PlayCircle}/></div>
    <Card><CardHeader><CardTitle>Desempenho observado por dia e horário</CardTitle><CardDescription>Faixas de 3 horas no fuso de Brasília. Quanto mais escuro, maior a média de interações observadas nos posts existentes.</CardDescription></CardHeader><CardContent className="overflow-x-auto"><div className="min-w-[850px]"><div className="grid grid-cols-8 gap-1 text-center text-xs text-slate"><div />{days.map(d => <div key={d} className="py-2 font-medium">{d}</div>)}{hours.map(hour => <React.Fragment key={hour}><div className="flex items-center justify-end pr-2">{String(hour).padStart(2,'0')}h</div>{days.map((_, di) => { const c=lookup.get(`${di}-${hour}`); const value=c?.avg_observed_interactions ?? 0; const opacity=c ? 0.16 + (value/max)*0.72 : 0.04; return <div key={`${di}-${hour}`} title={c ? `${c.posts} posts · média ${value.toFixed(1)}` : 'Sem posts'} className="rounded-md border border-blue/10 px-2 py-3 font-semibold" style={{backgroundColor:`rgba(37,99,235,${opacity})`, color: opacity>0.5?'white':'#172033'}}>{c ? Math.round(value) : '—'}</div>})}</React.Fragment>)}</div></div></CardContent></Card>
    <div className="rounded-xl border border-border bg-white p-4 text-sm text-slate">Associação histórica, não causal: o horário não garante desempenho futuro e deve ser interpretado junto com tema, formato e contexto.</div>
  </div>
}
