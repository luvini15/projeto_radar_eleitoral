import * as React from 'react'
import { api } from '@/services/radarApi'
import type { Campaign } from '@/services/radarApi'

export const CampaignContext = React.createContext<{
  campaigns: Campaign[]; selected: string; setSelected: (id: string) => void;
  limit: number; setLimit: (n: number) => void; days: number; setDays: (n: number) => void;
  revision: number; refresh: () => void; loading: boolean; error: string;
} | null>(null)

export function useCampaign() {
  const value = React.useContext(CampaignContext)
  if (!value) throw new Error('CampaignProvider ausente')
  return value
}
export function useCampaignData<T>(endpoint: string, query: string) {
  const { selected, revision } = useCampaign()
  const key = `${selected}/${endpoint}?${query}`
  const [state, setState] = React.useState<{key: string; data?: T; error?: string}>({key: ''})
  React.useEffect(() => {
    if (!selected) return
    const controller = new AbortController()
    api<T>(`/campaigns/${selected}/${endpoint}?${query}`, undefined, controller.signal)
      .then(data => { if (!controller.signal.aborted) setState({ key, data }) })
      .catch(cause => { if (!controller.signal.aborted) setState({ key, error: cause instanceof Error ? cause.message : 'Erro ao carregar dados.' }) })
    return () => controller.abort()
  }, [selected, endpoint, query, key, revision])
  return state.key === key ? state : { key }
}
