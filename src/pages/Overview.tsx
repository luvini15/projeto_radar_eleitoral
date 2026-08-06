import * as React from 'react'
import { Users, Eye, PlayCircle, MousePointerClick, Percent, FileStack } from 'lucide-react'
import { instagramService } from '@/services/instagramService'
import type { AccountSummary, DailyMetric, AlertaItem } from '@/types/instagram'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ExecutiveSummaryCard, HighlightCard } from '@/components/dashboard/ExecutiveSummary'
import { AlertList } from '@/components/dashboard/AlertList'
import { FollowersAreaChart } from '@/components/charts/FollowersAreaChart'
import { ReachInteractionsChart } from '@/components/charts/ReachInteractionsChart'
import { PageLoader } from '@/components/dashboard/PageLoader'
import { formatNumber, formatPercent, formatPP } from '@/utils/metrics'

export default function Overview() {
  const [account, setAccount] = React.useState<AccountSummary | null>(null)
  const [daily, setDaily] = React.useState<DailyMetric[]>([])
  const [alertas, setAlertas] = React.useState<AlertaItem[]>([])

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Seguidores"
          value={formatNumber(account.seguidores)}
          deltaLabel={`+${formatNumber(account.seguidoresVariacao)} cresc. líquido · ${formatPercent(account.seguidoresVariacaoPercentual)}`}
          icon={Users}
        />
        <MetricCard
          label="Alcance"
          value={formatNumber(account.alcance)}
          deltaLabel={formatPercent(account.alcanceVariacaoPercentual)}
          icon={Eye}
        />
        <MetricCard
          label="Visualizações"
          value={formatNumber(account.visualizacoes)}
          deltaLabel={formatPercent(account.visualizacoesVariacaoPercentual)}
          icon={PlayCircle}
        />
        <MetricCard
          label="Interações"
          value={formatNumber(account.interacoes)}
          deltaLabel={formatPercent(account.interacoesVariacaoPercentual)}
          icon={MousePointerClick}
        />
        <MetricCard
          label="Engaj. por alcance"
          value={`${account.engajamentoPorAlcance}%`}
          deltaLabel={formatPP(account.engajamentoPorAlcanceVariacaoPP)}
          icon={Percent}
        />
        <MetricCard
          label="Conteúdos publicados"
          value={String(account.conteudosPublicados)}
          deltaLabel={`+${account.conteudosPublicadosVariacao} vs. período anterior`}
          icon={FileStack}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FollowersAreaChart data={daily} />
        <ReachInteractionsChart data={daily} />
      </div>

      <div className="rounded-xl border border-blue/20 bg-blue/5 p-4 text-sm leading-relaxed text-blue-dark">
        <span className="font-semibold">Escopo Meta API:</span> os indicadores desta tela são baseados em métricas oficiais da conta autorizada e em snapshots salvos pelo Radar. O crescimento de seguidores é calculado como variação líquida do total de seguidores entre coletas; o sistema não identifica individualmente quem seguiu ou deixou de seguir.
      </div>

      <ExecutiveSummaryCard />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <HighlightCard
          kind="oportunidade"
          text="Mobilidade apresentou alcance 42% superior à mediana, apesar de representar apenas 12% das publicações."
        />
        <HighlightCard
          kind="atencao"
          text="Publicações estáticas tiveram queda de 18% no alcance médio."
        />
        <HighlightCard
          kind="recomendacao"
          text="Produzir dois Reels curtos sobre transporte público e infraestrutura entre quinta-feira e domingo."
        />
      </div>

      <AlertList alertas={alertas} />
    </div>
  )
}
