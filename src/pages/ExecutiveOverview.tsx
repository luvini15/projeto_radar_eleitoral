import {MediaInvestmentPanel} from '@/components/dashboard/MediaInvestmentPanel'
import {ComparisonExplorer} from '@/components/dashboard/ComparisonExplorer'
import { Link } from 'react-router-dom'
import { useCampaign, useCampaignData } from '@/lib/campaignContext'
import { DataFrame, Empty, Metrics, Panel, InstagramLink } from '@/components/dashboard/ApiData'
import { SlateComparison } from '@/components/dashboard/SlateComparison'
import { number, date } from '@/utils/apiFormat'
import type { ExecutiveReport } from '@/types/executive'
export default function ExecutiveOverview() {
  const {limit,days,scopeName}=useCampaign()
  const {data,error}=useCampaignData<ExecutiveReport>('executive',`limit_per_profile=${limit}&days=${days}`)
  const insights=data?.insights
  const facts=insights?[
    insights.theme&&`${insights.theme.theme} tem a maior média observada: ${number(insights.theme.avg_observed_interactions)} interações em ${insights.theme.posts} publicações.`,
    insights.most_published_theme&&`${insights.most_published_theme.theme} concentra o maior volume: ${insights.most_published_theme.posts} publicações.`,
    insights.format&&`${insights.format.format} apresenta ${number(insights.format.avg_observed_interactions)} interações médias em ${insights.format.posts} publicações.`,
    insights.hour&&`${insights.hour.hour}h–${(insights.hour.hour!+3)%24}h: ${number(insights.hour.avg_observed_interactions)} interações médias em ${insights.hour.posts} publicações.`,
    insights.weekday&&`${['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'][insights.weekday.weekday!]} tem o melhor desempenho médio: ${number(insights.weekday.avg_observed_interactions)} interações (${insights.weekday.posts} publicações).`,
    insights.profile&&`@${insights.profile.username}: maior média por perfil, ${number(insights.profile.avg_observed_interactions)} interações em ${insights.profile.posts} publicações.`,
    insights.peak&&`Publicações de ${date(insights.peak.date)} somam o maior pico: ${number(insights.peak.observed_interactions)} interações em ${insights.peak.posts} publicações.`,
  ].filter((value):value is string=>Boolean(value)):[]
  return <div className="px-4 py-6 md:px-7"><DataFrame data={data} error={error} showContext={false}>
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5"><div><p className="text-[10px] uppercase tracking-[.18em] text-[#ff7a45]">Resumo executivo</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">{scopeName}</h2><p className="mt-3 text-xs leading-6 text-slate">{date(data?.period.from)} a {date(data?.period.to)} · {data?.summary.profiles??0} perfis · Última coleta: {data?.last_collected_at?date(data.last_collected_at):'Nenhuma coleta disponível'}</p></div></header>
    {data?.collection?.status==='RUNNING'?<p role="status" className="rounded-xl border border-white/10 p-4 text-sm">Coleta em andamento. Os indicadores abaixo usam os últimos snapshots já armazenados.</p>:null}
    {data?.collection?.status==='PARTIAL'?<p role="status" className="rounded-xl border border-white/10 p-4 text-sm">A última coleta foi parcial. Consulte os detalhes em Coletas; métricas ausentes não foram estimadas.</p>:null}
    {data?.collection?.status==='FAILED'?<p role="status" className="rounded-xl border border-alert/30 p-4 text-sm">A última coleta falhou. Os dados anteriores continuam disponíveis. Consulte <Link className="underline" to="/coletas">Coletas</Link>.</p>:null}
    {data?<><Metrics items={[
      ['Seguidores dos perfis associados',data.summary.followers],['Crescimento de seguidores',data.summary.growth_absolute],['Crescimento percentual (%)',data.summary.growth_percent],['Publicações analisadas',data.summary.posts],['Interações observadas',data.summary.observed_interactions],['Comentários',data.summary.comments],['Plays',data.summary.plays],['Média de interações por publicação',data.summary.avg_observed_interactions],
    ]}/><p className="text-xs leading-6 text-slate">Seguidores disponíveis para {data.summary.followers_profiles_with_data} de {data.summary.profiles} perfis; não representam pessoas únicas. Amostra de até {limit} posts recentes por perfil publicados no período. Métricas ausentes permanecem indisponíveis; totais podem ter cobertura parcial.</p></>:null}
    {data?<MediaInvestmentPanel data={data.media_investment}/>:null}
    {data?.data_status==='NO_DATA'?<Empty>Sem publicações com data neste recorte. Ajuste o período ou consulte a coleta em Configurações.</Empty>:null}
    {facts.length?<Panel title="Principais insights"><ul className="grid gap-4 md:grid-cols-2">{facts.map(fact=><li className="border-l-2 border-[#ff6a2b]/50 pl-4 text-sm leading-6 text-white/80" key={fact}>{fact}</li>)}</ul><p className="mt-5 text-xs text-slate">Associações descritivas da amostra disponível; não demonstram causalidade nem apoio eleitoral.</p></Panel>:null}
    {insights?<Panel title="Conteúdos em destaque"><div className="grid gap-4 lg:grid-cols-3">{Object.entries(insights.top_posts).filter(([,post])=>post).map(([metric,post])=>post?<article className="min-w-0 rounded-xl border border-white/10 p-4" key={metric}><p className="text-[10px] uppercase tracking-wider text-slate">{{observed_interactions:'Maior interação',comments:'Mais comentários',plays:'Mais plays'}[metric]}</p><p className="my-3 font-mono text-2xl">{number(post.metrics[metric as 'comments'|'plays'|'observed_interactions'])}</p><p className="text-xs text-slate">@{post.profile.username}</p><p className="my-3 line-clamp-3 break-words text-sm text-white/75">{post.content.caption||'Publicação sem legenda.'}</p><InstagramLink url={post.content.url}/><Link to={`/conteudos/${post.post_id}`} className="mt-3 block text-xs text-[#ff7a45] underline">Ver detalhes e histórico</Link></article>:null)}</div></Panel>:null}
    <ComparisonExplorer initialDimension="followers" title="Evolução de seguidores · chapas e perfis"/>
    <ComparisonExplorer title="Comparação de desempenho"/>
    <SlateComparison compact/>
  </DataFrame></div>
}
