import type { Territory } from '@/types/api'
import { territorialSource } from '@/utils/territorial'
export function TerritorialEvidence({items}:{items:Territory[]}) {
  return <ul className="space-y-2 text-sm">{items.length ? items.map((item,i)=><li key={`${item.region_id}-${i}`} className="rounded-lg border border-border p-3"><b>{item.region || 'RA não atribuída'}</b><p className="text-xs text-slate">{territorialSource(item.source)}{item.source !== 'NONE' ? ` · ${item.confidence}` : ''}</p>{item.evidence ? <blockquote className="mt-2 break-words text-slate">“{item.evidence}”</blockquote> : null}</li>) : <li className="text-slate">Sem evidência territorial.</li>}</ul>
}
