import * as React from 'react'
import { instagramService } from '@/services/instagramService'
import type { MediaItem } from '@/types/instagram'
import { MediaTable } from '@/components/tables/MediaTable'
import { MediaDetailPanel } from '@/components/tables/MediaDetailPanel'
import { PageLoader } from '@/components/dashboard/PageLoader'

export default function Content() {
  const [media, setMedia] = React.useState<MediaItem[] | null>(null)
  const [selected, setSelected] = React.useState<MediaItem | null>(null)

  React.useEffect(() => {
    instagramService.getMedia().then(setMedia)
  }, [])

  if (!media) return <PageLoader />

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-muted/60 p-4">
        <p className="text-sm leading-6 text-slate">
          {media.length} conteudos no periodo selecionado. Metricas exibidas seguem o que pode vir da API oficial da Meta e variam por formato e permissao concedida.
        </p>
      </div>
      <MediaTable media={media} onSelect={setSelected} />
      <MediaDetailPanel item={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
