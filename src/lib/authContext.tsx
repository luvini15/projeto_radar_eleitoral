import * as React from 'react'

interface AuthUser {
  nome: string
  email: string
  papel: 'Administrador' | 'Analista'
}

interface AuthContextValue {
  user: AuthUser | null
  signIn: (email: string) => void
  signOut: () => void
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

const SESSION_KEY = 'data-sight:session-simulada'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(() => {
    // Sessão simulada mantida apenas em memória/sessionStorage do navegador
    // (nenhum token real, nenhuma senha é persistida).
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem(SESSION_KEY) : null
    return raw ? JSON.parse(raw) : null
  })

  const signIn = React.useCallback((email: string) => {
    // Autenticação simulada: qualquer e-mail/senha preenchidos liberam o
    // acesso ao protótipo. Componente preparado para, futuramente, chamar
    // supabase.auth.signInWithPassword({ email, password }).
    const simulatedUser: AuthUser = {
      nome: 'Cláudio Borcem',
      email,
      papel: 'Administrador',
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(simulatedUser))
    setUser(simulatedUser)
  }, [])

  const signOut = React.useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
