import * as React from 'react'
import { BarChart3, AlertTriangle, CheckCircle2, Database } from 'lucide-react'
import { getBenchmark, getRankings } from '@/services/api'
import type { BenchmarkResponse, RankingsResponse } from '@/types/api'
import { PageLoader } from '@/components/dashboard/PageLoader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const fmt=(v:number|null)=>v==null?'N/D':v.toLocaleString('pt-BR',{maximumFractionDigits:2})
export default function Insights(){
 const[bench,setBench]=React.useState<BenchmarkResponse|null>(null);const[rank,setRank]=React.useState<RankingsResponse|null>(null);const load=React.useCallback(async()=>{const[b,r]=await Promise.all([getBenchmark(),getRankings()]);setBench(b);setRank(r)},[]);React.useEffect(()=>{load()},[load]);React.useEffect(()=>{const h=()=>load();window.addEventListener('radar:data-updated',h);return()=>window.removeEventListener('radar:data-updated',h)},[load]);if(!bench||!rank)return <PageLoader/>;
 const client=bench.profiles.find(p=>p.role==='CLIENT');const competitors=bench.profiles.filter(p=>p.role==='COMPETITOR');const maxComments=[...competitors].sort((a,b)=>(b.avg_comments_per_post??-1)-(a.avg_comments_per_post??-1))[0];const maxViews=[...competitors].sort((a,b)=>(b.avg_views_per_reel??-1)-(a.avg_views_per_reel??-1))[0];const topPost=rank.rankings.top_observed_interactions[0];
 const observations=[
  {title:'Comparação de comentários',icon:BarChart3,text:client&&maxComments?`${maxComments.full_name} apresenta ${fmt(maxComments.avg_comments_per_post)} comentários por post em média, contra ${fmt(client.avg_comments_per_post)} do perfil do cliente no recorte atual.`:'Dados insuficientes para comparar comentários.'},
  {title:'Comparação de views em Reels',icon:BarChart3,text:client&&maxViews?`${maxViews.full_name} apresenta ${fmt(maxViews.avg_views_per_reel)} views por Reel em média, contra ${fmt(client.avg_views_per_reel)} do perfil do cliente.`:'Dados insuficientes para comparar views.'},
  {title:'Conteúdo com maior interação observada',icon:CheckCircle2,text:topPost?`O post de @${topPost.username} com maior interação observada no recorte soma ${fmt(topPost.observed_interactions)} interações públicas observáveis.`:'Nenhum ranking disponível.'},
  {title:'Limitação de cobertura',icon:AlertTriangle,text:'Shares e saves não estão disponíveis de forma completa no scraping público. Por isso, o Radar usa “interações observadas” e não apresenta taxa de engajamento completa como se fosse oficial.'},
 ]
 return <div className="space-y-6"><div className="rounded-xl border border-blue/20 bg-blue/5 p-4 text-sm text-blue-dark"><span className="font-semibold">Inteligência baseada em dados reais:</span> esta tela apresenta observações matemáticas do recorte monitorado. Não há textos demonstrativos nem inferência de métricas ausentes.</div><div className="grid gap-4 md:grid-cols-2">{observations.map(({title,text,icon:Icon})=><Card key={title}><CardHeader><CardTitle className="flex items-center gap-2"><Icon className="h-4 w-4 text-blue"/>{title}</CardTitle></CardHeader><CardContent className="text-sm leading-relaxed text-slate">{text}</CardContent></Card>)}</div><Card><CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-4 w-4"/>Metodologia</CardTitle></CardHeader><CardContent className="text-sm text-slate">Comparações usam os últimos conteúdos armazenados por perfil e o snapshot mais recente de cada post. Likes ocultos ficam N/D; views e plays são comparados somente quando existem.</CardContent></Card></div>
}
