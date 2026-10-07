import { ArrowDown, Database, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CommandBar } from '@/components/ai/CommandBar'
import { SignalField } from '@/components/dashboard/SignalField'
import { FeatureAccordion } from '@/components/dashboard/FeatureAccordion'
import { useCampaign } from '@/lib/campaignContext'

const suggestions = [
  'O que mais chama atenção nesta campanha?',
  'Quais temas aparecem com mais frequência?',
  'Em quais horários houve mais interação observada?',
]

export default function Overview() {
  const campaign = useCampaign()
  const navigate = useNavigate()
  const campaignName = campaign.campaigns.find(item => String(item.id) === campaign.selected)?.name

  function startChat(question: string) {
    if (!campaign.selected || !question.trim()) return
    navigate('/ia', { state: { initialQuestion: question.trim() } })
  }

  return <div className="hub-home">
    <section className="hub-hero">
      <SignalField />
      <div className="hub-hero__veil" aria-hidden="true" />
      <div className="hub-hero__content">
        <div className="hub-eyebrow"><span /><Sparkles /> IA conectada aos dados observados</div>
        <div className="hub-intro">
          <p className="font-mono text-[10px] uppercase tracking-[.22em] text-white/38">{campaignName || 'Selecione uma campanha'}</p>
          <h2>O que você quer<br /><em>entender agora?</em></h2>
          <p>Comece pelo hub e continue a conversa no espaço exclusivo da IA, com histórico e fontes da análise.</p>
        </div>
        <div className="hub-command"><CommandBar onSubmit={startChat} placeholder={campaign.selected ? 'Pergunte sobre a campanha…' : 'Selecione uma campanha acima'} /></div>
        <div className="hub-suggestions">{suggestions.map(item => <button key={item} type="button" disabled={!campaign.selected} onClick={() => startChat(item)}>{item}</button>)}</div>
        <div className="hub-grounding"><Database /> Dados da campanha via API e ferramentas MCP <span>•</span> respostas podem refletir amostras parciais</div>
      </div>
      <a href="#modulos" className="hub-scroll"><span>Explorar módulos</span><ArrowDown /></a>
    </section>
    <section id="modulos" className="hub-modules">
      <header><div><p>O restante da operação</p><h2>Abra uma frente de análise.</h2></div><span>Passe o cursor para explorar</span></header>
      <FeatureAccordion />
    </section>
  </div>
}
