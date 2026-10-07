import * as React from 'react'
import { ArrowDown, ArrowLeft, Clock3, Database, History, MessageSquarePlus, Sparkles, X } from 'lucide-react'
import { CommandBar } from '@/components/ai/CommandBar'
import { SignalField } from '@/components/dashboard/SignalField'
import { FeatureAccordion } from '@/components/dashboard/FeatureAccordion'
import { ThinkingBar } from '@/components/prompt-kit/thinking-bar'
import { Source, SourceContent, SourceTrigger } from '@/components/prompt-kit/source'
import { useCampaign } from '@/lib/campaignContext'
import { api } from '@/services/radarApi'

type SourceItem = { label: string; path: string; description: string }
type Answer = { conversation_id: string; text: string; model: string; sources: SourceItem[] }
type Message = { role: 'user' | 'assistant'; text: string; sources?: SourceItem[] }
type ConversationSummary = { id: string; title: string; created_at: string; updated_at: string; message_count: number }
type ConversationDetail = {
  id: string
  title: string
  messages: { role: 'user' | 'assistant'; content: string; sources: SourceItem[] }[]
}

const suggestions = [
  'O que mais chama atenção nesta campanha?',
  'Quais temas aparecem com mais frequência?',
  'Em quais horários houve mais interação observada?',
]

export default function Overview() {
  const campaign = useCampaign()
  const campaignName = campaign.campaigns.find(item => String(item.id) === campaign.selected)?.name
  const [query, setQuery] = React.useState('')
  const [messages, setMessages] = React.useState<Message[]>([])
  const [conversationId, setConversationId] = React.useState<string | null>(null)
  const [chatActive, setChatActive] = React.useState(false)
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [conversations, setConversations] = React.useState<ConversationSummary[]>([])
  const [historyLoading, setHistoryLoading] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const endRef = React.useRef<HTMLDivElement>(null)
  const previousCampaign = React.useRef(campaign.selected)

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, loading])

  React.useEffect(() => {
    if (previousCampaign.current && previousCampaign.current !== campaign.selected) {
      setChatActive(false)
      setHistoryOpen(false)
      setConversationId(null)
      setMessages([])
      setError('')
    }
    previousCampaign.current = campaign.selected
  }, [campaign.selected])

  async function ask(question: string) {
    if (!campaign.selected || loading || !question.trim()) return
    const cleanQuestion = question.trim()
    setChatActive(true)
    setMessages(current => [...current, { role: 'user', text: cleanQuestion }])
    setQuery('')
    setError('')
    setLoading(true)
    try {
      const answer = await api<Answer>(`/campaigns/${campaign.selected}/assistant`, {
        question: cleanQuestion,
        conversation_id: conversationId,
      })
      setConversationId(answer.conversation_id)
      setMessages(current => [...current, { role: 'assistant', text: answer.text, sources: answer.sources }])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível consultar a IA.')
    } finally {
      setLoading(false)
    }
  }

  async function openHistory() {
    if (!campaign.selected) return
    setHistoryOpen(true)
    setHistoryLoading(true)
    setError('')
    try {
      setConversations(await api<ConversationSummary[]>(`/campaigns/${campaign.selected}/assistant/conversations`))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o histórico.')
    } finally {
      setHistoryLoading(false)
    }
  }

  async function loadConversation(id: string) {
    if (!campaign.selected || loading) return
    setHistoryLoading(true)
    setError('')
    try {
      const detail = await api<ConversationDetail>(`/campaigns/${campaign.selected}/assistant/conversations/${id}`)
      setConversationId(detail.id)
      setMessages(detail.messages.map(message => ({
        role: message.role,
        text: message.content,
        sources: message.sources,
      })))
      setChatActive(true)
      setHistoryOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível abrir a conversa.')
    } finally {
      setHistoryLoading(false)
    }
  }

  function newConversation() {
    setConversationId(null)
    setMessages([])
    setQuery('')
    setError('')
    setHistoryOpen(false)
  }

  function returnToHub() {
    newConversation()
    setChatActive(false)
  }

  return <div className="hub-home" data-chat-active={chatActive}>
    <section className="hub-hero">
      <SignalField />
      <div className="hub-hero__veil" aria-hidden="true" />
      <div className="hub-hero__content">
        <div className="hub-eyebrow"><span /><Sparkles /> IA conectada aos dados observados</div>

        <div className="hub-intro" aria-hidden={chatActive}>
          <p className="font-mono text-[10px] uppercase tracking-[.22em] text-white/38">{campaignName || 'Selecione uma campanha'}</p>
          <h2>O que você quer<br /><em>entender agora?</em></h2>
          <p>Converse com os sinais da sua rede. A resposta usa as leituras disponíveis no Data Sight e mostra de onde veio o contexto.</p>
        </div>

        <header className="hub-chat-header" aria-hidden={!chatActive}>
          <button type="button" onClick={returnToHub} aria-label="Voltar ao início"><ArrowLeft /></button>
          <div><span>Data Sight IA</span><strong>{conversationId ? 'Conversa salva' : 'Nova conversa'}</strong></div>
          <div className="hub-chat-actions">
            <button type="button" onClick={newConversation}><MessageSquarePlus /><span>Nova</span></button>
            <button type="button" onClick={() => void openHistory()}><History /><span>Histórico</span></button>
          </div>
        </header>

        <div className="hub-conversation" aria-live="polite" aria-hidden={!chatActive}>
          {messages.length === 0 && chatActive ? <div className="hub-empty-thread">
            <span>Conversa pronta</span>
            <p>Faça uma pergunta sobre os dados observados da campanha.</p>
          </div> : null}
          {messages.map((message, index) => <article key={`${message.role}-${index}`} data-role={message.role} className="hub-message">
            <span>{message.role === 'assistant' ? 'Data Sight' : 'Você'}</span>
            <div className="whitespace-pre-wrap">{message.text}</div>
            {message.sources?.length ? <footer>{message.sources.map(source => <Source href={source.path} key={source.path}>
              <SourceTrigger>{source.label}</SourceTrigger>
              <SourceContent title={source.label} description={source.description} />
            </Source>)}</footer> : null}
          </article>)}
          {loading ? <ThinkingBar label="Cruzando os sinais da campanha" /> : null}
          <div ref={endRef} />
        </div>

        {error ? <p role="alert" className="hub-error">{error}</p> : null}
        <div className="hub-command"><CommandBar value={query} onValueChange={setQuery} onSubmit={question => void ask(question)} placeholder={campaign.selected ? 'Pergunte sobre a campanha…' : 'Selecione uma campanha acima'} /></div>
        <div className="hub-suggestions" aria-hidden={chatActive}>{suggestions.map(item => <button key={item} type="button" disabled={!campaign.selected || loading || chatActive} onClick={() => void ask(item)}>{item}</button>)}</div>
        <div className="hub-grounding"><Database /> Dados da campanha via API e ferramentas MCP <span>•</span> respostas podem refletir amostras parciais</div>
      </div>
      <a href="#modulos" className="hub-scroll" aria-hidden={chatActive}><span>Explorar módulos</span><ArrowDown /></a>
    </section>

    <section id="modulos" className="hub-modules" aria-hidden={chatActive}>
      <header><div><p>O restante da operação</p><h2>Abra uma frente de análise.</h2></div><span>Passe o cursor para explorar</span></header>
      <FeatureAccordion />
    </section>

    {chatActive && historyOpen ? <div className="hub-history-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) setHistoryOpen(false)
    }}>
      <aside className="hub-history" aria-label="Histórico de conversas">
        <header><div><span>Arquivo da IA</span><h2>Conversas</h2></div><button type="button" onClick={() => setHistoryOpen(false)} aria-label="Fechar histórico"><X /></button></header>
        <button type="button" className="hub-history__new" onClick={newConversation}><MessageSquarePlus /> Começar outra conversa</button>
        <div className="hub-history__list">
          {historyLoading ? <p>Carregando conversas…</p> : null}
          {!historyLoading && conversations.length === 0 ? <p>As conversas salvas nesta campanha aparecerão aqui.</p> : null}
          {conversations.map(item => <button type="button" key={item.id} data-current={item.id === conversationId} onClick={() => void loadConversation(item.id)}>
            <span>{item.title}</span>
            <small><Clock3 /> {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.updated_at))} · {item.message_count} mensagens</small>
          </button>)}
        </div>
      </aside>
    </div> : null}
  </div>
}
