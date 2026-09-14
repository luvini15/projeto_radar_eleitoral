import { number } from '@/utils/apiFormat'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useCampaign } from '@/lib/campaignContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
export function InstagramLink({ url }: { url?: string | null }) {
  let safe = false
  try { const parsed = new URL(url || ''); safe = parsed.protocol === 'https:' && (parsed.hostname === 'instagram.com' || parsed.hostname.endsWith('.instagram.com')) } catch { /* Missing or malformed source URL. */ }
  return safe ? <a href={url!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-white/75 hover:text-white">Abrir no Instagram <span aria-hidden="true">↗</span></a> : <span className="text-slate">Link indisponível</span>
}
export function Panel({ title, children }: {title: string; children: ReactNode}) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card>
}
export function Metrics({ items }: { items: readonly (readonly [string, number | null | undefined])[] }) {
  return <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">{items.map(([label, value]) => <Card key={label} className="p-5"><dt className="text-xs text-slate">{label}</dt><dd className="mt-3 font-mono text-2xl text-ink">{number(value)}</dd></Card>)}</dl>
}
export function Empty({ children = 'Ainda não há dados coletados para esta seleção.' }: {children?: ReactNode}) {
  return <div className="rounded-xl border border-dashed border-border p-6 text-sm text-slate"><p>{children}</p><Link className="mt-3 inline-flex rounded-full border border-white/15 px-4 py-2 font-medium text-white/80 hover:bg-white/5 hover:text-white" to="/configuracoes">Gerenciar perfis e coleta</Link></div>
}
export function DataFrame({ data, error, children, showContext = true }: {data: unknown; error?: string; children: ReactNode; showContext?: boolean}) {
  const c = useCampaign()
  if (c.error || error) return <div role="alert" className="space-y-3 rounded-xl border border-alert p-5"><p>{c.error || error}</p><Button onClick={c.refresh}>Tentar novamente</Button></div>
  if (c.loading) return <p role="status">Carregando campanhas…</p>
  if (!c.selected) return <Empty>Cadastre uma campanha para começar a acompanhar seus perfis.</Empty>
  if (!data) return <p role="status">Carregando dados da campanha…</p>
  return <div className="space-y-6">{showContext ? <p className="text-sm text-slate">{c.campaigns.find(item => String(item.id) === c.selected)?.name} · Até {c.limit} posts recentes por perfil · Última coleta disponível</p> : null}{children}</div>
}
export function DataTable({ headers, children }: {headers: string[]; children: ReactNode}) {
  return <div className="max-w-full overflow-x-auto rounded-xl border border-border"><table className="w-full text-left text-sm"><thead className="bg-muted text-xs text-slate"><tr>{headers.map(h => <th key={h} className="whitespace-nowrap p-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-border">{children}</tbody></table></div>
}
