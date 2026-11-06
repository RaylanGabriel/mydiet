// Utilitários de data no fuso LOCAL do usuário.
// Evite `toISOString().split('T')[0]`: ele usa UTC e, no Brasil (UTC-3),
// depois das 21h já retorna o dia seguinte.

/** Retorna a data no formato YYYY-MM-DD usando o fuso local. */
export function toLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Converte YYYY-MM-DD em Date local (meio-dia, para evitar problemas de horário de verão). */
export function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

/** Soma (ou subtrai) dias de uma data YYYY-MM-DD. */
export function addDays(value: string, days: number): string {
  const date = parseLocalDate(value)
  date.setDate(date.getDate() + days)
  return toLocalDateString(date)
}

const weekdays = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado']

/** Rótulo amigável: "Hoje", "Ontem" ou o dia da semana. */
export function formatDayLabel(value: string, today: string = toLocalDateString()): string {
  if (value === today) return 'Hoje'
  if (value === addDays(today, -1)) return 'Ontem'
  return weekdays[parseLocalDate(value).getDay()]
}

/** Data curta: "6/11" (ou "6/11/2025" se for de outro ano). */
export function formatShortDate(value: string, today: string = toLocalDateString()): string {
  const date = parseLocalDate(value)
  const base = `${date.getDate()}/${date.getMonth() + 1}`
  return value.slice(0, 4) === today.slice(0, 4) ? base : `${base}/${date.getFullYear()}`
}
