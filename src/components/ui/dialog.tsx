import * as React from 'react'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function Dialog({ open, onClose, title, children }: DialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-blue-dark/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl font-semibold text-blue-dark">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate hover:bg-bg hover:text-blue-dark transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="text-sm text-slate">{children}</div>
      </div>
    </div>
  )
}
