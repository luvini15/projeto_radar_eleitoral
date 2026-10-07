import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, CalendarDays, FileText, LockKeyhole, MessageCircle } from 'lucide-react'
import { DataSightLogo } from '@/components/brand/DataSightLogo'
import { AIInsightsShowcase } from '@/components/landing/AIInsightsShowcase'
import { ContactDetailsReveal } from '@/components/microkit/contact-details-reveal'
import { NextDotFillButton } from '@/components/microkit/next-dot-fill-button'
import { CaseStudyFlipStack } from '@/components/ui/case-study-flip-stack'
import { LetterCascade } from '@/components/ui/letter-cascade'
import { PrismGradient } from '@/components/ui/prism-gradient'
import { ScrollSplitCard } from '@/components/ui/scroll-split-card'
import { WheelCarousel, type WheelCarouselItem } from '@/components/ui/wheel-carousel'

const readings = [
  { number: '01', eyebrow: 'Publicações', title: 'Capturamos o que foi publicado', text: 'Posts, formatos, legendas e métricas entram na mesma coleta, sempre com o vínculo para o conteúdo original.' },
  { number: '02', eyebrow: 'Audiência', title: 'Organizamos a resposta da audiência', text: 'Comentários e interações são reunidos sem completar lacunas: quando a rede não entrega um dado, ele continua marcado como ausente.' },
  { number: '03', eyebrow: 'Tempo', title: 'Localizamos quando a resposta aconteceu', text: 'As publicações são distribuídas por dia e faixa de horário para revelar padrões sem esconder o tamanho da amostra.' },
  { number: '04', eyebrow: 'Comparação', title: 'Comparamos perfis ao longo do tempo', text: 'Histórico de seguidores e desempenho por perfil ajudam a equipe a enxergar mudanças entre uma coleta e outra.' },
]

const flipStackItems = readings.map((reading, index) => ({
  eyebrow: `Etapa ${reading.number} · ${reading.eyebrow}`,
  title: reading.title,
  description: reading.text,
  image: monitoringArt(index),
  imageAlt: `Visual da etapa ${reading.number}: ${reading.title}`,
  background: ['#171717', '#ff5a1f', '#e7e5e1', '#30170f'][index] ?? '#171717',
  foreground: index === 2 ? '#111111' : '#fff7ed',
}))

const wheelItems: WheelCarouselItem[] = [
  { label: 'Monitoramento de redes', image: '/images/civic-listening/post-buracos.png', imageAlt: 'Publicação fictícia de moradora reclamando de um buraco na rua' },
  { label: 'Monitoramento de vídeos', image: '/images/civic-listening/reel-transporte.png', imageAlt: 'Reel fictício de moradora relatando demora no transporte público' },
  { label: 'Monitoramento de sites', image: '/images/civic-listening/site-alagamento.png', imageAlt: 'Notícia fictícia sobre alagamento e cobrança por drenagem' },
  { label: 'Mapeamento de demandas', image: '/images/civic-listening/post-saude.png', imageAlt: 'Publicação fictícia sobre fila em uma unidade de saúde' },
]

export default function Landing() {
  const pageRef = React.useRef<HTMLElement>(null)

  React.useEffect(() => {
    const page = pageRef.current
    if (!page) return
    let frame = 0
    const update = () => {
      const scroll = window.scrollY
      page.style.setProperty('--page-scroll', String(scroll))
      frame = 0
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    const onPointer = (event: PointerEvent) => {
      page.style.setProperty('--mouse-x', `${(event.clientX / window.innerWidth - 0.5).toFixed(3)}`)
      page.style.setProperty('--mouse-y', `${(event.clientY / window.innerHeight - 0.5).toFixed(3)}`)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pointermove', onPointer, { passive: true })
    const sections = page.querySelectorAll<HTMLElement>('[data-flow-section]')
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-visible', entry.isIntersecting)
      })
    }, { threshold: 0.06, rootMargin: '0px 0px -8% 0px' })
    sections.forEach((section) => sectionObserver.observe(section))
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onPointer)
      sectionObserver.disconnect()
    }
  }, [])

  return (
    <main ref={pageRef} className="landing-v2 min-h-screen overflow-x-clip bg-black text-white">
      <header className="fixed inset-x-0 top-0 z-50 mix-blend-difference">
        <div className="mx-auto flex h-20 max-w-[1480px] items-center justify-between px-5 md:px-9">
          <Link to="/" aria-label="Data Sight, início" className="flex items-center gap-3 text-white">
            <DataSightLogo showText={false} markClassName="h-8 w-8" />
            <span className="text-sm font-semibold tracking-[-.02em]">Data Sight</span>
          </Link>
          <nav className="hidden items-center gap-8 text-[11px] font-medium uppercase tracking-[.12em] text-white/60 md:flex" aria-label="Navegação da página">
            <a href="#leitura" className="hover:text-white">O painel</a><a href="#metodo" className="hover:text-white">Como lemos</a><a href="#inteligencia" className="hover:text-white">IA</a><a href="#acesso" className="hover:text-white">Acesso</a>
          </nav>
          <NextDotFillButton label="Entrar" to="/login" compact />
        </div>
      </header>

      <section className="landing-hero-v2 relative flex min-h-[100svh] items-end border-b border-white/12 px-5 pb-9 pt-28 md:px-9 md:pb-12">
        <PrismGradient
          className="hero-prism"
          colors={['#000000', '#ff5a1f', '#141414']}
          speed={0.72}
        />
        <div className="hero-prism-shade" aria-hidden="true" />
        <div className="hero-index" aria-hidden="true">01</div>
        <div className="relative z-20 mx-auto grid w-full max-w-[1480px] items-end gap-10 lg:grid-cols-[1fr_340px]">
          <div className="max-w-5xl">
            <div className="mb-5 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[.2em] text-white/50"><span className="h-px w-10 bg-[#ff5a1f]" /> Monitoramento digital de campanha</div>
            <h1 className="hero-brand-title">
              <LetterCascade
                text="Data Sight"
                className="hero-logo-cascade text-[clamp(4.2rem,11vw,10.5rem)] font-semibold leading-[.76] tracking-[-.085em]"
                staggerDuration={0.055}
                staggerFrom="center"
                stiffness={250}
                damping={18}
              />
            </h1>
            <p className="mt-7 text-[clamp(1.35rem,2.2vw,2.4rem)] font-medium leading-none tracking-[-.045em] text-white/62">A campanha já está falando.</p>
          </div>
          <div className="pb-2 lg:pb-4">
            <p className="text-sm leading-6 text-white/62">O Data Sight junta posts, comentários e histórico dos perfis. A equipe abre uma tela e entende o que aconteceu na coleta.</p>
            <div className="mt-7 flex items-center gap-4"><NextDotFillButton label="Entrar na sala" to="/login" /><a href="#leitura" aria-label="Ir para a próxima seção" className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-white/70 transition-colors hover:border-[#ff5a1f] hover:text-[#ff5a1f]"><ArrowDown className="h-4 w-4" /></a></div>
          </div>
        </div>
      </section>

      <section id="leitura" data-flow-section className="landing-flow-section relative bg-black px-5 py-24 md:px-9 md:py-32">
        <div className="section-stamp" aria-hidden="true">02</div>
        <div className="mx-auto max-w-[1480px]">
          <div className="mb-10 grid gap-8 lg:grid-cols-[1fr_420px] lg:items-end">
            <div><p className="landing-kicker">Como monitoramos sua rede</p><h2 className="mt-5 max-w-4xl text-5xl font-semibold leading-[.92] tracking-[-.055em] md:text-7xl">Da publicação à leitura, sem perder a origem.</h2></div>
            <p className="max-w-md text-sm leading-7 text-white/50">Arraste os painéis para acompanhar o caminho dos dados. Cada leitura mantém período, amostra e fonte disponíveis para conferência.</p>
          </div>
          <CaseStudyFlipStack items={flipStackItems} />
        </div>
      </section>

      <section id="casos" data-flow-section className="landing-flow-section relative bg-black pt-24 md:pt-32">
        <div className="section-stamp" aria-hidden="true">03</div>
        <div className="mx-auto max-w-[1480px] px-5 md:px-9">
          <p className="landing-kicker">Casos de uso</p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_420px] lg:items-end">
            <h2 className="max-w-4xl text-5xl font-semibold leading-[.92] tracking-[-.055em] md:text-7xl">O mesmo dado responde a rotinas diferentes.</h2>
            <p className="max-w-md text-sm leading-7 text-white/50">Role para separar os painéis e ver onde o Data Sight entra no trabalho de comunicação.</p>
          </div>
        </div>
          <ScrollSplitCard
          cards={[
            { title: 'Planejamento de conteúdo', description: 'Compare temas, formatos e horários para montar um calendário editorial com mais contexto.', bgColor: '#e7e5e1', textColor: '#111111', icon: <CalendarDays className="h-8 w-8" /> },
            { title: 'Atendimento à comunidade', description: 'Reúna dúvidas e comentários recorrentes para responder com mais clareza e menos retrabalho.', bgColor: '#ff5a1f', textColor: '#090909', icon: <MessageCircle className="h-8 w-8" /> },
            { title: 'Relatórios de comunicação', description: 'Transforme publicações e reações em uma leitura organizada, pronta para compartilhar com a equipe.', bgColor: '#171717', textColor: '#ffffff', icon: <FileText className="h-8 w-8" /> },
          ]}
        />
      </section>

      <section id="metodo" data-flow-section className="landing-flow-section relative bg-black px-5 py-16 md:px-9 md:py-20">
        <div className="section-stamp" aria-hidden="true">04</div>
        <div className="mx-auto max-w-[1480px]">
          <div className="grid gap-8 pb-8 lg:grid-cols-[1fr_420px] lg:items-end md:pb-12">
            <div><p className="landing-kicker">Fontes monitoradas</p><h2 className="mt-5 max-w-4xl text-5xl font-semibold leading-[.92] tracking-[-.055em] md:text-7xl">A conversa pública não acontece em um lugar só.</h2></div>
            <p className="max-w-md text-sm leading-7 text-white/50">O Data Sight acompanha redes, vídeos, sites e relatos para conectar cada demanda à sua origem.</p>
          </div>
          <div className="h-[640px] w-full overflow-hidden md:h-[720px]">
            <WheelCarousel
              items={wheelItems}
              mode="custom"
              background="#000000"
              panelColor="#111111"
              textColor="rgba(255,255,255,.28)"
              selectedColor="#ffffff"
              markerColor="#ff5a1f"
              photoSide="left"
              photoWidth={44}
              photoAspect="3/4"
              photoRadius={2}
              contentWidth={1180}
              radius={300}
              visibleItems={5}
              scrollSpeed={0.0028}
              momentum={false}
              loop={false}
            />
          </div>
        </div>
      </section>

      <section id="inteligencia" data-flow-section className="landing-flow-section relative bg-[#e7e5e1] px-5 py-24 text-black md:px-9 md:py-32">
        <div className="section-stamp section-stamp--dark" aria-hidden="true">05</div>
        <div className="mx-auto max-w-[1480px]">
          <div className="mb-12 grid gap-8 lg:grid-cols-[1fr_420px] lg:items-end md:mb-16">
            <div><p className="landing-kicker text-black/48 before:bg-[#ff5a1f]">Inteligência contextual</p><h2 className="mt-5 max-w-5xl text-5xl font-semibold leading-[.9] tracking-[-.06em] md:text-8xl">Os dados explicam.<br />A IA ajuda a agir.</h2></div>
            <p className="max-w-md text-sm leading-7 text-black/55">Ela lê o contexto da sua rede, resume sinais importantes, responde perguntas e transforma a análise em próximos passos — inclusive ideias e roteiros para vídeos.</p>
          </div>
          <AIInsightsShowcase />
        </div>
      </section>

      <section id="acesso" data-flow-section className="landing-flow-section relative min-h-[76svh] overflow-hidden px-5 py-24 md:px-9 md:py-32">
        <div className="section-stamp" aria-hidden="true">06</div>
        <div className="access-orbit" aria-hidden="true"><i /><i /><i /><LockKeyhole className="h-9 w-9" /></div>
        <div className="relative z-10 mx-auto flex min-h-[55svh] max-w-[1480px] flex-col justify-between">
          <p className="landing-kicker">Ambiente confidencial</p>
          <div className="grid items-end gap-10 lg:grid-cols-[1fr_390px]"><h2 className="max-w-5xl text-5xl font-semibold leading-[.9] tracking-[-.06em] md:text-8xl">Os dados da campanha ficam com quem trabalha nela.</h2><div><p className="text-sm leading-6 text-white/52">O acesso é autenticado. Campanhas e perfis permanecem separados dentro do painel.</p><div className="mt-7 flex flex-col items-start gap-5"><NextDotFillButton label="Abrir login" to="/login" /><ContactDetailsReveal detail="contato@datasight.com.br" /></div></div></div>
        </div>
      </section>

      <footer className="border-t border-white/12 px-5 py-7 md:px-9"><div className="mx-auto flex max-w-[1480px] flex-col justify-between gap-3 text-[10px] uppercase tracking-[.12em] text-white/35 sm:flex-row"><span>Data Sight</span><span>Brasília · 2026</span></div></footer>
    </main>
  )
}

function monitoringArt(index: number) {
  const visuals = [
    `<g transform="translate(100 260)"><rect width="700" height="620" rx="34" fill="#111" stroke="#333"/><rect x="48" y="48" width="604" height="300" rx="20" fill="#1b1b1b"/><circle cx="350" cy="198" r="82" fill="none" stroke="#ff5a1f" stroke-width="18"/><path d="M350 116v164M268 198h164" stroke="#ff5a1f" stroke-width="8" opacity=".45"/><rect x="48" y="390" width="410" height="18" rx="9" fill="#eee"/><rect x="48" y="430" width="540" height="12" rx="6" fill="#666"/><rect x="48" y="466" width="490" height="12" rx="6" fill="#444"/><g fill="#ff5a1f"><rect x="48" y="540" width="90" height="28" rx="14"/><rect x="158" y="540" width="90" height="28" rx="14" opacity=".45"/></g></g>`,
    `<g transform="translate(90 250)"><rect width="720" height="640" rx="34" fill="#111" stroke="#333"/><g fill="#1c1c1c" stroke="#3a3a3a"><rect x="54" y="62" width="510" height="112" rx="28"/><rect x="158" y="214" width="500" height="112" rx="28"/><rect x="54" y="366" width="550" height="112" rx="28"/></g><g fill="#ff5a1f"><circle cx="92" cy="118" r="16"/><circle cx="196" cy="270" r="16"/><circle cx="92" cy="422" r="16"/></g><g fill="#777"><rect x="128" y="104" width="290" height="12" rx="6"/><rect x="128" y="130" width="350" height="9" rx="5"/><rect x="232" y="256" width="280" height="12" rx="6"/><rect x="232" y="282" width="330" height="9" rx="5"/><rect x="128" y="408" width="330" height="12" rx="6"/><rect x="128" y="434" width="390" height="9" rx="5"/></g><path d="M78 548h564" stroke="#333"/><path d="M80 548c90-10 128-85 214-64s130 82 214 38 98-115 134-104" fill="none" stroke="#ff5a1f" stroke-width="8"/></g>`,
    `<g transform="translate(90 250)"><rect width="720" height="640" rx="34" fill="#111" stroke="#333"/><circle cx="360" cy="236" r="152" fill="#161616" stroke="#333"/><circle cx="360" cy="236" r="112" fill="none" stroke="#ff5a1f" stroke-width="20" stroke-dasharray="430 274" transform="rotate(-90 360 236)"/><path d="M360 236V142M360 236l74 48" stroke="#eee" stroke-width="10" stroke-linecap="round"/><circle cx="360" cy="236" r="15" fill="#ff5a1f"/><g transform="translate(70 450)"><rect width="54" height="92" rx="8" fill="#444"/><rect x="82" y="-40" width="54" height="132" rx="8" fill="#777"/><rect x="164" y="-94" width="54" height="186" rx="8" fill="#ff5a1f"/><rect x="246" y="-18" width="54" height="110" rx="8" fill="#555"/><rect x="328" y="-66" width="54" height="158" rx="8" fill="#aaa"/><rect x="410" y="-118" width="54" height="210" rx="8" fill="#ff5a1f" opacity=".55"/><rect x="492" y="-48" width="54" height="140" rx="8" fill="#666"/><rect x="574" y="-82" width="54" height="174" rx="8" fill="#999"/></g></g>`,
    `<g transform="translate(90 250)"><rect width="720" height="640" rx="34" fill="#111" stroke="#333"/><g transform="translate(56 70)"><circle cx="62" cy="62" r="62" fill="#ff5a1f"/><circle cx="62" cy="48" r="20" fill="#111"/><path d="M25 103c12-38 62-38 74 0" fill="#111"/><rect x="160" y="18" width="300" height="18" rx="9" fill="#eee"/><rect x="160" y="56" width="208" height="12" rx="6" fill="#666"/><rect x="160" y="88" width="380" height="12" rx="6" fill="#444"/></g><path d="M58 250h604M58 430h604" stroke="#333"/><g transform="translate(70 286)"><rect width="74" height="106" rx="10" fill="#555"/><rect x="104" y="48" width="74" height="58" rx="10" fill="#999"/><rect x="208" y="-36" width="74" height="142" rx="10" fill="#ff5a1f"/><rect x="312" y="18" width="74" height="88" rx="10" fill="#777"/><rect x="416" y="-70" width="74" height="176" rx="10" fill="#eee"/><rect x="520" y="-12" width="74" height="118" rx="10" fill="#ff5a1f" opacity=".5"/></g><g fill="#777"><rect x="70" y="488" width="240" height="14" rx="7"/><rect x="70" y="526" width="420" height="10" rx="5"/><rect x="70" y="558" width="350" height="10" rx="5"/></g></g>`,
  ]
  const step = String(index + 1).padStart(2, '0')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200"><defs><pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0H0V60" fill="none" stroke="#232323"/></pattern><radialGradient id="glow" cx="80%" cy="12%" r="80%"><stop stop-color="#ff5a1f" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><rect width="900" height="1200" fill="#050505"/><rect width="900" height="1200" fill="url(#grid)"/><rect width="900" height="1200" fill="url(#glow)"/><text x="70" y="105" fill="#ff5a1f" font-family="Arial,sans-serif" font-size="22" font-weight="700" letter-spacing="5">DATA SIGHT / ${step}</text>${visuals[index] ?? visuals[0]}<text x="70" y="1110" fill="#777" font-family="Arial,sans-serif" font-size="18" letter-spacing="4">MONITORAMENTO DIGITAL</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
