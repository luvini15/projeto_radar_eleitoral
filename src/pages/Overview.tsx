import * as React from 'react'
import { NavLink } from 'react-router-dom'
import {
  ArrowRight,
  CalendarClock,
  Eye,
  FileStack,
  Layers3,
  MousePointerClick,
  SlidersHorizontal,
  Sparkles,
  Users,
} from 'lucide-react'
import { instagramService } from '@/services/instagramService'
import type { AccountSummary, AlertaItem, DailyMetric } from '@/types/instagram'
import { PageLoader } from '@/components/dashboard/PageLoader'
import { Dialog } from '@/components/ui/dialog'
import { formatNumber, formatPercent } from '@/utils/metrics'

type MetricKey = 'seguidores' | 'alcance' | 'interacoes'

const hubActions = [
  {
    to: '/conteudos',
    title: 'Conteudos',
    metric: 'ver posts',
    tag: 'arquivo',
    icon: FileStack,
    summary: 'Veja publicacoes, notas de desempenho e detalhes por peca.',
  },
  {
    to: '/temas-formatos',
    title: 'Temas e formatos',
    metric: 'comparar',
    tag: 'leitura',
    icon: Layers3,
    summary: 'Descubra assuntos com tracao e formatos que merecem prioridade.',
  },
  {
    to: '/dias-horarios',
    title: 'Dias e horarios',
    metric: 'planejar',
    tag: 'agenda',
    icon: CalendarClock,
    summary: 'Encontre janelas com melhor resposta para proximas postagens.',
  },
  {
    to: '/audiencia',
    title: 'Audiencia',
    metric: 'entender',
    tag: 'publico',
    icon: Users,
    summary: 'Cruze sinais agregados de audiencia e comportamento.',
  },
  {
    to: '/insights',
    title: 'Inteligencia',
    metric: 'decidir',
    tag: 'acao',
    icon: Sparkles,
    summary: 'Transforme os dados em recomendacoes operacionais.',
  },
]

export default function Overview() {
  const [account, setAccount] = React.useState<AccountSummary | null>(null)
  const [daily, setDaily] = React.useState<DailyMetric[]>([])
  const [alertas, setAlertas] = React.useState<AlertaItem[]>([])
  const [selectedMetric, setSelectedMetric] = React.useState<MetricKey>('alcance')
  const [metricModalOpen, setMetricModalOpen] = React.useState(false)

  React.useEffect(() => {
    Promise.all([
      instagramService.getAccountSummary(),
      instagramService.getDailyMetrics(),
      instagramService.getAlerts(),
    ]).then(([acc, dm, al]) => {
      setAccount(acc)
      setDaily(dm)
      setAlertas(al)
    })
  }, [])

  if (!account) return <PageLoader />

  const lastPoint = daily.at(-1)
  const firstPoint = daily.at(0)
  const reachDelta = firstPoint && lastPoint ? lastPoint.alcance - firstPoint.alcance : 0
  const topAlert = alertas[0]
  const alertLabel =
    topAlert?.tipo === 'positivo' ? 'Sinal positivo' : topAlert?.tipo === 'atencao' ? 'Ponto de atencao' : 'Monitoramento'

  const metricOptions: Record<MetricKey, MetricOption> = {
    seguidores: {
      key: 'seguidores',
      label: 'Seguidores',
      helper: 'Base monitorada',
      value: formatNumber(account.seguidores),
      delta: `+${formatNumber(account.seguidoresVariacao)} no periodo`,
      period: formatPercent(account.seguidoresVariacaoPercentual),
      values: daily.map((point) => point.seguidores),
      icon: Users,
    },
    alcance: {
      key: 'alcance',
      label: 'Alcance',
      helper: 'Ultimos 30 dias',
      value: formatNumber(account.alcance),
      delta: `${formatNumber(reachDelta)} na janela`,
      period: formatPercent(account.alcanceVariacaoPercentual),
      values: daily.map((point) => point.alcance),
      icon: Eye,
    },
    interacoes: {
      key: 'interacoes',
      label: 'Interacoes',
      helper: 'Resposta do publico',
      value: formatNumber(account.interacoes),
      delta: `${account.engajamentoPorAlcance}% por alcance`,
      period: formatPercent(account.interacoesVariacaoPercentual),
      values: daily.map((point) => point.interacoes),
      icon: MousePointerClick,
    },
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(420px,0.75fr)]">
        <MainMetricChart
          metric={metricOptions[selectedMetric]}
          onOpenModal={() => setMetricModalOpen(true)}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-[1.5rem] border border-white/10 bg-card/80 p-5">
            <p className="font-mono text-[10px] uppercase text-slate">proxima acao</p>
            <p className="mt-3 text-2xl font-semibold leading-tight text-white">Quinta, 19h</p>
            <p className="mt-3 text-sm leading-6 text-slate">
              Publicar Reel curto sobre transporte publico com chamada local e legenda revisavel.
            </p>
            <div className="mt-5 h-2 rounded-full bg-white/10">
              <div className="h-2 w-[78%] rounded-full bg-white/70" />
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-card/80 p-5">
            <p className="font-mono text-[10px] uppercase text-slate">alerta principal</p>
            <p className="mt-3 text-lg font-semibold leading-snug text-white">{alertLabel}</p>
            <p className="mt-3 text-sm leading-6 text-slate">
              {topAlert?.texto ?? 'Os sinais principais estao estaveis no periodo monitorado.'}
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase text-slate">acessos rapidos</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Escolha para onde ir agora</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate">
            A home fica leve; as analises completas moram nas areas abaixo.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {hubActions.map((action) => (
            <HubActionCard key={action.to} {...action} />
          ))}
        </div>
      </section>

      <Dialog
        open={metricModalOpen}
        onClose={() => setMetricModalOpen(false)}
        title="Alterar visao"
      >
        <div className="grid gap-2">
          {Object.values(metricOptions).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                setSelectedMetric(option.key)
                setMetricModalOpen(false)
              }}
              className={`flex items-center justify-between gap-4 rounded-xl border px-3 py-3 text-left transition-colors ${
                selectedMetric === option.key
                  ? 'border-white/35 bg-white/10 text-white'
                  : 'border-white/10 bg-white/5 text-slate hover:border-white/25 hover:bg-white/8 hover:text-white'
              }`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/8 text-white">
                  <option.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{option.label}</span>
                  <span className="block truncate text-xs text-slate">{option.helper}</span>
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-white">{option.value}</span>
            </button>
          ))}
        </div>
      </Dialog>
    </div>
  )
}

interface MetricOption {
  key: MetricKey
  label: string
  helper: string
  value: string
  delta: string
  period: string
  values: number[]
  icon: React.ElementType
}

function MainMetricChart({ metric, onOpenModal }: { metric: MetricOption; onOpenModal: () => void }) {
  const gradientId = React.useId()
  const sparkline = React.useMemo(() => buildSparkline(metric.values), [metric.values])
  const Icon = metric.icon

  return (
    <article className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#080D16]/88 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase text-slate">Data Sight hub</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-white md:text-3xl">
            O resumo para decidir rapido.
          </h1>
        </div>
        <button
          type="button"
          onClick={onOpenModal}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/35"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Alterar visao
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/8 text-white">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate">{metric.helper}</p>
              <p className="text-lg font-semibold text-white">{metric.label}</p>
            </div>
          </div>
          <p className="mt-5 text-5xl font-semibold tracking-normal text-white">{metric.value}</p>
        </div>
        <div className="grid min-w-[170px] gap-2 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="font-mono text-[10px] uppercase text-slate">variacao</p>
          <p className="text-2xl font-semibold text-white">{metric.period}</p>
          <p className="text-xs leading-5 text-slate">{metric.delta}</p>
        </div>
      </div>

      <div className="relative mt-6 h-[230px] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#050812] p-4">
        <div className="absolute inset-0 data-rule opacity-20" />
        <svg className="relative h-full w-full" viewBox="0 0 300 120" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F5F5F4" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#F5F5F4" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={sparkline.area} fill={`url(#${gradientId})`} />
          <path d={sparkline.line} fill="none" stroke="#F5F5F4" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div
          className="absolute"
          style={{ left: `calc(${sparkline.dot.x}% + 16px)`, top: `calc(${sparkline.dot.y}% + 16px)` }}
        >
          <div className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg shadow-white/20" />
          <div className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-white/20" />
        </div>
      </div>
    </article>
  )
}

interface HubActionCardProps {
  to: string
  title: string
  metric: string
  tag: string
  icon: React.ElementType
  summary: string
}

function HubActionCard({ to, title, metric, tag, icon: Icon, summary }: HubActionCardProps) {
  return (
    <NavLink
      to={to}
      className="group relative min-h-[254px] overflow-hidden rounded-[10px] border border-white/10 bg-[#101010] p-[15px] text-white transition-all duration-300 hover:border-white/24 hover:bg-[#171717] hover:shadow-[0_18px_48px_rgba(0,0,0,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/35"
    >
      <div className="flex h-full w-full flex-col items-center justify-center gap-[15px]">
        <div className="flex h-[152px] w-full items-center justify-center rounded-lg border border-white/10 bg-[#080808] text-white/70 transition-all duration-300 group-hover:h-[110px] group-hover:bg-white group-hover:text-black">
          <Icon className="h-14 w-14 stroke-[1.6]" />
        </div>
        <div className="flex min-h-[44px] w-full flex-col items-center justify-center text-center">
          <p className="text-[0.72rem] font-semibold uppercase tracking-normal text-slate">
            {title}
          </p>
          <p className="mt-1 text-sm font-bold uppercase tracking-normal text-white">{metric}</p>
        </div>
        <div className="grid w-full grid-rows-[0fr] transition-[grid-template-rows] duration-300 group-hover:grid-rows-[1fr]">
          <p className="overflow-hidden text-center text-xs leading-5 text-slate">{summary}</p>
        </div>
        <span className="mt-auto inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-white/14 bg-white/7 text-sm font-semibold text-white transition-all duration-300 group-hover:mt-0 group-hover:bg-white group-hover:text-black">
          Abrir
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
      <p className="absolute left-3 top-3 rounded-full border border-white/14 bg-black/55 px-3 py-1.5 text-xs font-semibold text-white/74">
        {tag}
      </p>
    </NavLink>
  )
}

function buildSparkline(values: number[]) {
  const cleanValues = values.filter((value) => Number.isFinite(value))
  const safeValues = cleanValues.length > 1 ? cleanValues : [0, 0]
  const min = Math.min(...safeValues)
  const max = Math.max(...safeValues)
  const range = max - min || 1
  const points = safeValues.map((value, index) => {
    const x = safeValues.length === 1 ? 150 : (index / (safeValues.length - 1)) * 300
    const y = 104 - ((value - min) / range) * 88
    return { x, y }
  })

  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(' ')
  const area = `M0,120 L${points[0].x.toFixed(1)},${points[0].y.toFixed(1)} ${points
    .slice(1)
    .map((point) => `L${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(' ')} L300,120 Z`
  const last = points.at(-1) ?? { x: 300, y: 60 }

  return {
    line,
    area,
    dot: {
      x: (last.x / 300) * 100,
      y: (last.y / 120) * 100,
    },
  }
}
