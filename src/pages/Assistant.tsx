import * as React from 'react'
import { AlertTriangle, ArrowUp, Clock3, Copy, History, MessageSquarePlus, Sparkles, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChatContainerContent, ChatContainerRoot, ChatContainerScrollAnchor } from '@/components/prompt-kit/chat-container'
import { DotsLoader } from '@/components/prompt-kit/loader'
import { Message, MessageAction, MessageActions, MessageContent } from '@/components/prompt-kit/message'
import { PromptInput, PromptInputActions, PromptInputTextarea } from '@/components/prompt-kit/prompt-input'
import { Tool, type ToolPart } from '@/components/prompt-kit/tool'
import { Source, SourceContent, SourceTrigger } from '@/components/prompt-kit/source'
import { useCampaign } from '@/lib/campaignContext'
import { api } from '@/services/radarApi'
import type { AssistantVisualizationSpec } from '@/components/assistant/AssistantVisualizations'

type SourceItem = { label: string; path: string; description: string; visualizations?: AssistantVisualizationSpec[] }
type Answer = { conversation_id: string; text: string; model: string; sources: SourceItem[]; tools?: ToolPart[] }
type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string; sources?: SourceItem[]; tools?: ToolPart[] }
type ConversationSummary = { id: string; title: string; created_at: string; updated_at: string; message_count: number }
type ConversationDetail = { id: string; title: string; messages: { id: number; role: 'user' | 'assistant'; content: string; sources: SourceItem[] }[] }

function toolsFromSources(sources: SourceItem[]): ToolPart[] {
  return sources.map(source => ({
    type: `tool-${source.label.toLowerCase().replaceAll(' ', '_')}`,
    state: 'output-available',
    output: { description: source.description, visualizations: source.visualizations ?? [] },
  }))
}

function ChatMessageView({ message, last }: { message: ChatMessage; last: boolean }) {
  const assistant = message.role === 'assistant'
  const [copied, setCopied] = React.useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(message.text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1300)
    } catch { /* Clipboard can be unavailable outside HTTPS. */ }
  }
  return <Message className={`ai-message ${assistant ? 'ai-message--assistant' : 'ai-message--user'}`}>
    {assistant ? <div className="ai-message__assistant">
      {message.tools?.length ? <div className="ai-message__tools">{message.tools.map((tool, index) => <Tool key={`${tool.type}-${index}`} toolPart={tool} />)}</div> : null}
      <MessageContent markdown className="ai-message__content">{message.text}</MessageContent>
      {message.sources?.length ? <div className="ai-message__sources">{message.sources.map(source => <Source href={source.path} key={source.path}><SourceTrigger>{source.label}</SourceTrigger><SourceContent title={source.label} description={source.description} /></Source>)}</div> : null}
      <MessageActions className={last ? 'is-visible' : undefined}>
        <MessageAction tooltip={copied ? 'Copiado' : 'Copiar'}><button type="button" onClick={() => void copy()} aria-label="Copiar resposta"><Copy /></button></MessageAction>
        <MessageAction tooltip="Resposta útil"><button type="button" aria-label="Marcar como útil"><ThumbsUp /></button></MessageAction>
        <MessageAction tooltip="Resposta não foi útil"><button type="button" aria-label="Marcar como não útil"><ThumbsDown /></button></MessageAction>
      </MessageActions>
    </div> : <div className="ai-message__user">
      <MessageContent>{message.text}</MessageContent>
      <MessageActions><MessageAction tooltip={copied ? 'Copiado' : 'Copiar'}><button type="button" onClick={() => void copy()} aria-label="Copiar pergunta"><Copy /></button></MessageAction></MessageActions>
    </div>}
  </Message>
}

export default function Assistant() {
  const campaign = useCampaign()
  const location = useLocation()
  const navigate = useNavigate()
  const initialSent = React.useRef(false)
  const requestInFlight = React.useRef(false)
  const [input, setInput] = React.useState('')
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = React.useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [conversations, setConversations] = React.useState<ConversationSummary[]>([])
  const [historyLoading, setHistoryLoading] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const campaignName = campaign.campaigns.find(item => String(item.id) === campaign.selected)?.name

  const ask = React.useCallback(async (question: string) => {
    if (!campaign.selected || requestInFlight.current || !question.trim()) return
    requestInFlight.current = true
    const clean = question.trim()
    setMessages(current => [...current, { id: crypto.randomUUID(), role: 'user', text: clean }])
    setInput('')
    setError('')
    setLoading(true)
    try {
      const answer = await api<Answer>(`/campaigns/${campaign.selected}/assistant`, { question: clean, conversation_id: conversationId })
      setConversationId(answer.conversation_id)
      setMessages(current => [...current, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: answer.text,
        sources: answer.sources,
        tools: answer.tools ?? toolsFromSources(answer.sources),
      }])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível consultar a IA.')
    } finally {
      requestInFlight.current = false
      setLoading(false)
    }
  }, [campaign.selected, conversationId])

  React.useEffect(() => {
    const initialQuestion = (location.state as { initialQuestion?: string } | null)?.initialQuestion
    if (!initialQuestion || !campaign.selected || initialSent.current) return
    initialSent.current = true
    navigate('/ia', { replace: true, state: null })
    void ask(initialQuestion)
  }, [ask, campaign.selected, location.state, navigate])

  async function openHistory() {
    if (!campaign.selected) return
    setHistoryOpen(true)
    setHistoryLoading(true)
    try { setConversations(await api<ConversationSummary[]>(`/campaigns/${campaign.selected}/assistant/conversations`)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o histórico.') }
    finally { setHistoryLoading(false) }
  }

  async function loadConversation(id: string) {
    if (!campaign.selected || loading) return
    setHistoryLoading(true)
    try {
      const detail = await api<ConversationDetail>(`/campaigns/${campaign.selected}/assistant/conversations/${id}`)
      setConversationId(detail.id)
      setMessages(detail.messages.map(message => ({
        id: String(message.id), role: message.role, text: message.content, sources: message.sources,
        tools: message.role === 'assistant' ? toolsFromSources(message.sources) : undefined,
      })))
      setHistoryOpen(false)
      setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível abrir a conversa.') }
    finally { setHistoryLoading(false) }
  }

  function newConversation() {
    if (requestInFlight.current) return
    setConversationId(null)
    setMessages([])
    setInput('')
    setError('')
    setHistoryOpen(false)
  }

  return <div className="ai-chat-page">
    <header className="ai-chat-header">
      <div><span><Sparkles /> Data Sight IA</span><strong>{conversationId ? 'Conversa salva' : 'Nova conversa'}</strong></div>
      <div><button type="button" disabled={loading} onClick={newConversation}><MessageSquarePlus /> Nova conversa</button><button type="button" disabled={loading} onClick={() => void openHistory()}><History /> Histórico</button></div>
    </header>

    <ChatContainerRoot className="ai-chat-scroll">
      <ChatContainerContent className="ai-chat-messages">
        {messages.length === 0 ? <div className="ai-chat-empty"><Sparkles /><p>{campaignName || 'Data Sight'}</p><h2>Como posso ajudar com esta campanha?</h2><span>Faça uma pergunta sobre temas, formatos, horários, audiência ou publicações observadas.</span></div> : null}
        {messages.map((message, index) => <ChatMessageView key={message.id} message={message} last={index === messages.length - 1} />)}
        {loading ? <Message className="ai-message ai-message--assistant"><div className="ai-loading"><DotsLoader /><span>Consultando os dados da campanha…</span></div></Message> : null}
        {error ? <Message className="ai-message ai-message--assistant"><div className="ai-chat-error"><AlertTriangle />{error}</div></Message> : null}
        <ChatContainerScrollAnchor />
      </ChatContainerContent>
    </ChatContainerRoot>

    <footer className="ai-composer-wrap">
      <PromptInput value={input} onValueChange={setInput} onSubmit={() => void ask(input)} disabled={!campaign.selected || loading} className="ai-composer">
        <PromptInputTextarea placeholder={campaign.selected ? 'Pergunte sobre os dados da campanha' : 'Selecione uma campanha'} className="ai-composer__textarea" />
        <PromptInputActions className="ai-composer__actions"><span>Enter para enviar · Shift + Enter para quebrar linha</span><button type="button" disabled={!input.trim() || loading || !campaign.selected} onClick={() => void ask(input)} aria-label="Enviar pergunta">{loading ? <i /> : <ArrowUp />}</button></PromptInputActions>
      </PromptInput>
      <p>A IA usa apenas os dados disponíveis no Data Sight e pode refletir amostras parciais.</p>
    </footer>

    {historyOpen ? <div className="hub-history-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setHistoryOpen(false) }}>
      <aside className="hub-history" aria-label="Histórico de conversas">
        <header><div><span>Arquivo da IA</span><h2>Conversas</h2></div><button type="button" onClick={() => setHistoryOpen(false)} aria-label="Fechar histórico"><X /></button></header>
        <button type="button" className="hub-history__new" onClick={newConversation}><MessageSquarePlus /> Começar outra conversa</button>
        <div className="hub-history__list">
          {historyLoading ? <p>Carregando conversas…</p> : null}
          {!historyLoading && conversations.length === 0 ? <p>As conversas salvas nesta campanha aparecerão aqui.</p> : null}
          {conversations.map(item => <button type="button" key={item.id} data-current={item.id === conversationId} onClick={() => void loadConversation(item.id)}><span>{item.title}</span><small><Clock3 /> {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.updated_at))} · {item.message_count} mensagens</small></button>)}
        </div>
      </aside>
    </div> : null}
  </div>
}
