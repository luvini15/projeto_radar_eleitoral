import * as React from 'react'
import { CheckCircle2, Database, ExternalLink, Pause, Play, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
import { api } from '@/services/radarApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Source = {
  id: number; name: string; source_type: 'WORDPRESS' | 'OUV_CSV'; url: string
  scope_ra: string | null; active: boolean; official: boolean; last_status: string
  last_error: string | null; last_items_count: number; last_checked_at: string | null
}

export default function ListeningSources() {
  const [sources, setSources] = React.useState<Source[]>([])
  const [loading, setLoading] = React.useState(true)
  const [working, setWorking] = React.useState<number | 'all' | 'add' | null>(null)
  const [error, setError] = React.useState('')
  const load = React.useCallback(async () => {
    setLoading(true); setError('')
    try { setSources(await api<Source[]>('/listening/sources')) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as fontes.') }
    finally { setLoading(false) }
  }, [])
  React.useEffect(() => { void load() }, [load])

  async function action(id: number, kind: 'sync' | 'toggle') {
    setWorking(id); setError('')
    try { await api(`/listening/sources/${id}/${kind}`, {}); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'A operação falhou.') }
    finally { setWorking(null) }
  }
  async function syncAll() {
    setWorking('all'); setError('')
    try { await api('/listening/sync?limit=300', {}); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'A sincronização falhou.') }
    finally { setWorking(null) }
  }
  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setWorking('add'); setError('')
    const form = event.currentTarget; const data = new FormData(form)
    try {
      await api('/listening/sources', {
        name: String(data.get('name') || ''), source_type: String(data.get('source_type')),
        url: String(data.get('url') || ''), scope_ra: String(data.get('scope_ra') || '') || null,
        official: data.get('official') === 'on',
      })
      form.reset(); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível adicionar a fonte.') }
    finally { setWorking(null) }
  }

  return <section className="space-y-6 px-4 py-7 sm:px-6 lg:px-10 lg:py-9">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.18em] text-blue"><Database className="h-3.5 w-3.5" />Governança da coleta</div><h1 className="text-3xl font-medium tracking-[-.04em] text-white sm:text-4xl">Gerenciador de fontes</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">Cadastre APIs públicas, pause coletas e acompanhe a saúde de cada origem. Os itens ficam persistidos para auditoria.</p></div><Button onClick={() => void syncAll()} disabled={working !== null}><RefreshCw className={`h-4 w-4 ${working === 'all' ? 'animate-spin' : ''}`} />Sincronizar fontes ativas</Button></header>
    {error && <div role="alert" className="rounded-xl border border-alert/40 bg-alert/[0.07] p-4 text-sm text-alert">{error}</div>}
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,.7fr)]">
      <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#090909]">{loading ? <p className="p-6 text-sm text-white/40">Carregando fontes…</p> : <div className="divide-y divide-white/[0.07]">{sources.map(source => <article key={source.id} className="p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-white/85">{source.name}</h2>{source.official && <span className="inline-flex items-center gap-1 rounded-full border border-blue/25 bg-blue/[0.08] px-2 py-0.5 text-[9px] uppercase tracking-wide text-blue"><ShieldCheck className="h-3 w-3" />Oficial</span>}<span className={`rounded-full px-2 py-0.5 text-[9px] uppercase ${source.active ? 'bg-positive/10 text-positive' : 'bg-white/5 text-white/35'}`}>{source.active ? 'Ativa' : 'Pausada'}</span></div><p className="mt-2 text-xs text-white/35">{source.source_type === 'OUV_CSV' ? 'CSV OUV-DF' : 'API WordPress'}{source.scope_ra ? ` · Escopo: ${source.scope_ra}` : ' · Escopo distrital'}</p><a className="mt-2 inline-flex max-w-full items-center gap-1 truncate text-xs text-blue/65 hover:text-blue" href={source.url} target="_blank" rel="noreferrer">{source.url}<ExternalLink className="h-3 w-3 shrink-0" /></a>{source.last_error && <p className="mt-2 text-xs text-alert">{source.last_error}</p>}</div><div className="flex shrink-0 gap-2"><button className="rounded-lg border border-white/10 p-2 text-white/55 hover:text-white" onClick={() => void action(source.id, 'toggle')} aria-label={source.active ? 'Pausar fonte' : 'Ativar fonte'}>{source.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button><button className="rounded-lg border border-white/10 p-2 text-white/55 hover:text-white disabled:opacity-40" disabled={working !== null} onClick={() => void action(source.id, 'sync')} aria-label="Sincronizar fonte"><RefreshCw className={`h-4 w-4 ${working === source.id ? 'animate-spin' : ''}`} /></button></div></div><div className="mt-4 flex flex-wrap gap-4 text-[10px] text-white/35"><span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Status: {source.last_status}</span><span>{source.last_items_count} itens na última coleta</span><span>{source.last_checked_at ? new Date(source.last_checked_at).toLocaleString('pt-BR') : 'Ainda não sincronizada'}</span></div></article>)}</div>}</div>
      <form onSubmit={add} className="h-fit space-y-4 rounded-2xl border border-white/[0.09] bg-[#090909] p-5"><div><p className="flex items-center gap-2 text-sm font-semibold text-white"><Plus className="h-4 w-4 text-blue" />Adicionar fonte</p><p className="mt-1 text-xs leading-5 text-white/35">Aceitamos endpoints HTTPS públicos do WordPress e arquivos CSV no padrão OUV-DF.</p></div><Input name="name" required placeholder="Nome da fonte" /><select name="source_type" className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.035] px-3 text-sm text-white"><option value="WORDPRESS">API WordPress</option><option value="OUV_CSV">CSV OUV-DF</option></select><Input name="url" required type="url" placeholder="https://…" /><Input name="scope_ra" placeholder="RA fixa, se houver" /><label className="flex items-center gap-2 text-xs text-white/50"><input name="official" type="checkbox" className="accent-[#ff5a1f]" />Fonte oficial do poder público</label><Button className="w-full" disabled={working !== null}>{working === 'add' ? 'Adicionando…' : 'Adicionar fonte'}</Button></form>
    </div>
  </section>
}
