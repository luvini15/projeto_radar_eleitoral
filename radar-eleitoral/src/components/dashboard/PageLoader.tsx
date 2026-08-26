import { Loader2 } from 'lucide-react'

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24 text-slate">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="ml-2 text-sm">Carregando dados do Radar…</span>
    </div>
  )
}
