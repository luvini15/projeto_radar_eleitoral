import * as React from 'react'
import { normalizeDailyAnalytics } from '@/utils/dailyAnalytics'
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AnalysisCard } from './AnalysisCard'
import { ChartTooltip } from '@/components/charts/ChartTheme'
import { chartAxis, chartColors, compactNumber } from '@/components/charts/chartConfig'
import { date } from '@/utils/apiFormat'
import type { DailyMetric, FilteredAnalytics } from '@/types/api'
const METRICS:Record<DailyMetric,string>={interactions:'Interações',likes:'Curtidas',comments:'Comentários',views:'Visualizações',plays:'Plays',shares:'Compartilhamentos',saves:'Salvamentos',posts:'Publicações'}
export function DailyPerformanceChart({daily,profiles,metric,onMetricChange,compare,onCompareChange}:{daily?:FilteredAnalytics['daily'];profiles?:FilteredAnalytics['profiles']|null;metric:DailyMetric;onMetricChange:(value:DailyMetric)=>void;compare:boolean;onCompareChange:(value:boolean)=>void}) {
  const days=normalizeDailyAnalytics(daily)
  const availableProfiles=Array.isArray(profiles)?profiles:[]
  const visible=availableProfiles.slice(0,5)
  const rows=days.map(day=>({date:day.date,total:day[metric],posts:day.posts,comments:day.comments,...Object.fromEntries(visible.map(p=>['profile_'+p.profile_id,day.profiles[p.username]?.[metric]??null]))}))
  const values=rows.map(row=>row.total).filter((v):v is number=>typeof v==='number'&&v>0).sort((a,b)=>a-b)
  const outlier=values.length>2&&values.at(-1)!>values[Math.floor(values.length/2)]*20
  const [rootScale,setRootScale]=React.useState<boolean|null>(null)
  const root=rootScale??outlier
  const hasData=compare&&availableProfiles.length>1?days.some(day=>visible.some(p=>day.profiles[p.username]?.[metric]!=null)):rows.some(row=>row.total!=null)
  const partial=metric!=='posts'&&days.some(day=>day.metric_samples[metric]!=null&&day.posts!=null&&day.metric_samples[metric]!<day.posts)
  const unknownCoverage=metric!=='posts'&&days.some(day=>day.metric_samples[metric]==null)
  return <AnalysisCard title="Desempenho por dia" question="Totais das publicações por data de publicação; consulte os valores exatos no tooltip.">
    <div className="mb-4 flex flex-wrap items-center gap-4 text-xs">
      <label>Métrica: <select aria-label="Métrica do desempenho por dia" className="rounded-md border border-border bg-card p-2" value={metric} onChange={e=>onMetricChange(e.target.value as DailyMetric)}>{Object.entries(METRICS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      {availableProfiles.length>1?<label className="flex items-center gap-2"><input type="checkbox" checked={compare} onChange={e=>onCompareChange(e.target.checked)}/>Comparar perfis</label>:null}
      <label className="flex items-center gap-2"><input type="checkbox" checked={root} onChange={e=>setRootScale(e.target.checked)}/>Escala de raiz quadrada</label>
    </div>
    {hasData?<div className="h-72 min-w-0" role="img" aria-label={`Desempenho por dia: ${METRICS[metric]}`}><ResponsiveContainer><BarChart data={rows} barCategoryGap="25%" margin={{top:10,right:12,left:8,bottom:5}}><XAxis dataKey="date" {...chartAxis} tickFormatter={value=>date(value).slice(0,5)}/><YAxis {...chartAxis} allowDecimals={false} scale={root?'sqrt':'auto'} domain={[0,'auto']} tickFormatter={compactNumber} width={65}/><Tooltip content={<ChartTooltip/>} labelFormatter={value=>date(String(value))}/>{compare&&availableProfiles.length>1?<Legend wrapperStyle={{fontSize:11}}/>:null}{compare&&availableProfiles.length>1?visible.map((p,i)=><Bar key={p.profile_id} dataKey={'profile_'+p.profile_id} name={'@'+p.username} fill={chartColors[i]} radius={[3,3,0,0]} maxBarSize={45}/>):<Bar dataKey="total" name={METRICS[metric]} fill={chartColors[0]} radius={[4,4,0,0]} maxBarSize={60}/>}</BarChart></ResponsiveContainer></div>:<p role="status" className="py-10 text-center text-sm text-slate">Métrica indisponível: sem valores de {METRICS[metric].toLowerCase()} neste período.</p>}
    {root?<p className="mt-3 text-xs text-slate">Escala de raiz quadrada: preserva o pico e amplia a leitura dos dias menores. Os eixos e tooltips mostram os valores originais; nenhum dado foi modificado.</p>:null}
    {unknownCoverage?<p className="mt-2 text-xs text-slate">Cobertura não informada pela API. Valores ausentes permanecem indisponíveis.</p>:null}
    {partial?<p className="mt-2 text-xs text-slate">Métrica parcial: somente valores disponíveis foram somados. Ausência de coleta não significa zero.</p>:null}
    <p className="mt-2 text-xs leading-5 text-slate">Último snapshot de cada publicação, agrupado pela data de publicação (UTC). Não representa interações recebidas naquele dia. Dias sem posts armazenados não são preenchidos.</p>
  </AnalysisCard>
}
