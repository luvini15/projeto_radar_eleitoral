import { supabase } from './supabaseClient'

export async function authHeaders(_apiUrl: string): Promise<Record<string, string>> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  if (!token) throw new Error('Sessão expirada.')
  return { Authorization: `Bearer ${token}` }
}
