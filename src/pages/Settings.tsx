import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { AtSign, UserPlus, Info } from 'lucide-react'

const usuarios = [
  { nome: 'Cláudio Borcem', papel: 'Administrador' },
  { nome: 'Luís Lima', papel: 'Analista' },
]

export default function Settings() {
  const [modalOpen, setModalOpen] = React.useState(false)
  const { show } = useToast()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campanha</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate">Campanha</dt>
              <dd className="text-sm font-medium text-ink">Cláudio Borcem</dd>
            </div>
            <div>
              <dt className="text-xs text-slate">Rede conectada</dt>
              <dd className="text-sm font-medium text-ink">Instagram</dd>
            </div>
            <div>
              <dt className="text-xs text-slate">Status</dt>
              <dd>
                <Badge variant="warning">Modo demonstração</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate">Última atualização</dt>
              <dd className="text-sm font-medium text-ink">Hoje, 07:00</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integração de dados oficiais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-slate">
                <AtSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Instagram oficial</p>
                <p className="text-xs text-slate">Aguardando autorização oficial da Meta</p>
              </div>
            </div>
            <Button size="sm" onClick={() => setModalOpen(true)}>
              Conectar Instagram
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuários autorizados</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {usuarios.map((u) => (
              <li key={u.nome} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue/10 text-xs font-bold text-blue">
                    {u.nome.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <span className="text-sm text-ink">{u.nome}</span>
                </div>
                <Badge variant={u.papel === 'Administrador' ? 'dark' : 'neutral'}>{u.papel}</Badge>
              </li>
            ))}
          </ul>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => show('Convite enviado (visual, protótipo).')}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Convidar usuário
          </Button>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} title="Conectar Instagram">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
          <p>
            A conexão oficial será ativada por OAuth da Meta. O candidato autoriza a conta profissional do Instagram; o Radar coleta somente métricas permitidas e nunca solicita a senha do Instagram.
          </p>
        </div>
        <div className="mt-5 flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
            Entendi
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
