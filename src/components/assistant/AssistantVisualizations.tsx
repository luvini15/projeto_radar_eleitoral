import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'

type Datum = Record<string, string | number | null>
type Series = { key: string; label: string; color?: string }

type BarSpec = {
  kind: 'bar'
  title: string
  subtitle?: string
  categoryKey: string
  sampleKey?: string
  data: Datum[]
  series: Series[]
}

type LineSpec = {
  kind: 'line'
  title: string
  subtitle?: string
  xKey: string
  data: Datum[]
  series: Series[]
}

type HeatmapSpec = {
  kind: 'heatmap'
  title: string
  subtitle?: string
  rows: string[]
  columns: string[]
  cells: { row: string; column: string; value: number | null; posts?: number | null }[]
  valueLabel: string
}

export type AssistantVisualizationSpec = BarSpec | LineSpec | HeatmapSpec

const lineColors = ['#ff5a1f', '#f4f4f4', '#8a8a8a', '#c8a18a', '#5f5f5f']
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
const precise = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

function metric(value: unknown) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 'Sem dado'
  return Math.abs(number) >= 1_000 ? compact.format(number) : precise.format(number)
}

function ChartTooltip({ active, payload, label, sampleKey }: TooltipContentProps<number, string> & { sampleKey?: string }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload as Datum | undefined
  return <div className="ai-chart-tooltip">
    <strong>{String(label ?? '')}</strong>
    {payload.map(item => <span key={String(item.dataKey)}><i style={{ background: item.color }} />{item.name}: {metric(item.value)}</span>)}
    {sampleKey && row?.[sampleKey] != null ? <small>{metric(row[sampleKey])} publicações na amostra</small> : null}
  </div>
}

function EmptyChart() {
  return <p className="ai-chart-empty">Ainda não há observações suficientes para desenhar este gráfico.</p>
}

function BarVisualization({ spec }: { spec: BarSpec }) {
  const hasValues = spec.data.some(row => spec.series.some(series => row[series.key] != null))
  if (!spec.data.length || !hasValues) return <EmptyChart />
  const height = Math.max(210, spec.data.length * 44)
  return <div className="ai-chart-canvas" style={{ height }} role="img" aria-label={spec.title}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={spec.data} layout="vertical" margin={{ top: 8, right: 18, bottom: 8, left: 4 }} accessibilityLayer>
        <CartesianGrid horizontal={false} stroke="rgba(255,255,255,.08)" />
        <XAxis type="number" domain={[0, 'auto']} tickFormatter={metric} tick={{ fill: 'rgba(255,255,255,.42)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey={spec.categoryKey} width={132} tickFormatter={value => String(value).length > 20 ? `${String(value).slice(0, 19)}…` : String(value)} tick={{ fill: 'rgba(255,255,255,.68)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip content={props => <ChartTooltip {...props} sampleKey={spec.sampleKey} />} cursor={{ fill: 'rgba(255,255,255,.035)' }} />
        {spec.series.length > 1 ? <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, color: 'rgba(255,255,255,.55)' }} /> : null}
        {spec.series.map((series, index) => <Bar key={series.key} dataKey={series.key} name={series.label} fill={series.color ?? lineColors[index % lineColors.length]} radius={[0, 4, 4, 0]} barSize={spec.series.length > 1 ? 10 : 15} />)}
      </BarChart>
    </ResponsiveContainer>
  </div>
}

function LineVisualization({ spec }: { spec: LineSpec }) {
  const hasValues = spec.data.some(row => spec.series.some(series => row[series.key] != null))
  if (!spec.data.length || !spec.series.length || !hasValues) return <EmptyChart />
  return <div className="ai-chart-canvas ai-chart-canvas--line" role="img" aria-label={spec.title}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={spec.data} margin={{ top: 12, right: 16, bottom: 4, left: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,.08)" />
        <XAxis dataKey={spec.xKey} interval="preserveStartEnd" tickFormatter={value => String(value).slice(5).replace('-', '/')} tick={{ fill: 'rgba(255,255,255,.42)', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,.12)' }} tickLine={false} />
        <YAxis domain={['auto', 'auto']} tickFormatter={metric} width={46} tick={{ fill: 'rgba(255,255,255,.42)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip content={props => <ChartTooltip {...props} />} />
        {spec.series.length > 1 ? <Legend iconType="line" wrapperStyle={{ fontSize: 10, color: 'rgba(255,255,255,.55)' }} /> : null}
        {spec.series.map((series, index) => <Line key={series.key} type="monotone" dataKey={series.key} name={series.label} stroke={series.color ?? lineColors[index % lineColors.length]} strokeWidth={2} dot={{ r: 2.5, fill: '#080808' }} activeDot={{ r: 4 }} connectNulls={false} />)}
      </LineChart>
    </ResponsiveContainer>
  </div>
}

function HeatmapVisualization({ spec }: { spec: HeatmapSpec }) {
  const observed = spec.cells.map(cell => cell.value).filter((value): value is number => value != null && Number.isFinite(value))
  if (!spec.rows.length || !spec.columns.length || !observed.length) return <EmptyChart />
  const maximum = Math.max(...observed, 1)
  const lookup = new Map(spec.cells.map(cell => [`${cell.row}|${cell.column}`, cell]))
  return <div className="ai-heatmap-scroll">
    <div className="ai-heatmap" style={{ gridTemplateColumns: `minmax(92px, 1.2fr) repeat(${spec.columns.length}, minmax(62px, 1fr))` }}>
      <span />
      {spec.columns.map(column => <b key={column}>{column}</b>)}
      {spec.rows.map(row => <React.Fragment key={row}>
        <strong>{row.replace('-feira', '')}</strong>
        {spec.columns.map(column => {
          const cell = lookup.get(`${row}|${column}`)
          const value = cell?.value
          const opacity = value == null ? 0.035 : 0.15 + (value / maximum) * 0.75
          const detail = value == null
            ? `${row}, ${column}: sem dado`
            : `${row}, ${column}: ${metric(value)} ${spec.valueLabel}; ${metric(cell?.posts)} publicações`
          return <button key={column} type="button" aria-label={detail} data-tooltip={detail} style={{ backgroundColor: `rgba(255,90,31,${opacity})` }}>{value == null ? '—' : metric(value)}</button>
        })}
      </React.Fragment>)}
    </div>
  </div>
}

export function AssistantVisualization({ spec }: { spec: AssistantVisualizationSpec }) {
  return <figure className="ai-chart">
    <figcaption><strong>{spec.title}</strong>{spec.subtitle ? <span>{spec.subtitle}</span> : null}</figcaption>
    {spec.kind === 'bar' ? <BarVisualization spec={spec} /> : spec.kind === 'line' ? <LineVisualization spec={spec} /> : <HeatmapVisualization spec={spec} />}
  </figure>
}
