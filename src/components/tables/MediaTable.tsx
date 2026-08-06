import * as React from 'react'
import { Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { MediaItem, FormatoConteudo, TemaConteudo, ClassificacaoDesempenho } from '@/types/instagram'
import { classificacaoBadgeVariant } from '@/utils/metrics'
import { formatNumber } from '@/utils/metrics'

const formatos: FormatoConteudo[] = ['Reels', 'Carrossel', 'Imagem', 'Vídeo']
const temas: TemaConteudo[] = [
  'Mobilidade', 'Segurança', 'Saúde', 'Educação', 'Infraestrutura',
  'Emprego', 'Fiscalização', 'Ações comunitárias', 'Institucional', 'Bastidores',
]
const classificacoes: ClassificacaoDesempenho[] = ['Destaque', 'Dentro da média', 'Abaixo da média']

interface MediaTableProps {
  media: MediaItem[]
  onSelect: (item: MediaItem) => void
}

export function MediaTable({ media, onSelect }: MediaTableProps) {
  const [formato, setFormato] = React.useState<string>('todos')
  const [tema, setTema] = React.useState<string>('todos')
  const [classificacao, setClassificacao] = React.useState<string>('todas')
  const [busca, setBusca] = React.useState('')

  const filtrado = media.filter((m) => {
    if (formato !== 'todos' && m.formato !== formato) return false
    if (tema !== 'todos' && m.tema !== tema) return false
    if (classificacao !== 'todas' && m.classificacao !== classificacao) return false
    if (busca && !m.legenda.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate" />
          <Input
            placeholder="Buscar por legenda..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={formato} onChange={(e) => setFormato(e.target.value)}>
          <option value="todos">Todos os formatos</option>
          {formatos.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </Select>
        <Select value={tema} onChange={(e) => setTema(e.target.value)}>
          <option value="todos">Todos os temas</option>
          {temas.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
        <Select value={classificacao} onChange={(e) => setClassificacao(e.target.value)}>
          <option value="todas">Todas as classificações</option>
          {classificacoes.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto thin-scrollbar">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-border bg-bg/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate">
                <th className="px-4 py-3">Conteúdo</th>
                <th className="px-3 py-3">Data</th>
                <th className="px-3 py-3">Formato</th>
                <th className="px-3 py-3">Tema</th>
                <th className="px-3 py-3 text-right">Alcance</th>
                <th className="px-3 py-3 text-right">Visualiz.</th>
                <th className="px-3 py-3 text-right">Curtidas</th>
                <th className="px-3 py-3 text-right">Coment.</th>
                <th className="px-3 py-3 text-right">Compart.</th>
                <th className="px-3 py-3 text-right">Salvos</th>
                <th className="px-3 py-3 text-right">Engaj.</th>
                <th className="px-3 py-3">Classificação</th>
              </tr>
            </thead>
            <tbody>
              {filtrado.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-bg/60 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-9 w-9 shrink-0 rounded-md"
                        style={{ backgroundColor: item.miniaturaCor }}
                      />
                      <span className="line-clamp-1 max-w-[220px] text-blue-dark">{item.legenda}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate">
                    {item.data.slice(8, 10)}/{item.data.slice(5, 7)}
                  </td>
                  <td className="px-3 py-3 text-slate">{item.formato}</td>
                  <td className="px-3 py-3 text-slate">{item.tema}</td>
                  <td className="px-3 py-3 text-right font-medium text-blue-dark">
                    {formatNumber(item.alcance)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate">{formatNumber(item.visualizacoes)}</td>
                  <td className="px-3 py-3 text-right text-slate">{formatNumber(item.curtidas)}</td>
                  <td className="px-3 py-3 text-right text-slate">{formatNumber(item.comentarios)}</td>
                  <td className="px-3 py-3 text-right text-slate">{formatNumber(item.compartilhamentos)}</td>
                  <td className="px-3 py-3 text-right text-slate">{formatNumber(item.salvamentos)}</td>
                  <td className="px-3 py-3 text-right font-medium text-blue-dark">{item.engajamento}%</td>
                  <td className="px-3 py-3">
                    <Badge variant={classificacaoBadgeVariant(item.classificacao) as any}>
                      {item.classificacao}
                    </Badge>
                  </td>
                </tr>
              ))}
              {filtrado.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-sm text-slate">
                    Nenhum conteúdo encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
