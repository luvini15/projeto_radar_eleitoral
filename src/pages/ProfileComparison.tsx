import * as React from 'react'
import { AtSign, BarChart3, Check, ExternalLink, Plus, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DataFrame, Empty } from '@/components/dashboard/ApiData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCampaign, useCampaignData } from '@/lib/campaignContext'
import { api } from '@/services/radarApi'
import { number } from '@/utils/apiFormat'

type ProfileMetric = {
  profile_id: number
  username: string
  full_name: string | null
  role: string
  followers: number | null
  posts_analyzed: number
  reels_analyzed: number
  avg_comments_per_post: number | null
  avg_likes_per_post: number | null
  avg_views_per_reel: number | null
  avg_plays_per_reel: number | null
  avg_observed_interactions: number | null
  interaction_coverage: { complete_posts: number; posts_analyzed: number }
}
type Benchmark = {
  methodology: { posts_per_profile: number; latest_posts_only: boolean; latest_snapshot_only: boolean }
  profiles: ProfileMetric[]
}

const metrics: { label: string; field: keyof ProfileMetric; note: string }[] = [
  { label: 'Seguidores', field: 'followers', note: 'Última coleta do perfil' },
  { label: 'Posts analisados', field: 'posts_analyzed', note: 'Mesma janela por perfil' },
  { label: 'Reels analisados', field: 'reels_analyzed', note: 'Dentro da janela selecionada' },
  { label: 'Curtidas por post', field: 'avg_likes_per_post', note: 'Média quando disponível' },
  { label: 'Comentários por post', field: 'avg_comments_per_post', note: 'Média observada' },
  { label: 'Interações por post', field: 'avg_observed_interactions', note: 'Soma dos componentes disponíveis' },
  { label: 'Reproduções por Reel', field: 'avg_plays_per_reel', note: 'Apenas publicações em vídeo' },
  { label: 'Visualizações por Reel', field: 'avg_views_per_reel', note: 'Quando fornecido pela fonte' },
]
const selectClass = 'h-11 w-full rounded-xl border border-border bg-white/[0.035] px-3 text-sm text-ink outline-none focus:border-blue/45 focus:ring-2 focus:ring-blue/15'

function ProfileHeader({ profile, accent }: { profile: ProfileMetric; accent?: boolean }) {
  return <div className={`rounded-2xl border p-5 ${accent ? 'border-blue/35 bg-blue/[0.055]' : 'border-white/10 bg-white/[0.025]'}`}>
    <div className="flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-full ${accent ? 'bg-blue text-black' : 'bg-white/10 text-white'}`}><AtSign className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-base font-semibold text-white">{profile.full_name || `@${profile.username}`}</p><p className="truncate text-xs text-white/40">@{profile.username}</p></div></div>
    <div className="mt-5 flex items-end justify-between"><div><p className="text-[9px] uppercase tracking-[.13em] text-white/30">Seguidores</p><p className="mt-1 font-mono text-2xl text-white">{number(profile.followers)}</p></div><a href={`https://www.instagram.com/${encodeURIComponent(profile.username)}/`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-white/45 hover:text-white">Instagram <ExternalLink className="h-3 w-3" /></a></div>
  </div>
}

export default function ProfileComparison() {
  const campaign = useCampaign()
  const benchmark = useCampaignData<Benchmark>('benchmark', `limit=${campaign.limit}`)
  const [primaryId, setPrimaryId] = React.useState('')
  const [referenceId, setReferenceId] = React.useState('')
  const [adding, setAdding] = React.useState(false)
  const [syncing, setSyncing] = React.useState(false)
  const [error, setError] = React.useState('')
  const [message, setMessage] = React.useState('')

  React.useEffect(() => {
    const profiles = benchmark.data?.profiles || []
    if (!profiles.length) return
    setPrimaryId(current => profiles.some(item => String(item.profile_id) === current) ? current : String(profiles.find(item => item.role === 'CLIENT')?.profile_id ?? profiles[0].profile_id))
  }, [benchmark.data])
  React.useEffect(() => {
    const profiles = benchmark.data?.profiles || []
    setReferenceId(current => profiles.some(item => String(item.profile_id) === current && current !== primaryId) ? current : String(profiles.find(item => String(item.profile_id) !== primaryId)?.profile_id ?? ''))
  }, [benchmark.data, primaryId])

  const profiles = benchmark.data?.profiles || []
  const primary = profiles.find(item => String(item.profile_id) === primaryId)
  const reference = profiles.find(item => String(item.profile_id) === referenceId)

  async function addProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!campaign.selected || adding) return
    const form = event.currentTarget
    const data = new FormData(form)
    setAdding(true); setError(''); setMessage('')
    try {
      const result = await api<{ profile_id: number; username: string }>(`/campaigns/${campaign.selected}/profiles`, { username: String(data.get('username')).trim().replace(/^@/, ''), role: 'REFERENCE' })
      form.reset(); setReferenceId(String(result.profile_id)); setMessage(`@${result.username} foi adicionado como perfil de referência. Execute a coleta para preencher as métricas.`); campaign.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível adicionar o perfil.') }
    finally { setAdding(false) }
  }

  async function syncProfile(profile: ProfileMetric) {
    if (!campaign.selected || syncing) return
    setSyncing(true); setError(''); setMessage('')
    try {
      const result = await api<{ posts_received: number; snapshots_created: number }>(`/campaigns/${campaign.selected}/profiles/${profile.profile_id}/sync?limit=${campaign.limit}`, {})
      setMessage(`Coleta de @${profile.username} concluída: ${result.posts_received} posts recebidos e ${result.snapshots_created} snapshots gravados.`)
      campaign.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível coletar o perfil.') }
    finally { setSyncing(false) }
  }

  return <section className="space-y-6 px-4 py-7 sm:px-6 lg:px-10 lg:py-9">
    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="mb-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.18em] text-blue"><Users className="h-3.5 w-3.5" />Análise de perfis</div><h1 className="text-3xl font-medium tracking-[-.04em] text-white sm:text-4xl">Comparação de perfis</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">Coloque o perfil principal e uma referência lado a lado usando exatamente a mesma janela de publicações.</p></div><Link to="/configuracoes" className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 px-4 py-2.5 text-xs text-white/60 hover:border-white/20 hover:text-white"><BarChart3 className="h-4 w-4" />Gerenciar coleta</Link></header>

    <DataFrame data={benchmark.data} error={benchmark.error}>
      {!profiles.length ? <Empty>Adicione o perfil principal e ao menos um perfil de referência para iniciar.</Empty> : <>
        <div className="grid gap-4 rounded-2xl border border-white/[0.09] bg-[#090909] p-5 lg:grid-cols-[1fr_48px_1fr] lg:items-end">
          <label className="space-y-2 text-xs text-white/45"><span>Perfil principal</span><select className={selectClass} value={primaryId} onChange={event => setPrimaryId(event.target.value)}>{profiles.map(profile => <option key={profile.profile_id} value={profile.profile_id}>@{profile.username}{profile.role === 'CLIENT' ? ' · Principal' : ''}</option>)}</select></label>
          <div className="hidden h-11 items-center justify-center font-mono text-xs text-white/20 lg:flex">VS</div>
          <label className="space-y-2 text-xs text-white/45"><span>Perfil de referência</span><select className={selectClass} value={referenceId} onChange={event => setReferenceId(event.target.value)}><option value="">Selecione um perfil</option>{profiles.filter(profile => String(profile.profile_id) !== primaryId).map(profile => <option key={profile.profile_id} value={profile.profile_id}>@{profile.username}</option>)}</select></label>
        </div>

        {primary && reference ? <>
          {reference.posts_analyzed === 0 && <div className="flex flex-col gap-3 rounded-xl border border-blue/25 bg-blue/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-white">@{reference.username} ainda não possui dados coletados</p><p className="mt-1 text-xs text-white/40">Execute somente a coleta deste perfil para preencher a comparação. Esta operação consome créditos da Apify.</p></div><Button disabled={syncing} onClick={() => void syncProfile(reference)}>{syncing ? 'Coletando…' : `Coletar @${reference.username}`}</Button></div>}
          <div className="grid gap-4 md:grid-cols-2"><ProfileHeader profile={primary} accent /><ProfileHeader profile={reference} /></div>
          <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#090909]"><div className="grid grid-cols-[minmax(110px,1fr)_minmax(90px,.7fr)_minmax(90px,.7fr)] gap-3 border-b border-white/[0.07] px-4 py-3 text-[9px] uppercase tracking-[.12em] text-white/30 sm:px-6"><span>Métrica</span><span>@{primary.username}</span><span>@{reference.username}</span></div>{metrics.map(item => <div key={item.label} className="grid grid-cols-[minmax(110px,1fr)_minmax(90px,.7fr)_minmax(90px,.7fr)] items-center gap-3 border-b border-white/[0.06] px-4 py-4 last:border-0 sm:px-6"><div><p className="text-xs font-medium text-white/70">{item.label}</p><p className="mt-1 hidden text-[10px] text-white/25 sm:block">{item.note}</p></div><p className="font-mono text-sm text-white">{number(primary[item.field] as number | null)}</p><p className="font-mono text-sm text-white">{number(reference[item.field] as number | null)}</p></div>)}</div>
          <div className="grid gap-3 md:grid-cols-2">{[primary, reference].map(profile => <div key={profile.profile_id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs text-white/45"><p className="flex items-center gap-2 font-medium text-white/70"><Check className="h-3.5 w-3.5 text-blue" />Cobertura de @{profile.username}</p><p className="mt-2 leading-5">{profile.interaction_coverage.complete_posts} de {profile.interaction_coverage.posts_analyzed} posts possuem todos os componentes de interação. Valores ausentes aparecem como “—”, nunca como zero.</p></div>)}</div>
        </> : <Empty>Selecione um segundo perfil ou adicione uma referência abaixo.</Empty>}
      </>}

      <div className="rounded-2xl border border-white/[0.09] bg-[#090909] p-5"><div className="flex items-center gap-2 text-sm font-medium text-white"><Plus className="h-4 w-4 text-blue" />Adicionar perfil para comparação</div><p className="mt-2 text-xs leading-5 text-white/35">O perfil será vinculado à campanha atual como referência. A coleta de dados não é iniciada automaticamente.</p><form onSubmit={addProfile} className="mt-4 flex max-w-xl flex-col gap-3 sm:flex-row"><Input name="username" required pattern="@?[A-Za-z0-9._]{1,30}" placeholder="@perfil_de_referencia" aria-label="Perfil do Instagram" /><Button disabled={adding}>{adding ? 'Adicionando…' : 'Adicionar perfil'}</Button></form>{error && <p role="alert" className="mt-3 text-xs text-alert">{error}</p>}{message && <p role="status" className="mt-3 text-xs text-white/55">{message}</p>}</div>
    </DataFrame>
  </section>
}
