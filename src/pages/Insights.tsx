import { number } from '@/utils/apiFormat'
import * as React from 'react'
import { useCampaign, useCampaignData } from '@/lib/campaignContext'
import { DataFrame, Empty, Panel, InstagramLink } from '@/components/dashboard/ApiData'
import type { RankedPost } from '@/types/radar'
const rankings = {
  top_comments: ['Mais comentários','comments'],
  top_observed_interactions: ['Mais interações observadas','observed_interactions'],
  top_reels_views: ['Reels com mais visualizações','views'],
  top_reels_plays: ['Reels com mais reproduções','plays'],
} as const
export default function Insights() {
  const {limit} = useCampaign()
  const {data,error} = useCampaignData<{rankings: Record<keyof typeof rankings,RankedPost[]>}>('rankings', `limit_per_profile=${limit}&top_n=10`)
  const [ranking,setRanking] = React.useState<keyof typeof rankings>('top_comments')
  const [label,metric] = rankings[ranking]
  const posts = data?.rankings[ranking] || []
  return <DataFrame data={data} error={error}>
    <p className="text-sm text-slate">Rankings calculados com as métricas coletadas. A comparação descreve os resultados observados; não contém recomendações geradas por IA.</p>
    <label className="flex flex-col gap-2 text-sm">Comparar por<select className="h-10 rounded-md bg-muted px-3" value={ranking} onChange={e => setRanking(e.target.value as keyof typeof rankings)}>{Object.entries(rankings).map(([key,[title]]) => <option key={key} value={key}>{title}</option>)}</select></label>
    <Panel title={label}>{posts.length ? <ol className="divide-y divide-border">{posts.map((p,index) => <li key={p.post_id} className="flex items-start gap-4 py-5"><span className="font-mono text-xl text-blue">{index+1}</span><div className="min-w-0 flex-1"><p className="text-sm text-slate">@{p.username} · {p.format}</p><p className="my-2 line-clamp-3 break-words">{p.caption || 'Sem legenda'}</p><InstagramLink url={p.url}/></div><span className="font-mono text-lg">{number(p[metric])}</span></li>)}</ol> : <Empty>Sem métricas disponíveis para este ranking.</Empty>}</Panel>
  </DataFrame>
}
