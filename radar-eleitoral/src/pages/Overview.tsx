import * as React from 'react'
import { Users, FileStack, MessageCircle, Eye, PlayCircle, MousePointerClick } from 'lucide-react'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { FollowersAreaChart } from '@/components/charts/FollowersAreaChart'
import { ObservedPerformanceChart } from '@/components/charts/ObservedPerformanceChart'
import { PageLoader } from '@/components/dashboard/PageLoader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getFollowersHistory, getOverview, getPosts } from '@/services/api'
import type { FollowersHistoryResponse, OverviewResponse, PostsResponse } from '@/types/api'
import { formatNumber } from '@/utils/metrics'

export default function Overview() {
  const [overview, setOverview] = React.useState<OverviewResponse | null>(null)
  const [followers, setFollowers] = React.useState<FollowersHistoryResponse | null>(null)
  const [posts, setPosts] = React.useState<PostsResponse | null>(null)
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(async () => {
    try {
      setLoading(true)
      const [o, f, p] = await Promise.all([getOverview(), getFollowersHistory(), getPosts()])
      setOverview(o); setFollowers(f); setPosts(p)
    } finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])
  React.useEffect(() => {
    const handler = () => load()
    window.addEventListener('radar:data-updated', handler)
    return () => window.removeEventListener('radar:data-updated', handler)
  }, [load])

  if (loading && !overview) return <PageLoader />
  if (!overview || !followers || !posts) return <div className="text-sm text-alert">Não foi possível carregar os dados reais.</div>

  const client = overview.profiles.find((p) => p.role === 'CLIENT')
  const followerClient = followers.profiles.find((p) => p.role === 'CLIENT')
  const clientPosts = posts.posts.filter((p) => p.profile.role === 'CLIENT')
  const dailyMap = new Map<string, { date: string; comments: number; plays: number; views: number; observed: number }>()
  clientPosts.forEach((post) => {
    if (!post.content.published_at) return
    const date = post.content.published_at.slice(0, 10)
    const current = dailyMap.get(date) ?? { date, comments: 0, plays: 0, views: 0, observed: 0 }
    current.comments += post.metrics.comments ?? 0
    current.plays += post.metrics.plays ?? 0
    current.views += post.metrics.views ?? 0
    current.observed += post.metrics.observed_interactions ?? 0
    dailyMap.set(date, current)
  })
  const daily = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date))

  const growthLabel = followerClient && followerClient.days_with_data > 1 && followerClient.growth_absolute !== null
    ? `${followerClient.growth_absolute >= 0 ? '+' : ''}${formatNumber(followerClient.growth_absolute)} no histórico · ${followerClient.growth_percent ?? 0}%`
    : 'Histórico sendo construído'

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Seguidores" value={followerClient?.current_followers != null ? formatNumber(followerClient.current_followers) : 'N/D'} deltaLabel={growthLabel} icon={Users} />
        <MetricCard label="Posts analisados" value={String(client?.posts_analyzed ?? 0)} deltaLabel="Últimos conteúdos armazenados" icon={FileStack} />
        <MetricCard label="Comentários" value={formatNumber(client?.comments ?? 0)} deltaLabel="Total no recorte" icon={MessageCircle} />
        <MetricCard label="Views de Reels" value={formatNumber(client?.views ?? 0)} deltaLabel="Somente quando disponível" icon={Eye} />
        <MetricCard label="Plays de Reels" value={formatNumber(client?.plays ?? 0)} deltaLabel="Somente quando disponível" icon={PlayCircle} />
        <MetricCard label="Interações observadas" value={formatNumber(client?.observed_interactions ?? 0)} deltaLabel="Parcial: shares/saves indisponíveis" icon={MousePointerClick} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FollowersAreaChart data={followerClient?.history ?? []} requestedDays={60} />
        <ObservedPerformanceChart data={daily} />
      </div>

      <div className="rounded-xl border border-blue/20 bg-blue/5 p-4 text-sm leading-relaxed text-blue-dark">
        <span className="font-semibold">Dados reais:</span> seguidores são snapshots públicos coletados via Apify; posts e métricas vêm do banco do Radar. Likes ocultos permanecem como N/D. Compartilhamentos, salvos, alcance e demografia não são inferidos quando a fonte não os fornece.
      </div>

      <Card>
        <CardHeader><CardTitle>Leitura rápida do recorte atual</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 text-sm">
          <div className="rounded-lg bg-bg p-4"><p className="text-xs uppercase text-slate">Perfil do cliente</p><p className="mt-1 font-semibold">@{client?.username}</p></div>
          <div className="rounded-lg bg-bg p-4"><p className="text-xs uppercase text-slate">Perfis monitorados</p><p className="mt-1 font-semibold">{overview.summary.profiles_monitored}</p></div>
          <div className="rounded-lg bg-bg p-4"><p className="text-xs uppercase text-slate">Última base comparativa</p><p className="mt-1 font-semibold">{overview.summary.posts_analyzed} posts em todos os perfis</p></div>
        </CardContent>
      </Card>
    </div>
  )
}
