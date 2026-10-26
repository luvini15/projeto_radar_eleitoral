import * as React from 'react'
import {utcPeriod,validPeriod} from '@/utils/analysisPeriod'
import { api } from '@/services/radarApi'
import type { Campaign } from '@/services/radarApi'
import { CampaignContext } from './campaignContext'
import { useAuth } from './authContext'

export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const storageKey = `radar:campaign:v2:${user?.id || 'anonymous'}`
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([])
  const [selected, select] = React.useState(() => { try { return localStorage.getItem(storageKey) || '' } catch { return '' } })
  const [slateSelections, setSlateSelections] = React.useState<Record<string,string>>(() => {
    try { const saved=JSON.parse(localStorage.getItem('radar:slate:v1') || '{}');return saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{} } catch { return {} }
  })
  const currentCampaign = campaigns.find(c => String(c.id) === selected)
  const rawSlate = slateSelections[selected] || ''
  const slateSelected = currentCampaign?.slates?.some(s => String(s.id) === rawSlate) ? rawSlate : ''
  const [profileSelected,setProfile]=React.useState('')
  const setProfileSelected=React.useCallback((id:string)=>{setProfile(id);try{localStorage.setItem('radar:profile:v1',id);localStorage.setItem(storageKey,selected)}catch{/* Memory selection remains available. */}},[selected,storageKey])
  React.useEffect(()=>{setProfileSelected('')},[selected,slateSelected,setProfileSelected])
  const scopeKey = `${selected}:${slateSelected}:${profileSelected}`
  const scopeName = currentCampaign?.slates?.find(s => String(s.id) === slateSelected)?.name || currentCampaign?.name || ''
  const setSlateSelected = React.useCallback((id: string) => {
    setProfileSelected('')
    setSlateSelections(previous => {
      const next = {...previous, [selected]: id}
      try { localStorage.setItem('radar:slate:v1', JSON.stringify(next)) } catch { /* Selection remains visible. */ }
      return next
    })
  }, [selected,setProfileSelected])
  const [limit, updateLimit] = React.useState(()=>{try{const n=Number(localStorage.getItem('radar:sample:v1'));return [10,25,50,100].includes(n)?n:25}catch{return 25}})
  const setLimit=React.useCallback((n:number)=>{updateLimit(n);try{localStorage.setItem('radar:sample:v1',String(n))}catch{/* Memory selection remains available. */}},[])
  const [days, updateDays] = React.useState(() => {
    try {const value=Number(localStorage.getItem('radar:days:v1')||30);return value>=1&&value<=365?value:30} catch {return 30}
  })
  const setDays=React.useCallback((value:number)=>{
    updateDays(value)
    try {localStorage.setItem('radar:days:v1',String(value))} catch { /* Nonpersistent mode. */ }
  },[])
  const [range,setRange]=React.useState(()=>{try{const r=JSON.parse(localStorage.getItem('radar:period:v1')||'null');return r&&validPeriod(r.start,r.end)?r as {start:string;end:string}:null}catch{return null}})
  const periodMode=range?'custom':'preset'
  const dates=range||utcPeriod(days)
  const periodKey=dates.start+':'+dates.end
  const setDateRange=React.useCallback((start:string,end:string)=>{if(!validPeriod(start,end))return;const next={start,end};setRange(next);try{localStorage.setItem('radar:period:v1',JSON.stringify(next))}catch{/* Memory selection remains available. */}},[])
  const setPeriodMode=React.useCallback((mode:'preset'|'custom')=>{if(mode==='preset'){setRange(null);try{localStorage.removeItem('radar:period:v1')}catch{/* Memory selection remains available. */}}else{const next=utcPeriod(days);setDateRange(next.start,next.end)}},[days,setDateRange])
  const [revision, refresh] = React.useReducer((n: number) => n + 1, 0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const setSelected = React.useCallback((id: string) => {
    setProfileSelected('')
    select(id)
    try { localStorage.setItem(storageKey, id) } catch { /* Selection still works without storage. */ }
  }, [storageKey,setProfileSelected])
  React.useEffect(() => {
    try { select(localStorage.getItem(storageKey) || '') } catch { select('') }
  }, [storageKey])
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
      setSlateSelections(previous => {
        const next = {...previous}
        for (const item of items) if (!item.slates?.some(s => String(s.id) === next[item.id])) delete next[item.id]
        try { localStorage.setItem('radar:slate:v1', JSON.stringify(next)) } catch { /* Nonpersistent mode. */ }
        return next
      })
      select(current => items.some(c => String(c.id) === current) ? current : String(items.find(c => c.active)?.id ?? items[0]?.id ?? ''))
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Erro ao carregar campanhas.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [revision])
  return <CampaignContext.Provider value={{ periodMode,startDate:dates.start,endDate:dates.end,periodKey,setPeriodMode,setDateRange,profileSelected,setProfileSelected, slateSelected, setSlateSelected, scopeKey, scopeName, campaigns, selected, setSelected, limit, setLimit, days, setDays, revision, refresh, loading, error }}>{children}</CampaignContext.Provider>
}
