import type { Profile } from './types'

export type Sexo = NonNullable<Profile['sexo']>
export type NivelAtividade = NonNullable<Profile['nivel_atividade']>
export type Objetivo = NonNullable<Profile['objetivo']>
export type Experiencia = NonNullable<Profile['experiencia_treino']>

export interface BodyData {
  sexo: Sexo
  idade: number
  altura_cm: number
  peso_kg: number
  nivel_atividade: NivelAtividade
  objetivo: Objetivo
  experiencia_treino: Experiencia
  dias_treino_semana: number
}

export const NIVEL_ATIVIDADE_OPTIONS: { value: NivelAtividade; label: string; description: string; fator: number }[] = [
  { value: 'sedentario', label: 'Sedentário', description: 'Pouco ou nenhum exercício', fator: 1.2 },
  { value: 'leve', label: 'Levemente ativo', description: 'Exercício 1-3x por semana', fator: 1.375 },
  { value: 'moderado', label: 'Moderadamente ativo', description: 'Exercício 3-5x por semana', fator: 1.55 },
  { value: 'intenso', label: 'Muito ativo', description: 'Exercício intenso 6-7x por semana', fator: 1.725 },
  { value: 'muito_intenso', label: 'Extremamente ativo', description: 'Treino pesado + trabalho físico', fator: 1.9 },
]

export const OBJETIVO_OPTIONS: { value: Objetivo; label: string; description: string }[] = [
  { value: 'emagrecer', label: 'Emagrecer', description: 'Perder gordura' },
  { value: 'ganhar_massa', label: 'Ganhar massa', description: 'Hipertrofia muscular' },
  { value: 'manter', label: 'Manter', description: 'Manter peso e saúde' },
  { value: 'condicionamento', label: 'Condicionamento', description: 'Resistência e fôlego' },
]

export const EXPERIENCIA_OPTIONS: { value: Experiencia; label: string; description: string }[] = [
  { value: 'iniciante', label: 'Iniciante', description: 'Menos de 6 meses' },
  { value: 'intermediario', label: 'Intermediário', description: '6 meses a 2 anos' },
  { value: 'avancado', label: 'Avançado', description: 'Mais de 2 anos' },
]

export function getBodyData(profile: Profile | null | undefined): BodyData | null {
  if (!profile) return null
  const { sexo, idade, altura_cm, peso_kg, nivel_atividade, objetivo, experiencia_treino, dias_treino_semana } = profile
  if (!sexo || !idade || !altura_cm || !peso_kg || !nivel_atividade || !objetivo || !experiencia_treino || !dias_treino_semana) {
    return null
  }
  return {
    sexo,
    idade,
    altura_cm,
    peso_kg: Number(peso_kg),
    nivel_atividade,
    objetivo,
    experiencia_treino,
    dias_treino_semana,
  }
}

// Mifflin-St Jeor (Mifflin et al., 1990)
export function calculateBmr(d: Pick<BodyData, 'sexo' | 'idade' | 'altura_cm' | 'peso_kg'>) {
  const base = 10 * d.peso_kg + 6.25 * d.altura_cm - 5 * d.idade
  return Math.round(d.sexo === 'masculino' ? base + 5 : base - 161)
}

export function classifyBmi(bmi: number) {
  if (bmi < 18.5) return 'Abaixo do peso'
  if (bmi < 25) return 'Peso adequado'
  if (bmi < 30) return 'Sobrepeso'
  if (bmi < 35) return 'Obesidade grau I'
  if (bmi < 40) return 'Obesidade grau II'
  return 'Obesidade grau III'
}

const PROTEINA_G_POR_KG: Record<Objetivo, number> = {
  emagrecer: 2.0,
  ganhar_massa: 1.8,
  manter: 1.6,
  condicionamento: 1.6,
}

const AJUSTE_CALORICO: Record<Objetivo, number> = {
  emagrecer: 0.8,
  ganhar_massa: 1.1,
  manter: 1,
  condicionamento: 1,
}

const PERCENTUAL_GORDURA = 0.25

export interface MealSplit {
  refeicao: string
  percentual: number
  calorias: number
  proteina_g: number
  exemplo: string
}

export interface NutritionPlan {
  bmr: number
  tdee: number
  calorias: number
  proteina_g: number
  carboidratos_g: number
  gordura_g: number
  agua_ml: number
  imc: number
  imcClassificacao: string
  ajusteDescricao: string
  refeicoes: MealSplit[]
}

const MEAL_TEMPLATES: { refeicao: string; percentual: number; exemplo: Record<Objetivo, string> }[] = [
  {
    refeicao: 'Café da manhã',
    percentual: 0.25,
    exemplo: {
      emagrecer: 'Ovos mexidos + mamão + café sem açúcar',
      ganhar_massa: 'Pão francês + ovos + banana + leite',
      manter: 'Pão francês + ovo + fruta',
      condicionamento: 'Pão francês + ovos + banana',
    },
  },
  {
    refeicao: 'Almoço',
    percentual: 0.3,
    exemplo: {
      emagrecer: 'Frango grelhado + arroz integral + feijão + salada',
      ganhar_massa: 'Carne moída (patinho) + arroz + feijão + batata',
      manter: 'Frango grelhado + arroz + feijão + legumes',
      condicionamento: 'Frango grelhado + arroz + feijão + batata',
    },
  },
  {
    refeicao: 'Lanche da tarde',
    percentual: 0.15,
    exemplo: {
      emagrecer: 'Whey protein + morango',
      ganhar_massa: 'Whey protein + banana + aveia',
      manter: 'Fruta + iogurte ou whey',
      condicionamento: 'Banana + whey protein (pré-treino)',
    },
  },
  {
    refeicao: 'Janta',
    percentual: 0.3,
    exemplo: {
      emagrecer: 'Frango desfiado + batata inglesa + salada',
      ganhar_massa: 'Lombo suíno + macarrão + legumes',
      manter: 'Carne moída + arroz + salada',
      condicionamento: 'Frango + macarrão + legumes',
    },
  },
]

export function calculateNutritionPlan(d: BodyData): NutritionPlan {
  const bmr = calculateBmr(d)
  const fator = NIVEL_ATIVIDADE_OPTIONS.find((o) => o.value === d.nivel_atividade)?.fator ?? 1.2
  const tdee = Math.round(bmr * fator)

  const pisoSeguro = d.sexo === 'masculino' ? 1500 : 1200
  const alvo = tdee * AJUSTE_CALORICO[d.objetivo]
  const calorias = Math.round(Math.max(alvo, d.objetivo === 'emagrecer' ? pisoSeguro : 0) / 10) * 10

  const proteina_g = Math.round(d.peso_kg * PROTEINA_G_POR_KG[d.objetivo])
  const gordura_g = Math.round((calorias * PERCENTUAL_GORDURA) / 9)
  const carboidratos_g = Math.max(0, Math.round((calorias - proteina_g * 4 - gordura_g * 9) / 4))

  const agua_ml = Math.min(5000, Math.max(1500, Math.round((d.peso_kg * 35) / 250) * 250))

  const alturaM = d.altura_cm / 100
  const imc = Math.round((d.peso_kg / (alturaM * alturaM)) * 10) / 10

  const ajusteDescricao = {
    emagrecer: 'Déficit de ~20% sobre o gasto diário',
    ganhar_massa: 'Superávit de ~10% sobre o gasto diário',
    manter: 'Igual ao gasto diário',
    condicionamento: 'Igual ao gasto diário',
  }[d.objetivo]

  const refeicoes = MEAL_TEMPLATES.map((m) => ({
    refeicao: m.refeicao,
    percentual: m.percentual,
    calorias: Math.round((calorias * m.percentual) / 10) * 10,
    proteina_g: Math.round(proteina_g * m.percentual),
    exemplo: m.exemplo[d.objetivo],
  }))

  return {
    bmr,
    tdee,
    calorias,
    proteina_g,
    carboidratos_g,
    gordura_g,
    agua_ml,
    imc,
    imcClassificacao: classifyBmi(imc),
    ajusteDescricao,
    refeicoes,
  }
}

export interface PlanExercise {
  nome: string
  series: number
  repeticoes: string
  descanso_segundos: number
}

export interface PlanWorkout {
  nome: string
  foco: string
  dias_semana: number[]
  exercicios: PlanExercise[]
}

export interface TrainingPlan {
  divisao: string
  descricao: string
  prescricao: { series: number; repeticoes: string; descanso_segundos: number }
  cardio: string
  workouts: PlanWorkout[]
  dicas: string[]
}

type Template = { foco: string; exercicios: string[] }

const TEMPLATES: Record<string, Template> = {
  fullA: {
    foco: 'Corpo inteiro',
    exercicios: ['Agachamento livre', 'Supino reto com barra', 'Remada curvada com barra', 'Desenvolvimento com halteres', 'Mesa flexora', 'Prancha'],
  },
  fullB: {
    foco: 'Corpo inteiro',
    exercicios: ['Leg press 45', 'Supino inclinado com halteres', 'Puxada frontal', 'Elevação lateral', 'Stiff', 'Abdominal supra'],
  },
  push: {
    foco: 'Peito, ombros e tríceps',
    exercicios: ['Supino reto com barra', 'Supino inclinado com halteres', 'Crossover na polia', 'Desenvolvimento com halteres', 'Elevação lateral', 'Tríceps pulley', 'Tríceps francês'],
  },
  pull: {
    foco: 'Costas e bíceps',
    exercicios: ['Puxada frontal', 'Remada curvada com barra', 'Remada baixa', 'Crucifixo inverso', 'Rosca direta com barra', 'Rosca martelo'],
  },
  legs: {
    foco: 'Pernas e glúteos',
    exercicios: ['Agachamento livre', 'Leg press 45', 'Cadeira extensora', 'Mesa flexora', 'Stiff', 'Elevação pélvica', 'Panturrilha em pé'],
  },
  upper: {
    foco: 'Membros superiores',
    exercicios: ['Supino reto com barra', 'Puxada frontal', 'Desenvolvimento com halteres', 'Remada baixa', 'Rosca alternada com halteres', 'Tríceps pulley'],
  },
  lower: {
    foco: 'Membros inferiores e core',
    exercicios: ['Agachamento livre', 'Stiff', 'Cadeira extensora', 'Mesa flexora', 'Elevação pélvica', 'Panturrilha sentado', 'Prancha'],
  },
}

const CORE_EXERCISES: Record<string, string> = {
  Prancha: '30-45 s',
  'Abdominal supra': '15-20',
}

const TRAINING_DAYS: Record<number, number[]> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
}

function chooseSplit(dias: number, experiencia: Experiencia) {
  if (dias <= 2) return { divisao: 'Full body (AB)', keys: ['fullA', 'fullB'], descricao: 'Treino de corpo inteiro em cada sessão, garantindo frequência de 2x por semana para cada músculo.' }
  if (dias === 3 && experiencia === 'iniciante') {
    return { divisao: 'Full body (AB alternado)', keys: ['fullA', 'fullB'], descricao: 'Para iniciantes, treinar o corpo todo 3x por semana acelera o aprendizado dos movimentos e os ganhos iniciais.' }
  }
  if (dias === 4) return { divisao: 'Superior / Inferior (AB)', keys: ['upper', 'lower'], descricao: 'Cada grupo muscular é treinado 2x por semana, a frequência com melhores resultados para hipertrofia.' }
  return { divisao: 'Push / Pull / Legs (ABC)', keys: ['push', 'pull', 'legs'], descricao: 'Divide empurrar, puxar e pernas. Com 5-6 dias, cada músculo é treinado ~2x por semana.' }
}

function prescriptionFor(objetivo: Objetivo, experiencia: Experiencia) {
  const series = experiencia === 'iniciante' ? 3 : 4
  switch (objetivo) {
    case 'ganhar_massa':
      return { series, repeticoes: '8-12', descanso_segundos: 90 }
    case 'emagrecer':
      return { series: 3, repeticoes: '10-15', descanso_segundos: 60 }
    case 'condicionamento':
      return { series: 3, repeticoes: '12-15', descanso_segundos: 45 }
    default:
      return { series: 3, repeticoes: '8-12', descanso_segundos: 75 }
  }
}

export function calculateTrainingPlan(d: BodyData): TrainingPlan {
  const split = chooseSplit(d.dias_treino_semana, d.experiencia_treino)
  const prescricao = prescriptionFor(d.objetivo, d.experiencia_treino)
  const addCardio = d.objetivo === 'emagrecer' || d.objetivo === 'condicionamento'
  const days = TRAINING_DAYS[Math.min(7, Math.max(1, d.dias_treino_semana))]

  const workouts: PlanWorkout[] = split.keys.map((key, i) => {
    const template = TEMPLATES[key]
    const exercicios: PlanExercise[] = template.exercicios.map((nome) => ({
      nome,
      series: CORE_EXERCISES[nome] ? 3 : prescricao.series,
      repeticoes: CORE_EXERCISES[nome] ?? (nome.startsWith('Panturrilha') ? '12-15' : prescricao.repeticoes),
      descanso_segundos: CORE_EXERCISES[nome] ? 45 : prescricao.descanso_segundos,
    }))
    if (addCardio) {
      exercicios.push({
        nome: d.objetivo === 'condicionamento' ? 'Bicicleta ergométrica' : 'Esteira',
        series: 1,
        repeticoes: d.objetivo === 'condicionamento' ? '15 min' : '20-30 min',
        descanso_segundos: 0,
      })
    }
    return {
      nome: `Treino ${String.fromCharCode(65 + i)}`,
      foco: template.foco,
      dias_semana: days.filter((_, dayIndex) => dayIndex % split.keys.length === i),
      exercicios,
    }
  })

  const cardio = {
    emagrecer: '150-300 min/semana de cardio moderado (ex.: 30-40 min, 5x por semana). Ajuda a aumentar o déficit calórico.',
    condicionamento: '150+ min/semana, combinando cardio contínuo e intervalado (HIIT 1-2x por semana).',
    ganhar_massa: 'Opcional: 2x por semana, 20 min leve, para saúde cardiovascular sem atrapalhar a recuperação.',
    manter: '150 min/semana de atividade moderada, conforme recomendação da OMS.',
  }[d.objetivo]

  const dicas = [
    'Aumente a carga ou as repetições aos poucos quando conseguir completar todas as séries com boa técnica (sobrecarga progressiva).',
    'Termine as séries a 1-3 repetições da falha: perto do limite, mas sem perder a técnica.',
    'Durma 7-9 horas por noite: a recuperação é quando o músculo se adapta.',
  ]
  if (d.experiencia_treino === 'iniciante') {
    dicas.unshift('Nas primeiras 2-4 semanas, priorize aprender a técnica com cargas leves.')
  }

  return {
    divisao: split.divisao,
    descricao: split.descricao,
    prescricao,
    cardio,
    workouts,
    dicas,
  }
}

export const SCIENTIFIC_SOURCES = [
  {
    tema: 'Gasto calórico basal',
    citacao: 'Mifflin MD et al. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr, 1990.',
  },
  {
    tema: 'Proteína',
    citacao: 'Jäger R et al. ISSN Position Stand: protein and exercise. J Int Soc Sports Nutr, 2017.',
  },
  {
    tema: 'Proteína e hipertrofia',
    citacao: 'Morton RW et al. A systematic review, meta-analysis and meta-regression of protein supplementation on muscle mass and strength. Br J Sports Med, 2018.',
  },
  {
    tema: 'Superávit para ganho de massa',
    citacao: 'Iraki J et al. Nutrition recommendations for bodybuilders in the off-season: a narrative review. Sports, 2019.',
  },
  {
    tema: 'Hidratação',
    citacao: 'EFSA Panel on Dietetic Products, Nutrition and Allergies. Scientific Opinion on Dietary Reference Values for water. EFSA Journal, 2010.',
  },
  {
    tema: 'Séries, repetições e descanso',
    citacao: 'American College of Sports Medicine. Position Stand: Progression models in resistance training for healthy adults. Med Sci Sports Exerc, 2009.',
  },
  {
    tema: 'Frequência de treino',
    citacao: 'Schoenfeld BJ et al. Effects of resistance training frequency on measures of muscle hypertrophy: a systematic review and meta-analysis. Sports Med, 2016.',
  },
  {
    tema: 'Volume semanal',
    citacao: 'Schoenfeld BJ et al. Dose-response relationship between weekly resistance training volume and increases in muscle mass. J Sports Sci, 2017.',
  },
  {
    tema: 'Cardio para emagrecimento',
    citacao: 'Donnelly JE et al. ACSM Position Stand: Appropriate physical activity intervention strategies for weight loss and prevention of weight regain for adults. Med Sci Sports Exerc, 2009.',
  },
  {
    tema: 'Atividade física geral',
    citacao: 'World Health Organization. WHO guidelines on physical activity and sedentary behaviour, 2020.',
  },
]
