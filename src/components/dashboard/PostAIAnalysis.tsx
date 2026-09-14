import * as React from 'react'
import { api } from '@/services/radarApi'
import { Panel } from './ApiData'
import { date } from '@/utils/apiFormat'
interface Analysis {text: string; model: string; created_at: string; cached: boolean; evidence: {comments: {sample_size: number}}}
export function PostAIAnalysis({campaignId, postId, version}: {campaignId: string; postId: number; version: string}) {
  const [data,setData] = React.useState<Analysis | null>(null)
  const [error,setError] = React.useState('')
  const [loading,setLoading] = React.useState(true)
  const [retry,refresh] = React.useReducer((n: number) => n+1,0)
  React.useEffect(() => {
    const controller = new AbortController()
    setLoading(true);setError('');setData(null)
    api<Analysis>(`/campaigns/${campaignId}/posts/${postId}/analysis`, {}, controller.signal)
      .then(result => {if (!controller.signal.aborted) setData(result)})
      .catch(cause => {if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Falha ao gerar análise.')})
      .finally(() => {if (!controller.signal.aborted) setLoading(false)})
    return () => controller.abort()
  }, [campaignId,postId,version,retry])
  return <Panel title="Leitura do post">
    <p className="mb-4 text-xs leading-5 text-slate">Resumo das métricas, da legenda e dos comentários coletados nos últimos 90 dias.</p>
    {loading ? <p role="status" className="text-sm">Preparando análise do post…</p> : error ? <div className="space-y-3 text-sm"><p role="alert">{error}</p><button className="rounded-full border border-border bg-muted px-4 py-2" onClick={refresh}>Tentar análise novamente</button></div> : data ? <>
      <div className="whitespace-pre-wrap break-words text-sm leading-7">{data.text}</div>
      <p className="mt-4 border-t border-white/10 pt-3 text-xs text-slate">Atualizado em {date(data.created_at)} · {data.cached ? 'Resultado salvo' : 'Novo resultado'}</p>
      <p className="mt-2 text-xs text-slate">Baseado em {data.evidence.comments.sample_size} comentário(s) coletado(s). A amostra pode ser parcial.</p>
    </> : null}
  </Panel>
}
