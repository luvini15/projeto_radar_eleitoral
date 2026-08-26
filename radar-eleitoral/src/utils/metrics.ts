import type { MediaItem, FormatoConteudo } from '@/types/instagram'

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value))
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')}mi`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace('.', ',')}mil`
  return formatNumber(value)
}

export function formatPercent(value: number, withSign = true): string {
  const sign = withSign && value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1).replace('.', ',')}%`
}

export function formatPP(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1).replace('.', ',')} p.p.`
}

export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function medianAlcancePorFormato(media: MediaItem[], formato: FormatoConteudo): number {
  return median(media.filter((m) => m.formato === formato).map((m) => m.alcance))
}

export function classificacaoBadgeVariant(classificacao: string) {
  switch (classificacao) {
    case 'Destaque':
      return 'positive'
    case 'Abaixo da média':
      return 'alert'
    default:
      return 'neutral'
  }
}

export function heatIntensityToColor(intensity: number): string {
  // 0-100 -> escala do azul principal, do mais claro ao mais intenso
  const clamped = Math.max(0, Math.min(100, intensity))
  const alpha = 0.08 + (clamped / 100) * 0.85
  return `rgba(37, 99, 235, ${alpha.toFixed(2)})`
}
