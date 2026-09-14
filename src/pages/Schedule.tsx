import { number } from '@/utils/apiFormat'
import { useCampaign, useCampaignData } from '@/lib/campaignContext'
import { DataFrame, Empty, Panel } from '@/components/dashboard/ApiData'
import type { Cell } from '@/types/radar'
export default function Schedule() {
  const {limit} = useCampaign()
  const {data,error} = useCampaignData<{cells: Cell[]; best_observed_interactions: Cell | null}>('time-performance', `limit_per_profile=${limit}`)
  const max = Math.max(1, ...(data?.cells.map(c => c.avg_observed_interactions ?? 0) || []))
  const best = data?.best_observed_interactions
  return <DataFrame data={data} error={error}>
    <Panel title="Faixa com mais interações observadas">{best ? <><p className="font-display text-3xl">{best.weekday} · {best.hour_label}</p><p className="mt-2 text-sm text-slate">{number(best.avg_observed_interactions)} interações médias em {best.posts} post(s).</p></> : <p className="text-slate">Ainda não há métricas suficientes para comparar horários.</p>}</Panel>
    {data?.cells.length ? <Panel title="Interações por dia e horário"><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-center text-xs"><thead><tr><th className="p-2">Dia</th>{Array.from({length:8},(_,i) => <th className="p-2" key={i}>{i*3}h–{(i*3+3)%24}h</th>)}</tr></thead><tbody>{['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map((day,index) => <tr key={day}><th className="p-2">{day}</th>{Array.from({length:8},(_,i) => {
      const cell = data.cells.find(c => c.weekday_index === index && c.hour === i*3)
      const value = cell?.avg_observed_interactions
      return <td className="border-4 border-card p-3" key={i} title={cell ? `${cell.posts} post(s), ${number(value)} interações médias` : 'Sem dados'} style={{backgroundColor:value == null ? '#1F1F22' : `rgba(127,161,232,${0.12 + value/max*0.58})`}}>{number(value)}</td>
    })}</tr>)}</tbody></table></div></Panel> : <Empty />}
    <p className="text-sm text-slate">Horários de São Paulo, agrupados em faixas de três horas. São associações históricas; o horário isolado não explica o desempenho. — indica ausência de dados.</p>
  </DataFrame>
}
