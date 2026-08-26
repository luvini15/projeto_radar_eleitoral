import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'

import {
  formatCompact,
  formatNumber,
} from '@/utils/metrics'


interface FollowersHistoryPoint {
  date: string
  followers: number | null
  collected_at: string
}


interface FollowersAreaChartProps {
  data: FollowersHistoryPoint[]
  requestedDays?: number
}


export function FollowersAreaChart({
  data,
  requestedDays = 60,
}: FollowersAreaChartProps) {

  const daysAvailable = data.length

  return (
    <Card>

      <CardHeader>

        <CardTitle>
          Evolução de seguidores
        </CardTitle>

        <CardDescription>
          {daysAvailable > 1
            ? `${daysAvailable} dias de histórico disponíveis`
            : `Histórico sendo construído · janela de ${requestedDays} dias`}
        </CardDescription>

      </CardHeader>


      <CardContent className="pl-1 pr-4">

        {data.length === 0 ? (

          <div className="flex h-[260px] items-center justify-center text-sm text-slate">
            Nenhum snapshot de seguidores disponível.
          </div>

        ) : data.length === 1 ? (

          <div className="flex h-[260px] flex-col items-center justify-center gap-2">

            <span className="text-3xl font-bold text-blue-dark">
              {data[0].followers !== null
                ? formatNumber(data[0].followers)
                : 'N/D'}
            </span>

            <span className="text-sm text-slate">
              Seguidores na primeira coleta
            </span>

            <span className="text-xs text-slate">
              O gráfico será formado conforme novos
              snapshots diários forem armazenados.
            </span>

          </div>

        ) : (

          <ResponsiveContainer
            width="100%"
            height={260}
          >

            <AreaChart
              data={data}
              margin={{
                top: 8,
                right: 8,
                left: 0,
                bottom: 0,
              }}
            >

              <defs>

                <linearGradient
                  id="seguidoresGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >

                  <stop
                    offset="0%"
                    stopColor="#2563EB"
                    stopOpacity={0.28}
                  />

                  <stop
                    offset="100%"
                    stopColor="#2563EB"
                    stopOpacity={0}
                  />

                </linearGradient>

              </defs>


              <CartesianGrid
                vertical={false}
                stroke="#DFE6EF"
              />


              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const date = String(value)

                  return (
                    date.slice(8, 10) +
                    '/' +
                    date.slice(5, 7)
                  )
                }}
                tick={{
                  fontSize: 11,
                  fill: '#64748B',
                }}
                axisLine={{
                  stroke: '#DFE6EF',
                }}
                tickLine={false}
              />


              <YAxis
                tickFormatter={(value) =>
                  formatCompact(value)
                }
                tick={{
                  fontSize: 11,
                  fill: '#64748B',
                }}
                axisLine={false}
                tickLine={false}
                width={48}
                domain={[
                  'dataMin - 100',
                  'dataMax + 100',
                ]}
              />


              <Tooltip
                formatter={(value) => [
                  formatNumber(
                    Number(value)
                  ),
                  'Seguidores',
                ]}
                labelFormatter={(label) =>
                  `Data: ${label}`
                }
                contentStyle={{
                  borderRadius: 8,
                  borderColor: '#DFE6EF',
                  fontSize: 12,
                }}
              />


              <Area
                type="monotone"
                dataKey="followers"
                stroke="#2563EB"
                strokeWidth={2}
                fill="url(#seguidoresGradient)"
              />

            </AreaChart>

          </ResponsiveContainer>

        )}

      </CardContent>

    </Card>
  )
}