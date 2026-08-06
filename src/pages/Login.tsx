import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/authContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = React.useState('')
  const [senha, setSenha] = React.useState('')
  const [erro, setErro] = React.useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !senha) {
      setErro('Preencha e-mail e senha para continuar.')
      return
    }
    // Autenticação simulada — preparado para Supabase Auth futuramente.
    signIn(email)
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-blue-dark px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Radar Eleitoral</h1>
          <p className="mt-1 text-sm text-white/60">Ambiente privado de inteligência digital.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white p-6 shadow-2xl"
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate">E-mail</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
                <Input
                  type="email"
                  placeholder="voce@campanha.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  autoComplete="username"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate">Senha</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="pl-9"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {erro && <p className="text-xs font-medium text-alert">{erro}</p>}

            <Button type="submit" className="w-full" size="lg">
              Entrar no painel
            </Button>
          </div>
        </form>

        <p className="mt-5 text-center text-xs text-white/50">
          Acesso restrito a usuários autorizados pela campanha.
        </p>
      </div>
    </div>
  )
}
