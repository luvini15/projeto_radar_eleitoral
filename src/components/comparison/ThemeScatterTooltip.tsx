import type { AnalyticsSummary } from '@/types/api'

type Point = AnalyticsSummary & {theme:string;x:number;y:number}
const fmt=(value:number|null|undefined)=>value==null?'N/D':value.toLocaleString('pt-BR',{maximumFractionDigits:1})

export function ThemeScatterTooltip({active,payload}:{active?:boolean;payload?:Array<{payload:Point}>}) {
  const point=payload?.[0]?.payload
  if(!active||!point)return null
  const rows=[['Publicações',point.posts],['Curtidas médias',point.likes_average],['Interações médias',point.interactions_average],['Comentários médios',point.comments_average],['Views médias',point.views_average],['Plays médios',point.plays_average]] as const
  return <div className="min-w-56 max-w-80 rounded-xl border border-white/15 bg-[#101010] p-3.5 text-xs text-white "><b className="text-sm text-white">{point.theme}</b>{rows.map(([label,value])=><div key={label} className="mt-1.5 flex justify-between gap-5"><span className="text-slate">{label}</span><b>{fmt(value)}</b></div>)}</div>
}
