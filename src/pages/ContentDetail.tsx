import * as React from 'react'
import { Link, useParams } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useCampaign, useCampaignData } from '@/lib/campaignContext'
import { DataFrame, DataTable, Panel } from '@/components/dashboard/ApiData'
import { LatestPostCard } from '@/components/dashboard/LatestPostCard'
import { PostAIAnalysis } from '@/components/dashboard/PostAIAnalysis'
import { number, date, apiTimestamp } from '@/utils/apiFormat'
import type { Post } from '@/types/radar'
interface Snapshot {id: number; collected_at: string; likes_count: number|null; comments_count: number|null; views_count: number|null; plays_count: number|null; interactions_count: number|null; shares_count: number|null; saves_count: number|null}
interface Detail {post: Post; history: Snapshot[]; comments: {texts: string[]; collected_at: string|null; is_sample: boolean}}
const metrics = {comments_count:'Comentários',likes_count:'Curtidas',views_count:'Visualizações',plays_count:'Reproduções',interactions_count:'Interações observadas',shares_count:'Compartilhamentos',saves_count:'Salvamentos'} as const
export default function ContentDetail() {
  const {postId} = useParams()
  const {selected} = useCampaign()
  const [days,setDays] = React.useState(30)
  const [metric,setMetric] = React.useState<keyof typeof metrics>('comments_count')
  const {data,error} = useCampaignData<Detail>(`posts/${encodeURIComponent(postId || '')}`, `days=${days}`)
  const series = React.useMemo(() => (data?.history || []).map(row => ({...row,time:apiTimestamp(row.collected_at)})).sort((a,b) => a.time-b.time),[data?.history])
  const available = series.filter(row => row[metric] != null)
  const first = available[0]?.[metric]
  const last = available.at(-1)?.[metric]
  const change = available.length > 1 && first != null && last != null ? last-first : null
  const comments = data?.comments?.texts || []
  return <div className="space-y-5">
    <Link to="/conteudos" className="inline-flex rounded-full border border-border bg-muted px-4 py-2 text-sm hover:bg-white/10">← Voltar aos conteúdos</Link>
    <DataFrame data={data} error={error}>{data ? <>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <LatestPostCard key={data.post.post_id} post={data.post} detail />
        <div className="min-w-0 space-y-4">
          <PostAIAnalysis campaignId={selected} postId={data.post.post_id} version={`${data.post.metrics.collected_at}|${data.comments?.collected_at}`} />
          <Panel title="Sobre a publicação"><dl className="space-y-4 text-sm"><div><dt className="text-slate">Perfil</dt><dd>@{data.post.profile.username}</dd></div><div><dt className="text-slate">Formato</dt><dd>{data.post.content.format}</dd></div><div><dt className="text-slate">Tema identificado por palavras-chave</dt><dd>{data.post.content.theme}</dd></div><div><dt className="text-slate">Publicação</dt><dd>{date(data.post.content.published_at)}</dd></div></dl></Panel>
        </div>
      </div>
      <Panel title="Evolução do post">
        <div className="mb-5 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-2 text-sm">Período da evolução<select aria-label="Período da evolução" className="h-10 rounded-md border border-border bg-muted px-3" value={days} onChange={e=>setDays(Number(e.target.value))}><option value={7}>Última semana</option><option value={30}>Últimos 30 dias</option><option value={90}>Últimos 90 dias</option><option value={365}>Último ano</option></select></label>
          <label className="flex flex-col gap-2 text-sm">Métrica<select aria-label="Métrica da evolução" className="h-10 rounded-md border border-border bg-muted px-3" value={metric} onChange={e=>setMetric(e.target.value as keyof typeof metrics)}>{Object.entries(metrics).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
          <p className="text-sm text-slate">Variação entre coletas: <strong className="text-ink">{change == null ? '—' : `${change>0?'+':''}${number(change)}`}</strong></p>
        </div>
        {available.length ? <div className="h-72 w-full" role="img" aria-label={`Evolução de ${metrics[metric]} nos últimos ${days} dias`}><ResponsiveContainer width="100%" height="100%"><LineChart data={series} margin={{left:0,right:15,bottom:10}}><CartesianGrid stroke="#ffffff12" vertical={false}/><XAxis type="number" dataKey="time" domain={['dataMin','dataMax']} tickFormatter={value=>new Date(value).toLocaleDateString('pt-BR')} tick={{fill:'#A1A1AA',fontSize:11}}/><YAxis tick={{fill:'#A1A1AA',fontSize:11}} allowDecimals={false}/><Tooltip labelFormatter={value=>new Date(Number(value)).toLocaleString('pt-BR')} contentStyle={{background:'#141414',borderColor:'#333'}}/><Line type="linear" dataKey={metric} name={metrics[metric]} stroke="#7FA1E8" strokeWidth={2} dot={{r:3}} connectNulls={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></div> : <p className="rounded-xl border border-dashed border-border p-6 text-sm text-slate">Sem dados desta métrica no período selecionado.</p>}
        <p className="mt-3 text-xs text-slate">{available.length === 1 ? 'Só existe uma coleta com esta métrica; ainda não é possível mostrar evolução.' : 'Cada ponto representa uma coleta real. Lacunas não são preenchidas e quedas podem refletir revisão dos números pelo Instagram.'}</p>
      </Panel>
      <Panel title="Comentários coletados"><p className="mb-4 text-sm text-slate">{comments.length} texto(s) disponíveis na amostra · {number(data.post.metrics.comments)} comentários informados no post. As quantidades podem diferir.</p>{comments.length ? <><ul className="max-h-80 space-y-3 overflow-y-auto">{comments.map((text,i)=><li key={i} className="whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/40 p-3 text-sm">{text}</li>)}</ul><p className="mt-3 text-xs text-slate">Amostra coletada em {date(data.comments.collected_at)}. Pode não representar todos os comentários.</p></> : <p className="text-sm text-slate">A coleta atual contém apenas a contagem. Sem textos, a IA não pode avaliar o teor dos comentários.</p>}</Panel>
      <Panel title="Histórico de acompanhamento">{data.history.length ? <DataTable headers={['Coleta','Curtidas','Comentários','Visualizações','Interações observadas']}>{data.history.map(row => <tr key={row.id}><td className="whitespace-nowrap p-3">{date(row.collected_at)}</td><td className="p-3">{number(row.likes_count)}</td><td className="p-3">{number(row.comments_count)}</td><td className="p-3">{number(row.views_count)}</td><td className="p-3">{number(row.interactions_count)}</td></tr>)}</DataTable> : <p className="text-sm text-slate">Ainda não há métricas coletadas neste período.</p>}<p className="mt-3 text-xs text-slate">Até 2.000 coletas no período selecionado. Os valores são totais observados em cada coleta, não novos comentários por dia.</p></Panel>
    </> : null}</DataFrame>
  </div>
}
