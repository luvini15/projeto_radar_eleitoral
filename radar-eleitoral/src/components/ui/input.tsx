import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-lg border border-border bg-white px-3 text-sm text-blue-dark placeholder:text-slate/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/30 focus-visible:border-blue/40 transition-colors',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'
