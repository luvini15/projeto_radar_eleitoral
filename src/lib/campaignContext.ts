import * as React from 'react'
import { api } from '@/services/radarApi'
import type { Campaign } from '@/services/radarApi'

export const CampaignContext = React.createContext<{
  periodMode: 'preset'|'custom'; startDate:string; endDate:string; periodKey:string;
  setPeriodMode:(mode:'preset'|'custom')=>void; setDateRange:(start:string,end:string)=>void;
  profileSelected:string; setProfileSelected:(id:string)=>void;
  slateSelected: string; setSlateSelected: (id: string) => void; scopeKey: string; scopeName: string;
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
  const { selected, revision, scopeKey, days, periodKey, loading: campaignLoading } = useCampaign()
  const key = `${scopeKey}:${days}:${periodKey}/${endpoint}?${query}`
  const [state, setState] = React.useState<{key: string; data?: T; error?: string}>({key: ''})
  React.useEffect(() => {
    if (!selected || campaignLoading) return
    const controller = new AbortController()
    api<T>(`/campaigns/${selected}${endpoint ? `/${endpoint}` : ''}?${query}`, undefined, controller.signal)
      .then(data => { if (!controller.signal.aborted) setState({ key, data }) })
      .catch(cause => { if (!controller.signal.aborted) setState({ key, error: cause instanceof Error ? cause.message : 'Erro ao carregar dados.' }) })
    return () => controller.abort()
  }, [selected, endpoint, query, key, revision, campaignLoading])
  return state.key === key ? state : { key }
}
