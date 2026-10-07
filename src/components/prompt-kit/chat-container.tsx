import { cn } from '@/lib/utils'
import { StickToBottom } from 'use-stick-to-bottom'

export type ChatContainerRootProps = React.HTMLAttributes<HTMLDivElement>
export type ChatContainerContentProps = React.HTMLAttributes<HTMLDivElement>

export function ChatContainerRoot({ children, className, ...props }: ChatContainerRootProps) {
  return <StickToBottom className={cn('flex overflow-y-auto', className)} resize="smooth" initial="instant" role="log" {...props}>{children}</StickToBottom>
}

export function ChatContainerContent({ children, className, ...props }: ChatContainerContentProps) {
  return <StickToBottom.Content className={cn('flex w-full flex-col', className)} {...props}>{children}</StickToBottom.Content>
}

export function ChatContainerScrollAnchor({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('h-px w-full shrink-0 scroll-mt-4', className)} aria-hidden="true" {...props} />
}
