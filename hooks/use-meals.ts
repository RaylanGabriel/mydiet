'use client'

import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import type { Meal, MealItem, FoodOption } from '@/lib/types'

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
