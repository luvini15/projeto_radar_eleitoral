import type { AccountSummary } from '@/types/instagram'

// Dados ilustrativos — protótipo em desenvolvimento.
// Os mesmos totais aparecem de forma consistente em todas as páginas.
export const mockAccount: AccountSummary = {
  usuario: '@claudioborcem',
  nomeExibicao: 'Cláudio Borcem',
  seguidores: 58420,
  seguidoresVariacao: 1284, // crescimento líquido calculado por snapshots
  seguidoresVariacaoPercentual: 2.25,
  alcance: 1482300,
  alcanceVariacaoPercentual: 18.4,
  visualizacoes: 2936800,
  visualizacoesVariacaoPercentual: 21.7,
  interacoes: 142670,
  interacoesVariacaoPercentual: 13.9,
  engajamentoPorAlcance: 9.6,
  engajamentoPorAlcanceVariacaoPP: 0.8,
  conteudosPublicados: 24,
  conteudosPublicadosVariacao: 5,
  ultimaAtualizacao: 'Hoje, 07:00',
}
