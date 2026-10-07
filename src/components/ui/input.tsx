import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-xl border border-border bg-white/[0.035] px-3 text-sm text-ink placeholder:text-slate/60 transition-all focus-visible:border-blue/45 focus-visible:bg-white/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/15',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'
