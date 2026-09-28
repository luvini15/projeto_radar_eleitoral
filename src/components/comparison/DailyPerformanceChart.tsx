import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AnalysisCard } from './AnalysisCard'
import type { DailyMetric, FilteredAnalytics } from '@/types/api'

const METRICS: Record<DailyMetric,string> = {interactions:'Interações',likes:'Curtidas',comments:'Comentários',views:'Visualizações',plays:'Reproduções',shares:'Compartilhamentos',saves:'Salvamentos',posts:'Publicações'}
const COLORS=['#7FA1E8','#A7D6BB','#E5B96F','#B69DE8','#E891A5']
export function DailyPerformanceChart({daily,profiles,metric,onMetricChange,compare,onCompareChange}:{daily:FilteredAnalytics['daily'];profiles:FilteredAnalytics['profiles'];metric:DailyMetric;onMetricChange:(value:DailyMetric)=>void;compare:boolean;onCompareChange:(value:boolean)=>void}) {
  const visible=profiles.slice(0,5)
  const rows=[...daily].sort((a,b)=>a.date.localeCompare(b.date)).map(day=>({date:day.date,total:day[metric],...Object.fromEntries(visible.map(p=>['profile_'+p.profile_id,day.profiles[p.username]?.[metric]??null]))}))
  const hasData=rows.some(row=>row.total!=null)
  const partial=metric!=='posts'&&daily.some(day=>day.metric_samples[metric]<day.posts)
  return <AnalysisCard title="Desempenho por dia" question="Como varia o desempenho das publicações?">
    <div className="mb-4 flex flex-wrap items-center gap-4">
      <label className="text-sm">Métrica: <select aria-label="Métrica do desempenho por dia" className="rounded-md border border-border bg-card p-2" value={metric} onChange={e=>onMetricChange(e.target.value as DailyMetric)}>{Object.entries(METRICS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      {profiles.length>1&&<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={compare} onChange={e=>onCompareChange(e.target.checked)}/>Comparar perfis</label>}
    </div>
    {hasData?<div className="h-72" role="img" aria-label={`Desempenho por dia: ${METRICS[metric]}`}><ResponsiveContainer><LineChart data={rows}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis allowDecimals={false}/><Tooltip contentStyle={{background:'#141414',borderColor:'#333'}} formatter={(value)=>Number(value).toLocaleString('pt-BR')}/><Legend/>{compare&&profiles.length>1?visible.map((p,i)=><Line key={p.profile_id} dataKey={'profile_'+p.profile_id} name={'@'+p.username} stroke={COLORS[i]} strokeWidth={2} dot connectNulls={false}/>):<Line dataKey="total" name={METRICS[metric]} stroke={COLORS[0]} strokeWidth={2} dot connectNulls={false}/>}</LineChart></ResponsiveContainer></div>:<p role="status" className="py-12 text-center text-slate">Sem dados históricos disponíveis para {METRICS[metric].toLowerCase()}.</p>}
    {partial&&<p className="mt-2 text-xs text-slate">Métrica parcial: somente valores disponíveis foram somados. Ausência de coleta ou métrica não significa zero.</p>}
    <p className="mt-2 text-xs text-slate">Soma do último snapshot armazenado de cada publicação, agrupada pela data de publicação (UTC). Não representa interações recebidas naquele dia. Dias sem publicações armazenadas não são preenchidos.</p>
  </AnalysisCard>
}
