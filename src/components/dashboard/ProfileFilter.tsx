import { useCampaignData } from '@/lib/campaignContext'
export function ProfileFilter({value,onChange}:{value:string;onChange:(id:string)=>void}) {
  const {data}=useCampaignData<{profiles:{id:number;username:string}[]}>('', '')
  return <label className="flex min-w-0 flex-col gap-2 text-xs text-slate">Recorte adicional por perfil<select aria-label="Perfil da análise" className="h-10 max-w-sm rounded-md border border-white/15 bg-muted px-3 text-sm text-white" value={value} onChange={e=>onChange(e.target.value)}><option value="">Todos os perfis da seleção</option>{data?.profiles.map(p=><option key={p.id} value={p.id}>@{p.username}</option>)}</select></label>
}
