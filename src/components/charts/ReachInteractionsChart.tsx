import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { DailyMetric } from '@/types/instagram'
import { formatCompact, formatNumber } from '@/utils/metrics'

export function ReachInteractionsChart({ data }: { data: DailyMetric[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alcance e interacoes por dia</CardTitle>
        <CardDescription>Ultimos 30 dias</CardDescription>
      </CardHeader>
      <CardContent className="pl-1 pr-4">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="data"
              tickFormatter={(v) => v.slice(8, 10) + '/' + v.slice(5, 7)}
              tick={{ fontSize: 11, fill: '#8B949E' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
              interval={4}
            />
            <YAxis
              tickFormatter={(v) => formatCompact(v)}
              tick={{ fontSize: 11, fill: '#8B949E' }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              formatter={(value, name) => [formatNumber(Number(value)), String(name)]}
              contentStyle={{
                backgroundColor: '#101216',
                borderRadius: 8,
                borderColor: 'rgba(255,255,255,0.14)',
                color: '#F5F7FA',
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: '#8B949E' }} />
            <Line
              type="monotone"
              dataKey="alcance"
              name="Alcance"
              stroke="#8EA4FF"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="interacoes"
              name="Interacoes"
              stroke="#5CE1A7"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
