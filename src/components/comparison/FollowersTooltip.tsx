import { date, number } from '@/utils/apiFormat'
export function FollowersTooltip({active,payload,label}:{active?:boolean;payload?:Array<{name:string;value:number;color:string;payload:Record<string,number|null|string>}>;label?:string}) {
  if(!active||!payload?.length)return null
  return <div className="min-w-56 max-w-80 rounded-xl border border-white/15 bg-[#101010] p-3.5 text-xs text-white"><b>{date(label)}</b>{payload.map(item=>{const delta=item.payload[`${item.name}__delta`];return <div key={item.name} className="mt-2" style={{color:item.color}}><div className="flex justify-between gap-5"><span>@{item.name}</span><b>{number(item.value)}</b></div><p className="text-right text-[11px] text-slate">{typeof delta==='number'?`${delta>=0?'+':''}${number(delta)} vs. snapshot anterior`:'Sem snapshot anterior'}</p></div>})}</div>
}
