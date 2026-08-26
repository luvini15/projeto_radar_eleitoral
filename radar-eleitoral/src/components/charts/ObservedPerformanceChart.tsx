import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCompact, formatNumber } from '@/utils/metrics'

interface Point { date: string; comments: number; plays: number; views: number; observed: number }

export function ObservedPerformanceChart({ data }: { data: Point[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Desempenho observado por dia</CardTitle>
        <CardDescription>Somatório dos conteúdos do perfil do cliente no recorte armazenado.</CardDescription>
      </CardHeader>
      <CardContent className="pl-1 pr-4">
        {data.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-slate">Sem dados suficientes.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#DFE6EF" />
              <XAxis dataKey="date" tickFormatter={(v) => `${String(v).slice(8, 10)}/${String(v).slice(5, 7)}`} tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCompact(Number(v))} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={48} />
              <Tooltip formatter={(value, name) => [formatNumber(Number(value)), String(name)]} labelFormatter={(label) => `Data: ${label}`} contentStyle={{ borderRadius: 8, borderColor: '#DFE6EF', fontSize: 12 }} />
              <Legend />
              <Line type="monotone" dataKey="observed" name="Interações observadas" stroke="#2563EB" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="plays" name="Plays" stroke="#16A34A" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="comments" name="Comentários" stroke="#D97706" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
