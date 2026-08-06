import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { DailyMetric } from '@/types/instagram'
import { formatCompact, formatNumber } from '@/utils/metrics'

export function FollowersAreaChart({ data }: { data: DailyMetric[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução de seguidores</CardTitle>
        <CardDescription>Últimos 30 dias</CardDescription>
      </CardHeader>
      <CardContent className="pl-1 pr-4">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="seguidoresGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              domain={['dataMin - 400', 'dataMax + 200']}
            />
            <Tooltip
              formatter={(value) => [formatNumber(Number(value)), 'Seguidores']}
              labelFormatter={(label) => `Data: ${label}`}
              contentStyle={{
                borderRadius: 8,
                borderColor: '#DFE6EF',
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="seguidores"
              stroke="#2563EB"
              strokeWidth={2}
              fill="url(#seguidoresGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
