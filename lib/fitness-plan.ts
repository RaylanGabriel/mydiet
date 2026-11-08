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
  /** Um ou mais objetivos (ex.: emagrecer + ganhar massa = recomposição corporal) */
  objetivos: Objetivo[]
  experiencia_treino: Experiencia
  dias_treino_semana: number
  /** Todos os treinos de musculação são de corpo inteiro */
  prefere_fullbody: boolean
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

/** Ordem canônica dos objetivos (usada para exibir e salvar). */
const OBJETIVO_ORDER: Objetivo[] = ['emagrecer', 'ganhar_massa', 'manter', 'condicionamento']

/**
 * "Manter" é incompatível com "Emagrecer" e "Ganhar massa" (direções calóricas opostas).
 * Retorna a nova seleção depois de alternar `value`.
 */
export function toggleObjetivo(current: Objetivo[], value: Objetivo): Objetivo[] {
  if (current.includes(value)) return current.filter((o) => o !== value)
  let next = [...current, value]
  if (value === 'manter') next = next.filter((o) => o !== 'emagrecer' && o !== 'ganhar_massa')
  if (value === 'emagrecer' || value === 'ganhar_massa') next = next.filter((o) => o !== 'manter')
  return OBJETIVO_ORDER.filter((o) => next.includes(o))
}

/** Objetivo "principal", gravado na coluna legada `objetivo`. */
export function primaryObjetivo(objetivos: Objetivo[]): Objetivo {
  if (objetivos.includes('emagrecer')) return 'emagrecer'
  if (objetivos.includes('ganhar_massa')) return 'ganhar_massa'
  if (objetivos.includes('condicionamento')) return 'condicionamento'
  return 'manter'
}

export function objetivosLabel(objetivos: Objetivo[]): string {
  return OBJETIVO_OPTIONS.filter((o) => objetivos.includes(o.value))
    .map((o) => o.label)
    .join(' + ')
}

/** Descrição curta da combinação escolhida, exibida no formulário. */
export function describeCombination(objetivos: Objetivo[]): string | null {
  const has = (o: Objetivo) => objetivos.includes(o)
  if (has('emagrecer') && has('ganhar_massa')) {
    return has('condicionamento')
      ? 'Recomposição corporal com foco em fôlego: perder gordura e ganhar músculo, com mais cardio.'
      : 'Recomposição corporal: perder gordura e ganhar músculo ao mesmo tempo, com déficit calórico leve e proteína alta.'
  }
  if (has('emagrecer') && has('condicionamento')) return 'Perder gordura melhorando o fôlego: déficit moderado e mais cardio.'
  if (has('ganhar_massa') && has('condicionamento')) return 'Ganhar massa sem perder o fôlego: superávit leve e cardio que não atrapalha a recuperação.'
  if (has('manter') && has('condicionamento')) return 'Manter o peso e melhorar resistência e saúde cardiovascular.'
  return null
}

export function getBodyData(profile: Profile | null | undefined): BodyData | null {
  if (!profile) return null
  const { sexo, idade, altura_cm, peso_kg, nivel_atividade, experiencia_treino, dias_treino_semana } = profile
  // Compatível com perfis antigos, que só têm a coluna `objetivo`
  const objetivos = profile.objetivos?.length ? profile.objetivos : profile.objetivo ? [profile.objetivo] : []
  if (!sexo || !idade || !altura_cm || !peso_kg || !nivel_atividade || objetivos.length === 0 || !experiencia_treino || !dias_treino_semana) {
    return null
  }
  return {
    sexo,
    idade,
    altura_cm,
    peso_kg: Number(peso_kg),
    nivel_atividade,
    objetivos: OBJETIVO_ORDER.filter((o) => objetivos.includes(o)),
    experiencia_treino,
    dias_treino_semana,
    prefere_fullbody: profile.prefere_fullbody === true,
  }
}

// Mifflin-St Jeor (Mifflin et al., 1990)
export function calculateBmr(d: Pick<BodyData, 'sexo' | 'idade' | 'altura_cm' | 'peso_kg'>) {
  const base = 10 * d.peso_kg + 6.25 * d.altura_cm - 5 * d.idade
  return Math.round(d.sexo === 'masculino' ? base + 5 : base - 161)
}

export function calculateBmi(d: Pick<BodyData, 'altura_cm' | 'peso_kg'>) {
  const alturaM = d.altura_cm / 100
  return Math.round((d.peso_kg / (alturaM * alturaM)) * 10) / 10
}

export function classifyBmi(bmi: number) {
  if (bmi < 18.5) return 'Abaixo do peso'
  if (bmi < 25) return 'Peso adequado'
  if (bmi < 30) return 'Sobrepeso'
  if (bmi < 35) return 'Obesidade grau I'
  if (bmi < 40) return 'Obesidade grau II'
  return 'Obesidade grau III'
}

// ---------------------------------------------------------------------------
// Dieta
// ---------------------------------------------------------------------------

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
  estrategia: string
  ajusteDescricao: string
  avisos: string[]
  refeicoes: MealSplit[]
}

type MealStyle = 'emagrecer' | 'recomposicao' | 'ganhar_massa' | 'manter' | 'condicionamento'

const MEAL_TEMPLATES: { refeicao: string; percentual: number; exemplo: Record<MealStyle, string> }[] = [
  {
    refeicao: 'Café da manhã',
    percentual: 0.25,
    exemplo: {
      emagrecer: 'Ovos mexidos + mamão + café sem açúcar',
      recomposicao: 'Omelete (3 ovos) + pão integral + fruta',
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
      recomposicao: 'Patinho grelhado + arroz + feijão + salada à vontade',
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
      recomposicao: 'Iogurte natural + whey + aveia',
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
      recomposicao: 'Peixe ou frango + batata-doce + legumes',
      ganhar_massa: 'Lombo suíno + macarrão + legumes',
      manter: 'Carne moída + arroz + salada',
      condicionamento: 'Frango + macarrão + legumes',
    },
  },
]

function flags(objetivos: Objetivo[]) {
  return {
    E: objetivos.includes('emagrecer'),
    G: objetivos.includes('ganhar_massa'),
    M: objetivos.includes('manter'),
    C: objetivos.includes('condicionamento'),
  }
}

export function calculateNutritionPlan(d: BodyData): NutritionPlan {
  const { E, G, C } = flags(d.objetivos)
  const bmr = calculateBmr(d)
  const fator = NIVEL_ATIVIDADE_OPTIONS.find((o) => o.value === d.nivel_atividade)?.fator ?? 1.2
  const tdee = Math.round(bmr * fator)
  const imc = calculateBmi(d)
  const avisos: string[] = []

  // 1) Estratégia calórica a partir da combinação de objetivos
  let ajuste = 0 // fração sobre o TDEE (negativo = déficit)
  let estrategia = 'Manutenção'
  let style: MealStyle = 'manter'
  if (E && G) {
    ajuste = -0.1
    estrategia = 'Recomposição corporal'
    style = 'recomposicao'
  } else if (E) {
    ajuste = C ? -0.15 : -0.2
    estrategia = C ? 'Emagrecimento com condicionamento' : 'Emagrecimento'
    style = 'emagrecer'
  } else if (G) {
    ajuste = C ? 0.05 : d.experiencia_treino === 'avancado' ? 0.07 : 0.1
    estrategia = C ? 'Ganho de massa com condicionamento' : 'Ganho de massa'
    style = 'ganhar_massa'
  } else if (C) {
    estrategia = 'Condicionamento'
    style = 'condicionamento'
  }

  // 2) Travas de segurança
  if (ajuste < 0 && imc < 18.5) {
    ajuste = 0
    estrategia = 'Manutenção (déficit não recomendado)'
    avisos.push('Seu IMC está abaixo do recomendado, então não aplicamos déficit calórico. Converse com um nutricionista antes de tentar emagrecer.')
  }
  if (ajuste < -0.1 && d.idade < 18) {
    ajuste = -0.1
    avisos.push('Para menores de 18 anos o déficit foi limitado a 10% para não prejudicar o crescimento.')
  }

  const pisoSeguro = d.sexo === 'masculino' ? 1500 : 1200
  let alvo = tdee * (1 + ajuste)
  if (ajuste < 0 && alvo < pisoSeguro) {
    alvo = Math.min(tdee, pisoSeguro)
    avisos.push(`As calorias foram mantidas em pelo menos ${pisoSeguro} kcal, o mínimo seguro sem acompanhamento profissional.`)
  }
  const calorias = Math.round(alvo / 10) * 10

  // 3) Proteína (g/kg): mais alta em déficit e na recomposição (Jäger 2017; Morton 2018)
  let proteinaPorKg = 1.6
  if (G) proteinaPorKg = 1.8
  if (E) proteinaPorKg = 2.0
  if (E && G) proteinaPorKg = 2.2
  // Em obesidade, calcular sobre o peso total superestima; usa o peso de IMC 25 como referência
  const alturaM = d.altura_cm / 100
  const pesoReferencia = imc >= 30 ? 25 * alturaM * alturaM : d.peso_kg
  const proteina_g = Math.round(pesoReferencia * proteinaPorKg)
  const gordura_g = Math.round((calorias * PERCENTUAL_GORDURA) / 9)
  const carboidratos_g = Math.max(0, Math.round((calorias - proteina_g * 4 - gordura_g * 9) / 4))

  const agua_ml = Math.min(5000, Math.max(1500, Math.round((d.peso_kg * 35 + (C ? 500 : 0)) / 250) * 250))

  const pct = Math.round(Math.abs(ajuste) * 100)
  const ajusteDescricao =
    ajuste < 0
      ? `Déficit de ~${pct}% sobre o gasto diário`
      : ajuste > 0
        ? `Superávit de ~${pct}% sobre o gasto diário`
        : 'Igual ao gasto diário'

  const refeicoes = MEAL_TEMPLATES.map((m) => ({
    refeicao: m.refeicao,
    percentual: m.percentual,
    calorias: Math.round((calorias * m.percentual) / 10) * 10,
    proteina_g: Math.round(proteina_g * m.percentual),
    exemplo: m.exemplo[style],
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
    estrategia,
    ajusteDescricao,
    avisos,
    refeicoes,
  }
}

// ---------------------------------------------------------------------------
// Treino
// ---------------------------------------------------------------------------

/**
 * Todos os exercícios que o plano pode sugerir. Os nomes precisam existir na
 * biblioteca global (`exercises` com user_id NULL) para serem criados no app —
 * o script scripts/006_plan_multiple_goals.sql garante isso.
 */
export const PLAN_EXERCISE_CATALOG: Record<string, { grupo: string; equipamento: string }> = {
  'Supino reto com barra': { grupo: 'Peito', equipamento: 'Barra' },
  'Supino inclinado com halteres': { grupo: 'Peito', equipamento: 'Halteres' },
  'Supino máquina': { grupo: 'Peito', equipamento: 'Máquina' },
  'Crossover na polia': { grupo: 'Peito', equipamento: 'Polia' },
  'Flexão de braço': { grupo: 'Peito', equipamento: 'Peso corporal' },
  'Puxada frontal': { grupo: 'Costas', equipamento: 'Polia' },
  'Remada baixa': { grupo: 'Costas', equipamento: 'Polia' },
  'Remada curvada com barra': { grupo: 'Costas', equipamento: 'Barra' },
  'Remada unilateral com halter': { grupo: 'Costas', equipamento: 'Halteres' },
  'Barra fixa': { grupo: 'Costas', equipamento: 'Peso corporal' },
  'Levantamento terra': { grupo: 'Costas', equipamento: 'Barra' },
  'Desenvolvimento com halteres': { grupo: 'Ombros', equipamento: 'Halteres' },
  'Desenvolvimento máquina': { grupo: 'Ombros', equipamento: 'Máquina' },
  'Elevação lateral': { grupo: 'Ombros', equipamento: 'Halteres' },
  'Crucifixo inverso': { grupo: 'Ombros', equipamento: 'Halteres' },
  'Rosca direta com barra': { grupo: 'Bíceps', equipamento: 'Barra' },
  'Rosca alternada com halteres': { grupo: 'Bíceps', equipamento: 'Halteres' },
  'Rosca martelo': { grupo: 'Bíceps', equipamento: 'Halteres' },
  'Tríceps pulley': { grupo: 'Tríceps', equipamento: 'Polia' },
  'Tríceps francês': { grupo: 'Tríceps', equipamento: 'Halteres' },
  'Agachamento livre': { grupo: 'Pernas', equipamento: 'Barra' },
  'Agachamento goblet': { grupo: 'Pernas', equipamento: 'Halteres' },
  'Leg press 45': { grupo: 'Pernas', equipamento: 'Máquina' },
  'Cadeira extensora': { grupo: 'Pernas', equipamento: 'Máquina' },
  'Mesa flexora': { grupo: 'Pernas', equipamento: 'Máquina' },
  Stiff: { grupo: 'Pernas', equipamento: 'Barra' },
  'Afundo com halteres': { grupo: 'Pernas', equipamento: 'Halteres' },
  'Elevação pélvica': { grupo: 'Glúteos', equipamento: 'Barra' },
  'Cadeira abdutora': { grupo: 'Glúteos', equipamento: 'Máquina' },
  'Kettlebell swing': { grupo: 'Glúteos', equipamento: 'Kettlebell' },
  'Panturrilha em pé': { grupo: 'Panturrilha', equipamento: 'Máquina' },
  'Panturrilha sentado': { grupo: 'Panturrilha', equipamento: 'Máquina' },
  Prancha: { grupo: 'Abdômen', equipamento: 'Peso corporal' },
  'Prancha lateral': { grupo: 'Abdômen', equipamento: 'Peso corporal' },
  'Abdominal supra': { grupo: 'Abdômen', equipamento: 'Peso corporal' },
  Perdigueiro: { grupo: 'Abdômen', equipamento: 'Peso corporal' },
  Esteira: { grupo: 'Cardio', equipamento: 'Máquina' },
  'Bicicleta ergométrica': { grupo: 'Cardio', equipamento: 'Máquina' },
  'Elíptico': { grupo: 'Cardio', equipamento: 'Máquina' },
  'Remo ergômetro': { grupo: 'Cardio', equipamento: 'Máquina' },
  'Pular corda': { grupo: 'Cardio', equipamento: 'Corda' },
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
  tipo: 'forca' | 'cardio'
  dias_semana: number[]
  exercicios: PlanExercise[]
}

export interface TrainingPlan {
  divisao: string
  descricao: string
  resumoSemana: string
  prescricao: { series: number; repeticoes: string; descanso_segundos: number }
  cardio: string
  workouts: PlanWorkout[]
  motivos: string[]
  avisos: string[]
  dicas: string[]
}

/** basico = máquinas e variações mais seguras; avancado = mais exercícios livres. */
type Nivel = 'basico' | 'padrao' | 'avancado'
type Slot = { basico: string; padrao?: string; avancado?: string }
type Template = { foco: string; slots: Slot[]; core?: Slot }

const s = (basico: string, padrao?: string, avancado?: string): Slot => ({ basico, padrao, avancado })

// Slots em ordem de prioridade: quando o treino precisa ser mais curto, os últimos saem.
const TEMPLATES: Record<string, Template> = {
  fullA: {
    foco: 'Corpo inteiro',
    slots: [
      s('Agachamento goblet', 'Agachamento livre'),
      s('Supino máquina', 'Supino reto com barra'),
      s('Remada baixa', 'Remada curvada com barra'),
      s('Elevação pélvica', 'Stiff', 'Levantamento terra'),
      s('Desenvolvimento máquina', 'Desenvolvimento com halteres'),
      s('Mesa flexora'),
      s('Rosca alternada com halteres'),
    ],
    core: s('Prancha'),
  },
  fullB: {
    foco: 'Corpo inteiro',
    slots: [
      s('Leg press 45'),
      s('Supino inclinado com halteres'),
      s('Puxada frontal', 'Puxada frontal', 'Barra fixa'),
      s('Mesa flexora', 'Stiff'),
      s('Elevação lateral'),
      s('Cadeira extensora', 'Afundo com halteres'),
      s('Tríceps pulley'),
    ],
    core: s('Perdigueiro', 'Abdominal supra'),
  },
  fullC: {
    foco: 'Corpo inteiro',
    slots: [
      s('Agachamento goblet', 'Afundo com halteres'),
      s('Supino máquina', 'Supino inclinado com halteres'),
      s('Remada unilateral com halter'),
      s('Elevação pélvica'),
      s('Desenvolvimento máquina', 'Desenvolvimento com halteres'),
      s('Cadeira extensora'),
      s('Rosca martelo'),
    ],
    core: s('Prancha lateral'),
  },
  upper: {
    foco: 'Membros superiores',
    slots: [
      s('Supino máquina', 'Supino reto com barra'),
      s('Puxada frontal', 'Puxada frontal', 'Barra fixa'),
      s('Desenvolvimento máquina', 'Desenvolvimento com halteres'),
      s('Remada baixa', 'Remada unilateral com halter', 'Remada curvada com barra'),
      s('Supino inclinado com halteres'),
      s('Rosca alternada com halteres', 'Rosca direta com barra'),
      s('Tríceps pulley'),
      s('Elevação lateral'),
    ],
  },
  lower: {
    foco: 'Membros inferiores e core',
    slots: [
      s('Leg press 45', 'Agachamento livre'),
      s('Elevação pélvica', 'Stiff', 'Levantamento terra'),
      s('Cadeira extensora', 'Afundo com halteres'),
      s('Mesa flexora'),
      s('Elevação pélvica'),
      s('Panturrilha em pé'),
      s('Cadeira abdutora'),
    ],
    core: s('Prancha'),
  },
  push: {
    foco: 'Peito, ombros e tríceps',
    slots: [
      s('Supino máquina', 'Supino reto com barra'),
      s('Supino inclinado com halteres'),
      s('Desenvolvimento máquina', 'Desenvolvimento com halteres'),
      s('Elevação lateral'),
      s('Crossover na polia'),
      s('Tríceps pulley'),
      s('Tríceps francês'),
    ],
  },
  pull: {
    foco: 'Costas e bíceps',
    slots: [
      s('Puxada frontal', 'Puxada frontal', 'Barra fixa'),
      s('Remada baixa', 'Remada curvada com barra'),
      s('Remada unilateral com halter', 'Remada baixa'),
      s('Crucifixo inverso'),
      s('Rosca direta com barra'),
      s('Rosca martelo'),
      s('Puxada frontal'),
    ],
    core: s('Abdominal supra'),
  },
  legs: {
    foco: 'Pernas e glúteos',
    slots: [
      s('Leg press 45', 'Agachamento livre'),
      s('Elevação pélvica', 'Stiff'),
      s('Leg press 45'),
      s('Cadeira extensora'),
      s('Mesa flexora'),
      s('Panturrilha em pé'),
      s('Cadeira abdutora', 'Afundo com halteres'),
    ],
    core: s('Prancha'),
  },
}

const SLOT_COUNT: Record<Nivel, number> = { basico: 5, padrao: 6, avancado: 7 }

const TIMED_EXERCISES: Record<string, string> = {
  Prancha: '30-45 s',
  'Prancha lateral': '20-30 s cada lado',
  Perdigueiro: '10 cada lado',
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

function pick(slot: Slot, nivel: Nivel) {
  if (nivel === 'avancado') return slot.avancado ?? slot.padrao ?? slot.basico
  if (nivel === 'padrao') return slot.padrao ?? slot.basico
  return slot.basico
}

function chooseFullBodySplit(strengthDays: number) {
  switch (strengthDays) {
    case 1:
      return { divisao: 'Full body', keys: ['fullA'], descricao: 'Treino de corpo inteiro: todos os músculos são estimulados na sessão da semana.' }
    case 2:
      return { divisao: 'Full body (AB)', keys: ['fullA', 'fullB'], descricao: 'Corpo inteiro em cada sessão: cada músculo é treinado 2x por semana, a frequência com melhores resultados.' }
    case 3:
      return { divisao: 'Full body (ABC)', keys: ['fullA', 'fullB', 'fullC'], descricao: 'Corpo inteiro em todas as sessões, com três treinos diferentes: cada músculo é treinado 3x por semana com variedade de exercícios.' }
    case 4:
      return { divisao: 'Full body (AB 2x)', keys: ['fullA', 'fullB'], descricao: 'Corpo inteiro em todas as sessões, alternando dois treinos: cada músculo é treinado 4x por semana.' }
    case 5:
      return { divisao: 'Full body (ABC rotativo)', keys: ['fullA', 'fullB', 'fullC'], descricao: 'Corpo inteiro em todas as sessões, alternando três treinos. Com essa frequência, controle a carga e a proximidade da falha para conseguir se recuperar entre os dias.' }
    default:
      return { divisao: 'Full body (ABC 2x)', keys: ['fullA', 'fullB', 'fullC'], descricao: 'Corpo inteiro em todas as sessões, repetindo três treinos. Com essa frequência, controle a carga e a proximidade da falha para conseguir se recuperar entre os dias.' }
  }
}

function chooseSplit(strengthDays: number, experiencia: Experiencia, fullbody: boolean) {
  if (fullbody) return chooseFullBodySplit(strengthDays)
  switch (strengthDays) {
    case 1:
      return { divisao: 'Full body', keys: ['fullA'], descricao: 'Com 1 dia de musculação, o treino de corpo inteiro garante que todos os músculos sejam estimulados na semana.' }
    case 2:
      return { divisao: 'Full body (AB)', keys: ['fullA', 'fullB'], descricao: 'Corpo inteiro em cada sessão: cada músculo é treinado 2x por semana, a frequência com melhores resultados.' }
    case 3:
      return experiencia === 'iniciante'
        ? { divisao: 'Full body (AB alternado)', keys: ['fullA', 'fullB'], descricao: 'Para iniciantes, treinar o corpo todo 3x por semana acelera o aprendizado dos movimentos e os ganhos iniciais.' }
        : { divisao: 'Superior / Inferior / Corpo inteiro (ABC)', keys: ['upper', 'lower', 'fullA'], descricao: 'Separa superiores e inferiores e fecha a semana com corpo inteiro, mantendo cada músculo ~2x por semana em só 3 dias.' }
    case 4:
      return { divisao: 'Superior / Inferior (AB)', keys: ['upper', 'lower'], descricao: 'Cada grupo muscular é treinado 2x por semana com sessões focadas, sem treinos longos demais.' }
    case 5:
      return { divisao: 'Push / Pull / Legs + Superior / Inferior', keys: ['push', 'pull', 'legs', 'upper', 'lower'], descricao: 'Combina PPL com superior/inferior: alto volume semanal e cada músculo ainda ~2x por semana.' }
    default:
      return { divisao: 'Push / Pull / Legs (ABC 2x)', keys: ['push', 'pull', 'legs'], descricao: 'Divide empurrar, puxar e pernas e repete o ciclo: cada músculo treinado 2x por semana com bastante volume.' }
  }
}

export function calculateTrainingPlan(d: BodyData): TrainingPlan {
  const { E, G, M, C } = flags(d.objetivos)
  const imc = calculateBmi(d)
  const idoso = d.idade >= 60
  const baixoImpacto = imc >= 30 || idoso
  const motivos: string[] = []
  const avisos: string[] = []

  // 1) Nível de complexidade dos exercícios
  let nivel: Nivel = d.experiencia_treino === 'avancado' ? 'avancado' : d.experiencia_treino === 'intermediario' ? 'padrao' : 'basico'
  if (idoso || imc >= 35) nivel = 'basico'
  if (nivel === 'basico') {
    const porque = d.experiencia_treino === 'iniciante' ? 'você está começando' : idoso ? 'a partir dos 60 anos a prioridade é segurança articular' : 'reduz o impacto nas articulações'
    motivos.push(`Priorizamos máquinas e variações mais estáveis (ex.: leg press, supino máquina, agachamento goblet) porque ${porque}.`)
  } else if (nivel === 'avancado') {
    motivos.push('Como você é avançado, o treino inclui mais exercícios livres e compostos (barra fixa, levantamento terra) e mais volume por sessão.')
  }

  // 2) Quantos dias são de musculação e quantos de cardio/recuperação
  const dias = Math.min(7, Math.max(1, d.dias_treino_semana))
  let maxForca = { iniciante: 4, intermediario: 5, avancado: 6 }[d.experiencia_treino]
  if (!G && E) maxForca = Math.min(maxForca, 4)
  if (!G && !E && C) maxForca = Math.min(maxForca, 3)
  maxForca = Math.min(maxForca, 6)
  const strengthDays = Math.min(dias, maxForca)
  const extraDays = dias - strengthDays

  const allDays = TRAINING_DAYS[dias]
  // Espalha os dias extras no meio da semana para intercalar com a musculação
  // (com 7 dias e só 1 extra, ele cai no domingo).
  const extraIdx = new Set(
    dias === 7 && extraDays === 1
      ? [0]
      : Array.from({ length: extraDays }, (_, k) => Math.floor(((k + 0.5) * dias) / extraDays)),
  )
  const strengthWeekDays = allDays.filter((_, i) => !extraIdx.has(i))
  const extraWeekDays = allDays.filter((_, i) => extraIdx.has(i))

  if (extraDays > 0) {
    const tipoExtra = E || C ? 'cardio' : 'recuperação ativa (cardio leve e mobilidade)'
    const razao =
      d.experiencia_treino === 'iniciante' && strengthDays === 4
        ? `Para iniciantes, mais de 4 dias de musculação não traz ganho extra e aumenta o risco de lesão`
        : dias === 7
          ? 'Os músculos precisam de pelo menos um dia sem musculação para se recuperar'
          : E
            ? 'Para emagrecer, os dias a mais rendem mais como cardio, aumentando o gasto calórico'
            : 'Para condicionamento, os dias a mais rendem mais como cardio'
    motivos.push(`Dos ${dias} dias, ${strengthDays} são de musculação e ${extraDays} de ${tipoExtra}. ${razao}.`)
  }

  const split = chooseSplit(strengthDays, d.experiencia_treino, d.prefere_fullbody)
  if (d.prefere_fullbody) {
    motivos.push('Você escolheu treinar full body, então todos os treinos de musculação trabalham o corpo inteiro.')
  }

  // 3) Prescrição (séries x repetições x descanso)
  let prescricao: TrainingPlan['prescricao']
  if (G) {
    prescricao = { series: d.experiencia_treino === 'iniciante' ? 3 : 4, repeticoes: '8-12', descanso_segundos: d.experiencia_treino === 'iniciante' ? 75 : 90 }
    motivos.push(
      E
        ? 'Recomposição: mantemos a faixa de hipertrofia (8-12 repetições, cargas desafiadoras). É o estímulo de força que faz o corpo preservar e ganhar músculo mesmo comendo um pouco menos.'
        : 'Faixa de 8-12 repetições com descanso de 75-90 s: o melhor equilíbrio entre carga e volume para hipertrofia.',
    )
  } else if (E) {
    prescricao = { series: d.experiencia_treino === 'avancado' ? 4 : 3, repeticoes: '10-12', descanso_segundos: 60 }
    motivos.push('No emagrecimento a musculação serve para não perder massa magra: cargas moderadas a altas (10-12 repetições) com descanso de 60 s para manter o ritmo.')
  } else if (C) {
    prescricao = { series: 3, repeticoes: '12-15', descanso_segundos: 45 }
    motivos.push('Para condicionamento, mais repetições (12-15) e descansos curtos (45 s) treinam a resistência muscular.')
  } else {
    prescricao = { series: d.experiencia_treino === 'avancado' ? 4 : 3, repeticoes: '8-12', descanso_segundos: 75 }
    motivos.push('Para manter, 3 séries de 8-12 repetições bastam para conservar força e massa muscular.')
  }
  if (C && G) prescricao.descanso_segundos = Math.max(60, prescricao.descanso_segundos - 15)
  if (idoso) {
    prescricao = { series: Math.min(prescricao.series, 3), repeticoes: '10-15', descanso_segundos: prescricao.descanso_segundos + 15 }
    motivos.push('Acima dos 60 anos usamos cargas um pouco menores (10-15 repetições) e descansos maiores, mantendo os benefícios com menos estresse articular.')
  }

  // 4) Cardio: modalidade e volume
  const intervalado = C && !baixoImpacto && d.experiencia_treino !== 'iniciante'
  const cardioMaquina = baixoImpacto ? 'Bicicleta ergométrica' : C ? 'Remo ergômetro' : 'Esteira'
  if (baixoImpacto && (E || C)) {
    motivos.push(`O cardio usa bicicleta e elíptico, de baixo impacto, por causa ${idoso ? 'da idade' : 'do IMC'}: protege joelhos e tornozelos.`)
  }

  const finisher: PlanExercise | null =
    E || C
      ? {
          nome: cardioMaquina,
          series: 1,
          repeticoes: intervalado ? '10-15 min intervalado' : E ? '15-20 min' : '10-15 min',
          descanso_segundos: 0,
        }
      : null

  // 5) Monta os treinos de musculação
  const count = SLOT_COUNT[nivel]
  const workouts: PlanWorkout[] = split.keys.map((key, i) => {
    const template = TEMPLATES[key]
    const nomes: string[] = []
    for (const slot of template.slots) {
      if (nomes.length >= count) break
      const nome = pick(slot, nivel)
      if (!nomes.includes(nome)) nomes.push(nome)
    }
    if (C && !baixoImpacto && nivel !== 'basico' && (key === 'fullA' || key === 'lower' || key === 'legs')) {
      nomes.push('Kettlebell swing')
    }
    if (template.core) {
      const core = pick(template.core, nivel)
      if (!nomes.includes(core)) nomes.push(core)
    }

    const exercicios: PlanExercise[] = nomes.map((nome) => {
      if (TIMED_EXERCISES[nome]) return { nome, series: 3, repeticoes: TIMED_EXERCISES[nome], descanso_segundos: 45 }
      if (nome === 'Kettlebell swing') return { nome, series: 3, repeticoes: '15-20', descanso_segundos: 45 }
      if (nome.startsWith('Panturrilha')) return { nome, series: prescricao.series, repeticoes: '12-15', descanso_segundos: 45 }
      return { nome, series: prescricao.series, repeticoes: prescricao.repeticoes, descanso_segundos: prescricao.descanso_segundos }
    })
    if (finisher) exercicios.push({ ...finisher })

    return {
      nome: `Treino ${String.fromCharCode(65 + i)}`,
      foco: template.foco,
      tipo: 'forca' as const,
      dias_semana: strengthWeekDays.filter((_, j) => j % split.keys.length === i),
      exercicios,
    }
  })

  // 6) Dias extras: cardio dedicado ou recuperação ativa
  if (extraWeekDays.length > 0) {
    const exercicios: PlanExercise[] = []
    if (E || C) {
      exercicios.push({
        nome: cardioMaquina,
        series: 1,
        repeticoes: intervalado ? '20-25 min (30 s forte / 90 s leve)' : '30-40 min ritmo moderado',
        descanso_segundos: 0,
      })
      if (C && !baixoImpacto) exercicios.push({ nome: 'Pular corda', series: 3, repeticoes: '1 min', descanso_segundos: 60 })
      if (baixoImpacto) exercicios.push({ nome: 'Elíptico', series: 1, repeticoes: '10-15 min leve', descanso_segundos: 0 })
    } else {
      exercicios.push({ nome: baixoImpacto ? 'Bicicleta ergométrica' : 'Esteira', series: 1, repeticoes: '20-30 min leve', descanso_segundos: 0 })
    }
    exercicios.push(
      { nome: 'Prancha lateral', series: 2, repeticoes: TIMED_EXERCISES['Prancha lateral'], descanso_segundos: 30 },
      { nome: 'Perdigueiro', series: 2, repeticoes: TIMED_EXERCISES.Perdigueiro, descanso_segundos: 30 },
    )
    workouts.push({
      nome: `Treino ${String.fromCharCode(65 + workouts.length)}`,
      foco: E || C ? 'Cardio e core' : 'Recuperação ativa',
      tipo: 'cardio',
      dias_semana: extraWeekDays,
      exercicios,
    })
  }

  // 7) Texto de cardio semanal
  let cardio: string
  if (E && C) cardio = `Meta de 200-300 min/semana: cardio no fim dos treinos de força${extraDays ? ' e sessões dedicadas nos outros dias' : ''}.${intervalado ? ' Inclua intervalado 1-2x por semana.' : ''}`
  else if (E) cardio = `Meta de 150-300 min/semana de cardio moderado${baixoImpacto ? ' e de baixo impacto' : ''}. Aumenta o gasto calórico sem atrapalhar a musculação.`
  else if (C) cardio = `Meta de 150+ min/semana${intervalado ? ', combinando contínuo e intervalado (HIIT 1-2x por semana)' : ' em ritmo contínuo; o intervalado pode entrar depois de algumas semanas'}.`
  else if (G) cardio = 'Opcional: 2x por semana, 20 min leve, para a saúde do coração sem atrapalhar a recuperação.'
  else cardio = '150 min/semana de atividade moderada, como recomenda a OMS.'
  if (G && !E && !C) motivos.push('O cardio fica opcional e leve para sobrar energia para ganhar massa.')
  if (M) motivos.push('Para manter, o foco é consistência: um treino que caiba na sua rotina e que dê para sustentar.')

  // 8) Avisos de segurança
  if (d.idade < 18) avisos.push('Menores de 18 anos devem treinar com supervisão de um profissional de educação física, priorizando técnica.')
  if (idoso) avisos.push('Faça uma avaliação médica antes de começar e inclua exercícios de equilíbrio no dia a dia.')
  if (imc >= 35) avisos.push('Com IMC acima de 35, é recomendável liberação médica antes de iniciar treinos intensos.')
  if (d.nivel_atividade === 'muito_intenso' && strengthDays >= 5) avisos.push('Como seu dia a dia já é muito ativo, observe a recuperação. Se sentir cansaço constante, tire um dia de treino.')

  // 9) Dicas
  const dicas = [
    'Aumente a carga ou as repetições aos poucos quando conseguir completar todas as séries com boa técnica (sobrecarga progressiva).',
    'Termine as séries a 1-3 repetições da falha: perto do limite, mas sem perder a técnica.',
    'Durma 7-9 horas por noite: a recuperação é quando o músculo se adapta.',
  ]
  if (d.experiencia_treino === 'iniciante') dicas.unshift('Nas primeiras 2-4 semanas, priorize aprender a técnica com cargas leves.')
  if (E && G) dicas.push('Na recomposição, a balança anda devagar. Acompanhe também a medida da cintura e as cargas no treino.')
  if (C && !G) dicas.push('Para ganhar mais fôlego, faça exercícios em bi-set (dois seguidos sem descanso) quando já dominar a técnica.')
  if (E) dicas.push('Caminhe mais no dia a dia (meta de 8-10 mil passos): soma bastante gasto calórico sem cansar para o treino.')

  const resumoSemana =
    extraDays > 0
      ? `${strengthDays} ${strengthDays === 1 ? 'dia' : 'dias'} de musculação + ${extraDays} de ${E || C ? 'cardio' : 'recuperação ativa'}`
      : `${strengthDays} ${strengthDays === 1 ? 'dia' : 'dias'} de musculação`

  return {
    divisao: split.divisao,
    descricao: split.descricao,
    resumoSemana,
    prescricao,
    cardio,
    workouts,
    motivos,
    avisos,
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
    tema: 'Recomposição corporal',
    citacao: 'Barakat C et al. Body recomposition: can trained individuals build muscle and lose fat at the same time? Strength Cond J, 2020.',
  },
  {
    tema: 'Ritmo de perda de peso',
    citacao: 'Helms ER et al. Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation. J Int Soc Sports Nutr, 2014.',
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
    tema: 'Treino para idosos',
    citacao: 'Fragala MS et al. Resistance training for older adults: position statement from the National Strength and Conditioning Association. J Strength Cond Res, 2019.',
  },
  {
    tema: 'Atividade física geral',
    citacao: 'World Health Organization. WHO guidelines on physical activity and sedentary behaviour, 2020.',
  },
]
