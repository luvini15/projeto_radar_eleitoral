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
      <p className="text-sm text-slate">
        {media.length} conteúdos no período selecionado. Métricas exibidas são compatíveis com a API oficial da Meta e podem variar conforme o formato da publicação e permissões concedidas. Clique em uma linha para ver o detalhe.
      </p>
      <MediaTable media={media} onSelect={setSelected} />
      <MediaDetailPanel item={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
