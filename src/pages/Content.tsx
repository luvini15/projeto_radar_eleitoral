import { Link } from 'react-router-dom'
import { PostThumbnail } from '@/components/tables/PostThumbnail'
import { number, date } from '@/utils/apiFormat'
import * as React from 'react'
import { useCampaign, useCampaignData } from '@/lib/campaignContext'
import { DataFrame, DataTable, Empty } from '@/components/dashboard/ApiData'
import { Input } from '@/components/ui/input'
import type { Post } from '@/types/radar'
export default function Content() {
  const { limit } = useCampaign()
  const {data, error} = useCampaignData<{posts: Post[]}>('posts', `limit_per_profile=${limit}`)
  const [search, setSearch] = React.useState('')
  const [format, setFormat] = React.useState('')
  const [order, setOrder] = React.useState('date')
  const posts = (data?.posts || []).filter(p => (!format || p.content.format === format) && `${p.profile.username} ${p.content.caption || ''}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
    .toSorted((a,b) => order === 'comments' ? (b.metrics.comments ?? -1) - (a.metrics.comments ?? -1) : order === 'interactions' ? (b.metrics.observed_interactions ?? -1) - (a.metrics.observed_interactions ?? -1) : (b.content.published_at || '').localeCompare(a.content.published_at || ''))
  return <DataFrame data={data} error={error}>
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm">Buscar perfil ou legenda<Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar conteúdos" /></label>
      <label className="flex flex-col gap-2 text-sm">Formato<select aria-label="Formato" className="h-10 rounded-md bg-muted px-3" value={format} onChange={e => setFormat(e.target.value)}><option value="">Todos os formatos</option>{[...new Set(data?.posts.map(p => p.content.format))].map(f => <option key={f}>{f}</option>)}</select></label>
      <label className="flex flex-col gap-2 text-sm">Ordenar<select aria-label="Ordenar" className="h-10 rounded-md bg-muted px-3" value={order} onChange={e => setOrder(e.target.value)}><option value="date">Mais recentes</option><option value="comments">Mais comentários</option><option value="interactions">Mais interações</option></select></label>
    </div>
    <p className="text-sm text-slate">{posts.length} conteúdos encontrados</p>
    {!posts.length ? <Empty>{data?.posts.length ? 'Nenhum conteúdo corresponde aos filtros. Ajuste a busca ou o formato.' : 'Nenhum conteúdo coletado para esta campanha.'}</Empty> : <DataTable headers={['Prévia', 'Conteúdo', 'Formato', 'Curtidas', 'Comentários', 'Interações', 'Detalhes']}>{posts.map(p => <tr key={p.post_id}>
      <td className="p-3"><Link to={`/conteudos/${p.post_id}`} aria-label={`Abrir prévia do post ${p.post_id}`}><PostThumbnail post={p} /></Link></td><td className="min-w-48 max-w-xs p-3"><p className="font-medium text-white/80">@{p.profile.username}</p><p className="line-clamp-2">{p.content.caption || 'Sem legenda'}</p><p className="mt-1 text-xs text-slate">{date(p.content.published_at)}</p></td><td className="p-3">{p.content.format}</td><td className="p-3">{number(p.metrics.likes)}</td><td className="p-3">{number(p.metrics.comments)}</td><td className="p-3">{number(p.metrics.observed_interactions)}</td><td className="p-3"><Link className="inline-flex whitespace-nowrap rounded-full border border-white/15 px-4 py-2 text-white/80 hover:bg-white/5 hover:text-white" to={`/conteudos/${p.post_id}`} aria-label={`Detalhes do post ${p.post_id}`}>Abrir</Link></td>
    </tr>)}</DataTable>}

  </DataFrame>
}
