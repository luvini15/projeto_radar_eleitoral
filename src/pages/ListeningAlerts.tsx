import * as React from 'react'
import { AlertTriangle, BellRing, CheckCircle2, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DataFrame, Empty } from '@/components/dashboard/ApiData'
import { Button } from '@/components/ui/button'
import { useCampaign, useCampaignData } from '@/lib/campaignContext'
import { api } from '@/services/radarApi'

type Alert = { id: number; ra: string; topic: string; window_days: number; evidence_count: number; source_count: number; first_seen_at: string; last_seen_at: string; status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED'; rule: string }

export default function ListeningAlerts() {
  const campaign = useCampaign(); const [days, setDays] = React.useState(14); const [working, setWorking] = React.useState<number | null>(null)
  const response = useCampaignData<{window_days: number; alerts: Alert[]}>('listening/alerts', `window_days=${days}`)
  async function setStatus(alert: Alert, status: Alert['status']) {
    if (!campaign.selected) return
    setWorking(alert.id)
    try { await api(`/campaigns/${campaign.selected}/listening/alerts/${alert.id}/status`, { status }); campaign.refresh() }
    finally { setWorking(null) }
  }
  const alerts = response.data?.alerts || []
  return <section className="space-y-6 px-4 py-7 sm:px-6 lg:px-10 lg:py-9"><header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.18em] text-blue"><BellRing className="h-3.5 w-3.5" />Detecção de recorrência</div><h1 className="text-3xl font-medium tracking-[-.04em] text-white sm:text-4xl">Alertas territoriais</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">Um alerta nasce quando o mesmo tema aparece ao menos três vezes, em dois dias distintos, dentro da mesma RA.</p></div><select value={days} onChange={event => setDays(Number(event.target.value))} className="h-10 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-xs text-white"><option value={7}>Últimos 7 dias</option><option value={14}>Últimos 14 dias</option><option value={30}>Últimos 30 dias</option><option value={90}>Últimos 90 dias</option></select></header><DataFrame data={response.data} error={response.error} showContext={false}>{alerts.length ? <div className="grid gap-4 lg:grid-cols-2">{alerts.map(alert => <article key={alert.id} className={`rounded-2xl border p-5 ${alert.status === 'NEW' ? 'border-blue/30 bg-blue/[0.045]' : 'border-white/[0.09] bg-[#090909]'}`}><div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-semibold text-white"><AlertTriangle className="h-4 w-4 text-blue" />{alert.topic}</p><Link to={`/escuta-df/ra/${encodeURIComponent(alert.ra)}`} className="mt-2 inline-flex items-center gap-1 text-xs text-white/45 hover:text-blue"><MapPin className="h-3 w-3" />{alert.ra}</Link></div><span className="rounded-full bg-white/[0.06] px-2 py-1 text-[9px] uppercase text-white/45">{alert.status === 'NEW' ? 'Novo' : alert.status === 'ACKNOWLEDGED' ? 'Em análise' : 'Resolvido'}</span></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/[0.035] p-3"><p className="text-[9px] uppercase text-white/30">Evidências</p><p className="mt-1 font-mono text-xl text-white">{alert.evidence_count}</p></div><div className="rounded-xl bg-white/[0.035] p-3"><p className="text-[9px] uppercase text-white/30">Fontes</p><p className="mt-1 font-mono text-xl text-white">{alert.source_count}</p></div></div><p className="mt-4 text-[10px] text-white/30">{alert.rule} · até {new Date(alert.last_seen_at).toLocaleDateString('pt-BR')}</p><div className="mt-4 flex gap-2">{alert.status === 'NEW' && <Button variant="outline" disabled={working === alert.id} onClick={() => void setStatus(alert, 'ACKNOWLEDGED')}>Assumir análise</Button>}{alert.status !== 'RESOLVED' && <Button variant="outline" disabled={working === alert.id} onClick={() => void setStatus(alert, 'RESOLVED')}><CheckCircle2 className="h-4 w-4" />Resolver</Button>}</div></article>)}</div> : <Empty>Nenhuma recorrência atingiu a regra nessa janela.</Empty>}</DataFrame></section>
}
