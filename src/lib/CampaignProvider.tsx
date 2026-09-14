import * as React from 'react'
import { api } from '@/services/radarApi'
import type { Campaign } from '@/services/radarApi'
import { CampaignContext } from './campaignContext'

export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([])
  const [selected, select] = React.useState(() => { try { return localStorage.getItem('radar:campaign:v1') || '' } catch { return '' } })
  const [limit, setLimit] = React.useState(25)
  const [days, setDays] = React.useState(30)
  const [revision, refresh] = React.useReducer((n: number) => n + 1, 0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const setSelected = React.useCallback((id: string) => {
    select(id)
    try { localStorage.setItem('radar:campaign:v1', id) } catch { /* Selection still works without storage. */ }
  }, [])
  React.useEffect(() => {
    const poll = () => { if (document.visibilityState === 'visible') refresh() }
    const timer = window.setInterval(poll, 60_000)
    document.addEventListener('visibilitychange', poll)
    window.addEventListener('online', poll)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', poll)
      window.removeEventListener('online', poll)
    }
  }, [])
  const initialized = React.useRef(false)
  React.useEffect(() => {
    const controller = new AbortController()
    if (!initialized.current) setLoading(true)
    setError('')
    api<Campaign[]>('/campaigns', undefined, controller.signal).then(items => {
      if (controller.signal.aborted) return
      initialized.current = true
      setCampaigns(items)
      select(current => items.some(c => String(c.id) === current) ? current : String(items.find(c => c.active)?.id ?? items[0]?.id ?? ''))
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Erro ao carregar campanhas.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [revision])
  return <CampaignContext.Provider value={{ campaigns, selected, setSelected, limit, setLimit, days, setDays, revision, refresh, loading, error }}>{children}</CampaignContext.Provider>
}
