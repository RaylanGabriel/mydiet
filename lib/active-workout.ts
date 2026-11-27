'use client'

import { useSyncExternalStore } from 'react'

/**
 * Treino em andamento, visível em qualquer aba do app (barra no topo).
 * O progresso completo fica em `treino-em-andamento-<id>`; aqui só o resumo
 * que a barra precisa.
 */
export interface ActiveWorkout {
  workoutId: string
  nome: string
  startedAt: string
  doneCount: number
  totalCount: number
  /** Fim do descanso em andamento (ms desde epoch) */
  restEndsAt: number | null
}

const KEY = 'treino-ativo'
const EVENT = 'mydiet:treino-ativo'
/** Depois disso o treino é considerado abandonado e a barra some (o progresso continua salvo) */
const MAX_AGE_MS = 12 * 60 * 60 * 1000

let cachedRaw: string | null | undefined
let cachedValue: ActiveWorkout | null = null

function read(): ActiveWorkout | null {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return null
  }
  if (raw === cachedRaw) return cachedValue
  cachedRaw = raw
  try {
    const parsed = raw ? (JSON.parse(raw) as ActiveWorkout) : null
    cachedValue = parsed && Date.now() - new Date(parsed.startedAt).getTime() < MAX_AGE_MS ? parsed : null
  } catch {
    cachedValue = null
  }
  return cachedValue
}

export function setActiveWorkout(value: ActiveWorkout) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value))
  } catch {
    // Sem armazenamento: a barra só não aparece
  }
  window.dispatchEvent(new Event(EVENT))
}

/** Limpa só se o treino ativo for este (outro pode ter sido iniciado depois). */
export function clearActiveWorkout(workoutId?: string) {
  try {
    const current = read()
    if (workoutId && current && current.workoutId !== workoutId) return
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(callback: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === KEY) callback()
  }
  window.addEventListener(EVENT, callback)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener('storage', onStorage)
  }
}

export function useActiveWorkout(): ActiveWorkout | null {
  return useSyncExternalStore(subscribe, read, () => null)
}
