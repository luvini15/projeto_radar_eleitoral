import * as React from 'react'
import type {MediaInvestment,MediaInvestmentRow} from '@/types/mediaInvestment'
import {date,number} from '@/utils/apiFormat'
import '@/styles/media-investment.css'
const currency=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const metrics:Array<{label:string;key:keyof MediaInvestmentRow;money?:boolean;context?:boolean}>=[
 {label:'Investimento informado na Meta',key:'amount',money:true},
 {label:'Interações observadas no recorte',key:'interactions'},
 {label:'Investimento informado ÷ interações observadas',key:'spend_per_observed_interaction',money:true,context:true},
 {label:'Interações observadas por R$ 1.000',key:'interactions_per_1000_brl',context:true},
 {label:'Crescimento observado de seguidores',key:'growth_absolute'},
 {label:'Investimento informado ÷ crescimento observado',key:'spend_per_additional_follower',money:true,context:true},
]
export function MediaInvestmentPanel({data,title=true}:{data?:MediaInvestment;title?:boolean}){
 const id=React.useId(),rows=data?.rows||[]
 return <section className="media-context" aria-label="Investimento em mídia e desempenho observado">{title?<h3>Investimento em mídia × desempenho observado</h3>:null}<p className="media-context-intro">Investimento informado pela Meta — últimos 90 dias. Relação contextual com as métricas do recorte selecionado.</p>{rows.length?<><div className="media-context-table"><table aria-describedby={id}><thead><tr><th>Indicador</th>{rows.map(row=><th key={`${row.campaign_id}:${row.slate_id}`}>{row.slate_name}</th>)}</tr></thead><tbody>{metrics.map(metric=><tr key={metric.key}><th>{metric.label}{metric.context?' *':''}</th>{rows.map(row=>{const value=row[metric.key];return <td key={`${row.campaign_id}:${row.slate_id}`}>{typeof value==='number'?(metric.money?currency(value):number(value))+(metric.context?' *':''):'Não disponível'}</td>})}</tr>)}</tbody></table></div><ul className="media-context-provenance">{rows.map(row=><li key={`${row.campaign_id}:${row.slate_id}`}><strong>{row.slate_name}</strong> · {row.source||'Investimento não informado neste documento/recorte.'}{row.amount!=null?` · ${row.window_label||'Últimos 90 dias'} · Consulta: ${row.observed_at?date(row.observed_at):'data não informada'}.`:''} Métricas digitais: {date(row.analysis_period.from)} a {date(row.analysis_period.to)} · {row.posts==null?'amostra indisponível':`${number(row.posts)} posts`}.{row.unavailable_reason?' '+row.unavailable_reason:''}</li>)}</ul></>:<p className="media-context-empty">Investimento não informado neste documento ou recorte. As métricas digitais permanecem disponíveis; relações de investimento exigem esse dado registrado no documento.</p>}<p id={id} className="media-context-note">* {data?.notice||'O investimento não foi registrado neste documento. Dados atuais não são inseridos retroativamente em relatórios salvos.'}</p><p className="media-context-note">Relações indisponíveis quando faltam dados ou o denominador é nulo/não positivo. Recortes parciais de uma chapa não recebem atribuição do investimento total. Não são estimados alcance, impressões ou efeitos de mídia paga.</p></section>
}
