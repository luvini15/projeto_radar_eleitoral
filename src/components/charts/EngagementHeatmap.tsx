import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { HeatmapCelula } from '@/types/instagram'
import { heatIntensityToColor } from '@/utils/metrics'

const dias = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']
const diasCurto = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const horarios = ['8h', '10h', '12h', '14h', '16h', '18h', '20h', '22h']

export function EngagementHeatmap({ data }: { data: HeatmapCelula[] }) {
  const lookup = new Map(data.map((c) => [`${c.diaSemana}|${c.horario}`, c.engajamentoMedio]))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Engajamento médio por dia e horário</CardTitle>
        <CardDescription>Quanto mais escuro, maior o engajamento médio observado.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto thin-scrollbar">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-[64px_repeat(7,1fr)] gap-1">
            <div />
            {diasCurto.map((d) => (
              <div key={d} className="pb-1 text-center text-[11px] font-medium text-slate">
                {d}
              </div>
            ))}
            {horarios.map((h) => (
              <div key={h} className="contents">
                <div className="flex items-center pr-2 text-[11px] font-medium text-slate">{h}</div>
                {dias.map((dia) => {
                  const valor = lookup.get(`${dia}|${h}`) ?? 0
                  return (
                    <div
                      key={dia + h}
                      title={`${dia}, ${h}: ${valor}`}
                      className="flex h-9 items-center justify-center rounded-md text-[10px] font-semibold"
                      style={{
                        backgroundColor: heatIntensityToColor(valor),
                        color: valor > 55 ? '#FFFFFF' : '#172033',
                      }}
                    >
                      {valor}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
