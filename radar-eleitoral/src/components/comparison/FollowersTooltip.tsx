export function FollowersTooltip({active,payload,label}:{active?:boolean;payload?:Array<{name:string;value:number;color:string;payload:Record<string,number|null|string>}>;label?:string}) {
  if(!active||!payload?.length)return null
  return <div className="min-w-56 rounded-lg border border-border bg-white p-3 text-xs shadow-xl"><b>{label}</b>{payload.map(item=>{const delta=item.payload[`${item.name}__delta`];return <div key={item.name} className="mt-2" style={{color:item.color}}><div className="flex justify-between gap-5"><span>@{item.name}</span><b>{item.value.toLocaleString('pt-BR')}</b></div><p className="text-right text-[11px] text-slate">{typeof delta==='number'?`${delta>=0?'+':''}${delta.toLocaleString('pt-BR')} vs. snapshot anterior`:'Sem snapshot anterior'}</p></div>})}</div>
}
