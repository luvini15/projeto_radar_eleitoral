import { Lock } from 'lucide-react'

export function ConfidentialBanner() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-blue-dark px-4 py-1.5 text-center text-[11px] font-medium text-white/85">
      <Lock className="h-3 w-3 shrink-0 text-warning" />
      <span>CONFIDENCIAL — Uso exclusivo da campanha de Cláudio Borcem.</span>
      <span className="hidden text-white/40 sm:inline">•</span>
      <span className="text-white/50">Dados ilustrativos — protótipo em desenvolvimento.</span>
    </div>
  )
}
