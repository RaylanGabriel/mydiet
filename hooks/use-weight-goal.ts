'use client'

import useSWR, { mutate as globalMutate } from 'swr'
import { createClient } from '@/lib/supabase/client'
import { getUserId } from '@/lib/supabase/get-user-id'
import { toLocalDateString } from '@/lib/date'
import type { WeightGoal, WeightLog } from '@/lib/weight-goal'

interface WeightGoalData {
  activeGoal: WeightGoal | null
  logs: WeightLog[]
  conquistas: number
}

async function requireUserId() {
  const userId = await getUserId()
  if (!userId) throw new Error('Usuário não autenticado')
  return userId
}

/** Erro amigável quando as tabelas do script 007 ainda não existem. */
function friendly(error: { message?: string; code?: string }) {
  const msg = error.message ?? ''
  if (error.code === '42P01' || error.code === 'PGRST205' || /weight_(goals|logs)/.test(msg)) {
    const e = new Error('Execute o script scripts/007_weight_goals.sql no SQL Editor do Supabase para ativar as metas de peso.')
    e.name = 'MissingMigration'
    return e
  }
  return error instanceof Error ? error : new Error(msg || 'Erro inesperado')
}

async function fetchWeightGoal(): Promise<WeightGoalData> {
  const userId = await requireUserId()
  const supabase = createClient()

  const [goalRes, logsRes, doneRes] = await Promise.all([
    supabase.from('weight_goals').select('*').eq('user_id', userId).eq('status', 'ativa').maybeSingle(),
    supabase.from('weight_logs').select('id, data, peso_kg').eq('user_id', userId).order('data', { ascending: false }).limit(400), // ~1 ano+ de pesagens diárias, para o gráfico
    supabase.from('weight_goals').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'concluida'),
  ])
  if (goalRes.error) throw friendly(goalRes.error)
  if (logsRes.error) throw friendly(logsRes.error)
  if (doneRes.error) throw friendly(doneRes.error)

  return {
    activeGoal: goalRes.data
      ? { ...goalRes.data, peso_inicial_kg: Number(goalRes.data.peso_inicial_kg), peso_meta_kg: Number(goalRes.data.peso_meta_kg) }
      : null,
    logs: (logsRes.data ?? []).map((l) => ({ ...l, peso_kg: Number(l.peso_kg) })),
    conquistas: doneRes.count ?? 0,
  }
}

export function useWeightGoal() {
  const { data, error, isLoading, mutate } = useSWR('weight-goal', fetchWeightGoal, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  const createGoal = async (pesoAtual: number, pesoMeta: number) => {
    const userId = await requireUserId()
    const supabase = createClient()
    // Garante uma única meta ativa
    const { error: cancelError } = await supabase
      .from('weight_goals')
      .update({ status: 'cancelada' })
      .eq('user_id', userId)
      .eq('status', 'ativa')
    if (cancelError) throw friendly(cancelError)

    const { error: insertError } = await supabase.from('weight_goals').insert({
      user_id: userId,
      peso_inicial_kg: pesoAtual,
      peso_meta_kg: pesoMeta,
    })
    if (insertError) throw friendly(insertError)
    await mutate()
  }

  const cancelGoal = async (goalId: string) => {
    const { error: updateError } = await createClient()
      .from('weight_goals')
      .update({ status: 'cancelada' })
      .eq('id', goalId)
    if (updateError) throw friendly(updateError)
    await mutate()
  }

  const completeGoal = async (goalId: string) => {
    const { error: updateError } = await createClient()
      .from('weight_goals')
      .update({ status: 'concluida', concluido_em: new Date().toISOString() })
      .eq('id', goalId)
      .eq('status', 'ativa')
    if (updateError) throw friendly(updateError)
    await mutate()
  }

  /**
   * Registra a pesagem de hoje. Por padrão também atualiza o peso do perfil,
   * o que recalcula a dieta e o treino do plano.
   */
  const logWeight = async (pesoKg: number, options: { updateProfile?: boolean } = {}) => {
    const userId = await requireUserId()
    const supabase = createClient()
    const peso = Math.round(pesoKg * 10) / 10

    const { error: logError } = await supabase
      .from('weight_logs')
      .upsert({ user_id: userId, data: toLocalDateString(), peso_kg: peso }, { onConflict: 'user_id,data' })
    if (logError) throw friendly(logError)

    if (options.updateProfile !== false) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ peso_kg: peso, updated_at: new Date().toISOString() })
        .eq('id', userId)
      if (profileError) throw profileError
      await globalMutate('profile')
    }
    await mutate()
  }

  return {
    activeGoal: data?.activeGoal ?? null,
    logs: data?.logs ?? [],
    conquistas: data?.conquistas ?? 0,
    error: error as Error | undefined,
    isLoading,
    createGoal,
    cancelGoal,
    completeGoal,
    logWeight,
  }
}
