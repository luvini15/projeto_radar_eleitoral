import * as React from 'react'
import { useCampaign } from '@/lib/campaignContext'
import { getCollections } from '@/services/api'
import { Panel } from './ApiData'
import { Link } from 'react-router-dom'
export function AutoSyncStatus() {
  const {selected,revision}=useCampaign()
  const [data,setData]=React.useState<Awaited<ReturnType<typeof getCollections>>|null>(null)
  const [error,setError]=React.useState('')
  React.useEffect(()=>{if(!selected)return;let active=true;getCollections(Number(selected)).then(result=>{if(active){setData(result);setError('')}}).catch(()=>{if(active)setError('Não foi possível consultar o agendamento.')});return()=>{active=false}},[selected,revision])
  return <Panel title="Atualização automática"><p className="text-sm text-slate">O painel consulta os dados a cada 60 segundos enquanto estiver visível.</p>{error?<p role="alert">{error}</p>:!data?<p role="status">Consultando agendamento…</p>:<p className="mt-3 text-sm">Coleta automática {data.schedule.enabled?'ATIVA':'INATIVA'} · {data.schedule.mode==='interval'?`a cada ${data.schedule.interval_hours} horas`:data.schedule.time} · {data.schedule.timezone}</p>}<Link className="mt-3 inline-block text-sm text-blue" to="/coletas">Ver histórico e agendamento</Link></Panel>
}
