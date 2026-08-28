import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { FormatoResumo } from '@/types/instagram'
import { formatCompact } from '@/utils/metrics'

export function FormatComparison({ data }: { data: FormatoResumo[] }) {
  const maxAlcance = Math.max(...data.map((f) => f.alcanceMedio))
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparacao entre formatos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((f) => (
          <div key={f.formato}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-ink">{f.formato}</span>
              <span className="text-slate">{formatCompact(f.alcanceMedio)} de alcance medio</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-blue"
                style={{ width: `${(f.alcanceMedio / maxAlcance) * 100}%` }}
              />
            </div>
            <div className="mt-1.5 grid grid-cols-1 gap-2 text-[11px] text-slate sm:grid-cols-3">
              <span>Engajamento: <span className="font-medium text-ink">{f.engajamentoMedio}%</span></span>
              <span>Compart.: <span className="font-medium text-ink">{formatCompact(f.compartilhamentosMedios)}</span></span>
              <span>Salvos: <span className="font-medium text-ink">{formatCompact(f.salvamentosMedios)}</span></span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
