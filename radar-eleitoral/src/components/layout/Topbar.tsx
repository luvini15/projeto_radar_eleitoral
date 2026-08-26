import { useState } from 'react'
import { Menu, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { syncCampaign } from '@/services/api'

interface TopbarProps { title: string; subtitle: string; onOpenMobileMenu: () => void }

export function Topbar({ title, subtitle, onOpenMobileMenu }: TopbarProps) {
  const { show } = useToast()
  const [loading, setLoading] = useState(false)
  const handleRefresh = async () => {
    try {
      setLoading(true)
      await syncCampaign()
      window.dispatchEvent(new Event('radar:data-updated'))
      show('Dados reais atualizados com sucesso.')
    } catch (error) {
      console.error('Erro ao atualizar dados:', error)
      show('Erro ao atualizar os dados.')
    } finally { setLoading(false) }
  }
  return <div className="border-b border-border bg-white/90 backdrop-blur px-4 py-4 md:px-8 md:py-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><button type="button" onClick={onOpenMobileMenu} className="md:hidden mt-1 rounded-md border border-border p-1.5 text-slate" aria-label="Abrir menu"><Menu className="h-4 w-4" /></button><div><h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-blue-dark">{title}</h1><p className="mt-0.5 text-sm text-slate">{subtitle}</p></div></div><div className="flex items-center gap-3"><span className="hidden rounded-md border border-border bg-bg px-3 py-2 text-xs text-slate sm:inline">Recorte: até 25 posts por perfil</span><Button type="button" variant="secondary" size="sm" onClick={handleRefresh} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 ${loading?'animate-spin':''}`}/>{loading?'Atualizando...':'Atualizar dados'}</Button></div></div></div>
}
