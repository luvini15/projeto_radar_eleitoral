import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { api } from '@/services/radarApi'
import { Panel } from './ApiData'
import { date } from '@/utils/apiFormat'

interface Analysis {
  text: string
  created_at: string
  cached: boolean
  evidence: { comments: { sample_size: number } }
}

interface Props {
  campaignId: string
  postId: number
  version: string
  disclosure?: boolean
}

export function PostAIAnalysis({ campaignId, postId, version, disclosure = false }: Props) {
  const [open, setOpen] = React.useState(!disclosure)
  const [data, setData] = React.useState<Analysis | null>(null)
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(!disclosure)
  const [retry, refresh] = React.useReducer((value: number) => value + 1, 0)

  React.useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setData(null)
    api<Analysis>(`/campaigns/${campaignId}/posts/${postId}/analysis`, {}, controller.signal)
      .then(result => { if (!controller.signal.aborted) setData(result) })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Falha ao gerar análise.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [campaignId, postId, version, retry, open])

  const result = (
    <>
      {loading ? <p role="status" className="text-sm">Lendo os dados do post…</p> : error ? (
        <div className="space-y-3 text-sm">
          <p role="alert">{error}</p>
          <button className="rounded-full border border-white/15 px-4 py-2 text-white/80 hover:bg-white/5" onClick={refresh}>Tentar novamente</button>
        </div>
      ) : data ? (
        <>
          <div className="whitespace-pre-wrap break-words text-sm leading-7 text-white/85">{data.text}</div>
          <p className="mt-4 border-t border-white/10 pt-3 text-xs text-slate">Atualizado em {date(data.created_at)} · {data.cached ? 'Resultado salvo' : 'Novo resultado'}</p>
          <p className="mt-2 text-xs text-slate">Baseado em {data.evidence.comments.sample_size} comentário(s) coletado(s). A amostra pode ser parcial.</p>
        </>
      ) : null}
    </>
  )

  if (disclosure) {
    return (
      <section className="border-y border-white/10">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(value => !value)}
          className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-white/85 hover:text-white"
        >
          <span><span className="mr-2 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-slate">Contexto</span>Ver leitura do post</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open ? <div className="border-t border-white/10 py-5">{result}</div> : null}
      </section>
    )
  }

  return (
    <Panel title="Leitura do post">
      <p className="mb-4 text-xs leading-5 text-slate">Resumo das métricas, da legenda e dos comentários coletados nos últimos 90 dias.</p>
      {result}
    </Panel>
  )
}
