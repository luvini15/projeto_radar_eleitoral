import type { ElementType } from 'react'
import { NavLink } from 'react-router-dom'
import { ArrowUpRight, CalendarDays, FileText, LayoutGrid, MessageSquareText, Users } from 'lucide-react'
import { DataFrame } from '@/components/dashboard/ApiData'
import { LatestPostCard } from '@/components/dashboard/LatestPostCard'
import { PostAIAnalysis } from '@/components/dashboard/PostAIAnalysis'
import { useCampaign, useCampaignData } from '@/lib/campaignContext'
import type { OverviewData, Post } from '@/types/radar'
import { number } from '@/utils/apiFormat'

const sections = [
  { to: '/conteudos', title: 'Conteúdos', description: 'Publicações, métricas e comentários.', icon: FileText },
  { to: '/temas-formatos', title: 'Temas e formatos', description: 'Desempenho por assunto e formato.', icon: LayoutGrid },
  { to: '/dias-horarios', title: 'Dias e horários', description: 'Dados por dia e faixa de horário.', icon: CalendarDays },
  { to: '/audiencia', title: 'Audiência', description: 'Histórico agregado dos perfis.', icon: Users },
  { to: '/insights', title: 'Inteligência', description: 'Leituras dos dados coletados.', icon: MessageSquareText },
] as const

export default function Overview() {
  const { limit, selected, campaigns } = useCampaign()
  const overview = useCampaignData<OverviewData>('overview', `limit=${limit}`)
  const latest = useCampaignData<{ posts: Post[] }>('posts', 'role=CLIENT&limit_per_profile=1')
  const summary = overview.data?.summary
  const latestPost = latest.data?.posts[0] ?? null
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

      <section className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
        <div className="min-w-0 space-y-5">
          <LatestPostCard key={latestPost?.post_id ?? 'empty'} post={latestPost} />
          {latestPost ? (
            <PostAIAnalysis
              campaignId={selected}
              postId={latestPost.post_id}
              version={`${latestPost.metrics.collected_at}|${latestPost.post_id}`}
              disclosure
            />
          ) : null}
        </div>

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

          <nav aria-label="Áreas do painel" className="mt-8 border-t border-white/10">
            <h2 className="py-4 text-sm font-semibold text-white">Áreas do painel</h2>
            <div className="border-t border-white/10">
              {sections.map(section => <SectionLink key={section.to} {...section} />)}
            </div>
          </nav>
        </aside>
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
      className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-white/10 py-4 transition-colors hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40"
    >
      <Icon className="h-4 w-4 text-white/60" />
      <span className="min-w-0"><strong className="block text-sm font-medium text-white">{title}</strong><small className="mt-0.5 block text-xs leading-5 text-slate">{description}</small></span>
      <ArrowUpRight className="h-4 w-4 text-white/35 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
    </NavLink>
  )
}
