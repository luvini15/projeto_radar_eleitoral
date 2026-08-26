import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium',
  {
    variants: {
      variant: {
        neutral: 'bg-bg text-slate border-border',
        blue: 'bg-blue/10 text-blue border-blue/20',
        positive: 'bg-positive/10 text-positive border-positive/20',
        alert: 'bg-alert/10 text-alert border-alert/20',
        warning: 'bg-warning/10 text-warning border-warning/20',
        dark: 'bg-blue-dark text-white border-blue-dark',
      },
    },
    defaultVariants: { variant: 'neutral' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
