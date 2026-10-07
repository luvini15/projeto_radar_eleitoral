import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/35 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-blue text-bg shadow-[0_8px_24px_rgba(255,90,31,0.16)] hover:-translate-y-0.5 hover:bg-blue-dark',
        secondary: 'border border-border bg-white/[0.045] text-ink hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.075]',
        ghost: 'text-slate hover:bg-white/8 hover:text-ink',
        outline: 'border border-border bg-transparent hover:bg-white/8 text-ink',
        destructive: 'bg-alert text-white hover:bg-alert/90',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    )
  }
)
Button.displayName = 'Button'
