import * as React from 'react'
import { Film, Image as ImageIcon, Layers } from 'lucide-react'
import type { Post } from '@/types/radar'
import { apiAsset } from '@/services/radarApi'
export function PostThumbnail({post, campaignId}: {post: Post; campaignId: string}) {
  const [failed,setFailed] = React.useState(false)
  const [visible,setVisible] = React.useState(false)
  const root = React.useRef<HTMLDivElement>(null)
  const preview = apiAsset(`/campaigns/${campaignId}/posts/${post.post_id}/thumbnail`)
  React.useEffect(() => setFailed(false), [preview])
  React.useEffect(() => {
    const element = root.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect() }
    }, {rootMargin: '320px'})
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const Icon = post.content.format === 'Reels' ? Film : post.content.format === 'Carrossel' ? Layers : ImageIcon
  return <div ref={root} className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-[#0c0c0c]">
    {visible && !failed ? <img src={preview} alt={`Prévia de @${post.profile.username}`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" onError={() => setFailed(true)} /> : failed ? <span className="flex flex-col items-center gap-2 p-4 text-center text-xs text-slate"><Icon className="h-8 w-8" />Prévia indisponível</span> : <span className="h-7 w-7 animate-pulse rounded-full bg-white/10" aria-label="Carregando prévia" />}
    <span className="absolute right-2 top-2 rounded-full bg-black/75 p-2 text-white" title={post.content.format}><Icon className="h-4 w-4" /></span>
  </div>
}
