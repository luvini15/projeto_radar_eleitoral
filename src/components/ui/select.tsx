import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative inline-block">
      <select
        ref={ref}
        className={cn(
          'appearance-none h-9 rounded-lg border border-border bg-white pl-3 pr-8 text-sm text-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/30 cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate" />
    </div>
  )
)
Select.displayName = 'Select'
