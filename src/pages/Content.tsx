import * as React from 'react'
import { Activity, ArrowUpRight, Heart, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DataFrame, Empty } from '@/components/dashboard/ApiData'
import { PostThumbnail } from '@/components/tables/PostThumbnail'
import { Input } from '@/components/ui/input'
import { useCampaign, useCampaignData } from '@/lib/campaignContext'
import type { Post } from '@/types/radar'
import { date, number } from '@/utils/apiFormat'

export default function Content() {
  const { limit, selected } = useCampaign()
  const { data, error } = useCampaignData<{ posts: Post[] }>('posts', `limit_per_profile=${limit}`)
  const [search, setSearch] = React.useState('')
  const [format, setFormat] = React.useState('')
  const [order, setOrder] = React.useState('date')
  const posts = (data?.posts || [])
    .filter(post => (!format || post.content.format === format) && `${post.profile.username} ${post.content.caption || ''}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
    .toSorted((a, b) => order === 'comments'
      ? (b.metrics.comments ?? -1) - (a.metrics.comments ?? -1)
      : order === 'interactions'
        ? (b.metrics.observed_interactions ?? -1) - (a.metrics.observed_interactions ?? -1)
        : (b.content.published_at || '').localeCompare(a.content.published_at || ''))

  return (
    <DataFrame data={data} error={error}>
      <div className="flex flex-col gap-4 border-y border-white/10 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">Buscar perfil ou legenda<Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar conteúdos" /></label>
          <label className="flex flex-col gap-2 text-sm">Formato<select aria-label="Formato" className="h-10 rounded-md border border-white/10 bg-muted px-3" value={format} onChange={event => setFormat(event.target.value)}><option value="">Todos os formatos</option>{[...new Set(data?.posts.map(post => post.content.format))].map(item => <option key={item}>{item}</option>)}</select></label>
          <label className="flex flex-col gap-2 text-sm">Ordenar<select aria-label="Ordenar" className="h-10 rounded-md border border-white/10 bg-muted px-3" value={order} onChange={event => setOrder(event.target.value)}><option value="date">Mais recentes</option><option value="comments">Mais comentários</option><option value="interactions">Mais interações</option></select></label>
        </div>
        <p className="text-sm text-slate">{posts.length} conteúdos encontrados</p>
      </div>

      {!posts.length ? <Empty>{data?.posts.length ? 'Nenhum conteúdo corresponde aos filtros.' : 'Nenhum conteúdo coletado para esta campanha.'}</Empty> : (
        <section aria-label="Publicações coletadas" className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {posts.map(post => (
            <article key={post.post_id} className="group min-w-0">
              <Link to={`/conteudos/${post.post_id}`} aria-label={`Abrir prévia do post ${post.post_id}`} className="block overflow-hidden rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                <PostThumbnail post={post} campaignId={selected} />
              </Link>
              <div className="pt-3">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <strong className="truncate text-white">@{post.profile.username}</strong>
                  <time className="shrink-0 text-slate" dateTime={post.content.published_at ?? undefined}>{date(post.content.published_at)}</time>
                </div>
                <p className="mt-2 line-clamp-2 min-h-10 break-words text-sm leading-5 text-white/75">{post.content.caption || 'Publicação sem legenda.'}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4 border-y border-white/10 py-3 text-xs text-slate" aria-label={`Métricas do post ${post.post_id}`}>
                  <Metric icon={Heart} label="Curtidas" value={post.metrics.likes} />
                  <Metric icon={MessageCircle} label="Comentários" value={post.metrics.comments} />
                  <Metric icon={Activity} label="Interações" value={post.metrics.observed_interactions} />
                  <span className="ml-auto rounded-full border border-white/10 px-2 py-1">{post.content.format}</span>
                </div>
                <Link to={`/conteudos/${post.post_id}`} aria-label={`Detalhes do post ${post.post_id}`} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white">
                  Ver detalhes <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </DataFrame>
  )
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number | null }) {
  return <span className="inline-flex items-center gap-1.5" title={label}><Icon className="h-3.5 w-3.5" /><span className="font-mono text-white/85">{number(value)}</span><span className="sr-only">{label}</span></span>
}
