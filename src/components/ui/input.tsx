import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-border bg-muted/60 px-3 text-sm text-ink placeholder:text-slate/60 transition-colors focus-visible:border-blue/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/20',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'
