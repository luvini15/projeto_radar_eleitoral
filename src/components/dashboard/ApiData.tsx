import { number } from '@/utils/apiFormat'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useCampaign } from '@/lib/campaignContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function InstagramLink({ url }: { url?: string | null }) {
  let safe = false
  try {
    const parsed = new URL(url || '')
    safe = parsed.protocol === 'https:' && (parsed.hostname === 'instagram.com' || parsed.hostname.endsWith('.instagram.com'))
  } catch { /* Missing or malformed source URL. */ }
  return safe ? <a href={url!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-blue/80 transition-colors hover:text-blue">Abrir no Instagram <span aria-hidden="true">↗</span></a> : <span className="text-slate">Link indisponível</span>
}

export function Panel({ title, children }: {title: string; children: ReactNode}) {
  return <Card><CardHeader className="border-b border-white/[0.07] pb-4"><p className="font-mono text-[9px] uppercase tracking-[.17em] text-blue/70">Análise</p><CardTitle>{title}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card>
}

export function Metrics({ items }: { items: readonly (readonly [string, number | null | undefined])[] }) {
  return <dl className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-3">{items.map(([label, value]) => <Card key={label} className="p-5"><dt className="relative z-[1] text-[10px] uppercase tracking-[.12em] text-slate">{label}</dt><dd className={`relative z-[1] mt-3 break-words font-mono text-ink ${value==null?'text-sm':'text-2xl'}`}>{value==null?'Métrica indisponível':number(value)}</dd></Card>)}</dl>
}

export function Empty({ children = 'Ainda não há dados coletados para esta seleção.' }: {children?: ReactNode}) {
  return <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-6 text-sm text-slate"><p>{children}</p><Link className="mt-4 inline-flex rounded-xl border border-white/15 px-4 py-2 font-semibold text-white/80 transition-colors hover:bg-white/5 hover:text-white" to="/configuracoes">Gerenciar perfis e coleta</Link></div>
}

export function DataFrame({ data, error, children, showContext = true }: {data: unknown; error?: string; children: ReactNode; showContext?: boolean}) {
  const campaign = useCampaign()
  if (campaign.error || error) return <div role="alert" className="space-y-3 rounded-2xl border border-alert/50 bg-alert/[0.06] p-5"><p>{campaign.error || error}</p><Button onClick={campaign.refresh}>Tentar novamente</Button></div>
  if (campaign.loading) return <p role="status" className="text-sm text-slate">Carregando campanhas…</p>
  if (!campaign.selected) return <Empty>Cadastre uma campanha para começar a acompanhar seus perfis.</Empty>
  if (!data) return <p role="status" className="text-sm text-slate">Carregando dados da campanha…</p>
  const selectedName = campaign.scopeName
  return <div className="space-y-6">{showContext ? <div className="flex flex-wrap items-center gap-2 text-xs text-slate"><span className="status-pulse h-1.5 w-1.5 rounded-full bg-positive text-positive" /><strong className="font-medium text-white/80">{selectedName}</strong><span>·</span><span>Até {campaign.limit} posts recentes por perfil · {campaign.days} dias</span><span>·</span><span>última coleta disponível</span></div> : null}{children}</div>
}

export function DataTable({ headers, children }: {headers: string[]; children: ReactNode}) {
  return <div className="thin-scrollbar max-w-full overflow-x-auto rounded-xl border border-border"><table className="w-full text-left text-sm"><thead className="bg-white/[0.035] text-[10px] uppercase tracking-[.1em] text-slate"><tr>{headers.map(header => <th key={header} className="whitespace-nowrap p-3.5 font-semibold">{header}</th>)}</tr></thead><tbody className="divide-y divide-border [&_tr]:transition-colors [&_tr:hover]:bg-white/[0.025]">{children}</tbody></table></div>
}
