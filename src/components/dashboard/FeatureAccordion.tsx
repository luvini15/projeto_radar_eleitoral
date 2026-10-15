import * as React from 'react'
import { NavLink } from 'react-router-dom'
import { ArrowUpRight, CalendarClock, FileStack, Layers3, Sparkles, Users } from 'lucide-react'

const items = [
  { to: '/conteudos', number: '01', title: 'Conteúdos', copy: 'Posts, comentários e desempenho observado.', icon: FileStack, motif: 'posts' },
  { to: '/temas-formatos', number: '02', title: 'Temas', copy: 'Assuntos e formatos que concentram resposta.', icon: Layers3, motif: 'bars' },
  { to: '/dias-horarios', number: '03', title: 'Horários', copy: 'Janelas de publicação e leitura temporal.', icon: CalendarClock, motif: 'time' },
  { to: '/audiencia', number: '04', title: 'Audiência', copy: 'Histórico dos perfis acompanhados.', icon: Users, motif: 'people' },
  { to: '/insights', number: '05', title: 'Inteligência', copy: 'Leituras estratégicas sustentadas pelos dados.', icon: Sparkles, motif: 'signal' },
]

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
function useSpring(target: number) {
  const [value, setValue] = React.useState(target); const current = React.useRef(target); const velocity = React.useRef(0)
  React.useEffect(() => {
    let raf = 0; let last = 0
    const tick = (now: number) => { const dt=last?clamp((now-last)/16.67,0,2.5):1; last=now; velocity.current+=(target-current.current)*.13*dt; velocity.current*=Math.pow(.73,dt); current.current+=velocity.current*dt; if(Math.abs(target-current.current)<.002&&Math.abs(velocity.current)<.002){current.current=target;setValue(target);return} setValue(current.current);raf=requestAnimationFrame(tick) }
    raf=requestAnimationFrame(tick); return()=>cancelAnimationFrame(raf)
  },[target]); return value
}

export function FeatureAccordion() {
  const [active, setActive] = React.useState<number | null>(0)
  const wanted = (index: number) => active === null ? 1 : 1 + 3.2*Math.exp(-((Math.abs(index-active)/.72)**2))
  const weights = [useSpring(wanted(0)), useSpring(wanted(1)), useSpring(wanted(2)), useSpring(wanted(3)), useSpring(wanted(4))]
  return <nav aria-label="Áreas do Data Sight" className="hub-accordion" onPointerLeave={() => setActive(0)}>{items.map((item,index)=>{const Icon=item.icon; return <NavLink key={item.to} to={item.to} className="hub-accordion__item" style={{ flexGrow: weights[index] }} onPointerEnter={()=>setActive(index)} onFocus={()=>setActive(index)} data-active={active===index||undefined}>
    <span className={`hub-accordion__motif hub-accordion__motif--${item.motif}`} aria-hidden="true"><i/><i/><i/><i/></span>
    <span className="hub-accordion__top"><small>{item.number}</small><Icon /></span>
    <span className="hub-accordion__copy"><strong>{item.title}</strong><small>{item.copy}</small></span>
    <ArrowUpRight className="hub-accordion__arrow" />
  </NavLink>})}</nav>
}
