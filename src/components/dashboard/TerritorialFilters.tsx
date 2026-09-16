import type { Region } from '@/types/api'

export interface TerritorialFilterValue { regionId:number|null; startDate:string; endDate:string; theme?:string }
export function TerritorialFilters({value,onChange,regions,themes}: {value:TerritorialFilterValue;onChange:(next:TerritorialFilterValue)=>void;regions:Region[];themes?:string[]}) {
  return <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-4">
    <label className="text-xs font-semibold uppercase text-slate">Região Administrativa<select className="mt-1 w-full rounded-md border border-border bg-card p-2 text-sm normal-case" value={value.regionId??''} onChange={e=>onChange({...value,regionId:e.target.value?Number(e.target.value):null})}><option value="">Todas as regiões</option>{regions.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
    <label className="text-xs font-semibold uppercase text-slate">Data inicial<input className="mt-1 w-full rounded-md border border-border p-2 text-sm normal-case" type="date" value={value.startDate} onChange={e=>onChange({...value,startDate:e.target.value})}/></label>
    <label className="text-xs font-semibold uppercase text-slate">Data final<input className="mt-1 w-full rounded-md border border-border p-2 text-sm normal-case" type="date" value={value.endDate} onChange={e=>onChange({...value,endDate:e.target.value})}/></label>
    {themes&&<label className="text-xs font-semibold uppercase text-slate">Categoria<select className="mt-1 w-full rounded-md border border-border bg-card p-2 text-sm normal-case" value={value.theme??''} onChange={e=>onChange({...value,theme:e.target.value||undefined})}><option value="">Todas</option>{themes.map(t=><option key={t}>{t}</option>)}</select></label>}
  </div>
}

export const defaultPeriod = () => { const end=new Date(); const start=new Date(end); start.setDate(start.getDate()-29); return {regionId:null,startDate:start.toISOString().slice(0,10),endDate:end.toISOString().slice(0,10)} }
