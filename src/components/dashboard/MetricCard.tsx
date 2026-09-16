import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string
  deltaLabel: string
  positive?: boolean
  icon: LucideIcon
}

export function MetricCard({ label, value, deltaLabel, positive = true, icon: Icon }: MetricCardProps) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div className="data-rule absolute inset-x-0 top-0 h-1 opacity-70" />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase text-slate">{label}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white/5 text-blue">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 font-display text-3xl font-semibold leading-none text-ink">{value}</p>
      <div
        className={cn(
          'mt-3 inline-flex items-center gap-1 text-xs font-bold',
          positive ? 'text-positive' : 'text-alert'
        )}
      >
        {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
        {deltaLabel}
      </div>
    </Card>
  )
}
