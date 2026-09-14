import * as React from 'react'
import { DataFrame, Empty, Panel } from '@/components/dashboard/ApiData'
import { useCampaign, useCampaignData } from '@/lib/campaignContext'
import type { Cell } from '@/types/radar'
import { number } from '@/utils/apiFormat'

const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const hours = Array.from({ length: 8 }, (_, index) => index * 3)
type Metric = 'avg_observed_interactions' | 'avg_comments'

const metricLabels: Record<Metric, string> = {
  avg_observed_interactions: 'Interações',
  avg_comments: 'Comentários',
}

export default function Schedule() {
  const { limit } = useCampaign()
  const { data, error } = useCampaignData<{ cells: Cell[] }>('time-performance', `limit_per_profile=${limit}`)
  const [metric, setMetric] = React.useState<Metric>('avg_observed_interactions')
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null)
  const cells = data?.cells ?? []
  const values = cells.map(cell => cell[metric]).filter((value): value is number => value != null)
  const max = Math.max(1, ...values)
  const posts = cells.reduce((total, cell) => total + cell.posts, 0)
  const selected = cells.find(cell => `${cell.weekday_index}-${cell.hour}` === selectedKey) ?? null

  return (
    <DataFrame data={data} error={error}>
      {cells.length ? (
        <Panel title="Distribuição por dia e horário">
          <div className="flex flex-col gap-5 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="max-w-2xl text-sm leading-6 text-slate">
                Média das publicações em cada faixa de três horas. Clique em uma célula para conferir a amostra usada no cálculo.
              </p>
              <p className="mt-3 text-xs text-slate">{number(posts)} publicações distribuídas em {number(cells.length)} faixas com dados.</p>
            </div>
            <div className="inline-flex w-fit rounded-full border border-white/10 bg-black/20 p-1" aria-label="Métrica do mapa">
              {(Object.keys(metricLabels) as Metric[]).map(key => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={metric === key}
                  onClick={() => { setMetric(key); setSelectedKey(null) }}
                  className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${metric === key ? 'bg-stone-100 text-stone-950' : 'text-slate hover:text-white'}`}
                >
                  {metricLabels[key]}
                </button>
              ))}
            </div>
          </div>

          {selected ? (
            <div className="my-5 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-l-2 border-[#D6CCB2] pl-4" role="status">
              <p className="font-semibold text-white">{selected.weekday}, {selected.hour_label}</p>
              <p className="text-sm text-slate">{number(selected[metric])} {metricLabels[metric].toLowerCase()} em média</p>
              <p className="text-sm text-slate">{number(selected.posts)} {selected.posts === 1 ? 'publicação' : 'publicações'}</p>
              <p className="text-sm text-slate">{number(selected.avg_comments)} comentários em média</p>
            </div>
          ) : (
            <p className="my-5 text-xs text-slate">Selecione uma célula para ver os detalhes.</p>
          )}

          <div className="overflow-x-auto pb-2">
            <table className="w-full min-w-[760px] border-separate border-spacing-1 text-center text-xs">
              <thead>
                <tr>
                  <th className="w-16 p-2 text-left font-medium text-slate">Dia</th>
                  {hours.map(hour => <th className="p-2 font-medium text-slate" key={hour}>{hour}h–{(hour + 3) % 24}h</th>)}
                </tr>
              </thead>
              <tbody>
                {days.map((day, weekdayIndex) => (
                  <tr key={day}>
                    <th className="p-2 text-left font-semibold text-white/80">{day}</th>
                    {hours.map(hour => {
                      const cell = cells.find(item => item.weekday_index === weekdayIndex && item.hour === hour)
                      const value = cell?.[metric]
                      const key = `${weekdayIndex}-${hour}`
                      const intensity = value == null ? 0 : Math.log1p(Math.max(0, value)) / Math.log1p(max)
                      const background = value == null
                        ? 'rgba(255,255,255,0.025)'
                        : `rgba(214, 204, 178, ${0.08 + intensity * 0.54})`
                      return (
                        <td key={hour} className="p-0.5">
                          <button
                            type="button"
                            disabled={!cell}
                            onClick={() => setSelectedKey(key)}
                            aria-label={cell ? `${day}, ${cell.hour_label}: ${number(value)} ${metricLabels[metric].toLowerCase()} em média, ${cell.posts} publicações` : `${day}, ${hour}h–${(hour + 3) % 24}h: sem dados`}
                            className={`flex h-16 w-full flex-col items-center justify-center rounded-md border text-white transition-[border-color,transform] ${selectedKey === key ? 'border-white' : 'border-white/5'} ${cell ? 'hover:-translate-y-0.5 hover:border-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50' : 'cursor-default text-slate/45'}`}
                            style={{ backgroundColor: background }}
                          >
                            <span className="font-mono text-sm font-semibold">{number(value)}</span>
                            {cell ? <span className="mt-1 text-[10px] opacity-65">{cell.posts} {cell.posts === 1 ? 'post' : 'posts'}</span> : null}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-xs text-slate">
            <span className="font-medium text-white/75">Intensidade</span>
            <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-sm border border-white/10 bg-white/[0.025]" />Sem dados</span>
            <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-sm bg-[rgba(214,204,178,0.16)]" />Menor intensidade</span>
            <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-sm bg-[rgba(214,204,178,0.62)]" />Maior intensidade</span>
          </div>
        </Panel>
      ) : <Empty />}
      <p className="text-xs leading-5 text-slate">Horário de São Paulo. Os números são médias das publicações coletadas em cada faixa; horário e desempenho podem estar associados, mas este quadro não determina causa.</p>
    </DataFrame>
  )
}
