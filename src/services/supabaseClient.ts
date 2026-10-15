import { createClient } from '@supabase/supabase-js'

// Autenticação real via Supabase Auth. A chave publicável pode ir ao navegador;
// chaves secret/service_role nunca devem usar o prefixo VITE_.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: { storage: sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }) : null

export const isSupabaseConfigured = Boolean(supabase)
