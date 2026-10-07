import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ArrowRight, CircleHelp, Eye, EyeOff, KeyRound, LogOut, ShieldCheck, Smartphone } from 'lucide-react'
import { useAuth } from '@/lib/authContext'
import { isSupabaseConfigured } from '@/services/supabaseClient'
import { DataSightLogo } from '@/components/brand/DataSightLogo'
import { PrismGradient } from '@/components/ui/prism-gradient'
import { TextMorph } from '@/components/ui/text-morph'
import { Toggle } from '@/components/auth/Toggle'
import { Otp } from '@/components/auth/Otp'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/animate-ui/components/radix/alert-dialog'

export default function Login() {
  const { signIn, signUp, signInWithGoogle, requestPasswordReset, resendConfirmation, verifyMfa, cancelMfaEnrollment, signOut, mfaFactorId, mfaQr, mfaStage, accessError, user } = useAuth()
  const navigate = useNavigate()
  const [modo, setModo] = React.useState<'entrar' | 'cadastro' | 'recuperar'>('entrar')
  const [email, setEmail] = React.useState('')
  const [senha, setSenha] = React.useState('')
  const [confirmacaoSenha, setConfirmacaoSenha] = React.useState('')
  const [codigo, setCodigo] = React.useState('')
  const [enviando, setEnviando] = React.useState(false)
  const [erro, setErro] = React.useState<string | null>(null)
  const [mensagem, setMensagem] = React.useState<string | null>(null)
  const [enableMfa, setEnableMfa] = React.useState(false)
  const [mfaDialogOpen, setMfaDialogOpen] = React.useState(false)
  const [supportDialogOpen, setSupportDialogOpen] = React.useState(false)
  const [termsAccepted, setTermsAccepted] = React.useState(false)
  const [needsConfirmation, setNeedsConfirmation] = React.useState(false)

  React.useEffect(() => { if (user) navigate('/painel', { replace: true }) }, [user, navigate])
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('confirmed') === '1') setMensagem('E-mail confirmado. Conclua a autenticação em duas etapas para continuar.')
    if (params.get('password') === 'updated') setMensagem('Senha atualizada. Entre novamente para continuar.')
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    if (hash.get('error_description')) setErro(hash.get('error_description') ?? 'Falha na autenticação.')
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setErro(null)
    setMensagem(null)
    setNeedsConfirmation(false)
    if (!isSupabaseConfigured) return
    if (!mfaFactorId && !email.trim()) {
      setErro('Informe seu e-mail.')
      return
    }
    if (!mfaFactorId && modo !== 'recuperar' && !senha) { setErro('Informe sua senha.'); return }
    if (!mfaFactorId && modo === 'cadastro' && senha.length < 8) { setErro('Use uma senha com pelo menos 8 caracteres.'); return }
    if (!mfaFactorId && modo === 'cadastro' && senha !== confirmacaoSenha) { setErro('As senhas não coincidem.'); return }
    if (!mfaFactorId && modo === 'cadastro' && !termsAccepted) { setErro('Você precisa aceitar os Termos de Uso e a Política de Privacidade.'); return }
    if (mfaFactorId && codigo.length !== 6) {
      setErro('Digite os seis números do autenticador.')
      return
    }

    try {
      setEnviando(true)
      if (mfaFactorId) await verifyMfa(codigo)
      else if (modo === 'cadastro') {
        const result = await signUp(email.trim(), senha, enableMfa)
        if (result.confirmationRequired) setMensagem('Confira seu e-mail para confirmar a conta. Depois da confirmação, você poderá entrar no Data Sight.')
      } else if (modo === 'recuperar') {
        await requestPasswordReset(email.trim())
        setMensagem('Se houver uma conta com esse e-mail, enviaremos o link para redefinir a senha.')
      } else await signIn(email.trim(), senha)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível entrar.'
      setErro(message)
      setNeedsConfirmation(message.startsWith('Confirme seu e-mail'))
    } finally {
      setEnviando(false)
    }
  }

  async function handleResendConfirmation() {
    setErro(null)
    setMensagem(null)
    try {
      setEnviando(true)
      await resendConfirmation(email.trim())
      setNeedsConfirmation(false)
      setMensagem('Enviamos um novo link de confirmação. Confira também a caixa de spam.')
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Não foi possível reenviar a confirmação.')
    } finally {
      setEnviando(false)
    }
  }

  async function handleGoogle() {
    setErro(null)
    setMensagem(null)
    setNeedsConfirmation(false)
    try {
      setEnviando(true)
      await signInWithGoogle()
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Não foi possível entrar com Google.')
      setEnviando(false)
    }
  }

  async function handleCancelMfa() {
    setErro(null)
    try {
      setEnviando(true)
      await cancelMfaEnrollment()
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Não foi possível cancelar a configuração.')
    } finally {
      setEnviando(false)
    }
  }

  function changeMode(next: 'entrar' | 'cadastro' | 'recuperar') {
    setModo(next)
    setErro(null)
    setMensagem(null)
    setNeedsConfirmation(false)
    setSenha('')
    setConfirmacaoSenha('')
    setEnableMfa(false)
    setTermsAccepted(false)
  }

  const title = mfaFactorId ? (mfaStage === 'enroll' ? 'Ative a proteção' : 'Confirme o código') : modo === 'cadastro' ? 'Crie sua conta' : modo === 'recuperar' ? 'Recupere sua senha' : 'Entre na sua conta'

  return (
    <main className="login-v2 relative min-h-screen overflow-x-hidden bg-black text-white">
      <PrismGradient
        className="login-prism"
        colors={['#000000', '#ff5a1f', '#141414']}
        speed={0.72}
      />
      <div className="login-prism-shade" aria-hidden="true" />

      <header className="absolute inset-x-0 top-0 z-30 flex h-20 items-center justify-between px-5 md:px-9">
        <Link to="/" className="flex items-center gap-3 text-white"><DataSightLogo showText={false} markClassName="h-8 w-8" /><span className="text-sm font-semibold">Data Sight</span></Link>
        <Link to="/" className="group flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-white/45 transition-colors hover:text-white"><ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />Voltar ao site</Link>
      </header>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 pb-12 pt-28 sm:px-6">
        <TextMorph
          words={['MONITORE', 'INTERPRETE', 'ANTECIPE']}
          interval={2400}
          morphDuration={680}
          className="mb-10 text-center text-4xl font-semibold tracking-[-.06em] text-white sm:text-5xl"
        />

        <section className="login-shell w-full max-w-[390px]">
          <div className="mb-8 text-center">
            <span className="mx-auto flex h-10 w-10 items-center justify-center text-white">
              {mfaFactorId ? <KeyRound className="h-5 w-5" /> : <DataSightLogo showText={false} markClassName="h-7 w-7" />}
            </span>
            <h1 className="mt-5 text-2xl font-semibold tracking-[-.04em]">{title}</h1>
            {!mfaFactorId ? (
              <p className="mt-2 text-sm text-white/48">
                {modo === 'entrar' ? <>Ainda não tem uma conta? <button type="button" onClick={() => changeMode('cadastro')} className="text-white underline decoration-white/35 underline-offset-4 transition-colors hover:text-[#ff5a1f]">Cadastre-se</button></> : modo === 'cadastro' ? <>Já possui uma conta? <button type="button" onClick={() => changeMode('entrar')} className="text-white underline decoration-white/35 underline-offset-4 transition-colors hover:text-[#ff5a1f]">Entrar</button></> : 'Enviaremos um link seguro para o seu e-mail.'}
              </p>
            ) : <p className="mt-2 text-sm text-white/48">Use o código do seu aplicativo autenticador.</p>}
          </div>

          {!isSupabaseConfigured ? <ConfigurationNotice /> : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!mfaFactorId ? <>
                <LoginField label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="username" />
                {modo !== 'recuperar' ? <LoginField label="Senha" type="password" value={senha} onChange={setSenha} autoComplete={modo === 'cadastro' ? 'new-password' : 'current-password'} /> : null}
                {modo === 'cadastro' ? <LoginField label="Confirme a senha" type="password" value={confirmacaoSenha} onChange={setConfirmacaoSenha} autoComplete="new-password" /> : null}
                {modo === 'cadastro' ? <>
                  <div className="flex items-center justify-between gap-5 py-2">
                    <div><p className="text-sm font-medium text-white">Autenticação em duas etapas</p><p className="mt-1 text-xs leading-5 text-white/42">Proteja sua conta com um aplicativo autenticador.</p></div>
                    <Toggle checked={enableMfa} onCheckedChange={next => { if (next) setMfaDialogOpen(true); else setEnableMfa(false) }} label="Ativar autenticação em duas etapas" />
                  </div>
                  <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-white/52">
                    <input type="checkbox" checked={termsAccepted} onChange={event => setTermsAccepted(event.target.checked)} className="mt-1 h-3.5 w-3.5 shrink-0 accent-[#ff5a1f]" />
                    <span>Li e concordo com os <Link to="/termos" target="_blank" className="text-white underline underline-offset-4">Termos de Uso</Link> e a <Link to="/privacidade" target="_blank" className="text-white underline underline-offset-4">Política de Privacidade</Link>.</span>
                  </label>
                </> : null}
                {modo === 'entrar' ? <div className="text-right"><button type="button" onClick={() => changeMode('recuperar')} className="text-xs text-white/48 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white">Esqueci minha senha</button></div> : null}
              </> : <MfaStep qr={mfaQr} code={codigo} onCodeChange={setCodigo} invalid={Boolean(erro)} />}

              {erro && !accessError ? <div role="alert" className="border-l-2 border-[#ff5a1f] bg-[#ff5a1f]/8 px-4 py-3 text-xs leading-5 text-white/75">{erro}</div> : null}
              {needsConfirmation && email.trim() ? <button type="button" disabled={enviando} onClick={() => void handleResendConfirmation()} className="mx-auto block text-xs font-medium text-[#ff7a45] underline decoration-[#ff5a1f]/40 underline-offset-4 transition-colors hover:text-white disabled:opacity-50">Reenviar e-mail de confirmação</button> : null}
              {accessError ? <AccessNotice message={accessError} onSignOut={() => void signOut()} /> : null}
              {mensagem ? <div role="status" className="border-l-2 border-white/35 bg-white/5 px-4 py-3 text-xs leading-5 text-white/75">{mensagem}</div> : null}

              <button type="submit" disabled={enviando} className="group flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white text-sm font-semibold text-black transition-colors hover:bg-[#ff5a1f] disabled:cursor-wait disabled:opacity-60">
                <span>{enviando ? 'Aguarde…' : mfaFactorId ? 'Verificar código' : modo === 'cadastro' ? 'Criar conta' : modo === 'recuperar' ? 'Enviar link' : 'Entrar'}</span><ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>

              {!mfaFactorId && modo !== 'recuperar' ? <>
                <div className="flex items-center gap-3 py-1 text-[10px] uppercase tracking-[.12em] text-white/30"><span className="h-px flex-1 bg-white/10" />ou<span className="h-px flex-1 bg-white/10" /></div>
                <button type="button" disabled={enviando} onClick={() => void handleGoogle()} className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-white/15 bg-white/[.035] text-sm font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/[.08] disabled:cursor-wait disabled:opacity-60"><GoogleIcon />Continuar com Google</button>
              </> : null}

              {modo === 'recuperar' && !mfaFactorId ? <button type="button" onClick={() => changeMode('entrar')} className="mx-auto block text-xs text-white/50 transition-colors hover:text-white">Voltar ao login</button> : null}
              {mfaStage === 'enroll' ? <button type="button" disabled={enviando} onClick={() => void handleCancelMfa()} className="mx-auto block text-xs text-white/50 transition-colors hover:text-white">Agora não</button> : null}
              {mfaFactorId ? <button type="button" onClick={() => setSupportDialogOpen(true)} className="mx-auto flex items-center gap-2 text-xs text-white/50 transition-colors hover:text-white"><CircleHelp className="h-3.5 w-3.5" />Tentar outro método ou obter ajuda</button> : null}
            </form>
          )}

          {modo !== 'cadastro' ? <p className="mt-7 text-center text-[10px] leading-5 text-white/30">Ao continuar, você concorda com os <Link to="/termos" target="_blank" className="underline underline-offset-2">Termos de Uso</Link> e a <Link to="/privacidade" target="_blank" className="underline underline-offset-2">Política de Privacidade</Link>.</p> : null}
        </section>
      </div>

      <AlertDialog open={mfaDialogOpen} onOpenChange={setMfaDialogOpen}>
        <AlertDialogContent className="border-white/12 bg-[#0a0a0a] text-white shadow-[0_30px_100px_rgba(0,0,0,.75)]">
          <AlertDialogHeader>
            <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#ff5a1f]/12 text-[#ff5a1f]"><ShieldCheck className="h-5 w-5" /></span>
            <AlertDialogTitle>Ativar autenticação em duas etapas?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/52">Depois de confirmar seu e-mail, você escaneará um QR Code no aplicativo autenticador. Nos próximos acessos, a senha e o código de seis dígitos serão obrigatórios.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/12 bg-transparent text-white hover:bg-white/8">Agora não</AlertDialogCancel>
            <AlertDialogAction onClick={() => setEnableMfa(true)} className="bg-[#ff5a1f] text-black hover:bg-[#ff713d]">Ativar proteção</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
        <AlertDialogContent className="border-white/12 bg-[#0a0a0a] text-white shadow-[0_30px_100px_rgba(0,0,0,.75)]">
          <AlertDialogHeader>
            <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-white"><Smartphone className="h-5 w-5" /></span>
            <AlertDialogTitle>Não consegue usar o autenticador?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-white/52">
              <span className="block">Confirme se o relógio do celular está no modo automático e use o código mais recente.</span>
              <span className="block">O envio por SMS ou WhatsApp ainda não está habilitado neste projeto. Ele exige um telefone previamente verificado e a configuração do Advanced MFA Phone no Supabase.</span>
              <span className="block">Se você perdeu o autenticador, peça ao administrador da campanha para redefinir seu fator de segurança.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/12 bg-transparent text-white hover:bg-white/8">Continuar tentando</AlertDialogCancel>
            <AlertDialogAction onClick={() => void signOut()} className="bg-white text-black hover:bg-[#ff5a1f]">Sair e voltar ao login</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}

function GoogleIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.7A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-3.8V7.4H3.1a10 10 0 0 0 0 9.3L6.5 14Z"/><path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3.1 7.4l3.4 2.7A5.9 5.9 0 0 1 12 6.1Z"/></svg>
}

function LoginField({ label, type, value, onChange, autoComplete }: { label: string; type: 'email' | 'password'; value: string; onChange: (value: string) => void; autoComplete: string }) {
  const id = React.useId()
  const [visible, setVisible] = React.useState(false)
  const password = type === 'password'
  return <div className="login-floating-field"><input id={id} required type={password && visible ? 'text' : type} value={value} onChange={event => onChange(event.target.value)} autoComplete={autoComplete} placeholder=" " /><label htmlFor={id}>{label}</label>{password ? <button type="button" className="login-password-toggle" onClick={() => setVisible(current => !current)} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}>{visible ? <EyeOff /> : <Eye />}</button> : null}</div>
}

function MfaStep({ qr, code, onCodeChange, invalid }: { qr: string | null; code: string; onCodeChange: (value: string) => void; invalid: boolean }) {
  return <div className="space-y-5">{qr ? <div className="mx-auto w-fit bg-white p-3"><img src={qr} alt="QR code para configurar o autenticador" className="h-44 w-44" /></div> : null}<div><p className="mb-4 text-center text-sm leading-6 text-white/58">{qr ? 'Escaneie o QR Code e informe o código gerado para concluir.' : 'Abra o aplicativo autenticador e digite o código exibido.'}</p><Otp value={code} onChange={onCodeChange} length={6} invalid={invalid} /></div></div>
}

function ConfigurationNotice() {
  return <div role="alert" className="border border-[#ff5a1f]/35 bg-[#ff5a1f]/7 p-5"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5a1f]" /><div><h3 className="text-sm font-semibold">O login ainda não está configurado</h3><p className="mt-2 text-xs leading-5 text-white/52">Crie o arquivo <code className="text-white/80">.env.local</code> na raiz do projeto e informe <code className="text-white/80">VITE_SUPABASE_URL</code> e <code className="text-white/80">VITE_SUPABASE_ANON_KEY</code>. Reinicie o front-end depois disso.</p></div></div></div>
}

function AccessNotice({ message, onSignOut }: { message: string; onSignOut: () => void }) {
  return <div role="alert" className="border-l-2 border-[#ff5a1f] bg-[#ff5a1f]/8 px-4 py-3 text-xs leading-5 text-white/75"><p>{message}</p><button type="button" onClick={onSignOut} className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.08em] text-white/55 hover:text-white"><LogOut className="h-3 w-3" />Sair desta conta</button></div>
}
