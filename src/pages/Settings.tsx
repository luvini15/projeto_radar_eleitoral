import { number } from '@/utils/apiFormat'
import { AutoSyncStatus } from '@/components/dashboard/AutoSyncStatus'
import { useCampaign } from '@/lib/campaignContext'
import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/services/radarApi'
import type { Campaign, Detail, Overview } from '@/services/radarApi'

export default function Settings() {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([])
  const { selected, setSelected, refresh: refreshCampaigns, revision: campaignRevision } = useCampaign()
  const [detail, setDetail] = React.useState<Detail | null>(null)
  const [overview, setOverview] = React.useState<Overview | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [revision, refresh] = React.useReducer((n: number) => n + 1, 0)
  React.useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    Promise.all([
      api<Campaign[]>('/campaigns', undefined, controller.signal),
      selected ? Promise.all([api<Detail>(`/campaigns/${selected}`, undefined, controller.signal), api<Overview>(`/campaigns/${selected}/overview`, undefined, controller.signal)]) : null,
    ]).then(([items, data]) => {
      if (controller.signal.aborted) return
      setCampaigns(items)
      if (data) { setDetail(data[0]); setOverview(data[1]) }
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Erro ao carregar.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [selected, revision, campaignRevision])

  async function mutate(action: () => Promise<string>) {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try { setMessage(await action()); refresh(); refreshCampaigns() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro ao salvar.') }
    finally { setBusy(false) }
  }
  const selectClass = 'h-10 rounded-md border border-border bg-muted px-3 text-sm text-ink'
  return <div className="space-y-6">
    <AutoSyncStatus />
    <p className="text-sm text-slate">Gerencie os dados coletados do Instagram. A campanha selecionada será usada em todas as telas do painel.</p>
    {error ? <div role="alert" className="rounded-lg border border-alert p-4"><p>{error}</p><Button className="mt-3" disabled={busy || loading} onClick={refresh}>Recarregar dados</Button></div> : null}
    <p role="status" className="text-sm text-slate">{busy ? 'Processando… Aguarde antes de repetir a operação.' : loading ? 'Carregando dados…' : message}</p>
    <Card><CardHeader><CardTitle>Campanhas</CardTitle></CardHeader><CardContent className="space-y-5">
      <label className="flex flex-col gap-2 text-sm">Campanha selecionada<select className={selectClass} value={selected} disabled={busy || loading} onChange={e => { setSelected(e.target.value); setMessage('') }}><option value="">Selecione uma campanha</option>{campaigns.map(c => <option key={c.id} value={c.id}>{c.name}{c.active ? '' : ' (inativa)'}</option>)}</select></label>
      {!loading && !campaigns.length && !error ? <p>Nenhuma campanha cadastrada. Crie a primeira abaixo.</p> : null}
      <form onSubmit={e => {
        e.preventDefault(); const form = e.currentTarget; const data = new FormData(form)
        void mutate(async () => {
          const name = String(data.get('name')).trim()
          if (!name) throw new Error('Informe o nome da campanha.')
          const campaign = await api<Campaign>('/campaigns', { name, slug: data.get('slug') })
          form.reset(); setSelected(String(campaign.id)); return 'Campanha criada.'
        })
      }}><fieldset disabled={busy || loading} className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">Nome<Input name="name" required placeholder="Nome da campanha" /></label>
        <label className="text-sm">Identificador<Input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Letras minúsculas, números e hífens" placeholder="minha-campanha" /></label>
        <Button className="self-end">Criar campanha</Button>
      </fieldset></form>
    </CardContent></Card>
    {detail ? <Card><CardHeader><CardTitle>Perfis de {detail.name}</CardTitle></CardHeader><CardContent className="space-y-5">
      {detail.profiles.length ? <ul className="divide-y divide-border">{detail.profiles.map(p => <li key={p.id} className="py-2">@{p.username} · {({ CLIENT: 'Principal', COMPETITOR: 'Concorrente', LOCAL_PAGE: 'Página local', MEDIA: 'Imprensa' } as Record<string, string>)[p.role] || p.role}{p.active ? '' : ' · Inativo'}</li>)}</ul> : <p>Vincule um perfil para iniciar a coleta.</p>}
      <form onSubmit={e => {
        e.preventDefault(); const form = e.currentTarget; const data = new FormData(form)
        void mutate(async () => {
          await api(`/campaigns/${detail.id}/profiles`, { username: String(data.get('username')).replace(/^@/, ''), role: data.get('role') })
          form.reset(); return 'Perfil vinculado.'
        })
      }}><fieldset disabled={busy} className="flex flex-wrap items-end gap-3">
        <label className="text-sm">Instagram<Input name="username" required pattern="@?[A-Za-z0-9_.]{1,30}" placeholder="@perfil" /></label>
        <label className="flex flex-col text-sm">Papel<select name="role" className={selectClass}><option value="CLIENT">Principal</option><option value="COMPETITOR">Concorrente</option><option value="LOCAL_PAGE">Página local</option><option value="MEDIA">Imprensa</option></select></label>
        <Button>Vincular perfil</Button>
      </fieldset></form>
      <form className="border-t border-border pt-4" onSubmit={e => {
        e.preventDefault(); const data = new FormData(e.currentTarget)
        void mutate(async () => {
          const result = await api<{ profiles_synced: number; status: string }>(`/campaigns/${detail.id}/sync?limit=${Number(data.get('limit'))}`, {})
          return `Coleta ${result.status}: ${result.profiles_synced} perfil(is) sincronizado(s). Consulte Coletas para ver os detalhes.`
        })
      }}><fieldset className="space-y-3" disabled={busy || !detail.active || !detail.profiles.some(p => p.active)}>
        <p className="text-sm text-slate">A coleta usa créditos da sua conta Apify e pode levar alguns minutos. O acesso é configurado no servidor.</p>
        <label className="block max-w-xs text-sm">Posts por perfil<Input name="limit" type="number" required min={1} max={200} defaultValue={25} /></label>
        <Button>Coletar dados pela Apify</Button>
      </fieldset></form>
    </CardContent></Card> : null}
    {overview ? <Card><CardHeader><CardTitle>Resumo dos dados coletados</CardTitle></CardHeader><CardContent>
      <p className="mb-4 text-sm text-slate">Até 25 posts recentes por perfil, usando a última coleta de cada post. Interações observadas podem ser parciais.</p>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">{([
        ['Perfis monitorados', overview.summary.profiles_monitored], ['Posts analisados', overview.summary.posts_analyzed],
        ['Comentários', overview.summary.comments], ['Interações observadas', overview.summary.observed_interactions],
      ] as const).map(([label, value]) => <div key={label}><dt className="text-xs text-slate">{label}</dt><dd className="text-xl font-semibold">{number(value)}</dd></div>)}</dl>
    </CardContent></Card> : null}
  </div>
}
