import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TopicoResumo } from '@/types/instagram'

const cores = ['#8EA4FF', '#5CE1A7', '#F2B45C', '#FF6B63']

export function EngagementByTopicChart({ data }: { data: TopicoResumo[] }) {
  const sorted = [...data].sort((a, b) => b.engajamentoMedio - a.engajamentoMedio)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Engajamento medio por tema</CardTitle>
      </CardHeader>
      <CardContent className="pl-1 pr-4">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.1)" />
            <XAxis
              type="number"
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: '#8B949E' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="tema"
              tick={{ fontSize: 11, fill: '#F5F7FA' }}
              axisLine={false}
              tickLine={false}
              width={130}
            />
            <Tooltip
              formatter={(value) => [`${Number(value).toFixed(1).replace('.', ',')}%`, 'Engajamento medio']}
              contentStyle={{
                backgroundColor: '#101216',
                borderRadius: 8,
                borderColor: 'rgba(255,255,255,0.14)',
                color: '#F5F7FA',
                fontSize: 12,
              }}
            />
            <Bar dataKey="engajamentoMedio" radius={[0, 6, 6, 0]} barSize={16}>
              {sorted.map((_, i) => (
                <Cell key={i} fill={cores[Math.min(i, cores.length - 1)]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
