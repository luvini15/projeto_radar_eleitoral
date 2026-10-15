import * as React from 'react'
import { CheckCircle2, ChevronDown, Loader2, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AssistantVisualization, type AssistantVisualizationSpec } from '@/components/assistant/AssistantVisualizations'

export type ToolPart = {
  type: string
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
  input?: Record<string, unknown>
  output?: Record<string, unknown> & { visualizations?: AssistantVisualizationSpec[] }
  errorText?: string
}

export function Tool({ toolPart, defaultOpen = true, className }: { toolPart: ToolPart; defaultOpen?: boolean; className?: string }) {
  const ready = toolPart.state === 'output-available'
  const visualizations = toolPart.output?.visualizations ?? []
  const [open, setOpen] = React.useState(defaultOpen)
  return <details className={cn('ai-tool group', className)} open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><span>{ready ? <CheckCircle2 /> : toolPart.state === 'input-streaming' ? <Loader2 className="animate-spin" /> : <Wrench />}{toolPart.type.replace(/^tool-/, '').replaceAll('_', ' ')}</span><small>{ready ? 'Concluído' : 'Consultando'}</small><ChevronDown className="ai-tool__chevron" /></summary>
    <div className="ai-tool__body">
      {visualizations.length ? <div className="ai-tool__visualizations">{visualizations.map((visualization, index) => <AssistantVisualization key={`${visualization.title}-${index}`} spec={visualization} />)}</div> : null}
      {!visualizations.length && toolPart.output?.description ? <p className="ai-tool__summary">{String(toolPart.output.description)}</p> : null}
      {toolPart.input ? <p className="ai-tool__summary">Consulta usada para montar esta leitura.</p> : null}
      {toolPart.errorText ? <p>{toolPart.errorText}</p> : null}
    </div>
  </details>
}
