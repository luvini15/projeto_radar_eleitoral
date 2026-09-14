import * as React from 'react'
import { NavLink } from 'react-router-dom'
import {
  ArrowRight,
  CalendarClock,
  FileStack,
  Layers3,
  Sparkles,
  Users,
} from 'lucide-react'
import { useCampaign, useCampaignData } from '@/lib/campaignContext'
import type { OverviewData, Post } from '@/types/radar'
import { DataFrame } from '@/components/dashboard/ApiData'
import { LatestPostCard } from '@/components/dashboard/LatestPostCard'


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
  const latest = useCampaignData<{posts: Post[]}>('posts', 'role=CLIENT&limit_per_profile=1')
  const summary = overview.data?.summary
  const campaignName = campaigns.find(campaign => String(campaign.id) === selected)?.name || 'Campanha'
  const needsCollection = !summary?.posts_analyzed

  return (
    <DataFrame data={overview.data && latest.data} error={overview.error || latest.error}>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(420px,0.75fr)]">
        <LatestPostCard key={latest.data?.posts[0]?.post_id ?? 'empty'} post={latest.data?.posts[0] ?? null} />

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

    </DataFrame>
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
