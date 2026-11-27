'use client'

import useSWR, { mutate as globalMutate } from 'swr'
import { createClient } from '@/lib/supabase/client'
import { getUserId } from '@/lib/supabase/get-user-id'
import type { Meal, MealItem, FoodOption, MealType } from '@/lib/types'

export type MealWithItems = Meal & { 
  items: (MealItem & { options: FoodOption[] })[] 
}

async function fetchMeals(date: string): Promise<MealWithItems[]> {
  const supabase = createClient()
  
  const { data: meals, error: mealsError } = await supabase
    .from('meals')
    .select('*')
    .eq('data', date)
    .order('ordem', { ascending: true })
    .order('horario', { ascending: true })

  if (mealsError) throw mealsError
  if (!meals || meals.length === 0) return []

  const mealIds = meals.map(m => m.id)

  const { data: items, error: itemsError } = await supabase
    .from('meal_items')
    .select('*')
    .in('meal_id', mealIds)
    .order('ordem', { ascending: true })

  if (itemsError) throw itemsError

  const itemIds = items?.map(i => i.id) || []

  let options: FoodOption[] = []
  if (itemIds.length > 0) {
    const { data: optionsData, error: optionsError } = await supabase
      .from('food_options')
      .select('*')
      .in('meal_item_id', itemIds)

    if (optionsError) throw optionsError
    options = optionsData || []
  }

  return meals.map(meal => ({
    ...meal,
    items: (items || [])
      .filter(item => item.meal_id === meal.id)
      .map(item => ({
        ...item,
        options: options.filter(opt => opt.meal_item_id === item.id)
      }))
  }))
}

/** Uma refeição com os itens, para abrir no formulário de edição. */
export async function fetchMeal(id: string): Promise<(Meal & { items: MealItem[] }) | null> {
  const supabase = createClient()
  const { data: meal, error } = await supabase.from('meals').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!meal) return null
  const { data: items, error: itemsError } = await supabase
    .from('meal_items')
    .select('*')
    .eq('meal_id', id)
    .order('ordem', { ascending: true })
  if (itemsError) throw itemsError
  return { ...meal, items: items ?? [] }
}

export interface MealItemDraft {
  /** id em `meal_items` quando o item já existe (edição) */
  dbId?: string
  nome: string
  quantidade: string
  calorias: number
  proteina: number
  carboidratos: number
  gordura: number
}

export interface MealDraft {
  /** Presente ao editar uma refeição existente */
  id?: string
  data: string
  tipo: MealType
  nome: string
  horario: string
  ordem: number
  items: MealItemDraft[]
}

/**
 * Cria ou atualiza uma refeição. Na edição, atualiza os itens que continuam,
 * insere os novos e apaga os removidos, então os totais do dia são
 * recalculados com os valores novos.
 */
export async function saveMeal(draft: MealDraft): Promise<string> {
  const supabase = createClient()
  const userId = await getUserId()
  if (!userId) throw new Error('Sessão expirada')

  const itemRow = (item: MealItemDraft, ordem: number) => ({
    nome: item.nome.trim(),
    quantidade: item.quantidade,
    calorias: Math.round(item.calorias),
    proteina: item.proteina,
    carboidratos: item.carboidratos,
    gordura: item.gordura,
    ordem,
  })
  const items = draft.items.filter((item) => item.nome.trim() !== '')

  let mealId = draft.id
  if (mealId) {
    const { error } = await supabase
      .from('meals')
      .update({
        nome: draft.nome,
        horario: draft.horario,
        tipo: draft.tipo,
        ordem: draft.ordem,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mealId)
    if (error) throw error

    const { data: existing, error: existingError } = await supabase.from('meal_items').select('id').eq('meal_id', mealId)
    if (existingError) throw existingError
    const keep = new Set(items.map((item) => item.dbId).filter(Boolean))
    const removed = (existing ?? []).map((row) => row.id as string).filter((id) => !keep.has(id))
    if (removed.length > 0) {
      const { error: deleteError } = await supabase.from('meal_items').delete().in('id', removed)
      if (deleteError) throw deleteError
    }

    for (const [ordem, item] of items.entries()) {
      if (!item.dbId) continue
      const { error: updateError } = await supabase
        .from('meal_items')
        .update({ ...itemRow(item, ordem), updated_at: new Date().toISOString() })
        .eq('id', item.dbId)
      if (updateError) throw updateError
    }
  } else {
    const { data: meal, error } = await supabase
      .from('meals')
      .insert({
        user_id: userId,
        nome: draft.nome,
        horario: draft.horario,
        data: draft.data,
        tipo: draft.tipo,
        concluida: false,
        ordem: draft.ordem,
      })
      .select('id')
      .single()
    if (error) throw error
    mealId = meal.id as string
  }

  const novos = items
    .map((item, ordem) => ({ item, ordem }))
    .filter(({ item }) => !item.dbId)
    .map(({ item, ordem }) => ({ ...itemRow(item, ordem), meal_id: mealId, user_id: userId }))
  if (novos.length > 0) {
    const { error: insertError } = await supabase.from('meal_items').insert(novos)
    if (insertError) throw insertError
  }

  await globalMutate(['meals', draft.data])
  return mealId!
}

export function useMeals(date: string) {
  const { data, error, isLoading, mutate } = useSWR(
    ['meals', date],
    () => fetchMeals(date),
    {
      revalidateOnFocus: false,
    }
  )

  const toggleMealComplete = async (mealId: string, concluida: boolean) => {
    const supabase = createClient()
    
    await supabase
      .from('meals')
      .update({ concluida, updated_at: new Date().toISOString() })
      .eq('id', mealId)

    mutate()
  }

  const deleteMeal = async (mealId: string) => {
    const supabase = createClient()
    
    // Delete will cascade to meal_items and food_options
    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', mealId)

    if (error) throw error

    await mutate()
  }

  const selectFoodOption = async (itemId: string, optionId: string) => {
    const supabase = createClient()
    
    // First, get the option details
    const { data: option } = await supabase
      .from('food_options')
      .select('*')
      .eq('id', optionId)
      .single()

    if (!option) return

    // Update the meal item with the option's values
    await supabase
      .from('meal_items')
      .update({
        nome: option.nome,
        quantidade: option.quantidade,
        calorias: option.calorias,
        proteina: option.proteina,
        carboidratos: option.carboidratos,
        gordura: option.gordura,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)

    // Mark this option as active, others as inactive
    await supabase
      .from('food_options')
      .update({ is_active: false })
      .eq('meal_item_id', itemId)

    await supabase
      .from('food_options')
      .update({ is_active: true })
      .eq('id', optionId)

    mutate()
  }

  const totals = (data || []).reduce(
    (acc, meal) => {
      meal.items.forEach((item) => {
        acc.calorias += item.calorias
        acc.proteina += item.proteina || 0
        acc.carboidratos += item.carboidratos || 0
        acc.gordura += item.gordura || 0
      })
      return acc
    },
    { calorias: 0, proteina: 0, carboidratos: 0, gordura: 0 }
  )

  return {
    meals: data || [],
    totals,
    isLoading,
    error,
    toggleMealComplete,
    deleteMeal,
    selectFoodOption,
    mutate,
  }
}
