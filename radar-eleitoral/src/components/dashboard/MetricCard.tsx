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
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate">{label}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue/10 text-blue">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 font-display text-3xl font-bold tracking-tight text-blue-dark">{value}</p>
      <div
        className={cn(
          'mt-2 inline-flex items-center gap-1 text-xs font-semibold',
          positive ? 'text-positive' : 'text-alert'
        )}
      >
        {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
        {deltaLabel}
      </div>
    </Card>
  )
}
