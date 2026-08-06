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
        <CardTitle>Frequência x engajamento por tema</CardTitle>
        <CardDescription>
          Tamanho da bolha = alcance médio. Temas no canto superior esquerdo (alto engajamento,
          baixa frequência) são oportunidades.
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-1 pr-4">
        <ResponsiveContainer width="100%" height={340}>
          <ScatterChart margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="#DFE6EF" />
            <XAxis
              type="number"
              dataKey="quantidadeConteudos"
              name="Publicações"
              tick={{ fontSize: 11, fill: '#64748B' }}
              axisLine={{ stroke: '#DFE6EF' }}
              tickLine={false}
              label={{ value: 'Quantidade de publicações', position: 'insideBottom', offset: -4, fontSize: 11, fill: '#64748B' }}
            />
            <YAxis
              type="number"
              dataKey="engajamentoMedio"
              name="Engajamento"
              unit="%"
              tick={{ fontSize: 11, fill: '#64748B' }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'Engajamento médio (%)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748B' }}
            />
            <ZAxis type="number" dataKey="alcanceMedio" range={[80, 900]} name="Alcance médio" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              formatter={(value, name) =>
                name === 'Engajamento'
                  ? [`${value}%`, name]
                  : [Number(value).toLocaleString('pt-BR'), String(name)]
              }
              labelFormatter={() => ''}
              contentStyle={{ borderRadius: 8, borderColor: '#DFE6EF', fontSize: 12 }}
            />
            <Scatter data={data}>
              {data.map((entry, i) => {
                const isOportunidade =
                  entry.engajamentoMedio >= mediaEngajamento && entry.quantidadeConteudos <= mediaFrequencia
                return <Cell key={i} fill={isOportunidade ? '#16A34A' : '#2563EB'} fillOpacity={0.75} />
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="mt-2 flex items-center gap-4 text-[11px] text-slate">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-positive" /> Oportunidade (alto desempenho, baixa frequência)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue" /> Demais temas
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
