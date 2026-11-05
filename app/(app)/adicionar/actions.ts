'use server'

import { z } from 'zod'

const querySchema = z.string().trim().min(2).max(80)
const FATSECRET_TOKEN_URL = 'https://oauth.fatsecret.com/connect/token'
const FATSECRET_API_URL = 'https://platform.fatsecret.com/rest/server.api'

type FatSecretServing = {
  serving_description?: string
  serving_metric_amount?: string
  serving_metric_unit?: string
  calories?: string
  protein?: string
  carbohydrate?: string
  fat?: string
}

type FatSecretFood = {
  food_id?: string
  food_name?: string
  servings?: { serving?: FatSecretServing | FatSecretServing[] }
}

export interface FatSecretFoodResult {
  id: string
  nome: string
  quantidade_padrao: string
  calorias: number
  proteina: number
  carboidratos: number
  gordura: number
  categoria: string
  source: 'fatsecret'
  serving_size: string | null
}

let cachedToken: { value: string; expiresAt: number } | null = null

async function getFatSecretToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value

  const clientId = process.env.FATSECRET_CLIENT_ID
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('FATSECRET_NOT_CONFIGURED')

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const response = await fetch(FATSECRET_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=basic',
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('FATSECRET_TOKEN_FAILED')

  const data = (await response.json()) as { access_token?: string; expires_in?: number }
  if (!data.access_token) throw new Error('FATSECRET_TOKEN_FAILED')
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + Math.max(60, (data.expires_in ?? 3600) - 60) * 1000,
  }
  return data.access_token
}

function asNumber(value?: string) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function servingScore(serving: FatSecretServing) {
  const description = (serving.serving_description ?? '').toLowerCase().replace(/\s/g, '')
  const amount = Number(serving.serving_metric_amount)
  const unit = (serving.serving_metric_unit ?? '').toLowerCase()
  if (description.includes('100g') || (amount === 100 && unit === 'g')) return 0
  if (description.includes('100ml') || (amount === 100 && unit === 'ml')) return 1
  return 2
}

function mapFatSecretFood(food: FatSecretFood): FatSecretFoodResult | null {
  if (!food.food_id || !food.food_name) return null
  const rawServings = food.servings?.serving
  const servings = Array.isArray(rawServings) ? rawServings : rawServings ? [rawServings] : []
  const serving = [...servings].sort((a, b) => servingScore(a) - servingScore(b))[0]
  if (!serving) return null

  return {
    id: `fatsecret-${food.food_id}`,
    nome: food.food_name.trim(),
    quantidade_padrao: '100g',
    calorias: Math.round(asNumber(serving.calories)),
    proteina: Math.round(asNumber(serving.protein) * 10) / 10,
    carboidratos: Math.round(asNumber(serving.carbohydrate) * 10) / 10,
    gordura: Math.round(asNumber(serving.fat) * 10) / 10,
    categoria: 'FatSecret Brasil',
    source: 'fatsecret',
    serving_size: serving.serving_description ?? null,
  }
}

export async function searchFatSecret(query: string): Promise<{ foods: FatSecretFoodResult[]; error?: string }> {
  const parsed = querySchema.safeParse(query)
  if (!parsed.success) return { foods: [] }

  try {
    const token = await getFatSecretToken()
    const params = new URLSearchParams({
      method: 'foods.search',
      search_expression: parsed.data,
      region: 'BR',
      language: 'pt',
      format: 'json',
      max_results: '8',
    })
    const response = await fetch(FATSECRET_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
      cache: 'no-store',
    })
    if (!response.ok) return { foods: [], error: 'Não foi possível consultar o FatSecret.' }

    const data = (await response.json()) as { foods?: { food?: FatSecretFood | FatSecretFood[] } }
    const rawFoods = data.foods?.food
    const foods = (Array.isArray(rawFoods) ? rawFoods : rawFoods ? [rawFoods] : [])
      .map(mapFatSecretFood)
      .filter((food): food is FatSecretFoodResult => food !== null)
    return { foods }
  } catch (error) {
    if (error instanceof Error && error.message === 'FATSECRET_NOT_CONFIGURED') {
      return { foods: [], error: 'Configure FATSECRET_CLIENT_ID e FATSECRET_CLIENT_SECRET para ativar a busca.' }
    }
    console.error('[fatsecret] search failed:', error)
    return { foods: [], error: 'Busca externa temporariamente indisponível.' }
  }
}
