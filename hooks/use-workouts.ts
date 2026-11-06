'use client'

import useSWR, { mutate as globalMutate } from 'swr'
import { createClient } from '@/lib/supabase/client'
import { getUserId } from '@/lib/supabase/get-user-id'
import type { Exercise, Workout, WorkoutExercise, WorkoutSession } from '@/lib/workout-types'
import type { PlanWorkout } from '@/lib/fitness-plan'

const COVER_BUCKET = 'workout-covers'
const MAX_COVER_BYTES = 5 * 1024 * 1024
const ALLOWED_COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function revalidateMonthSessions() {
  return globalMutate((key) => Array.isArray(key) && key[0] === 'month-sessions')
}

async function fetchMonthSessions(year: number, month: number): Promise<WorkoutSession[]> {
  const supabase = createClient()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 1)
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*, workout:workouts(id, nome, capa_url), session_sets(*)')
    .gte('iniciado_em', start.toISOString())
    .lt('iniciado_em', end.toISOString())
    .order('iniciado_em')
  if (error) throw error
  return data as WorkoutSession[]
}

export function useMonthSessions(year: number, month: number) {
  const { data, error, isLoading } = useSWR(['month-sessions', year, month], () =>
    fetchMonthSessions(year, month),
  )
  return { sessions: data ?? [], error, isLoading }
}

const WORKOUT_SELECT = '*, workout_exercises(*, exercise:exercises(*))'

async function requireUserId() {
  const userId = await getUserId()
  if (!userId) throw new Error('Usuário não autenticado')
  return userId
}

function sortExercises(workout: Workout): Workout {
  return {
    ...workout,
    workout_exercises: [...(workout.workout_exercises ?? [])].sort((a, b) => a.ordem - b.ordem),
  }
}

async function fetchWorkouts(): Promise<Workout[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('workouts')
    .select(WORKOUT_SELECT)
    .order('ordem')
    .order('created_at')
  if (error) throw error
  return (data as Workout[]).map(sortExercises)
}

async function fetchWorkout(id: string): Promise<Workout | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('workouts')
    .select(WORKOUT_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? sortExercises(data as Workout) : null
}

async function fetchExercises(): Promise<Exercise[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('grupo_muscular')
    .order('nome')
  if (error) throw error
  return data as Exercise[]
}

async function fetchSessions(): Promise<WorkoutSession[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .order('iniciado_em', { ascending: false })
    .limit(30)
  if (error) throw error
  return data as WorkoutSession[]
}

export function useWorkouts() {
  const { data, error, isLoading, mutate } = useSWR('workouts', fetchWorkouts)

  const createWorkout = async (input: { nome: string; descricao?: string; dias_semana: number[] }) => {
    const userId = await requireUserId()
    const supabase = createClient()
    const { data: created, error: insertError } = await supabase
      .from('workouts')
      .insert({
        user_id: userId,
        nome: input.nome,
        descricao: input.descricao || null,
        dias_semana: input.dias_semana,
        ordem: data?.length ?? 0,
      })
      .select('id')
      .single()
    if (insertError) throw insertError
    await mutate()
    return created.id as string
  }

  /** Cria os treinos do plano. Retorna os exercícios que não existem na biblioteca e foram ignorados. */
  const createFromPlan = async (planWorkouts: PlanWorkout[]): Promise<string[]> => {
    const userId = await requireUserId()
    const supabase = createClient()
    const names = Array.from(new Set(planWorkouts.flatMap((w) => w.exercicios.map((ex) => ex.nome))))
    const { data: library, error: libraryError } = await supabase
      .from('exercises')
      .select('id, nome')
      .is('user_id', null)
      .in('nome', names)
    if (libraryError) throw libraryError
    const idByName = new Map((library ?? []).map((ex) => [ex.nome as string, ex.id as string]))
    const missing = names.filter((nome) => !idByName.has(nome))

    const baseOrder = data?.length ?? 0
    for (const [i, planWorkout] of planWorkouts.entries()) {
      const { data: created, error: insertError } = await supabase
        .from('workouts')
        .insert({
          user_id: userId,
          nome: `${planWorkout.nome} - ${planWorkout.foco}`,
          descricao: 'Criado pelo plano sugerido',
          dias_semana: planWorkout.dias_semana,
          ordem: baseOrder + i,
        })
        .select('id')
        .single()
      if (insertError) throw insertError

      const rows = planWorkout.exercicios
        .filter((ex) => idByName.has(ex.nome))
        .map((ex, ordem) => ({
          workout_id: created.id,
          user_id: userId,
          exercise_id: idByName.get(ex.nome),
          series: ex.series,
          repeticoes: ex.repeticoes,
          descanso_segundos: ex.descanso_segundos,
          ordem,
        }))
      if (rows.length > 0) {
        const { error: exercisesError } = await supabase.from('workout_exercises').insert(rows)
        if (exercisesError) throw exercisesError
      }
    }
    await mutate()
    return missing
  }

  return { workouts: data ?? [], error, isLoading, mutate, createWorkout, createFromPlan }
}

export function useWorkout(id: string) {
  const { data, error, isLoading, mutate } = useSWR(['workout', id], () => fetchWorkout(id))

  const updateWorkout = async (
    updates: Partial<Pick<Workout, 'nome' | 'descricao' | 'dias_semana' | 'capa_url'>>,
  ) => {
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('workouts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (updateError) throw updateError
    await Promise.all([mutate(), globalMutate('workouts')])
  }

  const uploadCover = async (file: File) => {
    if (!ALLOWED_COVER_TYPES.includes(file.type)) throw new Error('Use uma imagem JPG, PNG ou WEBP.')
    if (file.size > MAX_COVER_BYTES) throw new Error('A imagem deve ter no máximo 5 MB.')
    const userId = await requireUserId()
    const supabase = createClient()
    const ext = file.type.split('/')[1]
    const path = `${userId}/${id}-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from(COVER_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: true })
    if (uploadError) {
      if (uploadError.message.toLowerCase().includes('row-level security')) {
        throw new Error('O Supabase bloqueou o envio da capa. Execute o script scripts/002_workout_cover_storage.sql no SQL Editor do Supabase para configurar as permissões do bucket.')
      }
      throw uploadError
    }
    const { data: publicUrl } = supabase.storage.from(COVER_BUCKET).getPublicUrl(path)
    await updateWorkout({ capa_url: publicUrl.publicUrl })
  }

  const deleteWorkout = async () => {
    const supabase = createClient()
    const { error: deleteError } = await supabase.from('workouts').delete().eq('id', id)
    if (deleteError) throw deleteError
  }

  const addExercise = async (exercise: Exercise) => {
    const userId = await requireUserId()
    const supabase = createClient()
    const isCardio = exercise.grupo_muscular === 'Cardio'
    const { error: insertError } = await supabase.from('workout_exercises').insert({
      workout_id: id,
      user_id: userId,
      exercise_id: exercise.id,
      series: isCardio ? 1 : 3,
      repeticoes: isCardio ? '20 min' : '12',
      descanso_segundos: isCardio ? 0 : 60,
      ordem: data?.workout_exercises.length ?? 0,
    })
    if (insertError) throw insertError
    await mutate()
  }

  const updateExercise = async (
    workoutExerciseId: string,
    updates: Partial<Pick<WorkoutExercise, 'series' | 'repeticoes' | 'carga_kg' | 'cargas_por_serie' | 'descanso_segundos' | 'observacoes'>>,
  ) => {
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('workout_exercises')
      .update(updates)
      .eq('id', workoutExerciseId)
    if (updateError) throw updateError
    await mutate()
  }

  const moveExercise = async (workoutExerciseId: string, direction: -1 | 1) => {
    if (!data) return
    const list = [...data.workout_exercises]
    const index = list.findIndex((ex) => ex.id === workoutExerciseId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= list.length) return
    ;[list[index], list[target]] = [list[target], list[index]]
    const reordered = list.map((ex, i) => ({ ...ex, ordem: i }))
    await mutate({ ...data, workout_exercises: reordered }, { revalidate: false })
    const supabase = createClient()
    await Promise.all(
      reordered.map((ex) => supabase.from('workout_exercises').update({ ordem: ex.ordem }).eq('id', ex.id)),
    )
    await mutate()
  }

  const removeExercise = async (workoutExerciseId: string) => {
    const supabase = createClient()
    const { error: deleteError } = await supabase
      .from('workout_exercises')
      .delete()
      .eq('id', workoutExerciseId)
    if (deleteError) throw deleteError
    await mutate()
  }

  return {
    workout: data,
    error,
    isLoading,
    mutate,
    updateWorkout,
    uploadCover,
    deleteWorkout,
    addExercise,
    updateExercise,
    moveExercise,
    removeExercise,
  }
}

export function useExerciseLibrary() {
  const { data, error, isLoading, mutate } = useSWR('exercise-library', fetchExercises, {
    revalidateOnFocus: false,
  })

  const createExercise = async (input: {
    nome: string
    grupo_muscular: string
    equipamento?: string
    video_url?: string
    instrucoes?: string
  }) => {
    const userId = await requireUserId()
    const supabase = createClient()
    const { data: created, error: insertError } = await supabase
      .from('exercises')
      .insert({
        user_id: userId,
        nome: input.nome,
        grupo_muscular: input.grupo_muscular,
        equipamento: input.equipamento || null,
        video_url: input.video_url || null,
        instrucoes: input.instrucoes || null,
      })
      .select('*')
      .single()
    if (insertError) throw insertError
    await mutate()
    return created as Exercise
  }

  return { exercises: data ?? [], error, isLoading, createExercise }
}

export interface CompletedSet {
  exercise_id: string
  exercise_nome: string
  serie_numero: number
  repeticoes: number
  carga_kg: number | null
}

export function useWorkoutSessions() {
  const { data, error, isLoading, mutate } = useSWR('workout-sessions', fetchSessions)

  const saveSession = async (input: {
    workout_id: string
    workout_nome: string
    iniciado_em: string
    sets: CompletedSet[]
  }) => {
    const userId = await requireUserId()
    const supabase = createClient()
    const finalizadoEm = new Date()
    const duracao = Math.round((finalizadoEm.getTime() - new Date(input.iniciado_em).getTime()) / 1000)
    const volume = input.sets.reduce((sum, set) => sum + set.repeticoes * (set.carga_kg ?? 0), 0)

    const { data: session, error: sessionError } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: userId,
        workout_id: input.workout_id,
        workout_nome: input.workout_nome,
        iniciado_em: input.iniciado_em,
        finalizado_em: finalizadoEm.toISOString(),
        duracao_segundos: duracao,
        volume_total_kg: volume,
        series_concluidas: input.sets.length,
      })
      .select('id')
      .single()
    if (sessionError) throw sessionError

    if (input.sets.length > 0) {
      const { error: setsError } = await supabase.from('session_sets').insert(
        input.sets.map((set) => ({ ...set, session_id: session.id, user_id: userId })),
      )
      if (setsError) throw setsError
    }

    await Promise.all([mutate(), revalidateMonthSessions()])
  }

  const deleteSession = async (sessionId: string) => {
    const supabase = createClient()
    const { error: deleteError } = await supabase.from('workout_sessions').delete().eq('id', sessionId)
    if (deleteError) throw deleteError
    await Promise.all([mutate(), revalidateMonthSessions()])
  }

  return { sessions: data ?? [], error, isLoading, saveSession, deleteSession }
}
