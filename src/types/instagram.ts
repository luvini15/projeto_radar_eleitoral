// Tipos centrais do domínio "Radar Eleitoral".
// Desenhados para que, futuramente, os mesmos formatos sejam
// preenchidos pela API oficial do Instagram (Graph API / Meta),
// sem exigir mudanças nos componentes visuais.

export type PeriodoFiltro = '7d' | '30d' | '90d' | 'custom'

export interface AccountSummary {
  usuario: string
  nomeExibicao: string
  seguidores: number
  seguidoresVariacao: number
  seguidoresVariacaoPercentual: number
  alcance: number
  alcanceVariacaoPercentual: number
  visualizacoes: number
  visualizacoesVariacaoPercentual: number
  interacoes: number
  interacoesVariacaoPercentual: number
  engajamentoPorAlcance: number
  engajamentoPorAlcanceVariacaoPP: number
  conteudosPublicados: number
  conteudosPublicadosVariacao: number
  ultimaAtualizacao: string
}

export interface DailyMetric {
  data: string // ISO yyyy-mm-dd
  seguidores: number
  alcance: number
  visualizacoes: number
  interacoes: number
  novosSeguidores: number // crescimento líquido calculado por snapshots
}

export type FormatoConteudo = 'Reels' | 'Carrossel' | 'Imagem' | 'Vídeo'

export type TemaConteudo =
  | 'Mobilidade'
  | 'Segurança'
  | 'Saúde'
  | 'Educação'
  | 'Infraestrutura'
  | 'Emprego'
  | 'Fiscalização'
  | 'Ações comunitárias'
  | 'Institucional'
  | 'Bastidores'

export type ClassificacaoDesempenho = 'Destaque' | 'Dentro da média' | 'Abaixo da média'

export interface MediaItem {
  id: string
  data: string
  legenda: string
  miniaturaCor: string // usado no protótipo no lugar de uma imagem real
  formato: FormatoConteudo
  tema: TemaConteudo
  alcance: number
  visualizacoes: number
  curtidas: number
  comentarios: number
  compartilhamentos: number
  salvamentos: number
  engajamento: number // percentual
  classificacao: ClassificacaoDesempenho
}

export interface MediaHistoricoPonto {
  hora: string
  alcanceAcumulado: number
  interacoesAcumuladas: number
}

export interface MediaInsight {
  mediaId: string
  medianaFormatoAlcance: number
  razaoVsMediana: number
  insight: string
  historico: MediaHistoricoPonto[]
}

export interface TopicoResumo {
  tema: TemaConteudo
  quantidadeConteudos: number
  alcanceMedio: number
  engajamentoMedio: number
  compartilhamentosMedios: number
  variacaoPercentual: number
}

export interface FormatoResumo {
  formato: FormatoConteudo
  alcanceMedio: number
  engajamentoMedio: number
  compartilhamentosMedios: number
  salvamentosMedios: number
}

export interface HeatmapCelula {
  diaSemana: string
  horario: string
  engajamentoMedio: number // 0-100 (intensidade relativa)
}

export interface AudienceFaixaEtaria {
  faixa: string
  percentual: number
}

export interface AudienceGenero {
  genero: string
  percentual: number
}

export interface AudienceRegiao {
  cidade: string
  percentual: number
}

export interface AudienceSummary {
  seguidores: number
  novosSeguidores: number // crescimento líquido calculado por snapshots
  visitasPerfil: number
  cliquesLink: number
  contasAlcancadas: number
  contasEngajadas: number
  faixaEtaria: AudienceFaixaEtaria[]
  genero: AudienceGenero[]
  regioes: AudienceRegiao[] // localizações agregadas quando disponíveis
}

export type PrioridadeInsight = 'Alta' | 'Média' | 'Baixa'
export type StatusInsight = 'Novo' | 'Em análise' | 'Aplicado' | 'Descartado'
export type CategoriaInsight =
  | 'O que funcionou'
  | 'O que não funcionou'
  | 'Oportunidade'
  | 'Ponto de atenção'
  | 'Recomendação'
  | 'Teste sugerido'

export interface StrategicInsight {
  id: string
  categoria: CategoriaInsight
  texto: string
  prioridade: PrioridadeInsight
  status: StatusInsight
}

export interface AlertaItem {
  id: string
  texto: string
  tipo: 'positivo' | 'atencao' | 'neutro'
}
