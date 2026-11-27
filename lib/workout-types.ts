export interface Exercise {
  id: string
  user_id: string | null
  nome: string
  grupo_muscular: string
  equipamento: string | null
  video_url: string | null
  instrucoes: string | null
}

export interface WorkoutExercise {
  id: string
  workout_id: string
  exercise_id: string
  series: number
  repeticoes: string
  carga_kg: number | null
  cargas_por_serie: (number | null)[] | null
  descanso_segundos: number
  observacoes: string | null
  ordem: number
  /** Ritmo alvo do cardio (script 008). Ausente antes da migração. */
  velocidade_kmh?: number | null
  inclinacao_pct?: number | null
  nivel?: number | null
  exercise: Exercise
}

export function getWorkoutExerciseLoads(item: WorkoutExercise) {
  return Array.from({ length: item.series }, (_, index) =>
    item.cargas_por_serie && index < item.cargas_por_serie.length
      ? item.cargas_por_serie[index]
      : item.carga_kg,
  )
}

export interface Workout {
  id: string
  user_id: string
  nome: string
  descricao: string | null
  dias_semana: number[]
  ordem: number
  capa_url: string | null
  created_at: string
  workout_exercises: WorkoutExercise[]
}

export const COVER_PRESETS = [
  { url: '/covers/peito.png', label: 'Peito e tríceps' },
  { url: '/covers/costas.png', label: 'Costas e bíceps' },
  { url: '/covers/pernas.png', label: 'Pernas' },
  { url: '/covers/ombros.png', label: 'Ombros' },
] as const

export function workoutLetter(nome: string) {
  return nome.replace(/^treino\s*/i, '').charAt(0).toUpperCase() || 'T'
}

export interface WorkoutSession {
  id: string
  workout_id: string | null
  workout_nome: string
  iniciado_em: string
  finalizado_em: string
  duracao_segundos: number
  volume_total_kg: number
  series_concluidas: number
  session_sets?: WorkoutSessionSet[]
  workout?: { id: string; nome: string; capa_url: string | null } | null
}

export interface WorkoutSessionSet {
  id: string
  session_id: string
  exercise_id: string
  exercise_nome: string
  serie_numero: number
  repeticoes: number
  carga_kg: number | null
  /** Exercícios por tempo (script 009) */
  duracao_seg?: number | null
  /** Cardio (script 008) */
  duracao_min?: number | null
  velocidade_kmh?: number | null
  inclinacao_pct?: number | null
  nivel?: number | null
}

export const GRUPOS_MUSCULARES = [
  'Peito',
  'Costas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Pernas',
  'Glúteos',
  'Panturrilha',
  'Abdômen',
  'Cardio',
] as const

export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const

// ---- Duração estimada (a mesma conta no plano e nos treinos salvos) ----

export const AQUECIMENTO_MIN = 5
/** Execução de uma série com repetições */
const SEG_POR_SERIE = 40
/** Preparar o aparelho / trocar de exercício */
const SEG_TRANSICAO = 45

export interface DurationItem {
  series: number
  repeticoes: string
  descanso_segundos: number
  /** Cardio: a duração vem do campo de repetições (ex.: "20 min" ou só "20") */
  cardio: boolean
}

/** Média de uma faixa ("15-20 min" → 17,5) ou o primeiro número */
export function rangeAvg(text: string): number {
  const nums = (text.replace(',', '.').match(/\d+(?:\.\d+)?/g) ?? []).map(Number)
  if (nums.length === 0) return 0
  return nums.length > 1 && /\d\s*-\s*\d/.test(text) ? (nums[0] + nums[1]) / 2 : nums[0]
}

function itemSeconds(ex: DurationItem): number {
  const r = ex.repeticoes
  let trabalho: number
  if (ex.cardio || /min/.test(r)) trabalho = rangeAvg(r) * 60
  else if (/\d\s*s\b/.test(r)) trabalho = rangeAvg(r) * (/cada lado/.test(r) ? 2 : 1)
  else trabalho = SEG_POR_SERIE
  // Sem descanso depois da última série
  return ex.series * trabalho + Math.max(0, ex.series - 1) * ex.descanso_segundos + SEG_TRANSICAO
}

/** Minutos da sessão, incluindo 5 min de aquecimento */
export function estimateMinutes(items: DurationItem[]): number {
  if (items.length === 0) return 0
  return Math.round(AQUECIMENTO_MIN + items.reduce((sum, ex) => sum + itemSeconds(ex), 0) / 60)
}

export function estimateWorkoutMinutes(exercises: WorkoutExercise[]) {
  return estimateMinutes(
    exercises.map((ex) => ({
      series: ex.series,
      repeticoes: ex.repeticoes,
      descanso_segundos: ex.descanso_segundos,
      cardio: ex.exercise?.grupo_muscular === 'Cardio',
    })),
  )
}

export function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function muscleGroupsOf(exercises: WorkoutExercise[]) {
  return Array.from(new Set(exercises.map((ex) => ex.exercise.grupo_muscular)))
}
