import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { TopicoResumo } from '@/types/instagram'

export function TopicOpportunityScatter({ data }: { data: TopicoResumo[] }) {
  const mediaFrequencia = data.reduce((s, d) => s + d.quantidadeConteudos, 0) / data.length
  const mediaEngajamento = data.reduce((s, d) => s + d.engajamentoMedio, 0) / data.length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Frequencia x engajamento por tema</CardTitle>
        <CardDescription>
          Tamanho da bolha = alcance medio. Alto engajamento com baixa frequencia vira oportunidade.
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-1 pr-4">
        <ResponsiveContainer width="100%" height={340}>
          <ScatterChart margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.045)"/>
            <XAxis
              type="number"
              dataKey="quantidadeConteudos"
              name="Publicacoes"
              tick={{ fontSize: 11, fill: '#8B949E' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
              label={{ value: 'Quantidade de publicacoes', position: 'insideBottom', offset: -4, fontSize: 11, fill: '#8B949E' }}
            />
            <YAxis
              type="number"
              dataKey="engajamentoMedio"
              name="Engajamento"
              unit="%"
              tick={{ fontSize: 11, fill: '#8B949E' }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'Engajamento medio (%)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#8B949E' }}
            />
            <ZAxis type="number" dataKey="alcanceMedio" range={[80, 900]} name="Alcance medio" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              formatter={(value, name) =>
                name === 'Engajamento'
                  ? [`${value}%`, name]
                  : [Number(value).toLocaleString('pt-BR'), String(name)]
              }
              labelFormatter={() => ''}
              contentStyle={{
                backgroundColor: '#101216',
                borderRadius: 8,
                borderColor: 'rgba(255,255,255,0.14)',
                color: '#F5F7FA',
                fontSize: 12,
              }}
            />
            <Scatter data={data}>
              {data.map((entry, i) => {
                const isOportunidade =
                  entry.engajamentoMedio >= mediaEngajamento && entry.quantidadeConteudos <= mediaFrequencia
                return <Cell key={i} fill={isOportunidade ? '#5CE1A7' : '#ff6a2b'} fillOpacity={0.78} />
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-slate">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-positive" /> Oportunidade
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue" /> Demais temas
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
