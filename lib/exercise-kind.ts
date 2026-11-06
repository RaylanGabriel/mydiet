import type { Exercise } from './workout-types'
import { isCardio } from './cardio'

/**
 * Como cada exercício é registrado:
 * - carga:         repetições + kg (padrão)
 * - peso_corporal: repetições + carga EXTRA opcional (barra fixa, flexão, paralelas...)
 * - tempo:         segundos de sustentação (prancha, isometrias)
 * - cardio:        minutos + ritmo (ver lib/cardio.ts)
 */
export type ExerciseKind = 'carga' | 'peso_corporal' | 'tempo' | 'cardio'

const normalize = (s: string | null | undefined) =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const TEMPO = /prancha|isometri|wall sit|cadeirinha|hollow|dead hang|suspensao na barra/
const PESO_CORPORAL = /barra fixa|flexao|paralelas?\b|mergulho|abdominal supra|abdominal infra|elevacao de pernas|burpee|perdigueiro/
// Versões em máquina/polia/assistidas usam carga normal
const COM_EQUIPAMENTO = /assistid|maquina|polia|smith|graviton/

export function exerciseKind(exercise: Pick<Exercise, 'nome' | 'grupo_muscular' | 'equipamento'>): ExerciseKind {
  if (isCardio(exercise)) return 'cardio'
  const nome = normalize(exercise.nome)
  if (TEMPO.test(nome)) return 'tempo'
  if (COM_EQUIPAMENTO.test(nome)) return 'carga'
  if (normalize(exercise.equipamento) === 'peso corporal' || PESO_CORPORAL.test(nome)) return 'peso_corporal'
  return 'carga'
}

/** Extrai os segundos de textos como "30-45 s", "20-30 s cada lado" ou "60". */
export function parseSeconds(text: string | null | undefined): number | null {
  if (!text) return null
  const match = text.match(/(\d+)/)
  return match ? Number(match[1]) : null
}

export function formatSeconds(total: number) {
  if (total < 60) return `${total} s`
  const m = Math.floor(total / 60)
  const s = total % 60
  return s ? `${m} min ${s} s` : `${m} min`
}
