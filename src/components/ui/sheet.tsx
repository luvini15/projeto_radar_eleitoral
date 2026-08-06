import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-blue-dark/40 backdrop-blur-[2px] animate-in fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto thin-scrollbar',
          className
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white/95 backdrop-blur px-5 py-4">
          <h2 className="font-display text-xl font-semibold text-blue-dark">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate hover:bg-bg hover:text-blue-dark transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
