const base = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
export interface Campaign { id: number; name: string; active: boolean }
export interface Detail extends Campaign { profiles: { id: number; username: string; role: string; active: boolean }[] }
export interface Overview { summary: { profiles_monitored: number; posts_analyzed: number; comments: number | null; observed_interactions: number | null } }
export async function api<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${base}/api${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('Não foi possível acessar o backend. Verifique se a API está rodando.')
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(typeof data?.detail === 'string' ? data.detail : `A operação falhou (${response.status}).`)
  }
  return response.json() as Promise<T>
}

