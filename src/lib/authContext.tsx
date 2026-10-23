import * as React from 'react'
import { supabase } from '@/services/supabaseClient'

interface AuthUser { id: string; nome: string; email: string; papel: 'Administrador' | 'Analista' }
type MfaStage = 'enroll' | 'challenge' | null

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  mfaFactorId: string | null
  mfaQr: string | null
  mfaStage: MfaStage
  accessError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, enableMfa: boolean) => Promise<{ confirmationRequired: boolean }>
  signInWithGoogle: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  resendConfirmation: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  startMfaEnrollment: () => Promise<void>
  cancelMfaEnrollment: () => Promise<void>
  verifyMfa: (code: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [mfaFactorId, setMfaFactorId] = React.useState<string | null>(null)
  const [mfaQr, setMfaQr] = React.useState<string | null>(null)
  const [mfaStage, setMfaStage] = React.useState<MfaStage>(null)
  const [accessError, setAccessError] = React.useState<string | null>(null)
  const preparingMfaRef = React.useRef(false)

  const clearMfa = React.useCallback(() => {
    setMfaFactorId(null)
    setMfaQr(null)
    setMfaStage(null)
  }, [])

  const startMfaEnrollment = React.useCallback(async () => {
    if (!supabase || preparingMfaRef.current) return
    preparingMfaRef.current = true
    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
      if (factorsError) throw new Error('Não foi possível consultar a autenticação em duas etapas.')
      const verified = factors.totp.find(item => item.status === 'verified')
      if (verified) {
        setMfaFactorId(verified.id)
        setMfaQr(null)
        setMfaStage('challenge')
        return
      }
      const pending = factors.all.find(item => item.factor_type === 'totp' && item.status === 'unverified')
      if (pending) await supabase.auth.mfa.unenroll({ factorId: pending.id })
      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Data Sight' })
      if (enrollError || !enrolled?.totp) throw new Error('Não foi possível configurar a autenticação em duas etapas.')
      setMfaFactorId(enrolled.id)
      setMfaQr(enrolled.totp.qr_code)
      setMfaStage('enroll')
    } finally {
      preparingMfaRef.current = false
    }
  }, [])

  const loadUser = React.useCallback(async (surfaceErrors = false) => {
    if (!supabase) { setLoading(false); return }
    if (window.location.pathname === '/redefinir-senha') { setLoading(false); return }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      setUser(null)
      setAccessError(null)
      clearMfa()
      setLoading(false)
      return
    }

    const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (assuranceError) { setLoading(false); return }

    if (assurance?.currentLevel === 'aal1' && assurance.nextLevel === 'aal2') {
      setAccessError(null)
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const verified = factors?.totp.find(item => item.status === 'verified')
      if (verified) {
        setUser(null)
        setMfaFactorId(verified.id)
        setMfaQr(null)
        setMfaStage('challenge')
        setLoading(false)
        return
      }
    }

    const params = new URLSearchParams(window.location.search)
    if (assurance?.nextLevel !== 'aal2' && params.get('mfa') === '1') {
      setUser(null)
      setAccessError(null)
      params.delete('mfa')
      window.history.replaceState({}, '', `${window.location.pathname}${params.size ? `?${params}` : ''}${window.location.hash}`)
      try { await startMfaEnrollment() } finally { setLoading(false) }
      return
    }

    const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:8000')
    const response = await fetch(`${apiBase.replace(/\/$/, '')}/api/me`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    }).catch(() => null)
    if (!response) {
      setUser(null)
      setAccessError('Sua identidade foi confirmada, mas a API do Data Sight está offline.')
      setLoading(false)
      if (surfaceErrors) throw new Error('Código confirmado, mas a API do Data Sight está offline. Inicie o backend na porta 8000 e tente novamente.')
      return
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { detail?: string } | null
      setUser(null)
      setAccessError(payload?.detail || 'A identidade foi confirmada, mas a API recusou o acesso.')
      setLoading(false)
      if (surfaceErrors) {
        throw new Error(payload?.detail || 'A autenticação foi concluída, mas a API recusou o acesso.')
      }
      return
    }
    const account = await response.json() as { id: string; role: 'admin' | 'analyst' }
    setUser({
      id: account.id,
      nome: session.user.email?.split('@')[0] || 'Usuário',
      email: session.user.email || '',
      papel: account.role === 'admin' ? 'Administrador' : 'Analista',
    })
    setAccessError(null)
    clearMfa()
    setLoading(false)
  }, [clearMfa, startMfaEnrollment])

  React.useEffect(() => {
    void loadUser()
    if (!supabase) return
    const client = supabase
    const { data: { subscription } } = client.auth.onAuthStateChange(() => {
      window.setTimeout(() => { void loadUser() }, 0)
    })
    let lastActivity = Date.now()
    const activity = () => { lastActivity = Date.now() }
    const events = ['pointerdown', 'keydown', 'scroll'] as const
    events.forEach(event => window.addEventListener(event, activity, { passive: true }))
    const interval = window.setInterval(() => {
      if (Date.now() - lastActivity > 30 * 60 * 1000) void client.auth.signOut()
    }, 60_000)
    return () => {
      subscription.unsubscribe()
      events.forEach(event => window.removeEventListener(event, activity))
      window.clearInterval(interval)
    }
  }, [loadUser])

  const signIn = React.useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Autenticação não configurada. Configure o Supabase Auth.')
    setAccessError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.code === 'email_not_confirmed') {
        throw new Error('Confirme seu e-mail antes de entrar. Use o link que o Supabase enviou para sua caixa de entrada.')
      }
      if (error.code === 'invalid_credentials') {
        throw new Error('E-mail ou senha incorretos. Se você criou a conta com Google, entre com Google ou redefina uma senha.')
      }
      if (error.code === 'user_banned') throw new Error('Esta conta está temporariamente bloqueada.')
      if (error.code === 'over_request_rate_limit') throw new Error('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
      throw new Error('Não foi possível autenticar esta conta agora.')
    }
    await loadUser(true)
  }, [loadUser])

  const signUp = React.useCallback(async (email: string, password: string, enableMfa: boolean) => {
    if (!supabase) throw new Error('Autenticação não configurada. Configure o Supabase Auth.')
    setAccessError(null)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login?confirmed=1&mfa=${enableMfa ? '1' : '0'}`,
        data: { terms_accepted_at: new Date().toISOString(), terms_version: '2026-10-06' },
      },
    })
    if (error) throw new Error(error.message || 'Não foi possível criar a conta.')
    if (data.user && data.user.identities?.length === 0) {
      throw new Error('Já existe uma conta com este e-mail. Entre, use o Google ou redefina sua senha.')
    }
    if (data.session) {
      if (enableMfa) await startMfaEnrollment()
      else await loadUser(true)
    }
    return { confirmationRequired: !data.session }
  }, [loadUser, startMfaEnrollment])

  const signInWithGoogle = React.useCallback(async () => {
    if (!supabase) throw new Error('Autenticação não configurada. Configure o Supabase Auth.')
    setAccessError(null)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/login` } })
    if (error) throw new Error('Não foi possível iniciar o login com Google.')
  }, [])

  const requestPasswordReset = React.useCallback(async (email: string) => {
    if (!supabase) throw new Error('Autenticação não configurada. Configure o Supabase Auth.')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/redefinir-senha` })
    if (error) throw new Error('Não foi possível enviar o e-mail de recuperação.')
  }, [])

  const resendConfirmation = React.useCallback(async (email: string) => {
    if (!supabase) throw new Error('Autenticação não configurada. Configure o Supabase Auth.')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/login?confirmed=1` },
    })
    if (error?.code === 'over_email_send_rate_limit') {
      throw new Error('O e-mail já foi enviado recentemente. Aguarde alguns minutos antes de reenviar.')
    }
    if (error) throw new Error('Não foi possível reenviar a confirmação agora.')
  }, [])

  const updatePassword = React.useCallback(async (password: string) => {
    if (!supabase) throw new Error('Autenticação não configurada. Configure o Supabase Auth.')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw new Error(error.message || 'Não foi possível atualizar a senha.')
    await supabase.auth.signOut()
  }, [])

  const cancelMfaEnrollment = React.useCallback(async () => {
    if (supabase && mfaStage === 'enroll' && mfaFactorId) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId })
      if (error) throw new Error('Não foi possível cancelar a configuração do MFA.')
    }
    clearMfa()
    await loadUser(true)
  }, [clearMfa, loadUser, mfaFactorId, mfaStage])

  const verifyMfa = React.useCallback(async (code: string) => {
    if (!supabase || !mfaFactorId || !/^\d{6}$/.test(code)) throw new Error('Informe um código de 6 dígitos.')
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code })
    if (error) throw new Error('Código MFA inválido ou expirado.')
    await loadUser(true)
  }, [loadUser, mfaFactorId])

  const signOut = React.useCallback(async () => {
    await supabase?.auth.signOut()
    setUser(null)
    setAccessError(null)
    clearMfa()
  }, [clearMfa])

  return <AuthContext.Provider value={{ user, loading, mfaFactorId, mfaQr, mfaStage, accessError, signIn, signUp, signInWithGoogle, requestPasswordReset, resendConfirmation, updatePassword, startMfaEnrollment, cancelMfaEnrollment, verifyMfa, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
