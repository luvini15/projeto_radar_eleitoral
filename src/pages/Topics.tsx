import { number } from '@/utils/apiFormat'
import { useCampaign, useCampaignData } from '@/lib/campaignContext'
import { DataFrame, DataTable, Empty, Panel } from '@/components/dashboard/ApiData'
import type { Group } from '@/types/radar'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
export default function Topics() {
  const {limit} = useCampaign()
  const {data,error} = useCampaignData<{themes: Group[]; formats: Group[]}>('themes-formats', `limit_per_profile=${limit}`)
  return <DataFrame data={data} error={error}>
    <p className="text-sm text-slate">Temas classificados por palavras-chave nas legendas. As médias consideram apenas métricas disponíveis; visualizações não equivalem a alcance.</p>
    {data && !data.themes.length ? <Empty /> : null}
    {data?.themes.length ? <Panel title="Interações médias por tema"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.themes} margin={{bottom: 40}}><XAxis dataKey="theme" tick={{fontSize:10,fill:'#A1A1AA'}} angle={-20} textAnchor="end" interval={0}/><YAxis tick={{fill:'#A1A1AA'}}/><Tooltip contentStyle={{background:'#141414',borderColor:'#333'}}/><Bar dataKey="avg_observed_interactions" name="Interações observadas" fill="#7FA1E8" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></Panel> : null}
    {data ? ([['Temas',data.themes],['Formatos',data.formats]] as const).map(([title,groups]) => <Panel key={title} title={title}><DataTable headers={['Grupo','Posts','Curtidas médias','Comentários médios','Interações médias']}>{groups.map(g => <tr key={g.theme || g.format}><td className="p-3">{g.theme || g.format}</td><td className="p-3">{number(g.posts)}</td><td className="p-3">{number(g.avg_likes)}</td><td className="p-3">{number(g.avg_comments)}</td><td className="p-3">{number(g.avg_observed_interactions)}</td></tr>)}</DataTable></Panel>) : null}
  </DataFrame>
}
