import { PeriodSelector } from '@/components/dashboard/PeriodSelector'
import { GlobalProfileFilter } from '@/components/dashboard/GlobalProfileFilter'
import { ChevronDown, RefreshCw } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useCampaign } from '@/lib/campaignContext'
import { SidebarTrigger } from '@/components/animate-ui/components/radix/sidebar'

export function Topbar({ title }: { title: string }) {
  const campaign = useCampaign()
  const { pathname } = useLocation()
  const field = 'h-9 appearance-none border-0 border-b border-white/15 bg-transparent py-0 pl-1 pr-7 text-xs text-white outline-none transition-colors hover:border-white/40 focus:border-[#ff5a1f]'
  const showSample = !['/configuracoes', '/painel', '/ia'].includes(pathname) && !pathname.startsWith('/relatorios')

  return <header className="md:sticky top-0 z-30 border-b border-white/10 bg-black/80 px-4 backdrop-blur-xl md:px-7">
    <div className="mx-auto flex min-h-[64px] max-w-[1600px] flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3"><SidebarTrigger /><span className="h-5 w-px bg-white/10" /><div><p className="font-mono text-[8px] uppercase tracking-[.2em] text-[#ff6a2b]">Data Sight / operação</p><h1 className="truncate text-sm font-medium text-white md:text-base">{title}</h1></div></div>
      <div className="flex max-w-full flex-wrap items-center gap-3">
        <label className="relative"><span className="mr-2 text-[10px] text-white/45">Campanha</span><select className={field + " max-w-[200px]"} value={campaign.selected} disabled={campaign.loading} onChange={event => campaign.setSelected(event.target.value)}><option value="">Selecione</option>{campaign.campaigns.map(item => <option value={item.id} key={item.id}>{item.name}{item.active?'':' (arquivada)'}</option>)}</select><ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" /></label>
        {campaign.campaigns.find(c => String(c.id) === campaign.selected)?.slates?.length ? <label className="relative"><span className="mr-2 text-[10px] text-white/45">Chapa</span><select aria-label="Chapa" className={field + ' max-w-[200px]'} value={campaign.slateSelected} onChange={e => campaign.setSlateSelected(e.target.value)}><option value="">Todas as chapas e perfis</option>{campaign.campaigns.find(c => String(c.id) === campaign.selected)?.slates?.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" /></label> : null}
        {showSample ? <label className="relative"><span className="sr-only">Amostra</span><select className={field} value={campaign.limit} onChange={event => campaign.setLimit(Number(event.target.value))}>{[10, 25, 50, 100].map(value => <option key={value} value={value}>{value} posts</option>)}</select><ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" /></label> : null}
        <button type="button" onClick={campaign.refresh} disabled={campaign.loading} aria-label="Atualizar dados" className="grid h-9 w-9 place-items-center text-white/45 transition-colors hover:text-[#ff5a1f]"><RefreshCw className={`h-4 w-4 ${campaign.loading ? 'animate-spin' : ''}`} /></button>
      </div>
    </div>
    {showSample?<><GlobalProfileFilter/><PeriodSelector/></>:null}
  </header>
}
