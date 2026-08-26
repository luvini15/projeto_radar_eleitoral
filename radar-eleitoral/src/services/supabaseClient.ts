import { createClient } from '@supabase/supabase-js'

// Preparado para autenticação futura via Supabase Auth.
// Nenhuma chave é armazenada no código-fonte: as variáveis abaixo devem
// ser configuradas em `.env.local` (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
// antes de ativar a autenticação real. Enquanto não configuradas, o
// protótipo usa autenticação simulada (ver `src/pages/Login.tsx`).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export const isSupabaseConfigured = Boolean(supabase)
