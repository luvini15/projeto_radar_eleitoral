import * as React from 'react'
import { Film, Image as ImageIcon, Layers, Play, Heart, MessageCircle, Eye, Repeat2, Bookmark, Share2 } from 'lucide-react'
import type { Post } from '@/types/radar'
import { Empty, InstagramLink } from './ApiData'
import { number, date } from '@/utils/apiFormat'

function embedUrl(url: string | null) {
  try {
    const parsed = new URL(url || '')
    if (parsed.protocol !== 'https:' || !(parsed.hostname === 'instagram.com' || parsed.hostname.endsWith('.instagram.com'))) return null
    const match = parsed.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?$/)
    return match ? `https://www.instagram.com/${match[1]}/${match[2]}/embed/` : null
  } catch { return null }
}

export function LatestPostCard({post, detail = false}: {post: Post | null; detail?: boolean}) {
  const [imageFailed,setImageFailed] = React.useState(false)
  const [showEmbed,setShowEmbed] = React.useState(false)
  const isReel = post?.content.format === 'Reels'
  const isCarousel = post?.content.format === 'Carrossel'
  const Icon = isReel ? Film : isCarousel ? Layers : ImageIcon
  const embed = post ? embedUrl(post.content.url) : null
  React.useEffect(() => setImageFailed(false), [post?.content.thumbnail_url])
  return <article aria-label={detail ? "Publicação selecionada" : "Último post do perfil"} className="relative min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#111111] p-5">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-5">
      <div><p className="font-mono text-[10px] uppercase text-slate">Acompanhamento do perfil</p><h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">{detail ? 'Publicação selecionada' : 'Último post'}</h2><p className="mt-2 text-xs text-slate">{detail ? 'Mídia e métricas específicas desta publicação' : 'Publicação mais recente coletada do perfil principal'}</p></div>
      {post ? <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs"><Icon className="h-4 w-4" />{post.content.format}</span> : null}
    </header>
    {!post ? <div className="mt-5"><Empty>Ainda não há publicações coletadas do perfil principal desta campanha.</Empty></div> : <div className="mt-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><p className="font-semibold text-white">@{post.profile.username}</p><time className="text-xs text-slate" dateTime={post.content.published_at ?? undefined}>{date(post.content.published_at)}</time></div>
      <div className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#090909]">
        {showEmbed && embed ? <iframe title={`Post de @${post.profile.username} no Instagram`} src={embed} className="h-[480px] w-full border-0" allow="encrypted-media; fullscreen" loading="lazy" /> : <>
          {post.content.thumbnail_url && !imageFailed ? <img src={post.content.thumbnail_url} alt={`Prévia de ${post.content.format.toLowerCase()} de @${post.profile.username}`} className="max-h-[420px] w-full object-contain" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} /> : <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center text-slate"><Icon className="h-12 w-12" /><p className="text-sm">Prévia indisponível</p></div>}
          {embed ? <button type="button" onClick={() => setShowEmbed(true)} className="absolute bottom-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/85 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"><Play className="h-4 w-4" />{isReel ? 'Reproduzir Reel' : isCarousel ? 'Abrir carrossel' : 'Ver publicação'}</button> : null}
        </>}
      </div>
      {showEmbed ? <p className="text-xs text-slate">Se o Instagram não carregar a publicação aqui, use o link abaixo.</p> : isCarousel ? <p className="text-xs text-slate">Capa do carrossel. Abra a publicação para ver todas as imagens.</p> : null}
      <div className="space-y-2"><p className="line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-white/85">{post.content.caption || 'Publicação sem legenda.'}</p>
        {post.content.caption && post.content.caption.length > 160 ? <details className="text-sm"><summary className="cursor-pointer text-white/75 hover:text-white">Ler legenda completa</summary><p className="mt-2 whitespace-pre-wrap break-words text-slate">{post.content.caption}</p></details> : null}
        <InstagramLink url={post.content.url} />
      </div>
      <section aria-label="Métricas deste post" className="border-t border-white/10 pt-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Métricas deste post</h3><span className="text-xs text-slate">Interações observadas: {number(post.metrics.observed_interactions)}</span></div>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">{([
          ['Curtidas',post.metrics.likes,Heart], ['Comentários',post.metrics.comments,MessageCircle],
          ...(isReel ? [['Visualizações',post.metrics.views,Eye],['Reproduções',post.metrics.plays,Repeat2]] as const : []),
          ['Compartilhamentos',post.metrics.shares,Share2], ['Salvamentos',post.metrics.saves,Bookmark],
        ] as const).map(([label,value,MetricIcon]) => <div key={label} className="min-w-0 border-l border-white/10 py-2 pl-3"><dt className="flex items-center gap-2 text-[11px] text-slate"><MetricIcon className="h-3.5 w-3.5 shrink-0" />{label}</dt><dd className="mt-2 font-mono text-xl text-white">{number(value)}</dd></div>)}</dl>
        <p className="mt-3 text-xs leading-5 text-slate">Última coleta: {date(post.metrics.collected_at)}. {post.metrics.interactions_complete ? 'Interações completas.' : 'Interações parciais; métricas não fornecidas aparecem como —.'}</p>
      </section>
    </div>}
  </article>
}
