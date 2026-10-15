import { CheckCircle2, ChevronDown, Loader2, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToolPart = {
  type: string
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  errorText?: string
}

export function Tool({ toolPart, className }: { toolPart: ToolPart; defaultOpen?: boolean; className?: string }) {
  const ready = toolPart.state === 'output-available'
  return <details className={cn('ai-tool group', className)}>
    <summary><span>{ready ? <CheckCircle2 /> : toolPart.state === 'input-streaming' ? <Loader2 className="animate-spin" /> : <Wrench />}{toolPart.type.replace(/^tool-/, '').replaceAll('_', ' ')}</span><small>{ready ? 'Concluído' : 'Consultando'}</small><ChevronDown className="ai-tool__chevron" /></summary>
    <div className="ai-tool__body">
      {toolPart.input ? <div><span>Entrada</span><pre>{JSON.stringify(toolPart.input, null, 2)}</pre></div> : null}
      {toolPart.output ? <div><span>Resultado</span><pre>{JSON.stringify(toolPart.output, null, 2)}</pre></div> : null}
      {toolPart.errorText ? <p>{toolPart.errorText}</p> : null}
    </div>
  </details>
}
