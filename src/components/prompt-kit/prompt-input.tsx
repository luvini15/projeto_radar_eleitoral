import * as React from 'react'
import { cn } from '@/lib/utils'

type ContextValue = { value: string; setValue: (value: string) => void; onSubmit?: () => void; disabled: boolean; maxHeight: number }
const PromptInputContext = React.createContext<ContextValue>({ value: '', setValue: () => undefined, disabled: false, maxHeight: 220 })

export function PromptInput({ value = '', onValueChange, onSubmit, disabled = false, maxHeight = 220, children, className, ...props }: React.HTMLProps<HTMLDivElement> & { value?: string; onValueChange?: (value: string) => void; onSubmit?: () => void; disabled?: boolean; isLoading?: boolean; maxHeight?: number }) {
  return <PromptInputContext.Provider value={{ value, setValue: onValueChange ?? (() => undefined), onSubmit, disabled, maxHeight }}><div className={cn('cursor-text rounded-3xl border', disabled && 'opacity-60', className)} {...props}>{children}</div></PromptInputContext.Provider>
}

export function PromptInputTextarea({ className, onKeyDown, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const context = React.useContext(PromptInputContext)
  const ref = React.useRef<HTMLTextAreaElement>(null)
  React.useLayoutEffect(() => {
    if (!ref.current) return
    ref.current.style.height = 'auto'
    ref.current.style.height = `${Math.min(ref.current.scrollHeight, context.maxHeight)}px`
  }, [context.value, context.maxHeight])
  return <textarea ref={ref} rows={1} value={context.value} disabled={context.disabled} onChange={event => context.setValue(event.target.value)} onKeyDown={event => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); context.onSubmit?.() }
    onKeyDown?.(event)
  }} className={cn('min-h-11 w-full resize-none border-0 bg-transparent outline-none', className)} {...props} />
}

export function PromptInputActions({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-2', className)} {...props}>{children}</div>
}
