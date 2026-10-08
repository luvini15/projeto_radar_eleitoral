import { number } from '@/utils/apiFormat'
import * as React from 'react'
import { useCampaign, useCampaignData } from '@/lib/campaignContext'
import { DataFrame, DataTable, Empty, Panel } from '@/components/dashboard/ApiData'
import type { Follower } from '@/types/radar'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
export default function Audience() {
  const {days,limit} = useCampaign()
  const history = useCampaignData<{profiles: Follower[]}>('followers-history', `days=${days}`)
  const comparison = useCampaignData<{profiles: {profile_id:number; username:string; followers:number|null; avg_comments_per_post:number|null; avg_observed_interactions:number|null}[]}>('benchmark', `limit=${limit}`)
  const [profileId,setProfileId] = React.useState('')
  const currentId=history.data?.profiles.some(p=>String(p.profile_id)===profileId)?profileId:''
  const profiles=(history.data?.profiles??[]).filter(p=>!currentId||String(p.profile_id)===currentId)
  const dates=[...new Set(profiles.flatMap(p=>p.history.map(point=>point.date)))].sort()
  const points=dates.map(date=>({date,...Object.fromEntries(profiles.map(p=>['profile_'+p.profile_id,p.history.find(point=>point.date===date)?.followers??null]))}))
  const colors=['#7FA1E8','#A7D6BB','#E5B96F','#B69DE8','#E891A5']
  return <DataFrame data={history.data && comparison.data} error={history.error || comparison.error}>
    <p className="text-sm text-slate">Histórico nos últimos {days} dias. Crescimento calculado entre coletas disponíveis; uma única coleta não permite medir evolução.</p>
    {history.data?.profiles.length ? <>
      <Panel title="Seguidores por perfil"><DataTable headers={['Perfil','Última coleta no período','Variação','Variação %','Dias com dados']}>{history.data.profiles.map(p => <tr key={p.profile_id}><td className="p-3">@{p.username}</td><td className="p-3">{number(p.current_followers)}</td><td className="p-3">{p.days_with_data > 1 ? number(p.growth_absolute) : '—'}</td><td className="p-3">{p.days_with_data > 1 && p.growth_percent != null ? `${number(p.growth_percent)}%` : '—'}</td><td className="p-3">{p.days_with_data}</td></tr>)}</DataTable></Panel>
      <Panel title="Evolução de seguidores"><label className="flex flex-col gap-2 text-sm">Perfil do gráfico<select className="h-10 rounded-md bg-muted px-3" value={currentId} onChange={e => setProfileId(e.target.value)}><option value="">Todos os perfis</option>{history.data.profiles.map(p => <option key={p.profile_id} value={p.profile_id}>@{p.username}</option>)}</select></label>
        {profiles.some(p=>p.history.some(point=>point.followers!=null)) ? <div className="mt-5 h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={points}><XAxis dataKey="date" tick={{fill:'#A1A1AA',fontSize:11}}/><YAxis tick={{fill:'#A1A1AA'}} domain={['auto','auto']}/><Tooltip contentStyle={{background:'#141414',borderColor:'#333'}}/><Legend/>{profiles.map((p,i)=><Line key={p.profile_id} dataKey={'profile_'+p.profile_id} name={'@'+p.username} stroke={colors[i%colors.length]} strokeWidth={2} dot connectNulls={false}/>)}</LineChart></ResponsiveContainer></div> : <div className="mt-4"><Empty>Sem coletas de seguidores neste período.</Empty></div>}
      </Panel>
      <Panel title="Comparação de perfis"><DataTable headers={['Perfil','Seguidores (última coleta)','Comentários por post','Interações por post']}>{comparison.data?.profiles.map(p => <tr key={p.profile_id}><td className="p-3">@{p.username}</td><td className="p-3">{number(p.followers)}</td><td className="p-3">{number(p.avg_comments_per_post)}</td><td className="p-3">{number(p.avg_observed_interactions)}</td></tr>)}</DataTable></Panel>
    </> : <Empty />}
    <Panel title="Dados de público indisponíveis"><p className="text-sm text-slate">Esta coleta não fornece idade, gênero, localização do público, visitas ao perfil ou cliques. Esses indicadores não são estimados a partir de seguidores.</p></Panel>
  </DataFrame>
}
