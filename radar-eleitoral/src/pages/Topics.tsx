import * as React from 'react'
import { getThemesFormats } from '@/services/api'
import type { ThemesFormatsResponse } from '@/types/api'
import { PageLoader } from '@/components/dashboard/PageLoader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatNumber } from '@/utils/metrics'

const val = (v: number | null) => v == null ? 'N/D' : formatNumber(Math.round(v))

export default function Topics() {
  const [data, setData] = React.useState<ThemesFormatsResponse | null>(null)
  const load = React.useCallback(() => getThemesFormats().then(setData), [])
  React.useEffect(() => { load() }, [load])
  React.useEffect(() => { const h = () => load(); window.addEventListener('radar:data-updated', h); return () => window.removeEventListener('radar:data-updated', h) }, [load])
  if (!data) return <PageLoader />

  return <div className="space-y-6">
    <div className="rounded-xl border border-blue/20 bg-blue/5 p-4 text-sm text-blue-dark">
      <span className="font-semibold">Dados reais:</span> formatos vêm diretamente dos posts coletados. Temas são classificação determinística do Radar a partir das legendas; não são categorias fornecidas pelo Instagram.
    </div>

    <section>
      <h2 className="mb-3 font-display text-xl font-bold">Temas identificados</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.themes.map((t) => <Card key={t.theme} className="p-4">
          <p className="font-semibold text-blue-dark">{t.theme}</p><p className="mt-1 text-xs text-slate">{t.posts} conteúdos</p>
          <div className="mt-4 space-y-2 text-xs"><div className="flex justify-between"><span className="text-slate">Comentários médios</span><b>{val(t.avg_comments)}</b></div><div className="flex justify-between"><span className="text-slate">Likes médios</span><b>{val(t.avg_likes)}</b></div><div className="flex justify-between"><span className="text-slate">Views médias</span><b>{val(t.avg_views)}</b></div><div className="flex justify-between"><span className="text-slate">Plays médios</span><b>{val(t.avg_plays)}</b></div><div className="flex justify-between"><span className="text-slate">Interações observadas</span><b>{val(t.avg_observed_interactions)}</b></div></div>
        </Card>)}
      </div>
    </section>

    <Card>
      <CardHeader><CardTitle>Comparação entre formatos</CardTitle><CardDescription>Métricas existentes nos posts armazenados; não há alcance, shares ou saves estimados.</CardDescription></CardHeader>
      <CardContent className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="text-left text-xs uppercase text-slate"><tr><th className="py-2">Formato</th><th>Posts</th><th>Comentários médios</th><th>Likes médios</th><th>Views médias</th><th>Plays médios</th><th>Interações observadas</th></tr></thead><tbody className="divide-y divide-border">{data.formats.map((f) => <tr key={f.format}><td className="py-3 font-semibold">{f.format}</td><td>{f.posts}</td><td>{val(f.avg_comments)}</td><td>{val(f.avg_likes)}</td><td>{val(f.avg_views)}</td><td>{val(f.avg_plays)}</td><td>{val(f.avg_observed_interactions)}</td></tr>)}</tbody></table></CardContent>
    </Card>
  </div>
}
