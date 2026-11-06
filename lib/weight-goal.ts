import { calculateBmi, type BodyData, type Objetivo } from './fitness-plan'

export interface WeightGoal {
  id: string
  user_id: string
  peso_inicial_kg: number
  peso_meta_kg: number
  status: 'ativa' | 'concluida' | 'cancelada'
  criado_em: string
  concluido_em: string | null
}

export interface WeightLog {
  id: string
  data: string
  peso_kg: number
}

export type GoalDirection = 'perder' | 'ganhar'

export function formatKg(value: number) {
  return `${(Math.round(value * 10) / 10).toString().replace('.', ',')} kg`
}

export function goalDirection(goal: Pick<WeightGoal, 'peso_inicial_kg' | 'peso_meta_kg'>): GoalDirection {
  return Number(goal.peso_meta_kg) < Number(goal.peso_inicial_kg) ? 'perder' : 'ganhar'
}

export function isGoalReached(goal: Pick<WeightGoal, 'peso_inicial_kg' | 'peso_meta_kg'>, pesoAtual: number) {
  const meta = Number(goal.peso_meta_kg)
  return goalDirection(goal) === 'perder' ? pesoAtual <= meta : pesoAtual >= meta
}

/** Progresso de 0 a 1 entre o peso inicial e a meta (nunca negativo). */
export function goalProgress(goal: Pick<WeightGoal, 'peso_inicial_kg' | 'peso_meta_kg'>, pesoAtual: number) {
  const inicial = Number(goal.peso_inicial_kg)
  const meta = Number(goal.peso_meta_kg)
  const total = Math.abs(meta - inicial)
  if (total === 0) return 1
  const feito = goalDirection(goal) === 'perder' ? inicial - pesoAtual : pesoAtual - inicial
  return Math.min(1, Math.max(0, feito / total))
}

export function remainingKg(goal: Pick<WeightGoal, 'peso_inicial_kg' | 'peso_meta_kg'>, pesoAtual: number) {
  if (isGoalReached(goal, pesoAtual)) return 0
  return Math.max(0, Math.round(Math.abs(Number(goal.peso_meta_kg) - pesoAtual) * 10) / 10)
}

/**
 * Ritmo semanal recomendado:
 * - perder: ~0,75% do peso por semana (Helms et al., 2014), no máximo 1 kg
 * - ganhar: depende da experiência (Iraki et al., 2019)
 */
export function weeklyRate(direction: GoalDirection, pesoAtual: number, experiencia: BodyData['experiencia_treino']) {
  if (direction === 'perder') return Math.min(1, pesoAtual * 0.0075)
  return { iniciante: 0.35, intermediario: 0.25, avancado: 0.15 }[experiencia]
}

export function estimateWeeks(
  goal: Pick<WeightGoal, 'peso_inicial_kg' | 'peso_meta_kg'>,
  pesoAtual: number,
  experiencia: BodyData['experiencia_treino'],
) {
  const restante = remainingKg(goal, pesoAtual)
  if (restante === 0) return 0
  return Math.max(1, Math.ceil(restante / weeklyRate(goalDirection(goal), pesoAtual, experiencia)))
}

export function formatWeeks(weeks: number) {
  if (weeks <= 1) return '~1 semana'
  if (weeks < 9) return `~${weeks} semanas`
  const meses = Math.round(weeks / 4.345)
  return `~${meses} ${meses === 1 ? 'mês' : 'meses'}`
}

export interface GoalValidation {
  error: string | null
  warnings: string[]
}

export function validateGoal(meta: number, d: Pick<BodyData, 'peso_kg' | 'altura_cm' | 'idade'>): GoalValidation {
  const warnings: string[] = []
  if (!Number.isFinite(meta) || meta < 30 || meta > 300) return { error: 'Informe uma meta entre 30 e 300 kg.', warnings }
  if (Math.abs(meta - d.peso_kg) < 0.5) return { error: 'A meta precisa ser pelo menos 0,5 kg diferente do seu peso atual.', warnings }

  const imcMeta = calculateBmi({ peso_kg: meta, altura_cm: d.altura_cm })
  if (imcMeta < 18.5) {
    const minimo = Math.ceil(18.5 * (d.altura_cm / 100) ** 2)
    return { error: `Essa meta deixaria seu IMC abaixo de 18,5 (abaixo do peso saudável). Para sua altura, o mínimo recomendado é ${minimo} kg.`, warnings }
  }

  const variacao = Math.abs(meta - d.peso_kg) / d.peso_kg
  if (variacao > 0.15) {
    warnings.push('É uma meta grande. Que tal dividir em etapas? Metas menores são mais fáceis de manter e dão motivação a cada conquista.')
  }
  if (meta > d.peso_kg && imcMeta >= 30) {
    warnings.push('Essa meta leva seu IMC para a faixa de obesidade. Considere conversar com um profissional.')
  }
  if (d.idade < 18) warnings.push('Para menores de 18 anos, metas de peso devem ser acompanhadas por um profissional.')
  return { error: null, warnings }
}

/** O plano atual está alinhado com o sentido da meta? Se não, sugere o ajuste. */
export function objetivoMismatch(direction: GoalDirection, objetivos: Objetivo[]): { sugestao: Objetivo[]; texto: string } | null {
  const cond = objetivos.includes('condicionamento') ? (['condicionamento'] as Objetivo[]) : []
  if (direction === 'perder' && !objetivos.includes('emagrecer')) {
    return {
      sugestao: objetivos.includes('ganhar_massa') ? ['emagrecer', 'ganhar_massa', ...cond] : ['emagrecer', ...cond],
      texto: 'Sua meta é perder peso, mas o plano não inclui "Emagrecer". Sem déficit calórico a balança não vai descer.',
    }
  }
  if (direction === 'ganhar' && !objetivos.includes('ganhar_massa')) {
    return {
      sugestao: ['ganhar_massa', ...cond],
      texto: 'Sua meta é ganhar peso, mas o plano não inclui "Ganhar massa". Sem superávit calórico fica difícil subir.',
    }
  }
  if (direction === 'ganhar' && objetivos.includes('emagrecer')) {
    return {
      sugestao: ['ganhar_massa', ...cond],
      texto: 'Sua meta é ganhar peso, mas o plano está em déficit (inclui "Emagrecer").',
    }
  }
  return null
}

export interface NextStepOption {
  id: string
  titulo: string
  descricao: string
  /** Novos objetivos do plano; null = manter os atuais e só criar nova meta */
  objetivos: Objetivo[] | null
  novaMeta: boolean
}

/** Próximos passos sugeridos depois de bater a meta. */
export function nextStepOptions(direction: GoalDirection, objetivos: Objetivo[]): NextStepOption[] {
  const cond = objetivos.includes('condicionamento') ? (['condicionamento'] as Objetivo[]) : []
  if (direction === 'perder') {
    return [
      { id: 'massa', titulo: 'Ganhar massa muscular', descricao: 'Superávit leve e treino de hipertrofia para construir músculo.', objetivos: ['ganhar_massa', ...cond], novaMeta: true },
      { id: 'manter', titulo: 'Manter meu novo peso', descricao: 'Calorias no nível do gasto diário para consolidar o resultado.', objetivos: ['manter', ...cond], novaMeta: false },
      { id: 'continuar', titulo: 'Continuar emagrecendo', descricao: 'Mesmo plano, com uma nova meta de peso.', objetivos: null, novaMeta: true },
    ]
  }
  return [
    { id: 'definir', titulo: 'Fazer definição', descricao: 'Perder gordura preservando o músculo que você ganhou (recomposição).', objetivos: ['emagrecer', 'ganhar_massa', ...cond], novaMeta: true },
    { id: 'manter', titulo: 'Manter meu novo peso', descricao: 'Calorias no nível do gasto diário para consolidar o resultado.', objetivos: ['manter', ...cond], novaMeta: false },
    { id: 'continuar', titulo: 'Continuar ganhando massa', descricao: 'Mesmo plano, com uma nova meta de peso.', objetivos: null, novaMeta: true },
  ]
}

const MENSAGENS_MOTIVACAO = [
  'Cada refeição registrada e cada treino feito te trouxeram até aqui. Isso é disciplina de verdade!',
  'Você provou para si mesmo que consegue. Agora é usar essa confiança no próximo desafio!',
  'Resultado não é sorte, é constância. E você foi constante!',
  'Lembra do primeiro dia? Olha o quanto você evoluiu. Orgulho define!',
  'Meta batida! O mais difícil, que é criar o hábito, você já fez.',
]

export function motivationMessage(seed: string) {
  let hash = 0
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return MENSAGENS_MOTIVACAO[Math.abs(hash) % MENSAGENS_MOTIVACAO.length]
}

/** Marcos intermediários (25/50/75%) cruzados entre duas pesagens. */
export function crossedMilestone(
  goal: Pick<WeightGoal, 'peso_inicial_kg' | 'peso_meta_kg'>,
  antes: number,
  depois: number,
): 25 | 50 | 75 | null {
  const a = goalProgress(goal, antes)
  const b = goalProgress(goal, depois)
  for (const m of [75, 50, 25] as const) {
    if (a < m / 100 && b >= m / 100 && b < 1) return m
  }
  return null
}
