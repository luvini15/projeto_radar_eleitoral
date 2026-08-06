import type {
  TopicoResumo,
  FormatoResumo,
  HeatmapCelula,
  AudienceSummary,
  StrategicInsight,
  AlertaItem,
  MediaInsight,
} from '@/types/instagram'

// Dados ilustrativos — protótipo em desenvolvimento.
// Valores fixos, coerentes com os totais usados nas demais páginas.

export const mockTopicos: TopicoResumo[] = [
  { tema: "Mobilidade", quantidadeConteudos: 4, alcanceMedio: 68795, engajamentoMedio: 11.5, compartilhamentosMedios: 1259, variacaoPercentual: -5.2 },
  { tema: "Segurança", quantidadeConteudos: 1, alcanceMedio: 55320, engajamentoMedio: 11.6, compartilhamentosMedios: 801, variacaoPercentual: 3.9 },
  { tema: "Saúde", quantidadeConteudos: 2, alcanceMedio: 35158, engajamentoMedio: 9.5, compartilhamentosMedios: 814, variacaoPercentual: -0.9 },
  { tema: "Educação", quantidadeConteudos: 2, alcanceMedio: 47928, engajamentoMedio: 13.9, compartilhamentosMedios: 1088, variacaoPercentual: -9.2 },
  { tema: "Infraestrutura", quantidadeConteudos: 2, alcanceMedio: 56837, engajamentoMedio: 11.8, compartilhamentosMedios: 1020, variacaoPercentual: 4.9 },
  { tema: "Emprego", quantidadeConteudos: 2, alcanceMedio: 21605, engajamentoMedio: 10.8, compartilhamentosMedios: 555, variacaoPercentual: -0.2 },
  { tema: "Fiscalização", quantidadeConteudos: 2, alcanceMedio: 40731, engajamentoMedio: 10.5, compartilhamentosMedios: 844, variacaoPercentual: 12.6 },
  { tema: "Ações comunitárias", quantidadeConteudos: 1, alcanceMedio: 14061, engajamentoMedio: 10.5, compartilhamentosMedios: 332, variacaoPercentual: -4.1 },
  { tema: "Institucional", quantidadeConteudos: 2, alcanceMedio: 20923, engajamentoMedio: 11.8, compartilhamentosMedios: 411, variacaoPercentual: 4.6 },
  { tema: "Bastidores", quantidadeConteudos: 2, alcanceMedio: 40733, engajamentoMedio: 12.3, compartilhamentosMedios: 794, variacaoPercentual: 12.6 },
]

export const mockFormatos: FormatoResumo[] = [
  { formato: "Reels", alcanceMedio: 63862, engajamentoMedio: 11.8, compartilhamentosMedios: 1096, salvamentosMedios: 2211 },
  { formato: "Carrossel", alcanceMedio: 36185, engajamentoMedio: 11, compartilhamentosMedios: 756, salvamentosMedios: 833 },
  { formato: "Imagem", alcanceMedio: 18421, engajamentoMedio: 11.2, compartilhamentosMedios: 418, salvamentosMedios: 492 },
  { formato: "Vídeo", alcanceMedio: 54046, engajamentoMedio: 12, compartilhamentosMedios: 1191, salvamentosMedios: 1285 },
]

export const mockHeatmap: HeatmapCelula[] = [
  { diaSemana: "Segunda-feira", horario: "8h", engajamentoMedio: 19 },
  { diaSemana: "Segunda-feira", horario: "10h", engajamentoMedio: 28 },
  { diaSemana: "Segunda-feira", horario: "12h", engajamentoMedio: 25 },
  { diaSemana: "Segunda-feira", horario: "14h", engajamentoMedio: 39 },
  { diaSemana: "Segunda-feira", horario: "16h", engajamentoMedio: 49 },
  { diaSemana: "Segunda-feira", horario: "18h", engajamentoMedio: 74 },
  { diaSemana: "Segunda-feira", horario: "20h", engajamentoMedio: 66 },
  { diaSemana: "Segunda-feira", horario: "22h", engajamentoMedio: 53 },
  { diaSemana: "Terça-feira", horario: "8h", engajamentoMedio: 50 },
  { diaSemana: "Terça-feira", horario: "10h", engajamentoMedio: 41 },
  { diaSemana: "Terça-feira", horario: "12h", engajamentoMedio: 55 },
  { diaSemana: "Terça-feira", horario: "14h", engajamentoMedio: 46 },
  { diaSemana: "Terça-feira", horario: "16h", engajamentoMedio: 49 },
  { diaSemana: "Terça-feira", horario: "18h", engajamentoMedio: 75 },
  { diaSemana: "Terça-feira", horario: "20h", engajamentoMedio: 71 },
  { diaSemana: "Terça-feira", horario: "22h", engajamentoMedio: 46 },
  { diaSemana: "Quarta-feira", horario: "8h", engajamentoMedio: 37 },
  { diaSemana: "Quarta-feira", horario: "10h", engajamentoMedio: 45 },
  { diaSemana: "Quarta-feira", horario: "12h", engajamentoMedio: 50 },
  { diaSemana: "Quarta-feira", horario: "14h", engajamentoMedio: 53 },
  { diaSemana: "Quarta-feira", horario: "16h", engajamentoMedio: 55 },
  { diaSemana: "Quarta-feira", horario: "18h", engajamentoMedio: 62 },
  { diaSemana: "Quarta-feira", horario: "20h", engajamentoMedio: 74 },
  { diaSemana: "Quarta-feira", horario: "22h", engajamentoMedio: 55 },
  { diaSemana: "Quinta-feira", horario: "8h", engajamentoMedio: 58 },
  { diaSemana: "Quinta-feira", horario: "10h", engajamentoMedio: 55 },
  { diaSemana: "Quinta-feira", horario: "12h", engajamentoMedio: 60 },
  { diaSemana: "Quinta-feira", horario: "14h", engajamentoMedio: 64 },
  { diaSemana: "Quinta-feira", horario: "16h", engajamentoMedio: 72 },
  { diaSemana: "Quinta-feira", horario: "18h", engajamentoMedio: 79 },
  { diaSemana: "Quinta-feira", horario: "20h", engajamentoMedio: 82 },
  { diaSemana: "Quinta-feira", horario: "22h", engajamentoMedio: 55 },
  { diaSemana: "Sexta-feira", horario: "8h", engajamentoMedio: 44 },
  { diaSemana: "Sexta-feira", horario: "10h", engajamentoMedio: 47 },
  { diaSemana: "Sexta-feira", horario: "12h", engajamentoMedio: 56 },
  { diaSemana: "Sexta-feira", horario: "14h", engajamentoMedio: 62 },
  { diaSemana: "Sexta-feira", horario: "16h", engajamentoMedio: 59 },
  { diaSemana: "Sexta-feira", horario: "18h", engajamentoMedio: 69 },
  { diaSemana: "Sexta-feira", horario: "20h", engajamentoMedio: 74 },
  { diaSemana: "Sexta-feira", horario: "22h", engajamentoMedio: 47 },
  { diaSemana: "Sábado", horario: "8h", engajamentoMedio: 43 },
  { diaSemana: "Sábado", horario: "10h", engajamentoMedio: 36 },
  { diaSemana: "Sábado", horario: "12h", engajamentoMedio: 40 },
  { diaSemana: "Sábado", horario: "14h", engajamentoMedio: 46 },
  { diaSemana: "Sábado", horario: "16h", engajamentoMedio: 47 },
  { diaSemana: "Sábado", horario: "18h", engajamentoMedio: 76 },
  { diaSemana: "Sábado", horario: "20h", engajamentoMedio: 59 },
  { diaSemana: "Sábado", horario: "22h", engajamentoMedio: 36 },
  { diaSemana: "Domingo", horario: "8h", engajamentoMedio: 38 },
  { diaSemana: "Domingo", horario: "10h", engajamentoMedio: 35 },
  { diaSemana: "Domingo", horario: "12h", engajamentoMedio: 41 },
  { diaSemana: "Domingo", horario: "14h", engajamentoMedio: 51 },
  { diaSemana: "Domingo", horario: "16h", engajamentoMedio: 48 },
  { diaSemana: "Domingo", horario: "18h", engajamentoMedio: 63 },
  { diaSemana: "Domingo", horario: "20h", engajamentoMedio: 73 },
  { diaSemana: "Domingo", horario: "22h", engajamentoMedio: 44 },
]

export const mockAudience: AudienceSummary = {
  seguidores: 58420,
  novosSeguidores: 1284, // crescimento líquido calculado por snapshots
  visitasPerfil: 24680,
  cliquesLink: 3142,
  contasAlcancadas: 1482300,
  contasEngajadas: 96410,
  faixaEtaria: [
    { faixa: "18–24", percentual: 14.2 },
    { faixa: "25–34", percentual: 31.6 },
    { faixa: "35–44", percentual: 26.8 },
    { faixa: "45–54", percentual: 17.1 },
    { faixa: "55+", percentual: 10.3 },
  ],
  genero: [
    { genero: "Mulheres", percentual: 54.3 },
    { genero: "Homens", percentual: 44.9 },
    { genero: "Não informado", percentual: 0.8 },
  ],
  // Localizações agregadas demonstrativas; não representa mapa completo por RA.
  regioes: [
    { cidade: "Brasília", percentual: 22.4 },
    { cidade: "Ceilândia", percentual: 17.8 },
    { cidade: "Taguatinga", percentual: 14.6 },
    { cidade: "Águas Claras", percentual: 11.2 },
    { cidade: "Samambaia", percentual: 9.4 },
    { cidade: "Sobradinho", percentual: 8.1 },
    { cidade: "Gama", percentual: 7.9 },
    { cidade: "Planaltina", percentual: 8.6 },
  ],
}

export const mockAlertas: AlertaItem[] = [
  { id: "alerta-1", texto: "Reel sobre mobilidade ultrapassou 180 mil visualizações.", tipo: "positivo" },
  { id: "alerta-2", texto: "Compartilhamentos cresceram 31% na semana.", tipo: "positivo" },
  { id: "alerta-3", texto: "Engajamento caiu nas publicações institucionais.", tipo: "atencao" },
  { id: "alerta-4", texto: "Melhor faixa histórica observada: 18h às 21h.", tipo: "neutro" },
]

export const mockStrategicInsights: StrategicInsight[] = [
  {
    id: "insight-1",
    categoria: "O que funcionou",
    texto: "Dado da Meta + análise do Radar: Reels gravados em campo tiveram alcance 37% superior à mediana.",
    prioridade: "Alta",
    status: "Novo",
  },
  {
    id: "insight-2",
    categoria: "O que funcionou",
    texto: "Conteúdos sobre fiscalização de obras geraram alto volume de compartilhamentos.",
    prioridade: "Média",
    status: "Em análise",
  },
  {
    id: "insight-3",
    categoria: "O que não funcionou",
    texto: "Artes estáticas institucionais tiveram menor quantidade de compartilhamentos.",
    prioridade: "Média",
    status: "Novo",
  },
  {
    id: "insight-4",
    categoria: "O que não funcionou",
    texto: "Publicações sem chamada para ação tiveram menor taxa de salvamento.",
    prioridade: "Baixa",
    status: "Descartado",
  },
  {
    id: "insight-5",
    categoria: "Oportunidade",
    texto: "Tema classificado pelo Radar: mobilidade possui alto desempenho e baixa frequência de publicação.",
    prioridade: "Alta",
    status: "Em análise",
  },
  {
    id: "insight-6",
    categoria: "Oportunidade",
    texto: "Vídeos de bastidores têm engajamento acima da média e custo de produção baixo.",
    prioridade: "Média",
    status: "Novo",
  },
  {
    id: "insight-7",
    categoria: "Ponto de atenção",
    texto: "Publicações estáticas tiveram queda de 18% no alcance médio.",
    prioridade: "Alta",
    status: "Em análise",
  },
  {
    id: "insight-8",
    categoria: "Recomendação",
    texto: "Criar uma série de três vídeos sobre transporte, integração e tempo de deslocamento no DF.",
    prioridade: "Alta",
    status: "Novo",
  },
  {
    id: "insight-9",
    categoria: "Recomendação",
    texto: "Produzir dois Reels curtos sobre transporte público e infraestrutura entre quinta-feira e domingo.",
    prioridade: "Alta",
    status: "Aplicado",
  },
  {
    id: "insight-10",
    categoria: "Teste sugerido",
    texto: "Comparar vídeos de 30 e 60 segundos sobre a mesma pauta.",
    prioridade: "Média",
    status: "Novo",
  },
]

// Insights individuais por conteúdo (chave = id da mídia em mockMedia.ts).
export const mockMediaInsights: Record<string, MediaInsight> = {
  "media-01": {
    mediaId: "media-01",
    medianaFormatoAlcance: 41000,
    razaoVsMediana: 1.62,
    insight: "Este Reel teve alcance 1,62 vez superior à mediana dos Reels publicados no período.",
    historico: [
      { hora: "0h", alcanceAcumulado: 4200, interacoesAcumuladas: 310 },
      { hora: "6h", alcanceAcumulado: 18900, interacoesAcumuladas: 1540 },
      { hora: "12h", alcanceAcumulado: 38200, interacoesAcumuladas: 3480 },
      { hora: "24h", alcanceAcumulado: 52100, interacoesAcumuladas: 5290 },
      { hora: "72h", alcanceAcumulado: 62776, interacoesAcumuladas: 6284 },
    ],
  },
  "media-04": {
    mediaId: "media-04",
    medianaFormatoAlcance: 41000,
    razaoVsMediana: 1.48,
    insight: "Conteúdo sobre a ciclovia inacabada superou a mediana dos Reels em compartilhamentos.",
    historico: [
      { hora: "0h", alcanceAcumulado: 3100, interacoesAcumuladas: 210 },
      { hora: "6h", alcanceAcumulado: 15400, interacoesAcumuladas: 1210 },
      { hora: "12h", alcanceAcumulado: 29800, interacoesAcumuladas: 2790 },
      { hora: "24h", alcanceAcumulado: 44700, interacoesAcumuladas: 4310 },
      { hora: "72h", alcanceAcumulado: 60700, interacoesAcumuladas: 5920 },
    ],
  },
}
