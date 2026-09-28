import * as React from 'react'
import { Link } from 'react-router-dom'
import { BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,CartesianGrid } from 'recharts'
import { Card,CardContent,CardHeader,CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageLoader } from '@/components/dashboard/PageLoader'
import { TerritorialFilters,defaultPeriod,type TerritorialFilterValue } from '@/components/dashboard/TerritorialFilters'
import { TerritorialEvidence } from '@/components/dashboard/TerritorialEvidence'
import { territorialSource } from '@/utils/territorial'
import { useCampaign } from '@/lib/campaignContext'
import { getCampaign,getRegions,getTrends,getTrendPosts } from '@/services/api'
import type { Region,TrendsResponse,CampaignDetails,TerritorialTrend } from '@/types/api'

const themes=['Segurança','Infraestrutura','Transporte/Mobilidade','Saúde','Educação','Agro/Rural','Emprego/Renda','Política','Eventos/Cultura','Lazer','Meio Ambiente','Comunidade/Cotidiano','Serviços Públicos','Outros']
const pct=(value:number|null)=>value==null?'Sem base anterior':`${value>=0?'+':''}${(value*100).toFixed(1)}%`
export default function Trends() {
  const {selected,revision}=useCampaign()
  const campaignId=Number(selected)
  const [filters,setFilters]=React.useState<TerritorialFilterValue>(defaultPeriod)
  const [regions,setRegions]=React.useState<Region[]>([])
  const [profiles,setProfiles]=React.useState<CampaignDetails['profiles']>([])
  const [data,setData]=React.useState<TrendsResponse|null>(null)
  const [error,setError]=React.useState('')
  const [loading,setLoading]=React.useState(true)
  const [target,setTarget]=React.useState<TerritorialTrend|null>(null)
  const [offset,setOffset]=React.useState(0)
  const [evidence,setEvidence]=React.useState<Awaited<ReturnType<typeof getTrendPosts>>|null>(null)
  const [evidenceError,setEvidenceError]=React.useState('')
  React.useEffect(()=>{let active=true;Promise.all([getRegions(),getCampaign(campaignId)]).then(([r,c])=>{if(active){setRegions(r.regions);setProfiles(c.profiles)}}).catch(()=>{if(active)setError('Não foi possível carregar os filtros.')});return()=>{active=false}},[campaignId])
  React.useEffect(()=>{
    let active=true;setLoading(true);setError('')
    getTrends(filters.startDate,filters.endDate,filters.regionId,filters.theme,campaignId,filters).then(result=>{if(active)setData(result)}).catch(()=>{if(active)setError('Não foi possível carregar tendências.')}).finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[filters,campaignId,revision])
  React.useEffect(()=>{
    if(!target)return
    let active=true;setEvidence(null);setEvidenceError('')
    getTrendPosts(filters.startDate,filters.endDate,target.region_id,target.theme,campaignId,filters,offset).then(result=>{if(active)setEvidence(result)}).catch(()=>{if(active)setEvidenceError('Não foi possível carregar as evidências.')})
    return()=>{active=false}
  },[target,filters,campaignId,offset,revision])
  function change(next:TerritorialFilterValue){setFilters(next);setTarget(null);setOffset(0)}
  return <div className="space-y-6">
    <TerritorialFilters value={filters} onChange={change} regions={regions} themes={themes} profiles={profiles} extended/>
    {loading&&!data?<PageLoader/>:error?<p role="alert" className="text-alert">{error}</p>:data?.data_status==='NO_DATA'?<p className="rounded-lg border border-border p-8">Não existem dados para este período ou região.</p>:<>
      <p className="text-sm text-slate">{data?.data_status==='INSUFFICIENT'?'A amostra ainda é insuficiente para conclusões robustas.':'Tendências calculadas a partir dos posts armazenados.'} Posts com várias RAs aparecem em cada região, mas são contados uma vez nos totais por tema.</p>
      <Card><CardHeader><CardTitle>Tendências por RA e tema</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr>{['RA','Tema','Posts','Interações','Crescimento','Formato','Perfil','Origem','Evidências'].map(label=><th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{data?.territorial_trends?.filter(row=>row.volume>0).map(row=><tr key={`${row.region_id}-${row.theme}`} className="border-t border-border"><td className="p-2">{row.region}</td><td>{row.theme}</td><td>{row.volume}</td><td title={`${row.interactions_posts} de ${row.volume} posts com métrica disponível`}>{row.interactions?.toLocaleString('pt-BR')??'N/D'}</td><td>{pct(row.growth)}</td><td>{row.formats.join(', ')}</td><td>{row.profiles.map(name=>'@'+name).join(', ')}</td><td>{row.sources.map(territorialSource).join('; ')}</td><td><Button variant="secondary" onClick={()=>{setTarget(row);setOffset(0)}}>Ver posts</Button></td></tr>)}</tbody></table>{!data?.territorial_trends?.some(row=>row.volume>0)&&<p className="py-4 text-slate">Nenhum post com atribuição territorial neste recorte.</p>}</CardContent></Card>
      {target&&<Card><CardHeader><CardTitle>Posts de evidência: {target.region} · {target.theme}</CardTitle></CardHeader><CardContent className="space-y-4">{evidenceError?<p role="alert">{evidenceError}</p>:!evidence?<p role="status">Carregando evidências…</p>:<><p>{evidence.total} posts sustentam esta tendência.</p>{evidence.posts.map(post=><article key={post.post_id} className="space-y-2 rounded-lg border border-border p-4"><b>@{post.profile}</b><p className="text-xs text-slate">{post.date?new Date(post.date).toLocaleDateString('pt-BR'):'Sem data'} · {post.format}</p><p className="break-words">{post.summary}</p><TerritorialEvidence items={post.territories||[]}/><Link className="inline-block text-blue" to={`/conteudos/${post.post_id}`}>Ver detalhes e legenda completa</Link></article>)}<div className="flex gap-2"><Button variant="secondary" disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-50))}>Anterior</Button><Button variant="secondary" disabled={offset+50>=evidence.total} onClick={()=>setOffset(offset+50)}>Próxima página</Button><Button variant="ghost" onClick={()=>setTarget(null)}>Fechar evidências</Button></div></>}</CardContent></Card>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{data?.trends.slice(0,4).map(row=><Card key={row.theme}><CardHeader><CardTitle>{row.theme}</CardTitle></CardHeader><CardContent><b className="text-3xl">{row.volume}</b><p className="text-sm text-slate">publicações · {pct(row.growth)}</p><p className="text-xs">{row.interactions?.toLocaleString('pt-BR')??'N/D'} interações · Relevância {row.relevance}</p></CardContent></Card>)}</div>
      <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Volume de publicações por tema</CardTitle></CardHeader><CardContent className="h-80"><ResponsiveContainer><BarChart data={data?.trends.slice(0,10)} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number"/><YAxis dataKey="theme" type="category" width={130} tick={{fontSize:11}}/><Tooltip/><Bar dataKey="volume" fill="#7FA1E8"/></BarChart></ResponsiveContainer></CardContent></Card><Card><CardHeader><CardTitle>Interação média por tema</CardTitle></CardHeader><CardContent className="h-80"><ResponsiveContainer><BarChart data={data?.trends.slice(0,10)}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="theme" tick={{fontSize:10}} angle={-20} height={70}/><YAxis/><Tooltip/><Bar dataKey="average_interactions" fill="#A7D6BB"/></BarChart></ResponsiveContainer></CardContent></Card></div>
      <Card><CardHeader><CardTitle>Evidências das principais tendências</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{data?.trends.slice(0,6).flatMap(row=>row.evidence.slice(0,1).map(post=><Link key={post.post_id} to={`/conteudos/${post.post_id}`} className="rounded-lg border border-border p-4"><b>{row.theme} · @{post.profile}</b><p className="line-clamp-3 text-sm text-slate">{post.summary}</p></Link>))}</CardContent></Card>
      <details className="text-xs text-slate"><summary>Metodologia do cálculo</summary><p>{data?.methodology.score}. {data?.methodology.growth}.</p><p>A origem Perfil é um fallback explícito de baixa confiança e não é usada para portais gerais. Menções ambíguas não recebem RA.</p></details>
    </>}
  </div>
}
