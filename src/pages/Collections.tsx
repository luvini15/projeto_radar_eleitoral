import * as React from 'react'
import { useCampaign } from '@/lib/campaignContext'
import { Card,CardContent,CardHeader,CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageLoader } from '@/components/dashboard/PageLoader'
import { getCollections,runCollection } from '@/services/api'
import { apiTimestamp } from '@/utils/apiFormat'
const timestamp=(value:string|null|undefined)=>value?new Date(apiTimestamp(value)).toLocaleString('pt-BR'):'Não disponível'
export default function Collections() {
  const {selected,revision,refresh,scopeKey,periodKey}=useCampaign()
  const [data,setData]=React.useState<Awaited<ReturnType<typeof getCollections>>|null>(null)
  const [error,setError]=React.useState('')
  const [running,setRunning]=React.useState(false)
  React.useEffect(()=>{let active=true;getCollections(Number(selected)).then(result=>{if(active){setData(result);setError('')}}).catch(()=>{if(active)setError('Não foi possível carregar o histórico de coletas.')});return()=>{active=false}},[selected,revision,scopeKey,periodKey])
  async function run(){setRunning(true);setError('');try{await runCollection(Number(selected));refresh()}catch(cause){setError(cause instanceof Error?cause.message:'Falha na coleta.')}finally{setRunning(false)}}
  if(!data&&!error)return <PageLoader/>
  const latest=data?.collections[0]
  return <div className="space-y-6">
    {error&&<p role="alert" className="rounded-lg border border-alert p-4 text-alert">{error}</p>}
    <div className="grid gap-4 md:grid-cols-3"><Card><CardHeader><CardTitle>Coleta automática</CardTitle></CardHeader><CardContent><b>{data?.schedule.enabled?'ATIVA':'INATIVA'}</b><p>Horário: {data?.schedule.mode==='interval'?`a cada ${data.schedule.interval_hours} horas`:data?.schedule.time}</p><p>Timezone: {data?.schedule.timezone}</p><p className="mt-2 text-xs text-slate">{data?.schedule.worker_alive?'Scheduler conectado.':'Scheduler sem sinal recente.'} Até {data?.schedule.posts_per_profile} posts por perfil.</p></CardContent></Card><Card><CardHeader><CardTitle>Última e próxima coleta</CardTitle></CardHeader><CardContent><p>Última no período: {timestamp(latest?.started_at)}</p><p>Próxima: {timestamp(data?.next_collection)}</p><p className="mt-2">Status: {latest?.status||'Sem execução'}</p></CardContent></Card><Card><CardHeader><CardTitle>Ação manual</CardTitle></CardHeader><CardContent><Button onClick={run} disabled={running}>{running?'Coletando...':'Executar agora'}</Button><p className="mt-2 text-xs text-slate">Fallback manual. Consome créditos Apify e respeita o bloqueio da campanha.</p></CardContent></Card></div>
    <Card><CardHeader><CardTitle>Histórico das coletas</CardTitle></CardHeader><CardContent className="overflow-x-auto"><p className="mb-3 text-xs text-slate">Período e perfis da seleção respeitados. Status refere-se à execução; contadores são dos perfis selecionados. Executar agora continua coletando individualmente os perfis ativos da campanha completa.</p><table className="w-full min-w-[1000px] text-left text-sm"><thead><tr>{['Data/hora','Status','Origem','Perfis','Posts encontrados','Novos posts','Snapshots','Seguidores','Erros'].map(label=><th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{data?.collections.map(row=><tr key={row.id} className="border-t border-border"><td className="p-2">{timestamp(row.started_at)}</td><td>{row.status}</td><td>{row.trigger}</td><td>{row.profiles_succeeded}/{row.profiles_total}</td><td>{row.posts_found}</td><td>{row.new_posts}</td><td>{row.post_snapshots_created}</td><td>{row.followers_updated}</td><td>{row.errors?<details><summary>{(()=>{try{return JSON.parse(row.errors).length}catch{return row.profiles_failed}})()} erro(s)</summary><p className="max-w-sm break-words">{row.errors}</p></details>:0}</td></tr>)}</tbody></table>{!data?.collections.length&&<p className="py-8 text-center text-slate">Nenhuma coleta executada.</p>}</CardContent></Card>
  </div>
}
