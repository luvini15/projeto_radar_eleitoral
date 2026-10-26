import {ComparisonExplorer} from '@/components/dashboard/ComparisonExplorer'
import * as React from 'react'
import { number, date } from '@/utils/apiFormat'
import { aggregateFollowerHistory } from '@/utils/followerAggregation'
import { useCampaign, useCampaignData } from '@/lib/campaignContext'
import { DataFrame, DataTable, Empty, Panel } from '@/components/dashboard/ApiData'
import { ChartTooltip, InsufficientData } from '@/components/charts/ChartTheme'
import { chartAxis, chartColors, compactNumber } from '@/components/charts/chartConfig'
import type { Follower } from '@/types/radar'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
export default function Audience() {
  const {days,limit,scopeName,startDate,endDate}=useCampaign()
  const history=useCampaignData<{profiles:Follower[]}>('followers-history',`days=${days}`)
  const comparison=useCampaignData<{profiles:{profile_id:number;username:string;followers:number|null;avg_comments_per_post:number|null;avg_observed_interactions:number|null}[]}>('benchmark',`limit=${limit}`)
  const [mode,setMode]=React.useState('slate')
  const [profileId,setProfileId]=React.useState('')
  const all=history.data?.profiles??[]
  const profiles=all.filter(p=>!profileId||String(p.profile_id)===profileId)
  const eligible=profiles.filter(p=>new Set(p.history.filter(point=>point.followers!=null).map(point=>point.date)).size>=2)
  const dates=[...new Set(eligible.flatMap(p=>p.history.map(point=>point.date)))].sort()
  const individual=dates.map(date=>({date,...Object.fromEntries(eligible.map(p=>['profile_'+p.profile_id,p.history.find(point=>point.date===date)?.followers??null]))}))
  const aggregate=aggregateFollowerHistory(all)
  const aggregateGrowth=aggregate.length>=2?aggregate.at(-1)!.followers-aggregate[0].followers:null
  const aggregatePercent=aggregateGrowth!=null&&aggregate[0].followers?aggregateGrowth/aggregate[0].followers*100:null
  const hasEvolution=mode==='slate'?aggregate.length>=2:eligible.length>0
  const latest=all.map(p=>p.current_followers).filter((v):v is number=>v!=null)
  return <DataFrame data={history.data&&comparison.data} error={history.error||comparison.error}>
    <p className="text-sm leading-6 text-slate">Histórico de {date(startDate)} a {date(endDate)} (UTC). Histórico manual e coletas reais identificados na origem. Seguidores dos perfis associados são somados, sem deduplicação: não representam pessoas únicas. Evolução agregada usa somente datas com coleta de todos os perfis da seleção.</p>
    <div className="flex flex-wrap items-end gap-4"><label className="flex flex-col gap-2 text-xs text-slate">Nível da análise<select aria-label="Nível da audiência" className="h-10 rounded-md border border-white/15 bg-muted px-3 text-sm text-white" value={mode} onChange={e=>setMode(e.target.value)}><option value="slate">Por campanha/chapa</option><option value="profile">Por perfil</option></select></label>{mode==='profile'?<label className="flex flex-col gap-2 text-xs text-slate">Perfil<select aria-label="Perfil da audiência" className="h-10 rounded-md border border-white/15 bg-muted px-3 text-sm text-white" value={profileId} onChange={e=>setProfileId(e.target.value)}><option value="">Todos os perfis da seleção</option>{all.map(p=><option key={p.profile_id} value={p.profile_id}>@{p.username}</option>)}</select></label>:null}</div>
    {all.length?<><Panel title={mode==='slate'?'Seguidores dos perfis associados':'Seguidores por perfil'}>{mode==='slate'?<div><p className="font-mono text-3xl text-white">{latest.length?number(latest.reduce((a,b)=>a+b,0)):'Métrica indisponível'}</p><p className="mt-3 text-xs text-slate">{scopeName} · observação disponível para {latest.length} de {all.length} perfis no período.</p><p className="mt-3 text-sm text-white/80">Crescimento comparável: {aggregateGrowth==null?'Requer duas datas completas':number(aggregateGrowth)} · {aggregatePercent==null?'Base percentual insuficiente':number(aggregatePercent)+'%'}</p></div>:null}<div className="mt-4"><DataTable headers={['Perfil','Última observação no período','Variação','Variação %','Dias com dados','Origem']}>{all.map(p=><tr key={p.profile_id}><td className="p-3">@{p.username}</td><td className="p-3">{number(p.current_followers)}</td><td className="p-3">{p.days_with_data>1?number(p.growth_absolute):'Requer duas coletas'}</td><td className="p-3">{p.days_with_data>1&&p.growth_percent!=null?number(p.growth_percent)+'%':'Base insuficiente'}</td><td className="p-3">{p.days_with_data}</td><td className="p-3 text-xs">{[...new Set(p.history.map(point=>point.source_label||point.source||'Coleta real'))].join(' / ')}</td></tr>)}</DataTable></div></Panel>
    <Panel title="Evolução de seguidores">{hasEvolution?<div className="h-72"><ResponsiveContainer><LineChart data={mode==='slate'?aggregate:individual} margin={{right:15,left:15,top:15}}><XAxis dataKey="date" {...chartAxis} tickFormatter={v=>date(v).slice(0,5)}/><YAxis {...chartAxis} tickFormatter={compactNumber} domain={['auto','auto']} width={70}/><Tooltip content={<ChartTooltip/>} labelFormatter={v=>date(String(v))}/>{mode==='profile'?<Legend wrapperStyle={{fontSize:11}}/>:null}{mode==='slate'?<Line dataKey="followers" name={scopeName+' · soma de perfis'} stroke={chartColors[0]} strokeWidth={3} dot={{r:4}} connectNulls={false}/>:eligible.map((p,i)=><Line key={p.profile_id} dataKey={'profile_'+p.profile_id} name={'@'+p.username} stroke={chartColors[i%chartColors.length]} strokeWidth={3} dot={{r:4}} connectNulls={false}/>)}</LineChart></ResponsiveContainer></div>:<InsufficientData>{mode==='slate'?'São necessárias pelo menos duas datas com coletas comparáveis de todos os perfis associados. Não há interpolação ou soma de dados ausentes.':undefined}</InsufficientData>}</Panel>
    <Panel title="Comparação de perfis"><DataTable headers={['Perfil','Seguidores (última coleta)','Comentários por post','Interações por post']}>{comparison.data?.profiles.map(p=><tr key={p.profile_id}><td className="p-3">@{p.username}</td><td className="p-3">{number(p.followers)}</td><td className="p-3">{number(p.avg_comments_per_post)}</td><td className="p-3">{number(p.avg_observed_interactions)}</td></tr>)}</DataTable></Panel></>:<Empty/>}
    <Panel title="Dados de público indisponíveis"><p className="text-sm leading-6 text-slate">Esta coleta não fornece idade, gênero, localização do público, visitas ao perfil ou cliques. Esses indicadores não são estimados a partir de seguidores.</p></Panel>
  <ComparisonExplorer initialDimension="followers" title="Comparação de audiência"/></DataFrame>
}
