import * as React from 'react'
import { ExternalLink, Search } from 'lucide-react'
import { getPosts } from '@/services/api'
import type { PostItem, PostsResponse } from '@/types/api'
import { PageLoader } from '@/components/dashboard/PageLoader'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { formatNumber } from '@/utils/metrics'

const metric = (value: number | null) => value == null ? 'N/D' : formatNumber(value)

export default function Content() {
  const [data, setData] = React.useState<PostsResponse | null>(null)
  const [search, setSearch] = React.useState('')
  const [profile, setProfile] = React.useState('ALL')
  const [format, setFormat] = React.useState('ALL')

  const load = React.useCallback(() => getPosts().then(setData), [])
  React.useEffect(() => { load() }, [load])
  React.useEffect(() => { const h = () => load(); window.addEventListener('radar:data-updated', h); return () => window.removeEventListener('radar:data-updated', h) }, [load])
  if (!data) return <PageLoader />

  const profiles = [...new Map(data.posts.map((p) => [p.profile.username, p.profile])).values()]
  const formats = [...new Set(data.posts.map((p) => p.content.format))]
  const filtered = data.posts.filter((p) => {
    const q = search.toLowerCase()
    return (profile === 'ALL' || p.profile.username === profile)
      && (format === 'ALL' || p.content.format === format)
      && (!q || (p.content.caption ?? '').toLowerCase().includes(q) || p.profile.full_name?.toLowerCase().includes(q))
  })

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue/20 bg-blue/5 p-4 text-sm text-blue-dark">
        {filtered.length} conteúdos reais no recorte. Likes ocultos e métricas não fornecidas aparecem como N/D; shares e saves não são estimados.
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_220px_180px]">
        <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por legenda..." className="pl-9" /></div>
        <Select value={profile} onChange={(e) => setProfile(e.target.value)}><option value="ALL">Todos os perfis</option>{profiles.map((p) => <option key={p.username} value={p.username}>{p.full_name ?? p.username}</option>)}</Select>
        <Select value={format} onChange={(e) => setFormat(e.target.value)}><option value="ALL">Todos os formatos</option>{formats.map((f) => <option key={f}>{f}</option>)}</Select>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-white thin-scrollbar">
        <table className="w-full min-w-[1200px] text-sm">
          <thead className="bg-bg text-[11px] uppercase tracking-wide text-slate"><tr>
            <th className="px-4 py-3 text-left">Conteúdo</th><th className="px-3 py-3 text-left">Perfil</th><th className="px-3 py-3">Data</th><th className="px-3 py-3">Formato</th><th className="px-3 py-3">Likes</th><th className="px-3 py-3">Comentários</th><th className="px-3 py-3">Views</th><th className="px-3 py-3">Plays</th><th className="px-3 py-3">Interações observadas</th><th className="px-3 py-3">Abrir</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {filtered.map((p: PostItem) => <tr key={p.post_id} className="hover:bg-bg/60">
              <td className="px-4 py-3"><div className="flex items-center gap-3">{p.content.thumbnail_url ? <img src={p.content.thumbnail_url} className="h-10 w-10 rounded-md object-cover" /> : <div className="h-10 w-10 rounded-md bg-bg" />}<div className="max-w-[340px]"><p className="truncate font-medium text-blue-dark">{p.content.caption || 'Sem legenda'}</p><p className="text-xs text-slate">{p.content.theme}{p.content.location_name ? ` · ${p.content.location_name}` : ''}</p></div></div></td>
              <td className="px-3 py-3"><div>{p.profile.full_name ?? p.profile.username}</div><Badge variant={p.profile.role === 'CLIENT' ? 'dark' : 'neutral'}>{p.profile.role}</Badge></td>
              <td className="px-3 py-3 text-center">{p.content.published_at ? new Date(p.content.published_at).toLocaleDateString('pt-BR') : 'N/D'}</td>
              <td className="px-3 py-3 text-center">{p.content.format}</td>
              <td className="px-3 py-3 text-center">{metric(p.metrics.likes)}</td><td className="px-3 py-3 text-center">{metric(p.metrics.comments)}</td><td className="px-3 py-3 text-center">{metric(p.metrics.views)}</td><td className="px-3 py-3 text-center">{metric(p.metrics.plays)}</td><td className="px-3 py-3 text-center font-semibold">{metric(p.metrics.observed_interactions)}</td>
              <td className="px-3 py-3 text-center"><a href={p.content.url} target="_blank" rel="noreferrer" className="inline-flex text-blue"><ExternalLink className="h-4 w-4" /></a></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
