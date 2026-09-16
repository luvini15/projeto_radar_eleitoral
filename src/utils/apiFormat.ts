export const number = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('pt-BR', {maximumFractionDigits: 2})
export function apiTimestamp(value: string) {
  return new Date(/(?:Z|[+-]\d\d:\d\d)$/i.test(value) ? value : `${value}Z`).getTime()
}
export const date = (value: string | null) => value ? new Date(apiTimestamp(value)).toLocaleString('pt-BR') : '—'
