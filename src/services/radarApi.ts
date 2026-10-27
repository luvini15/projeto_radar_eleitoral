import { scopedCampaignUrl } from './campaignScope'
const base = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:8000')).replace(/\/$/, '')
import { supabase } from './supabaseClient'
export interface Slate { id: number; name: string; campaign_id: number; members: {profile_id: number; username: string; position: string}[] }
export interface Campaign { slates?: Slate[]; id: number; name: string; slug?: string; active: boolean }
export function apiAsset(path: string) { return scopedCampaignUrl(base + '/api' + path) }
export async function apiAssetBlob(path: string): Promise<Blob> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  if (!token) throw new Error('Sessão expirada.')
  const response = await fetch(apiAsset(path), { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (!response.ok) throw new Error(`Imagem indisponível (${response.status}).`)
  return response.blob()
}
export interface ManagedProfile {id:number;username:string;full_name?:string|null;role:string;active:boolean;slate_id?:number|null;position?:string|null;username_editable?:boolean;username_edit_reason?:string|null}
export interface Detail extends Campaign { slug: string; profiles: ManagedProfile[] }
export interface Overview { summary: { profiles_monitored: number; posts_analyzed: number; comments: number | null; observed_interactions: number | null } }
export async function api<T>(path: string, body?: unknown, signal?: AbortSignal, method?: 'PUT' | 'DELETE'): Promise<T> {
  const session = (await supabase?.auth.getSession())?.data.session
  const token = session?.access_token
  if (!token) throw new Error('Sessão expirada.')
  let response: Response
  try {
    response = await fetch(scopedCampaignUrl(`${base}/api${path}`, session?.user.id), { method: method || (body === undefined ? 'GET' : 'POST'), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body === undefined ? undefined : JSON.stringify(body), signal, cache: 'no-store' })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('Não foi possível acessar o backend. Verifique se a API está rodando.')
  }
  if (!response.ok) {
    if (response.status === 401) {
      await supabase?.auth.signOut()
      throw new Error('Sessão expirada. Entre novamente.')
    }
    const data = await response.json().catch(() => null)
    throw new Error(typeof data?.detail === 'string' ? data.detail : `A operação falhou (${response.status}).`)
  }
  return response.json() as Promise<T>
}

// Configuration always addresses the full monitored campaign, independent of the analytical slate.
export const adminApi=<T,>(path:string,body?:unknown,method?:'PUT'|'DELETE')=>api<T>(`${path}${path.includes('?')?'&':'?'}full_campaign=1`,body,undefined,method)
