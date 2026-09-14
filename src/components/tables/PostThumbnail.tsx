import * as React from 'react'
import { Film, Image as ImageIcon, Layers } from 'lucide-react'
import type { Post } from '@/types/radar'
export function PostThumbnail({post}: {post: Post}) {
  const [failed,setFailed] = React.useState(false)
  React.useEffect(() => setFailed(false), [post.content.thumbnail_url])
  const Icon = post.content.format === 'Reels' ? Film : post.content.format === 'Carrossel' ? Layers : ImageIcon
  return <div className="relative flex h-24 w-20 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
    {post.content.thumbnail_url && !failed ? <img src={post.content.thumbnail_url} alt={`Prévia de @${post.profile.username}`} className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <span className="flex flex-col items-center gap-1 p-2 text-center text-[10px] text-slate"><Icon className="h-6 w-6" />Sem prévia</span>}
    <span className="absolute bottom-1 right-1 rounded bg-black/80 p-1 text-white" title={post.content.format}><Icon className="h-3 w-3" /></span>
  </div>
}
