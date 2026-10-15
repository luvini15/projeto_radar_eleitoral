import { memo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { CodeBlock, CodeBlockCode } from './code-block'

const components: Partial<Components> = {
  code({ className, children, ...props }) {
    const language = className?.match(/language-(\w+)/)?.[1]
    if (!language) return <code className={cn('rounded bg-white/8 px-1 py-0.5 font-mono text-[.9em]', className)} {...props}>{children}</code>
    return <CodeBlock><CodeBlockCode code={String(children).replace(/\n$/, '')} language={language} /></CodeBlock>
  },
  pre({ children }) { return <>{children}</> },
}

export const Markdown = memo(function Markdown({ children, className }: { children: string; className?: string }) {
  return <div className={className}><ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>{children}</ReactMarkdown></div>
})
