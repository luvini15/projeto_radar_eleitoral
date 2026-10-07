import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { DataSightLogo } from '@/components/brand/DataSightLogo'

const updatedAt = '6 de outubro de 2026'

function LegalLayout({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-20 max-w-4xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-3"><DataSightLogo showText={false} markClassName="h-7 w-7" /><span className="text-sm font-semibold">Data Sight</span></Link>
          <Link to="/login" className="flex items-center gap-2 text-xs text-white/50 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Voltar ao acesso</Link>
        </div>
      </header>
      <article className="legal-copy mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#ff5a1f]">Atualizado em {updatedAt}</p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-.05em] sm:text-6xl">{title}</h1>
        <p className="mt-7 text-base leading-7 text-white/58">{intro}</p>
        <div className="mt-14 space-y-10">{children}</div>
      </article>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="text-lg font-semibold">{title}</h2><div className="mt-3 space-y-3 text-sm leading-7 text-white/55">{children}</div></section>
}

export function TermsOfUse() {
  return (
    <LegalLayout title="Termos de Uso" intro="Estes termos regulam o acesso ao Data Sight, plataforma privada de monitoramento e análise de conteúdo digital para equipes autorizadas.">
      <Section title="1. Acesso e conta"><p>O acesso é pessoal e restrito aos usuários liberados pela organização responsável pela campanha. Você deve fornecer informações corretas, proteger suas credenciais e comunicar imediatamente qualquer suspeita de uso indevido.</p></Section>
      <Section title="2. Uso permitido"><p>O Data Sight pode ser usado para acompanhar publicações, métricas, temas, formatos, audiência e sinais produzidos pelas fontes integradas. É proibido utilizar a plataforma para violar direitos, contornar controles de acesso, inserir código malicioso ou realizar atividades contrárias à legislação.</p></Section>
      <Section title="3. Fontes e análises"><p>Dados de redes sociais e serviços de terceiros podem sofrer atrasos, indisponibilidade ou alterações. Indicadores e respostas geradas por inteligência artificial apoiam a análise humana e não devem ser tratados como fatos incontestáveis ou aconselhamento jurídico, eleitoral ou financeiro.</p></Section>
      <Section title="4. Segurança"><p>Podemos aplicar confirmação de e-mail, limites de sessão, controle de permissões e autenticação em duas etapas. Quando você ativa o MFA, a validação do código passa a ser obrigatória nos próximos acessos até que o fator seja removido por um fluxo autorizado.</p></Section>
      <Section title="5. Responsabilidades"><p>Você é responsável pelas decisões tomadas com base na plataforma e por verificar se a coleta e o tratamento realizados pela sua organização possuem base legal. O acesso pode ser suspenso diante de risco de segurança, violação destes termos ou encerramento do vínculo com a campanha.</p></Section>
      <Section title="6. Alterações"><p>Os termos podem ser atualizados para refletir mudanças operacionais, legais ou de segurança. Uma nova concordância poderá ser solicitada quando houver alteração relevante.</p></Section>
    </LegalLayout>
  )
}

export function PrivacyPolicy() {
  return (
    <LegalLayout title="Política de Privacidade" intro="Esta política explica quais dados o Data Sight trata, por que eles são necessários e quais controles estão disponíveis aos usuários.">
      <Section title="1. Dados tratados"><p>Tratamos dados da conta, como e-mail, identificador do usuário, função de acesso e registros de autenticação. Também processamos configurações de campanha, fontes monitoradas, publicações, métricas e interações necessárias para entregar as funcionalidades contratadas.</p></Section>
      <Section title="2. Finalidades"><p>Os dados são utilizados para autenticar usuários, limitar permissões, operar coletas, produzir análises, manter a segurança, diagnosticar falhas e registrar ações relevantes. Não usamos credenciais de autenticação para publicidade.</p></Section>
      <Section title="3. Serviços envolvidos"><p>Podemos utilizar fornecedores de infraestrutura, autenticação, coleta e inteligência artificial estritamente para executar o serviço. Cada integração deve receber apenas os dados necessários à sua finalidade e estar sujeita aos controles configurados pela organização responsável.</p></Section>
      <Section title="4. Conservação e segurança"><p>Os dados são mantidos durante o período necessário à operação, ao cumprimento de obrigações e à defesa de direitos. Aplicamos controles de acesso, sessões limitadas, registros de segurança e proteção de credenciais. Nenhum sistema elimina integralmente os riscos de incidente.</p></Section>
      <Section title="5. Direitos do titular"><p>Solicitações de confirmação, acesso, correção, eliminação, informação sobre compartilhamento ou revogação de consentimento devem ser encaminhadas ao canal indicado pela organização responsável pela campanha. Algumas informações podem ser conservadas quando houver obrigação legal ou interesse legítimo aplicável.</p></Section>
      <Section title="6. Controlador e contato"><p>A organização que concede o acesso ao Data Sight define as finalidades do tratamento no contexto da campanha e deve informar ao usuário sua identificação e seu canal oficial de privacidade.</p></Section>
    </LegalLayout>
  )
}
