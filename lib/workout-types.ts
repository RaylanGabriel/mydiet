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
  descanso_segundos: number
  observacoes: string | null
  ordem: number
  exercise: Exercise
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
  workout?: { id: string; nome: string; capa_url: string | null } | null
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

const SEGUNDOS_POR_SERIE = 40

export function estimateWorkoutMinutes(exercises: WorkoutExercise[]) {
  const totalSeconds = exercises.reduce(
    (sum, ex) => sum + ex.series * (SEGUNDOS_POR_SERIE + ex.descanso_segundos),
    0,
  )
  return Math.max(0, Math.round(totalSeconds / 60))
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
