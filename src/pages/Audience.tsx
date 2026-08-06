import * as React from 'react'
import { instagramService } from '@/services/instagramService'
import type { AudienceSummary } from '@/types/instagram'
import { PageLoader } from '@/components/dashboard/PageLoader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { Users, UserPlus, Eye, MousePointerClick, Radar, Handshake } from 'lucide-react'
import { formatNumber } from '@/utils/metrics'

export default function Audience() {
  const [audience, setAudience] = React.useState<AudienceSummary | null>(null)

  React.useEffect(() => {
    instagramService.getAudience().then(setAudience)
  }, [])

  if (!audience) return <PageLoader />

  const maxRegiao = Math.max(...audience.regioes.map((r) => r.percentual))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Seguidores" value={formatNumber(audience.seguidores)} deltaLabel="Base atual" icon={Users} />
        <MetricCard label="Cresc. líquido" value={formatNumber(audience.novosSeguidores)} deltaLabel="Calculado por snapshots" icon={UserPlus} />
        <MetricCard label="Visitas ao perfil" value={formatNumber(audience.visitasPerfil)} deltaLabel="No período" icon={Eye} />
        <MetricCard label="Cliques no link" value={formatNumber(audience.cliquesLink)} deltaLabel="No período" icon={MousePointerClick} />
        <MetricCard label="Contas alcançadas" value={formatNumber(audience.contasAlcancadas)} deltaLabel="No período" icon={Radar} />
        <MetricCard label="Contas engajadas" value={formatNumber(audience.contasEngajadas)} deltaLabel="No período" icon={Handshake} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por faixa etária</CardTitle>
            <CardDescription>Dado agregado quando disponível e elegível.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {audience.faixaEtaria.map((f) => (
              <div key={f.faixa}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-blue-dark">{f.faixa} anos</span>
                  <span className="font-medium text-blue-dark">{f.percentual}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-bg">
                  <div className="h-full rounded-full bg-blue" style={{ width: `${f.percentual}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por gênero</CardTitle>
            <CardDescription>Dado agregado quando disponível e elegível.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {audience.genero.map((g, i) => (
              <div key={g.genero}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-blue-dark">{g.genero}</span>
                  <span className="font-medium text-blue-dark">{g.percentual}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-bg">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${g.percentual}%`,
                      backgroundColor: ['#2563EB', '#16A34A', '#D97706'][i % 3],
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Localizações agregadas do público</CardTitle>
          <CardDescription>Exemplo demonstrativo. A Meta pode retornar localidades agregadas quando houver volume mínimo; isto não deve ser tratado como mapa completo por Região Administrativa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {audience.regioes
            .slice()
            .sort((a, b) => b.percentual - a.percentual)
            .map((r, i) => (
              <div key={r.cidade} className="flex items-center gap-3">
                <span className="w-5 shrink-0 text-xs font-semibold text-slate">{i + 1}</span>
                <span className="w-32 shrink-0 text-sm text-blue-dark">{r.cidade}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
                  <div
                    className="h-full rounded-full bg-blue"
                    style={{ width: `${(r.percentual / maxRegiao) * 100}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-sm font-medium text-blue-dark">
                  {r.percentual}%
                </span>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  )
}

