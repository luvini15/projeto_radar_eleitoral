import type { ElementType } from 'react'
import { NavLink } from 'react-router-dom'
import { ArrowUpRight, CalendarDays, FileText, LayoutGrid, MessageSquareText, Users } from 'lucide-react'
import { DataFrame } from '@/components/dashboard/ApiData'
import { LatestPostCard } from '@/components/dashboard/LatestPostCard'
import { useCampaign, useCampaignData } from '@/lib/campaignContext'
import type { OverviewData, Post } from '@/types/radar'
import { number } from '@/utils/apiFormat'

const sections = [
  { to: '/conteudos', title: 'Conteúdos', description: 'Publicações, métricas e comentários.', icon: FileText },
  { to: '/temas-formatos', title: 'Temas e formatos', description: 'Desempenho por assunto e formato.', icon: LayoutGrid },
  { to: '/dias-horarios', title: 'Dias e horários', description: 'Resposta do público por dia e faixa de horário.', icon: CalendarDays },
  { to: '/audiencia', title: 'Audiência', description: 'Histórico agregado dos perfis acompanhados.', icon: Users },
  { to: '/insights', title: 'Inteligência', description: 'Rankings e sinais encontrados nos dados.', icon: MessageSquareText },
] as const

export default function Overview() {
  const { limit, selected, campaigns } = useCampaign()
  const overview = useCampaignData<OverviewData>('overview', `limit=${limit}`)
  const latest = useCampaignData<{ posts: Post[] }>('posts', 'role=CLIENT&limit_per_profile=1')
  const summary = overview.data?.summary
  const campaignName = campaigns.find(campaign => String(campaign.id) === selected)?.name || 'Campanha'
  const needsCollection = !summary?.posts_analyzed

  return (
    <DataFrame data={overview.data && latest.data} error={overview.error || latest.error} showContext={false}>
      <section className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate">Visão geral</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">{campaignName}</h2>
        </div>
        <p className="max-w-lg text-sm leading-6 text-slate">
          {needsCollection
            ? 'Ainda não há publicações coletadas para esta campanha.'
            : `${number(summary?.posts_analyzed)} publicações de ${number(summary?.profiles_monitored)} perfil acompanhadas nesta leitura.`}
        </p>
      </section>

      <section className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.5fr)]">
        <LatestPostCard key={latest.data?.posts[0]?.post_id ?? 'empty'} post={latest.data?.posts[0] ?? null} />

        <aside className="border-t border-white/10 pt-5 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate">Resumo da coleta</p>
          <dl className="mt-4 divide-y divide-white/10 border-y border-white/10">
            <SummaryRow label="Publicações" value={summary?.posts_analyzed} />
            <SummaryRow label="Perfis" value={summary?.profiles_monitored} />
            <SummaryRow label="Comentários" value={summary?.comments} />
            <SummaryRow label="Interações observadas" value={summary?.observed_interactions} />
          </dl>
          <NavLink
            to={needsCollection ? '/configuracoes' : '/conteudos'}
            className="mt-5 inline-flex w-full items-center justify-between rounded-full bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-950 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            {needsCollection ? 'Configurar coleta' : 'Abrir conteúdos'}
            <ArrowUpRight className="h-4 w-4" />
          </NavLink>
          <p className="mt-4 text-xs leading-5 text-slate">Valores ausentes indicam métricas que a fonte não forneceu.</p>
        </aside>
      </section>

      <section className="pt-2">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Áreas do painel</h2>
          <span className="hidden text-xs text-slate sm:inline">Dados da campanha organizados por assunto</span>
        </div>
        <nav aria-label="Áreas do painel" className="grid border-t border-white/10 md:grid-cols-2 xl:grid-cols-5">
          {sections.map(section => <SectionLink key={section.to} {...section} />)}
        </nav>
      </section>
    </DataFrame>
  )
}

function SummaryRow({ label, value }: { label: string; value: number | null | undefined }) {
  return <div className="flex items-baseline justify-between gap-4 py-4"><dt className="text-sm text-slate">{label}</dt><dd className="font-mono text-xl text-white">{number(value)}</dd></div>
}

function SectionLink({ to, title, description, icon: Icon }: { to: string; title: string; description: string; icon: ElementType }) {
  return (
    <NavLink
      to={to}
      className="group flex min-h-36 flex-col border-b border-white/10 py-5 pr-5 transition-colors hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40 md:px-5 md:first:pl-0 xl:border-r xl:last:border-r-0"
    >
      <div className="flex items-center justify-between text-white/70">
        <Icon className="h-5 w-5 stroke-[1.5]" />
        <ArrowUpRight className="h-4 w-4 opacity-40 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
      </div>
      <h3 className="mt-6 text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-slate">{description}</p>
    </NavLink>
  )
}
