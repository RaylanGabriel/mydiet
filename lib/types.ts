export type MealType = 'cafe_manha' | 'almoco' | 'lanche_tarde' | 'cafe_tarde' | 'janta'

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  cafe_manha: 'Cafe da manha',
  almoco: 'Almoco',
  lanche_tarde: 'Lanche da tarde',
  cafe_tarde: 'Cafe da tarde',
  janta: 'Janta',
}

export const MEAL_TYPE_ORDER: MealType[] = [
  'cafe_manha',
  'almoco',
  'lanche_tarde',
  'cafe_tarde',
  'janta',
]

export interface Profile {
  id: string
  nome: string | null
  meta_calorias_diarias: number
  meta_agua_ml: number
  sexo: 'masculino' | 'feminino' | null
  idade: number | null
  altura_cm: number | null
  peso_kg: number | null
  nivel_atividade: 'sedentario' | 'leve' | 'moderado' | 'intenso' | 'muito_intenso' | null
  objetivo: 'emagrecer' | 'manter' | 'ganhar_massa' | 'condicionamento' | null
  experiencia_treino: 'iniciante' | 'intermediario' | 'avancado' | null
  dias_treino_semana: number | null
  created_at: string
  updated_at: string
}

export interface CommonFood {
  id: string
  nome: string
  quantidade_padrao: string
  calorias: number
  proteina: number
  carboidratos: number
  gordura: number
  categoria: string
}

export interface Meal {
  id: string
  user_id: string
  nome: string
  horario: string
  data: string
  tipo: MealType
  concluida: boolean
  ordem: number
  created_at: string
  updated_at: string
  meal_items?: MealItem[]
}

export interface MealItem {
  id: string
  meal_id: string
  user_id: string
  nome: string
  quantidade: string
  calorias: number
  proteina: number | null
  carboidratos: number | null
  gordura: number | null
  ordem: number
  created_at: string
  updated_at: string
  food_options?: FoodOption[]
}

export interface FoodOption {
  id: string
  meal_item_id: string
  user_id: string
  nome: string
  quantidade: string
  calorias: number
  proteina: number | null
  carboidratos: number | null
  gordura: number | null
  is_active: boolean
  created_at: string
}
