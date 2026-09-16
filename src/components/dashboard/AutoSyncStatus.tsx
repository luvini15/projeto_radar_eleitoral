import * as React from 'react'
import { useCampaign } from '@/lib/campaignContext'
import { api } from '@/services/radarApi'
import { Panel } from './ApiData'
interface Status {
  enabled: boolean; interval_hours: number; posts_per_profile: number;
  campaigns: {campaign_id: number; schedule: null | {status: string; next_run_at: string; last_finished_at: string | null; error: string | null}}[];
}
function timestamp(value: string) {
  return new Date(/[Zz]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`).toLocaleString('pt-BR')
}
export function AutoSyncStatus() {
  const {selected, revision} = useCampaign()
  const [status,setStatus] = React.useState<Status | null>(null)
  const [error,setError] = React.useState('')
  React.useEffect(() => {
    const controller = new AbortController()
    api<Status>('/sync/status', undefined, controller.signal).then(data => {
      if (!controller.signal.aborted) {setStatus(data);setError('')}
    }).catch(() => {if (!controller.signal.aborted) setError('Não foi possível consultar o agendamento.')})
    return () => controller.abort()
  }, [revision])
  const item = status?.campaigns.find(c => String(c.campaign_id) === selected)
  return <Panel title="Atualização automática">
    <p className="text-sm text-slate">O painel consulta os dados a cada 60 segundos enquanto estiver visível.</p>
    {error ? <p role="alert" className="mt-3 text-sm">{error}</p> : !status ? <p role="status">Consultando agendamento…</p> : status.enabled && item ? <div className="mt-3 space-y-2 text-sm">
      <p>Coleta a cada {status.interval_hours} horas · até {status.posts_per_profile} posts por perfil.</p>
      <p>{item.schedule?.status === 'running' ? 'Coleta em andamento.' : item.schedule ? `Próxima tentativa: ${timestamp(item.schedule.next_run_at)}` : 'Primeira coleta prevista no próximo minuto.'}</p>
      {item.schedule?.last_finished_at ? <p>Última tentativa concluída: {timestamp(item.schedule.last_finished_at)} · {item.schedule.status === 'success' ? 'sucesso' : item.schedule.status === 'partial' ? 'parcial' : 'falha'}</p> : null}
      {item.schedule?.error ? <p role="alert">{item.schedule.error}</p> : null}
      <p className="text-slate">Consome créditos Apify. A coleta depende de manter o backend rodando.</p>
    </div> : <p className="mt-3 text-sm text-slate">Coleta automática desativada para esta campanha. O agendamento é configurado no backend.</p>}
  </Panel>
}
