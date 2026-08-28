import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Code2, Lock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/authContext'
import { DataSightLogo } from '@/components/brand/DataSightLogo'

const LoginAnimatedBackdrop = React.lazy(() =>
  import('@/components/login/LoginAnimatedBackdrop').then((module) => ({
    default: module.LoginAnimatedBackdrop,
  })),
)

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = React.useState('')
  const [senha, setSenha] = React.useState('')
  const [lembrar, setLembrar] = React.useState(true)
  const [erro, setErro] = React.useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !senha) {
      setErro('Preencha e-mail e senha para continuar.')
      return
    }

    signIn(email)
    navigate('/', { replace: true })
  }

  return (
    <main className="uiverse-login-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-ink">
      <React.Suspense fallback={null}>
        <LoginAnimatedBackdrop />
      </React.Suspense>
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_0,rgba(0,0,0,0.08)_42%,rgba(0,0,0,0.68)_100%)]" />
      <section className="uiverse-login-card relative z-10 w-full max-w-[390px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <DataSightLogo
            className="mb-6 flex-col justify-center gap-4 text-white"
            animated
            markClassName="h-20 w-20"
            textClassName="[&_p:first-child]:text-4xl [&_p:first-child]:font-bold [&_p:last-child]:mt-2 [&_p:last-child]:text-sm"
          />
          <p className="text-sm text-white/48">Entre com suas credenciais para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/36" />
            <Input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setErro(null)
              }}
              className="uiverse-login-input pl-11"
              autoComplete="username"
            />
          </div>

          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/36" />
            <Input
              type="password"
              placeholder="Senha"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value)
                setErro(null)
              }}
              className="uiverse-login-input pl-11"
              autoComplete="current-password"
            />
          </div>

          <div className="flex items-center justify-between gap-3 text-xs">
            <label className="flex cursor-pointer items-center gap-2 text-white/52">
              <input
                type="checkbox"
                checked={lembrar}
                onChange={(e) => setLembrar(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-white/15 bg-transparent accent-[#5C8DF6]"
              />
              Lembrar acesso
            </label>
            <button type="button" className="text-white/62 transition-colors hover:text-white">
              Esqueci a senha
            </button>
          </div>

          {erro && (
            <div className="rounded-xl border border-alert/30 bg-alert/10 px-3 py-2 text-xs font-medium text-alert">
              {erro}
            </div>
          )}

          <Button type="submit" className="uiverse-login-button w-full" size="lg">
            Entrar
            <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] text-white/34">ou</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="uiverse-social-button">
              <Code2 className="h-4 w-4" />
              GitHub
            </button>
            <button type="button" className="uiverse-social-button">
              <span className="text-sm font-semibold">G</span>
              Google
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
