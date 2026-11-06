import type { Exercise } from './workout-types'

/** Campos de ritmo que cada tipo de cardio registra (além do tempo). */
export type CardioMetric = 'velocidade' | 'inclinacao' | 'nivel'

export const CARDIO_METRIC_INFO: Record<CardioMetric, { label: string; short: string; unit: string; step: number; max: number }> = {
  velocidade: { label: 'Velocidade', short: 'km/h', unit: 'km/h', step: 0.1, max: 40 },
  inclinacao: { label: 'Inclinação', short: 'Incl. %', unit: '%', step: 0.5, max: 30 },
  nivel: { label: 'Nível', short: 'Nível', unit: '', step: 1, max: 99 },
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export function isCardio(exercise: Pick<Exercise, 'grupo_muscular'>) {
  return exercise.grupo_muscular === 'Cardio'
}

/**
 * Quais campos de ritmo fazem sentido para o aparelho:
 * - esteira: velocidade + inclinação
 * - caminhada/corrida ao ar livre: velocidade média
 * - pular corda: só o tempo
 * - escada, bicicleta, elíptico, remo, spinning e outros: nível
 */
export function cardioMetrics(exercise: Pick<Exercise, 'nome' | 'grupo_muscular'>): CardioMetric[] {
  if (!isCardio(exercise)) return []
  const nome = normalize(exercise.nome)
  if (nome.includes('esteira')) return ['velocidade', 'inclinacao']
  if (nome.includes('corrida') || nome.includes('caminhada')) return ['velocidade']
  if (nome.includes('corda')) return []
  return ['nivel']
}

/** Dica de onde achar o número no aparelho, exibida no treino. */
export function cardioHint(metrics: CardioMetric[]) {
  if (metrics.includes('velocidade') && metrics.includes('inclinacao')) return 'Anote a velocidade e a inclinação que aparecem no painel da esteira.'
  if (metrics.includes('velocidade')) return 'Anote a velocidade média do seu relógio ou app (km/h).'
  if (metrics.includes('nivel')) return 'Anote o nível (resistência) que aparece no painel do aparelho.'
  return null
}

/** Extrai os minutos de textos como "20 min", "30-40 min ritmo moderado" ou "1 min". */
export function parseMinutes(text: string | null | undefined): number | null {
  if (!text) return null
  const match = text.replace(',', '.').match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}

const num = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',')

/** "20 min · 6,5 km/h · 3%" ou "15 min · nível 8" */
export function formatCardio(values: {
  duracao_min?: number | null
  velocidade_kmh?: number | null
  inclinacao_pct?: number | null
  nivel?: number | null
}) {
  const parts: string[] = []
  if (values.duracao_min != null) parts.push(`${num(Number(values.duracao_min))} min`)
  if (values.velocidade_kmh != null) parts.push(`${num(Number(values.velocidade_kmh))} km/h`)
  if (values.inclinacao_pct != null) parts.push(`${num(Number(values.inclinacao_pct))}%`)
  if (values.nivel != null) parts.push(`nível ${num(Number(values.nivel))}`)
  return parts.join(' · ')
}
