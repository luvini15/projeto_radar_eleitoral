import { Lock } from 'lucide-react'

export function ConfidentialBanner() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-border bg-muted/70 px-4 py-1.5 text-center text-[11px] font-semibold text-ink/80">
      <Lock className="h-3 w-3 shrink-0 text-blue" />
      <span>CONFIDENCIAL</span>
    </div>
  )
}
