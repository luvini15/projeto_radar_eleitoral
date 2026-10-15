import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Bookmark, Eye, Film, Heart, Image as ImageIcon, Layers, MessageCircle, Play, Repeat2, Share2 } from 'lucide-react'
import type { Post } from '@/types/radar'
import { Empty, InstagramLink } from './ApiData'
import { date, number } from '@/utils/apiFormat'
import { useProtectedImage } from '@/lib/useProtectedImage'

function embedUrl(url: string | null) {
  try {
    const parsed = new URL(url || '')
    if (parsed.protocol !== 'https:' || !(parsed.hostname === 'instagram.com' || parsed.hostname.endsWith('.instagram.com'))) return null
    const match = parsed.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?$/)
    return match ? `https://www.instagram.com/${match[1]}/${match[2]}/embed/` : null
  } catch { return null }
}

export function LatestPostCard({ post, detail = false, campaignId }: { post: Post | null; detail?: boolean; campaignId?: string }) {
  const [imageFailed, setImageFailed] = React.useState(false)
  const [showEmbed, setShowEmbed] = React.useState(false)
  const isReel = post?.content.format === 'Reels'
  const isCarousel = post?.content.format === 'Carrossel'
  const Icon = isReel ? Film : isCarousel ? Layers : ImageIcon
  const embed = post ? embedUrl(post.content.url) : null
  const protectedPreview = useProtectedImage(post && campaignId ? `/campaigns/${campaignId}/posts/${post.post_id}/thumbnail` : null)
  const preview = campaignId ? protectedPreview : post?.content.thumbnail_url
  React.useEffect(() => setImageFailed(false), [preview])

  if (!post) return <article aria-label={detail ? 'Publicação selecionada' : 'Último post do perfil'}><Empty>Ainda não há publicações coletadas do perfil principal desta campanha.</Empty></article>

  const metrics = [
    ['Curtidas', post.metrics.likes, Heart],
    ['Comentários', post.metrics.comments, MessageCircle],
    ...(isReel ? [['Visualizações', post.metrics.views, Eye], ['Reproduções', post.metrics.plays, Repeat2]] as const : []),
    ['Compartilhamentos', post.metrics.shares, Share2],
    ['Salvamentos', post.metrics.saves, Bookmark],
  ] as const

  return (
    <article aria-label={detail ? 'Publicação selecionada' : 'Último post do perfil'} className="min-w-0">
      <div className="mb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate">{detail ? 'Conteúdo' : 'Publicação mais recente'}</p>
        <h2 className="mt-1 text-2xl font-semibold text-white">{detail ? 'Publicação selecionada' : 'Último post'}</h2>
      </div>
      <header className="flex items-center gap-3 border-b border-white/10 pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm font-semibold uppercase text-white">
          {post.profile.username.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-white">@{post.profile.username}</h2>
          <p className="mt-0.5 text-xs text-slate">{date(post.content.published_at)} · {post.content.format}</p>
        </div>
        {!detail ? (
          <Link
            to={`/conteudos/${post.post_id}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/85 hover:bg-white/5 hover:text-white"
          >
            Ver detalhes <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </header>

      <div className={`relative mt-4 flex items-center justify-center overflow-hidden border border-white/10 bg-[#090909] ${detail ? 'min-h-72 rounded-xl' : 'aspect-[4/3] max-h-[590px] rounded-sm'}`}>
        {showEmbed && embed ? (
          <iframe title={`Post de @${post.profile.username} no Instagram`} src={embed} className="h-[560px] w-full border-0" allow="encrypted-media; fullscreen" loading="lazy" />
        ) : (
          <>
            {preview && !imageFailed ? (
              <img src={preview} alt={`Prévia de ${post.content.format.toLowerCase()} de @${post.profile.username}`} className="h-full max-h-[590px] w-full object-contain" onError={() => setImageFailed(true)} />
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center text-slate"><Icon className="h-12 w-12" /><p className="text-sm">Prévia indisponível</p></div>
            )}
            {embed ? (
              <button type="button" onClick={() => setShowEmbed(true)} className="absolute bottom-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/85 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                <Play className="h-4 w-4" />{isReel ? 'Reproduzir Reel' : isCarousel ? 'Abrir carrossel' : 'Ver publicação'}
              </button>
            ) : null}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-white/10 py-4" aria-label="Métricas deste post">
        {metrics.map(([label, value, MetricIcon]) => (
          <div key={label} className="flex items-center gap-2" title={label}>
            <MetricIcon className="h-[18px] w-[18px] text-white/75" />
            <span className="font-mono text-sm font-semibold text-white">{number(value)}</span>
            <span className="sr-only">{label}</span>
          </div>
        ))}
        <span className="ml-auto text-xs text-slate">{number(post.metrics.observed_interactions)} interações observadas</span>
      </div>

      <div className="space-y-3 py-4 text-sm">
        <p className="whitespace-pre-wrap break-words leading-6 text-white/80"><strong className="mr-2 text-white">@{post.profile.username}</strong>{post.content.caption || 'Publicação sem legenda.'}</p>
        <InstagramLink url={post.content.url} />
        {showEmbed ? <p className="text-xs text-slate">Se a publicação não carregar aqui, abra no Instagram.</p> : isCarousel ? <p className="text-xs text-slate">A prévia mostra apenas a capa do carrossel.</p> : null}
        <p className="text-xs leading-5 text-slate">Dados coletados em {date(post.metrics.collected_at)}. Métricas não fornecidas aparecem como —.</p>
      </div>
    </article>
  )
}
