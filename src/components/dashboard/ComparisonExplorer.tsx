import * as React from 'react'
import {BarChart,Bar,LineChart,Line,PieChart,Pie,Cell,XAxis,YAxis,Tooltip,Legend,ResponsiveContainer} from 'recharts'
import {useCampaign,useCampaignData} from '@/lib/campaignContext'
import {Panel,DataTable} from './ApiData'
import {InsufficientData} from '@/components/charts/ChartTheme'
import {chartAxis,chartColors,compactNumber} from '@/components/charts/chartConfig'
import {number,date} from '@/utils/apiFormat'
import type {ComparisonResponse,ComparisonRow} from '@/types/comparison'
import type {ExecutiveMetrics} from '@/types/executive'
const metrics:Partial<Record<keyof ExecutiveMetrics,string>>={followers:'Seguidores',growth_absolute:'Crescimento absoluto',growth_percent:'Crescimento percentual',posts:'Posts',observed_interactions:'Interações',comments:'Comentários',likes:'Curtidas',plays:'Plays',views:'Visualizações',avg_observed_interactions:'Média de interações',avg_likes:'Média de curtidas',avg_comments:'Média de comentários',avg_plays:'Média de plays',posts_per_day:'Publicações por dia'}
const additive=new Set(['followers','posts','observed_interactions','comments','likes','plays','views'])
const positions:Record<string,string>={CANDIDATE:'Candidato',VICE:'Vice',ASSOCIATE:'Associado'}
type Datum=Record<string,string|number|null|undefined>
function ExactTooltip({active,payload,label}:{active?:boolean;payload?:ReadonlyArray<{name?:string;value?:number|string|ReadonlyArray<number|string>;dataKey?:string|number;payload?:Datum}>;label?:unknown}){
 if(!active||!payload?.length)return null
 return <div className="max-w-80 rounded-xl border border-white/20 bg-[#101010] p-4 text-xs text-white"><b>{String(label??payload[0].payload?.name??'')}</b>{payload.filter(p=>p.value!=null).map((p,i)=>{const k=String(p.dataKey),r=p.payload;return <div key={i} className="mt-3 border-t border-white/10 pt-2"><p>{p.name}: <strong className="font-mono">{typeof p.value==='number'?number(p.value):String(p.value)}</strong></p>{r?.[k+'_posts']!=null?<p className="mt-1 text-white/60">{number(Number(r[k+'_posts']))} posts · média {r[k+'_avg']==null?'indisponível':number(Number(r[k+'_avg']))}</p>:null}{r?.[k+'_source']?<p className="mt-1 text-white/60">{r[k+'_source']}</p>:null}{r?.[k+'_delta']!=null?<p className="mt-1 text-white/60">Variação desde a observação anterior: {number(Number(r[k+'_delta']))}</p>:null}</div>})}</div>
}
export function ComparisonExplorer({initialDimension='summary',title='Explorar comparações'}:{initialDimension?:string;title?:string}){
 const c=useCampaign()
 const {data,error}=useCampaignData<ComparisonResponse>('comparison',`limit_per_profile=${c.limit}&days=${c.days}`)
 const [mode,setMode]=React.useState<'slates'|'profiles'>(c.slateSelected?'profiles':'slates')
 const [dimension,setDimension]=React.useState(initialDimension),[metric,setMetric]=React.useState<keyof ExecutiveMetrics>('observed_interactions')
 const [kind,setKind]=React.useState('bars'),[root,setRoot]=React.useState(false),[checked,setChecked]=React.useState<number[]|null>(null)
 const available=data?.[mode]??[]
 const selected=checked===null?available:available.filter(row=>checked.includes(row.id))
 const temporal=dimension==='followers'||dimension==='daily'
 const currentMetric=dimension==='followers'?'followers':metric
 const grouped=['themes','formats','hours'].includes(dimension)
 const legalMetrics=Object.entries(metrics).filter(([key])=>dimension==='followers'?key==='followers':dimension==='daily'||grouped?!['followers','growth_absolute','growth_percent','posts_per_day'].includes(key):true)
 const effectiveMetric=legalMetrics.some(([key])=>key===currentMetric)?currentMetric:'observed_interactions'
 const categoryCount=grouped?(selected[0]?.[dimension as 'themes'|'formats'|'hours']?.length??0):selected.length
 const pieAllowed=!temporal&&additive.has(effectiveMetric)&&categoryCount<=6&&selected.length<=6&&(!grouped||selected.length===1)
 const type=temporal?'line':kind==='pie'&&pieAllowed?'pie':'bars'
 const rows:Datum[]=[]
 const series:{key:string;name:string}[]=[]
 if(dimension==='summary'){
  for(const row of selected)rows.push({name:row.name,value:row.summary[effectiveMetric as keyof ExecutiveMetrics] as number|null,posts:row.summary.posts,value_posts:row.summary.posts,value_avg:row.summary.avg_observed_interactions})
  series.push({key:'value',name:metrics[effectiveMetric as keyof ExecutiveMetrics]||''})
 }else{
  const key=dimension==='themes'?'theme':dimension==='formats'?'format':dimension==='hours'?'hour':'date'
  const points=(r:ComparisonRow)=>dimension==='followers'?r.follower_history:r[dimension as 'daily'|'themes'|'formats'|'hours']
  const names=[...new Set(selected.flatMap(r=>points(r).map(p=>String((p as unknown as Datum)[key]))))].sort((a,b)=>dimension==='hours'?Number(a)-Number(b):a.localeCompare(b))
  for(const row of selected)series.push({key:'item_'+row.id,name:row.name})
  const previous=new Map<number,number>()
  for(const name of names){const result:Datum={name:temporal?date(name):dimension==='hours'?name+'h–'+((Number(name)+3)%24)+'h':name}
   for(const row of selected){const point=points(row).find(p=>String((p as unknown as Datum)[key])===name) as unknown as Datum|undefined,k='item_'+row.id
    result[k]=point?.[effectiveMetric] as number|null??null
    result[k+'_posts']=point?.posts??null;result[k+'_avg']=point?.avg_observed_interactions??null
    if(dimension==='followers'&&point){result[k+'_source']=point.source_label||'Origem identificada na observação';const v=point.followers;if(typeof v==='number'){result[k+'_delta']=previous.has(row.id)?v-previous.get(row.id)!:null;previous.set(row.id,v)}}
   }rows.push(result)
  }
 }
 const valid=rows.some(r=>series.some(s=>typeof r[s.key]==='number'))
 const canEvolve=dimension!=='followers'||selected.some(r=>r.follower_history.filter(p=>p.followers!=null).length>=2)
 const nonnegative=rows.every(r=>series.every(s=>r[s.key]==null||Number(r[s.key])>=0))
 const colors=chartColors
 const pieRows=rows.map(r=>({...r,value:r[series[0]?.key]??null})).filter(r=>r.value!=null&&Number(r.value)>=0)
 const pieTotal=pieRows.reduce((n,r)=>n+Number(r.value),0)
 return <Panel title={title}><div className="mb-5 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-5">
 <label className="flex min-w-0 flex-col gap-2 text-xs text-slate">Comparação<select aria-label="Modo de comparação" className="min-w-0 rounded-md border border-white/15 bg-muted p-2 text-white" value={mode} onChange={e=>{setMode(e.target.value as 'slates'|'profiles');setChecked(null)}}><option value="slates">Comparar chapas</option><option value="profiles">Comparar perfis da seleção</option></select></label>
 <label className="flex min-w-0 flex-col gap-2 text-xs text-slate">Análise<select aria-label="Análise comparada" className="min-w-0 rounded-md border border-white/15 bg-muted p-2 text-white" value={dimension} onChange={e=>setDimension(e.target.value)}><option value="summary">Indicadores do período</option><option value="followers">Evolução de seguidores</option><option value="daily">Desempenho diário</option><option value="themes">Tema × seleção</option><option value="formats">Formato × seleção</option><option value="hours">Horário × seleção</option></select></label>
 <label className="flex min-w-0 flex-col gap-2 text-xs text-slate">Métrica<select aria-label="Métrica comparada" className="min-w-0 rounded-md border border-white/15 bg-muted p-2 text-white" value={effectiveMetric} onChange={e=>setMetric(e.target.value as keyof ExecutiveMetrics)}>{legalMetrics.map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>
 <label className="flex min-w-0 flex-col gap-2 text-xs text-slate">Visualização<select aria-label="Tipo do gráfico" className="min-w-0 rounded-md border border-white/15 bg-muted p-2 text-white" value={type} onChange={e=>setKind(e.target.value)}><option value="bars" disabled={temporal}>Barras</option><option value="pie" disabled={!pieAllowed}>Pizza · participação</option><option value="line" disabled={!temporal}>Linha · evolução</option></select></label>
 <label className="flex items-center gap-2 text-xs text-slate"><input type="checkbox" checked={root&&nonnegative} disabled={type==='pie'||!nonnegative} onChange={e=>setRoot(e.target.checked)}/>Raiz quadrada na comparação</label></div>
 <p className="mb-3 text-xs leading-6 text-slate">{date(c.startDate)} a {date(c.endDate)} (UTC) · até {c.limit} posts por perfil. {mode==='slates'?'Comparação explícita entre as chapas da campanha; inclui as chapas alternativas ao filtro global.':'Perfis limitados à chapa/perfil global selecionado; posições e papel de monitoramento são independentes.'}</p>
 <div className="mb-4 flex flex-wrap gap-2">{available.map(row=><label key={row.id} className="flex min-w-0 items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs"><input type="checkbox" checked={selected.some(s=>s.id===row.id)} onChange={()=>setChecked(current=>{const ids=current??available.map(s=>s.id);return ids.includes(row.id)?ids.filter(id=>id!==row.id):[...ids,row.id]})}/><span className="break-all">{row.name}{row.position?' · '+positions[row.position]:''}</span></label>)}</div>
 {error?<p role="alert" className="text-sm text-alert">{error}</p>:!data?<p role="status" className="text-sm text-slate">Carregando comparação.</p>:!valid||!canEvolve||type==='pie'&&pieTotal<=0?<InsufficientData>{!selected.length?'Selecione pelo menos um item.':'Sem observações suficientes para esta métrica e este período. Valores ausentes não são convertidos em zero.'}</InsufficientData>:<div className="h-80 min-w-0" role="img" aria-label={`${title}: ${metrics[effectiveMetric as keyof ExecutiveMetrics]}`}><ResponsiveContainer>{type==='pie'?<PieChart><Pie data={pieRows} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="75%" paddingAngle={2} label={entry=>`${Number(entry.value)/pieTotal*100>=1?(Number(entry.value)/pieTotal*100).toFixed(1)+'%':''}`}>{pieRows.map((_,i)=><Cell key={i} fill={colors[i%colors.length]}/>)}</Pie><Tooltip content={<ExactTooltip/>}/><Legend wrapperStyle={{fontSize:11}}/></PieChart>:type==='line'?<LineChart data={rows} margin={{left:10,right:15,top:15}}><XAxis dataKey="name" {...chartAxis}/><YAxis {...chartAxis} width={75} tickFormatter={compactNumber} scale={root&&nonnegative?'sqrt':'auto'} domain={root&&nonnegative?[0,'auto']:['auto','auto']}/><Tooltip content={<ExactTooltip/>}/><Legend wrapperStyle={{fontSize:11}}/>{series.map((s,i)=><Line key={s.key} dataKey={s.key} name={s.name} stroke={colors[i%colors.length]} strokeWidth={3} dot={{r:3.5}} activeDot={{r:6}} connectNulls={false} type="linear"/>)}</LineChart>:<BarChart data={rows} margin={{left:10,right:15,top:15,bottom:15}} barCategoryGap="25%"><XAxis dataKey="name" {...chartAxis} height={55} interval="preserveStartEnd" tick={{fontSize:10,fill:'#b5b5bb'}}/><YAxis {...chartAxis} width={75} tickFormatter={compactNumber} scale={root&&nonnegative?'sqrt':'auto'} domain={nonnegative?[0,'auto']:['auto','auto']}/><Tooltip content={<ExactTooltip/>}/>{series.length>1?<Legend wrapperStyle={{fontSize:11}}/>:null}{series.map((s,i)=><Bar key={s.key} dataKey={s.key} name={s.name} fill={colors[i%colors.length]} radius={[4,4,0,0]} maxBarSize={64}/>)}</BarChart>}</ResponsiveContainer></div>}
 {root&&nonnegative&&type!=='pie'?<p className="mt-3 text-xs text-slate">Escala de raiz quadrada; valores reais preservados nos eixos, tabela e tooltip.</p>:null}
 {type==='pie'?<p className="mt-3 text-xs text-slate">Participação no total observado desta seleção. Métricas ausentes não entram no denominador; seguidores não representam pessoas únicas.</p>:null}
 {dimension==='followers'?<p className="mt-3 text-xs leading-6 text-slate">Histórico manual identificado na origem; coletas reais têm prioridade no mesmo dia. Soma de audiências dos perfis, sem deduplicação. Chapas usam somente datas comuns completas, sem interpolação e sem preencher ausências.</p>:null}
 {dimension==='daily'?<p className="mt-3 text-xs leading-6 text-slate">Totais observados por data de publicação (UTC), usando o último snapshot. Não representa interações novas recebidas naquele dia.</p>:null}
 <details className="mt-5"><summary className="cursor-pointer text-xs text-slate">Valores exatos da comparação</summary><DataTable headers={['Item',...series.map(s=>s.name)]}>{rows.map((r,i)=><tr key={i}><th className="p-3 text-left text-xs">{r.name}</th>{series.map(s=><td className="p-3 font-mono text-xs" key={s.key}>{r[s.key]==null?'Indisponível':number(Number(r[s.key]))}</td>)}</tr>)}</DataTable></details>
 </Panel>
}
