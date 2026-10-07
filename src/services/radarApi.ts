const base = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:8000')).replace(/\/$/, '')
import { supabase } from './supabaseClient'
export interface Campaign { id: number; name: string; active: boolean }
export function apiAsset(path: string) { return base + '/api' + path }
export async function apiAssetBlob(path: string): Promise<Blob> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  if (!token) throw new Error('Sessão expirada.')
  const response = await fetch(apiAsset(path), { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (!response.ok) throw new Error(`Imagem indisponível (${response.status}).`)
  return response.blob()
}
export interface Detail extends Campaign { profiles: { id: number; username: string; role: string; active: boolean }[] }
export interface Overview { summary: { profiles_monitored: number; posts_analyzed: number; comments: number | null; observed_interactions: number | null } }
export async function api<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  if (!token) throw new Error('Sessão expirada.')
  let response: Response
  try {
    response = await fetch(`${base}/api${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body === undefined ? undefined : JSON.stringify(body), signal, cache: 'no-store' })
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

