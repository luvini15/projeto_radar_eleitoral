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
import { useCampaign, useCampaignData } from '@/lib/campaignContext'
import type { OverviewData, Follower } from '@/types/radar'
import { DataFrame } from '@/components/dashboard/ApiData'
import { Dialog } from '@/components/ui/dialog'
import { number } from '@/utils/apiFormat'

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
  const { limit, selected, campaigns } = useCampaign()
  const overview = useCampaignData<OverviewData>('overview', `limit=${limit}`)
  const followers = useCampaignData<{profiles: Follower[]}>('followers-history', 'days=90')
  const [selectedMetric, setSelectedMetric] = React.useState<MetricKey>('seguidores')
  const [metricModalOpen, setMetricModalOpen] = React.useState(false)
  const principal = followers.data?.profiles.find(profile => profile.role === 'CLIENT')
  const points = principal?.history.filter(point => point.followers != null) || []
  const hasGrowth = points.length > 1
  const growth = hasGrowth ? points.at(-1)!.followers! - points[0].followers! : null
  const growthPercent = growth != null && points[0].followers ? growth / points[0].followers * 100 : null
  const summary = overview.data?.summary
  const campaignName = campaigns.find(campaign => String(campaign.id) === selected)?.name || 'Campanha'
  const needsCollection = !summary?.posts_analyzed
  const metricOptions: Record<MetricKey, MetricOption> = {
    seguidores: {
      key: 'seguidores', label: 'Seguidores',
      helper: principal ? `@${principal.username} · últimos 90 dias` : 'Perfil principal não cadastrado',
      value: number(principal?.current_followers),
      delta: growth == null ? 'É preciso ter duas coletas com dados.' : `${growth > 0 ? '+' : ''}${number(growth)} entre coletas disponíveis`,
      period: growthPercent == null ? '—' : `${growthPercent > 0 ? '+' : ''}${number(growthPercent)}%`,
      values: principal?.history.map(point => point.followers) || [],
      emptyLabel: 'O histórico aparecerá após duas coletas de seguidores.',
      chartLabel: points.length ? `Coletas de ${points[0].date} a ${points.at(-1)!.date}` : 'Sem histórico disponível',
      icon: Users,
    },
    alcance: {
      key: 'alcance', label: 'Alcance', helper: 'Contas alcançadas', value: '—',
      delta: 'Não disponível nesta integração.', period: '—', values: [],
      emptyLabel: 'A coleta atual não fornece alcance. Nenhuma estimativa é exibida.',
      chartLabel: 'Métrica indisponível', icon: Eye,
    },
    interacoes: {
      key: 'interacoes', label: 'Interações observadas', helper: `Até ${limit} posts por perfil`,
      value: number(summary?.observed_interactions), delta: 'Sem série histórica comparável.',
      period: '—', values: [], emptyLabel: 'O total usa a última coleta de cada post. Histórico de variação indisponível.',
      chartLabel: 'Total da campanha · pode ser parcial', icon: MousePointerClick,
    },
  }

  return (
    <DataFrame data={overview.data && followers.data} error={overview.error || followers.error}>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(420px,0.75fr)]">
        <MainMetricChart
          metric={metricOptions[selectedMetric]}
          onOpenModal={() => setMetricModalOpen(true)}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-[1.5rem] border border-white/10 bg-card/80 p-5">
            <p className="font-mono text-[10px] uppercase text-slate">proxima acao</p>
            <p className="mt-3 text-2xl font-semibold leading-tight text-white">{needsCollection ? 'Coletar dados' : 'Explorar conteúdos'}</p>
            <p className="mt-3 text-sm leading-6 text-slate">
              {needsCollection ? `Vincule o perfil principal de ${campaignName} e faça a primeira coleta.` : `${summary?.posts_analyzed} posts analisados em ${summary?.profiles_monitored} perfil(is). Consulte os detalhes dos conteúdos coletados.`}
            </p>
            <NavLink to={needsCollection ? '/configuracoes' : '/conteudos'} className="mt-5 inline-flex items-center gap-2 text-sm text-blue underline">
              {needsCollection ? 'Gerenciar coleta' : 'Ver conteúdos'} <ArrowRight className="h-4 w-4" />
            </NavLink>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-card/80 p-5">
            <p className="font-mono text-[10px] uppercase text-slate">alerta principal</p>
            <p className="mt-3 text-lg font-semibold leading-snug text-white">{needsCollection ? 'Aguardando coleta' : 'Cobertura das métricas'}</p>
            <p className="mt-3 text-sm leading-6 text-slate">
              {needsCollection ? 'Nenhum post coletado nesta campanha. Os indicadores serão preenchidos com os dados disponíveis.' : 'Interações podem ser parciais. Alcance e variação de interações ainda não estão disponíveis; valores ausentes aparecem como —.'}
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
    </DataFrame>
  )
}

interface MetricOption {
  key: MetricKey
  label: string
  helper: string
  value: string
  delta: string
  period: string
  values: (number | null)[]
  emptyLabel: string
  chartLabel: string
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
        {metric.values.filter(value => value != null).length > 1 ? <svg role="img" aria-label={metric.chartLabel} className="relative h-full w-full" viewBox="0 0 300 120" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F5F5F4" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#F5F5F4" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={sparkline.area} fill={`url(#${gradientId})`} />
          <path d={sparkline.line} fill="none" stroke="#F5F5F4" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={sparkline.dot.x * 3} cy={sparkline.dot.y * 1.2} r="2.5" fill="#F5F5F4" />
        </svg> : <div role="status" className="relative flex h-full items-center justify-center p-6 text-center text-sm leading-6 text-slate">{metric.emptyLabel}</div>}

      </div>
      <p className="mt-3 text-xs text-slate">{metric.chartLabel}</p>
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

function buildSparkline(values: (number | null)[]) {
  const cleanValues = values.filter((value): value is number => value != null && Number.isFinite(value))
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
