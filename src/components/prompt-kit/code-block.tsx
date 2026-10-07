import * as React from 'react'
import { cn } from '@/lib/utils'

export function CodeBlock({ children, className, ...props }: React.HTMLProps<HTMLDivElement>) {
  return <div className={cn('not-prose flex w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#090909]', className)} {...props}>{children}</div>
}

export function CodeBlockCode({ code, className, ...props }: { code: string; language?: string; className?: string } & React.HTMLProps<HTMLDivElement>) {
  return <div className={cn('w-full overflow-x-auto p-4 font-mono text-[13px] text-white/75', className)} {...props}><pre><code>{code}</code></pre></div>
}
