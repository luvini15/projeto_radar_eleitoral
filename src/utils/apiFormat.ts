export const number = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('pt-BR', {maximumFractionDigits: 2})
export const date = (value: string | null) => value ? new Date(value).toLocaleString('pt-BR') : '—'
