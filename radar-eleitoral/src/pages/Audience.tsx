import * as React from 'react'
import { Users, TrendingUp, LockKeyhole, Database } from 'lucide-react'
import { getFollowersHistory } from '@/services/api'
import type { FollowersHistoryResponse } from '@/types/api'
import { PageLoader } from '@/components/dashboard/PageLoader'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNumber } from '@/utils/metrics'

export default function Audience() {
  const [data,setData]=React.useState<FollowersHistoryResponse|null>(null)
  const load=React.useCallback(()=>getFollowersHistory().then(setData),[])
  React.useEffect(()=>{load()},[load]); React.useEffect(()=>{const h=()=>load();window.addEventListener('radar:data-updated',h);return()=>window.removeEventListener('radar:data-updated',h)},[load])
  if(!data)return <PageLoader/>
  const client=data.profiles.find(p=>p.role==='CLIENT')
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><MetricCard label="Seguidores públicos" value={client?.current_followers!=null?formatNumber(client.current_followers):'N/D'} deltaLabel="Snapshot mais recente" icon={Users}/><MetricCard label="Crescimento observado" value={client?.growth_absolute!=null?`${client.growth_absolute>=0?'+':''}${formatNumber(client.growth_absolute)}`:'N/D'} deltaLabel={`${client?.days_with_data??0} dia(s) com histórico`} icon={TrendingUp}/><MetricCard label="Dias de histórico" value={String(client?.days_with_data??0)} deltaLabel="Até 60 dias na janela" icon={Database}/><MetricCard label="Dados privados" value="Meta API" deltaLabel="Ainda não conectada" icon={LockKeyhole}/></div>
    <Card><CardHeader><CardTitle>Seguidores dos perfis monitorados</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{data.profiles.map(p=><div key={p.profile_id} className="rounded-lg border border-border p-4"><div className="flex justify-between"><div><p className="font-semibold">{p.full_name??p.username}</p><p className="text-xs text-slate">@{p.username} · {p.role}</p></div><p className="font-display text-2xl font-bold">{p.current_followers!=null?formatNumber(p.current_followers):'N/D'}</p></div></div>)}</CardContent></Card>
    <Card><CardHeader><CardTitle>Dados que não são exibidos sem fonte oficial</CardTitle></CardHeader><CardContent className="text-sm leading-relaxed text-slate">Faixa etária, gênero, localização dos seguidores, visitas ao perfil, cliques no link, contas alcançadas e contas engajadas são métricas privadas/condicionadas à Meta API. O Radar não preenche esses campos com estimativas ou valores demonstrativos.</CardContent></Card>
  </div>
}
