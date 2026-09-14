import { Menu, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCampaign } from '@/lib/campaignContext'
import { useLocation } from 'react-router-dom'

export function Topbar({ title, onOpenMobileMenu, desktopOpen, onToggleDesktop }: { title: string; onOpenMobileMenu: () => void; desktopOpen: boolean; onToggleDesktop: () => void }) {
  const c = useCampaign()
  const { pathname } = useLocation()
  const field = 'h-9 max-w-full rounded-md border border-border bg-muted px-2 text-sm'
  return <div className="border-b border-border bg-bg/55 px-4 py-4 md:px-7">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3"><button onClick={onOpenMobileMenu} className="md:hidden" aria-label="Abrir menu"><Menu className="h-5 w-5" /></button><button onClick={onToggleDesktop} className="hidden rounded-md p-2 text-slate hover:bg-white/8 md:block" aria-label={desktopOpen ? "Recolher sidebar" : "Expandir sidebar"} aria-expanded={desktopOpen} aria-controls="desktop-sidebar"><Menu className="h-5 w-5" /></button><h1 className="font-display text-2xl font-semibold">{title}</h1></div>
      <div className="flex max-w-full flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-col gap-1 text-xs text-slate">Campanha<select aria-label="Campanha do painel" className={field} value={c.selected} disabled={c.loading} onChange={e => c.setSelected(e.target.value)}><option value="">Selecione</option>{c.campaigns.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        {pathname !== '/configuracoes' ? <label className="flex flex-col gap-1 text-xs text-slate">Posts recentes por perfil<select className={field} value={c.limit} onChange={e => c.setLimit(Number(e.target.value))}>{[10,25,50,100].map(n => <option key={n} value={n}>{n} posts</option>)}</select></label> : null}
        {pathname === '/audiencia' ? <label className="flex flex-col gap-1 text-xs text-slate">Histórico de seguidores<select className={field} value={c.days} onChange={e => c.setDays(Number(e.target.value))}>{[7,30,90].map(n => <option key={n} value={n}>{n} dias</option>)}</select></label> : null}
        <span className="self-center text-xs text-slate">Atualiza a cada 60s</span>
        <Button variant="secondary" disabled={c.loading} onClick={c.refresh}><RefreshCw className="h-4 w-4" />Recarregar</Button>
      </div>
    </div>
  </div>
}
