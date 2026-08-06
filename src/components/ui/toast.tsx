import * as React from 'react'
import { CheckCircle2 } from 'lucide-react'

interface ToastContextValue {
  show: (message: string) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = React.useState<string | null>(null)

  const show = React.useCallback((msg: string) => {
    setMessage(msg)
    window.clearTimeout((show as any)._t)
    ;(show as any)._t = window.setTimeout(() => setMessage(null), 3200)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] -translate-x-1/2">
        {message && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-blue-dark px-4 py-3 text-sm font-medium text-white shadow-xl">
            <CheckCircle2 className="h-4 w-4 text-positive" />
            {message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return ctx
}
