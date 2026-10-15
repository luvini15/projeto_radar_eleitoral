import * as React from 'react'
import { cn } from '@/lib/utils'
import { Markdown } from './markdown'

export function Message({ children, className, ...props }: React.HTMLProps<HTMLDivElement>) {
  return <div className={cn('flex gap-3', className)} {...props}>{children}</div>
}

export function MessageContent({ children, markdown = false, className, ...props }: React.HTMLProps<HTMLDivElement> & { markdown?: boolean }) {
  const classes = cn('break-words whitespace-normal', className)
  return markdown ? <Markdown className={classes}>{String(children ?? '')}</Markdown> : <div className={classes} {...props}>{children}</div>
}

export function MessageActions({ children, className, ...props }: React.HTMLProps<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-1 text-white/40', className)} {...props}>{children}</div>
}

export function MessageAction({ tooltip, children, className }: { tooltip: React.ReactNode; children: React.ReactNode; className?: string; delayDuration?: number }) {
  return <span className={className} title={typeof tooltip === 'string' ? tooltip : undefined}>{children}</span>
}
