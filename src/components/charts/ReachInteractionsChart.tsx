import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { DailyMetric } from '@/types/instagram'
import { formatCompact, formatNumber } from '@/utils/metrics'

export function ReachInteractionsChart({ data }: { data: DailyMetric[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alcance e interações por dia</CardTitle>
        <CardDescription>Últimos 30 dias</CardDescription>
      </CardHeader>
      <CardContent className="pl-1 pr-4">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#DFE6EF" />
            <XAxis
              dataKey="data"
              tickFormatter={(v) => v.slice(8, 10) + '/' + v.slice(5, 7)}
              tick={{ fontSize: 11, fill: '#64748B' }}
              axisLine={{ stroke: '#DFE6EF' }}
              tickLine={false}
              interval={4}
            />
            <YAxis
              tickFormatter={(v) => formatCompact(v)}
              tick={{ fontSize: 11, fill: '#64748B' }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              formatter={(value, name) => [formatNumber(Number(value)), String(name)]}
              contentStyle={{ borderRadius: 8, borderColor: '#DFE6EF', fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="alcance"
              name="Alcance"
              stroke="#2563EB"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="interacoes"
              name="Interações"
              stroke="#16A34A"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
