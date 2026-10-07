import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react'
import { DataSightLogo } from '@/components/brand/DataSightLogo'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/authContext'
import { isSupabaseConfigured } from '@/services/supabaseClient'

export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = React.useState('')
  const [confirmation, setConfirmation] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Use uma senha com pelo menos 8 caracteres.'); return }
    if (password !== confirmation) { setError('As senhas não coincidem.'); return }
    try {
      setSubmitting(true)
      await updatePassword(password)
      navigate('/login?password=updated', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a senha.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-v2 relative min-h-screen overflow-x-hidden bg-black text-white">
      <div className="login-grid" aria-hidden="true" />
      <div className="login-orange-orbit" aria-hidden="true"><i /><i /><i /></div>
      <header className="absolute inset-x-0 top-0 z-30 flex h-20 items-center justify-between px-5 md:px-9">
        <Link to="/" className="flex items-center gap-3 text-white"><DataSightLogo showText={false} markClassName="h-8 w-8" /><span className="text-sm font-semibold">Data Sight</span></Link>
        <Link to="/login" className="group flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-white/45 transition-colors hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Voltar ao login</Link>
      </header>
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1480px] items-center justify-center px-5 pb-10 pt-28 md:px-9">
        <section className="login-panel relative w-full max-w-[470px] overflow-hidden border border-white/14 bg-[#111]/92 p-6 shadow-[0_35px_90px_rgba(0,0,0,.5)] backdrop-blur-xl sm:p-9">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#ff5a1f]" />
          <div className="mb-9 flex items-start justify-between gap-5"><div><p className="font-mono text-[9px] uppercase tracking-[.18em] text-[#ff5a1f]">Recuperação</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.045em]">Escolha uma nova senha</h1></div><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/12 text-white/60"><ShieldCheck className="h-4 w-4" /></span></div>
          {!isSupabaseConfigured ? <p className="text-sm text-white/60">O Supabase ainda não está configurado.</p> : <form onSubmit={handleSubmit} className="space-y-5">
            <PasswordField label="Nova senha" value={password} onChange={setPassword} />
            <PasswordField label="Confirme a nova senha" value={confirmation} onChange={setConfirmation} />
            {error ? <div role="alert" className="border-l-2 border-[#ff5a1f] bg-[#ff5a1f]/8 px-4 py-3 text-xs leading-5 text-white/75">{error}</div> : null}
            <button type="submit" disabled={submitting} className="group flex h-13 w-full items-center justify-between rounded-full bg-white pl-5 pr-1.5 text-sm font-semibold text-black transition-all hover:bg-[#ff5a1f] disabled:cursor-wait disabled:opacity-60"><span>{submitting ? 'Salvando…' : 'Salvar nova senha'}</span><i className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white transition-transform group-hover:rotate-[-35deg]"><ArrowRight className="h-4 w-4" /></i></button>
          </form>}
        </section>
      </div>
    </main>
  )
}

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [visible, setVisible] = React.useState(false)
  return <label className="block"><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[.13em] text-white/45">{label}</span><span className="login-field relative flex items-center"><Lock className="h-4 w-4" /><Input aria-label={label} type={visible ? 'text' : 'password'} value={value} onChange={event => onChange(event.target.value)} autoComplete="new-password" placeholder="Pelo menos 8 caracteres" /><button type="button" className="login-password-toggle" onClick={() => setVisible(current => !current)} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}>{visible ? <EyeOff /> : <Eye />}</button></span></label>
}
