import type { ReactNode } from 'react'
import { number } from '@/utils/apiFormat'
export function ChartTooltip({active,payload,label}:{active?:boolean;payload?:ReadonlyArray<{name?:string;value?:number|string|ReadonlyArray<number|string>|null;color?:string;payload?:Record<string,unknown>}>;label?:unknown}) {
  if(!active||!payload?.length)return null
  const rows=payload.filter(row=>row.value!=null)
  return <div className="max-w-80 rounded-xl border border-white/15 bg-[#101010] p-3.5 text-xs text-white"><p className="mb-2 font-medium">{String(label??'')}</p>{rows.map((row,index)=><div className="mt-1.5 flex justify-between gap-5" key={index}><span className="text-white/60">{row.name}</span><b className="font-mono font-medium">{typeof row.value==='number'?number(row.value):String(row.value??'Indisponível')}</b></div>)}{typeof payload[0]?.payload?.posts==='number'&&!rows.some(row=>row.name==='Publicações')?<p className="mt-2 border-t border-white/10 pt-2 text-white/50">{number(payload[0].payload.posts)} publicações na amostra</p>:null}{typeof payload[0]?.payload?.comments==='number'&&!rows.some(row=>row.name==='Comentários')?<p className="mt-2 text-white/50">Comentários: {number(payload[0].payload.comments)}</p>:null}</div>
}
export function InsufficientData({children='São necessárias pelo menos duas coletas comparáveis para calcular evolução.'}:{children?:ReactNode}) {
  return <div role="status" className="my-4 rounded-xl border border-dashed border-white/15 bg-white/[.02] p-6"><strong className="text-[10px] uppercase tracking-widest text-white/70">Dados insuficientes</strong><p className="mt-2 text-sm leading-6 text-slate">{children}</p></div>
}
