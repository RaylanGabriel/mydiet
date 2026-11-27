/**
 * Cardápio sugerido: distribui as calorias e a proteína do plano nas refeições
 * e calcula as gramas de cada alimento, com trocas equivalentes.
 *
 * Valores nutricionais por 100 g (ou 100 ml) da TACO (4ª ed.), alimentos já
 * preparados. Só entram alimentos comuns e de preço acessível.
 *
 * Equivalência das trocas: fontes de proteína trocam por proteína igual; os
 * demais grupos trocam por calorias iguais.
 */

interface Food {
  /** Usado em "130 g de <nome>" */
  nome: string
  kcal: number
  p: number
  c: number
  g: number
  medida?: 'g' | 'ml'
  /** Alimentos contados por unidade (ovo, pão, fruta) */
  unidade?: { g: number; singular: string; plural: string }
  min: number
  max: number
}

const FOODS = {
  // Proteínas
  frango_grelhado: { nome: 'peito de frango grelhado', kcal: 159, p: 32, c: 0, g: 2.5, min: 60, max: 250 },
  frango_desfiado: { nome: 'frango desfiado', kcal: 163, p: 31.5, c: 0, g: 3.2, min: 40, max: 250 },
  coxa_frango: { nome: 'coxa de frango sem pele', kcal: 167, p: 26.9, c: 0, g: 5.8, min: 60, max: 250 },
  patinho: { nome: 'patinho moído', kcal: 219, p: 35.9, c: 0, g: 7.3, min: 60, max: 220 },
  acem: { nome: 'carne moída de acém', kcal: 212, p: 26.7, c: 0, g: 10.9, min: 60, max: 220 },
  lombo: { nome: 'lombo suíno assado', kcal: 210, p: 35.7, c: 0, g: 6.4, min: 60, max: 220 },
  figado: { nome: 'bife de fígado', kcal: 225, p: 29.9, c: 4.2, g: 9, min: 60, max: 200 },
  tilapia: { nome: 'filé de tilápia assado', kcal: 128, p: 26.2, c: 0, g: 2.7, min: 80, max: 280 },
  sardinha: { nome: 'sardinha assada', kcal: 164, p: 32.2, c: 0, g: 3, min: 60, max: 250 },
  ovo: {
    nome: 'ovo cozido',
    kcal: 146,
    p: 13.3,
    c: 0.6,
    g: 9.5,
    unidade: { g: 50, singular: 'ovo cozido ou mexido', plural: 'ovos cozidos ou mexidos' },
    min: 50,
    max: 200,
  },
  queijo_minas: { nome: 'queijo minas frescal', kcal: 264, p: 17.4, c: 3.2, g: 20.2, min: 20, max: 120 },
  iogurte: { nome: 'iogurte natural', kcal: 51, p: 4.1, c: 1.9, g: 3, min: 100, max: 300 },
  leite: { nome: 'leite desnatado', kcal: 35, p: 3.4, c: 5, g: 0, medida: 'ml', min: 150, max: 400 },

  // Carboidratos
  arroz: { nome: 'arroz branco', kcal: 128, p: 2.5, c: 28.1, g: 0.2, min: 50, max: 400 },
  arroz_integral: { nome: 'arroz integral', kcal: 124, p: 2.6, c: 25.8, g: 1, min: 50, max: 400 },
  batata: { nome: 'batata inglesa cozida', kcal: 52, p: 1.2, c: 11.9, g: 0, min: 100, max: 450 },
  batata_doce: { nome: 'batata-doce cozida', kcal: 77, p: 0.6, c: 18.4, g: 0.1, min: 80, max: 400 },
  mandioca: { nome: 'mandioca cozida', kcal: 125, p: 0.6, c: 30.1, g: 0.3, min: 50, max: 300 },
  macarrao: { nome: 'macarrão cozido', kcal: 158, p: 5.8, c: 30.9, g: 0.9, min: 50, max: 350 },
  cuscuz: { nome: 'cuscuz de milho', kcal: 113, p: 2.2, c: 25.3, g: 0.7, min: 50, max: 300 },
  pao_frances: {
    nome: 'pão francês',
    kcal: 300,
    p: 8,
    c: 58.6,
    g: 3.1,
    unidade: { g: 50, singular: 'pão francês', plural: 'pães franceses' },
    min: 50,
    max: 150,
  },
  pao_integral: {
    nome: 'pão de forma integral',
    kcal: 253,
    p: 9.4,
    c: 49.9,
    g: 3.7,
    unidade: { g: 25, singular: 'fatia de pão de forma integral', plural: 'fatias de pão de forma integral' },
    min: 25,
    max: 125,
  },
  tapioca: { nome: 'goma de tapioca', kcal: 240, p: 0, c: 59.5, g: 0, min: 30, max: 120 },
  aveia: { nome: 'aveia em flocos', kcal: 394, p: 13.9, c: 66.6, g: 8.5, min: 15, max: 60 },

  // Leguminosas
  feijao: { nome: 'feijão carioca', kcal: 76, p: 4.8, c: 13.6, g: 0.5, min: 60, max: 250 },
  feijao_preto: { nome: 'feijão preto', kcal: 77, p: 4.5, c: 14, g: 0.5, min: 60, max: 250 },
  lentilha: { nome: 'lentilha cozida', kcal: 93, p: 6.3, c: 16.3, g: 0.5, min: 60, max: 220 },

  // Frutas
  banana: {
    nome: 'banana prata',
    kcal: 98,
    p: 1.3,
    c: 26,
    g: 0.1,
    unidade: { g: 75, singular: 'banana prata média', plural: 'bananas prata médias' },
    min: 75,
    max: 225,
  },
  mamao: { nome: 'mamão', kcal: 40, p: 0.5, c: 10.4, g: 0.1, min: 100, max: 350 },
  maca: {
    nome: 'maçã',
    kcal: 56,
    p: 0.3,
    c: 15.2,
    g: 0,
    unidade: { g: 130, singular: 'maçã média', plural: 'maçãs médias' },
    min: 130,
    max: 260,
  },
  laranja: {
    nome: 'laranja',
    kcal: 37,
    p: 1,
    c: 8.9,
    g: 0.1,
    unidade: { g: 140, singular: 'laranja média', plural: 'laranjas médias' },
    min: 140,
    max: 420,
  },
  melancia: { nome: 'melancia', kcal: 33, p: 0.9, c: 8.1, g: 0, min: 150, max: 450 },
  abacaxi: { nome: 'abacaxi', kcal: 48, p: 0.9, c: 12.3, g: 0.1, min: 100, max: 350 },

  // Gorduras
  azeite: {
    nome: 'azeite',
    kcal: 884,
    p: 0,
    c: 0,
    g: 100,
    medida: 'ml',
    unidade: { g: 5, singular: 'colher de chá de azeite', plural: 'colheres de chá de azeite' },
    min: 5,
    max: 10,
  },
  pasta_amendoim: { nome: 'pasta de amendoim', kcal: 588, p: 25, c: 20, g: 50, min: 10, max: 30 },
} satisfies Record<string, Food>

type FoodId = keyof typeof FOODS

export type Papel = 'proteina' | 'carboidrato' | 'leguminosa' | 'fruta' | 'gordura' | 'vegetais' | 'bebida'

export const PAPEL_LABEL: Record<Papel, string> = {
  proteina: 'Proteína',
  carboidrato: 'Carboidrato',
  leguminosa: 'Leguminosa',
  fruta: 'Fruta',
  gordura: 'Gordura boa',
  vegetais: 'Vegetais',
  bebida: 'Bebida',
}

type Slot =
  /** Quantidade calculada para fechar a proteína da refeição */
  | { papel: Papel; modo: 'proteina'; opcoes: FoodId[] }
  /** Quantidade calculada para fechar as calorias da refeição */
  | { papel: Papel; modo: 'completa'; opcoes: FoodId[] }
  /** Porção fixa (em uma dieta de 2000 kcal), ajustada às calorias do dia */
  | { papel: Papel; modo: 'fixo'; opcoes: FoodId[]; base: number }
  /** Item sem quantidade */
  | { papel: Papel; modo: 'livre'; texto: string; detalhe?: string }

type MealId = 'cafe' | 'lanche_manha' | 'almoco' | 'lanche_tarde' | 'jantar' | 'ceia'

const MEALS: Record<MealId, { nome: string; horario: string; slots: Slot[] }> = {
  cafe: {
    nome: 'Café da manhã',
    horario: '07:00',
    slots: [
      { papel: 'carboidrato', modo: 'completa', opcoes: ['pao_frances', 'pao_integral', 'tapioca', 'cuscuz'] },
      { papel: 'proteina', modo: 'proteina', opcoes: ['ovo', 'frango_desfiado', 'queijo_minas'] },
      { papel: 'fruta', modo: 'fixo', base: 150, opcoes: ['mamao', 'banana', 'maca', 'laranja', 'melancia', 'abacaxi'] },
      { papel: 'bebida', modo: 'livre', texto: 'Café ou chá sem açúcar à vontade', detalhe: 'Pode usar adoçante' },
    ],
  },
  lanche_manha: {
    nome: 'Lanche da manhã',
    horario: '10:00',
    slots: [
      { papel: 'fruta', modo: 'completa', opcoes: ['banana', 'maca', 'mamao', 'laranja', 'abacaxi', 'melancia'] },
      { papel: 'proteina', modo: 'proteina', opcoes: ['iogurte', 'leite'] },
    ],
  },
  almoco: {
    nome: 'Almoço',
    horario: '12:30',
    slots: [
      {
        papel: 'proteina',
        modo: 'proteina',
        opcoes: ['frango_grelhado', 'frango_desfiado', 'patinho', 'coxa_frango', 'acem', 'lombo', 'tilapia', 'sardinha', 'figado'],
      },
      {
        papel: 'carboidrato',
        modo: 'completa',
        opcoes: ['arroz', 'arroz_integral', 'batata', 'batata_doce', 'mandioca', 'macarrao', 'cuscuz'],
      },
      { papel: 'leguminosa', modo: 'fixo', base: 90, opcoes: ['feijao', 'feijao_preto', 'lentilha'] },
      {
        papel: 'vegetais',
        modo: 'livre',
        texto: 'Salada e legumes à vontade',
        detalhe: 'Alface, tomate, pepino, cenoura, repolho, chuchu, abobrinha',
      },
      { papel: 'gordura', modo: 'fixo', base: 5, opcoes: ['azeite'] },
    ],
  },
  lanche_tarde: {
    nome: 'Lanche da tarde',
    horario: '16:00',
    slots: [
      { papel: 'carboidrato', modo: 'completa', opcoes: ['pao_frances', 'pao_integral', 'tapioca', 'cuscuz'] },
      { papel: 'proteina', modo: 'proteina', opcoes: ['ovo', 'frango_desfiado', 'queijo_minas'] },
      { papel: 'bebida', modo: 'livre', texto: 'Café, chá ou água à vontade' },
    ],
  },
  jantar: {
    nome: 'Jantar',
    horario: '19:30',
    slots: [
      {
        papel: 'proteina',
        modo: 'proteina',
        opcoes: ['frango_desfiado', 'frango_grelhado', 'patinho', 'tilapia', 'coxa_frango', 'acem', 'lombo', 'sardinha', 'ovo'],
      },
      {
        papel: 'carboidrato',
        modo: 'completa',
        opcoes: ['batata', 'arroz', 'batata_doce', 'mandioca', 'macarrao', 'arroz_integral', 'cuscuz'],
      },
      {
        papel: 'vegetais',
        modo: 'livre',
        texto: 'Salada e legumes à vontade',
        detalhe: 'Folhas, tomate, brócolis, cenoura, abobrinha, berinjela',
      },
      { papel: 'gordura', modo: 'fixo', base: 5, opcoes: ['azeite'] },
    ],
  },
  ceia: {
    nome: 'Ceia',
    horario: '21:30',
    slots: [
      { papel: 'proteina', modo: 'proteina', opcoes: ['iogurte', 'leite'] },
      { papel: 'carboidrato', modo: 'completa', opcoes: ['aveia', 'banana', 'mamao', 'pasta_amendoim'] },
    ],
  },
}

export const MEAL_COUNT_OPTIONS = [4, 5, 6] as const
export type MealCount = (typeof MEAL_COUNT_OPTIONS)[number]

const DISTRIBUICAO: Record<MealCount, [MealId, number][]> = {
  4: [
    ['cafe', 0.25],
    ['almoco', 0.35],
    ['lanche_tarde', 0.15],
    ['jantar', 0.25],
  ],
  5: [
    ['cafe', 0.2],
    ['lanche_manha', 0.1],
    ['almoco', 0.3],
    ['lanche_tarde', 0.15],
    ['jantar', 0.25],
  ],
  6: [
    ['cafe', 0.2],
    ['lanche_manha', 0.1],
    ['almoco', 0.27],
    ['lanche_tarde', 0.13],
    ['jantar', 0.22],
    ['ceia', 0.08],
  ],
}

export interface Macros {
  kcal: number
  p: number
  c: number
  g: number
}

export interface Portion {
  /** Texto pronto: "130 g de frango desfiado", "2 ovos cozidos (100 g)" */
  texto: string
  /** Nome curto do alimento, para a lista de trocas */
  alimento: string
  macros: Macros
}

export interface MealItem {
  id: string
  papel: Papel
  /** Itens livres não têm porção (salada à vontade, café) */
  livre?: { texto: string; detalhe?: string }
  /** Primeira opção é a sugestão; as demais são trocas equivalentes */
  opcoes: Portion[]
}

export interface PlannedMeal {
  id: MealId
  nome: string
  horario: string
  percentual: number
  alvo: Macros
  itens: MealItem[]
}

const ZERO: Macros = { kcal: 0, p: 0, c: 0, g: 0 }

function macrosOf(food: Food, grams: number): Macros {
  const f = grams / 100
  return { kcal: food.kcal * f, p: food.p * f, c: food.c * f, g: food.g * f }
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce((a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, g: a.g + m.g }), ZERO)
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Arredonda para uma medida fácil de pesar (unidades inteiras, 5 g ou 10 g). */
function roundPortion(food: Food, grams: number): number {
  const g = clamp(grams, food.min, food.max)
  if (food.unidade) {
    const n = Math.max(1, Math.round(g / food.unidade.g))
    return Math.min(n * food.unidade.g, Math.max(food.unidade.g, food.max))
  }
  return g < 60 ? Math.max(5, Math.round(g / 5) * 5) : Math.round(g / 10) * 10
}

function portion(food: Food, grams: number): Portion {
  const unidadeMedida = food.medida ?? 'g'
  let texto: string
  if (food.unidade) {
    const n = Math.round(grams / food.unidade.g)
    texto = `${n} ${n === 1 ? food.unidade.singular : food.unidade.plural} (${grams} ${unidadeMedida})`
  } else {
    texto = `${grams} ${unidadeMedida} de ${food.nome}`
  }
  return { texto, alimento: food.nome, macros: macrosOf(food, grams) }
}

/** Gramas de `alt` equivalentes a `grams` de `base`. */
function equivalent(base: Food, grams: number, alt: Food, porProteina: boolean): number {
  if (porProteina && base.p > 0 && alt.p > 0) return (grams * base.p) / alt.p
  return (grams * base.kcal) / alt.kcal
}

/** Fração máxima das calorias da refeição que a fonte de proteína pode ocupar */
const TETO_PROTEINA = 0.55
/** Trocas que fogem mais que isso da sugestão (por limite de porção) não são exibidas */
const TOLERANCIA_TROCA = 0.2

const MAIN_MEALS: MealId[] = ['almoco', 'jantar']

function slotFoods(s: Slot): FoodId[] {
  return s.modo === 'livre' ? [] : s.opcoes
}

function buildMeal(id: MealId, percentual: number, alvo: Macros, escala: number): PlannedMeal {
  const meal = MEALS[id]

  // 1) Porções fixas
  const gramas = new Map<number, number>()
  meal.slots.forEach((s, i) => {
    if (s.modo === 'fixo') gramas.set(i, roundPortion(FOODS[s.opcoes[0]], s.base * escala))
  })
  const fixo = sumMacros([...gramas].map(([i, g]) => macrosOf(FOODS[slotFoods(meal.slots[i])[0]], g)))

  // 2) Proteína e complemento calórico, ajustados juntos (cada um interfere no outro)
  const iProt = meal.slots.findIndex((s) => s.modo === 'proteina')
  const iComp = meal.slots.findIndex((s) => s.modo === 'completa')
  const prot = iProt >= 0 ? FOODS[slotFoods(meal.slots[iProt])[0]] : null
  const tetoProt = prot ? ((alvo.kcal * TETO_PROTEINA) / prot.kcal) * 100 : 0

  const solve = (comp: Food | null) => {
    let gp = prot ? prot.min : 0
    let gc = comp ? comp.min : 0
    let livre = 0 // gramas que o complemento precisaria sem limite
    for (let k = 0; k < 4; k++) {
      if (prot) {
        const pComp = comp ? macrosOf(comp, gc).p : 0
        gp = clamp(Math.min(((alvo.p - fixo.p - pComp) / prot.p) * 100, tetoProt), prot.min, prot.max)
      }
      if (comp) {
        const kProt = prot ? macrosOf(prot, gp).kcal : 0
        livre = ((alvo.kcal - fixo.kcal - kProt) / comp.kcal) * 100
        gc = clamp(livre, comp.min, comp.max)
      }
    }
    return { gp, gc, cabe: !comp || livre <= comp.max }
  }

  // O complemento sugerido é o primeiro da lista cuja porção cabe no limite
  // (ex.: em dietas grandes, arroz no lugar de 600 g de batata)
  let compIdx = 0
  let res = solve(null)
  if (iComp >= 0) {
    const opcoes = slotFoods(meal.slots[iComp])
    compIdx = opcoes.findIndex((fid) => solve(FOODS[fid]).cabe)
    if (compIdx < 0) compIdx = opcoes.reduce((best, fid, j) => (FOODS[fid].max * FOODS[fid].kcal > FOODS[opcoes[best]].max * FOODS[opcoes[best]].kcal ? j : best), 0)
    res = solve(FOODS[opcoes[compIdx]])
  }
  if (prot) gramas.set(iProt, roundPortion(prot, res.gp))
  if (iComp >= 0) gramas.set(iComp, roundPortion(FOODS[slotFoods(meal.slots[iComp])[compIdx]], res.gc))

  // 3) Itens com as trocas
  const itens: MealItem[] = meal.slots.map((s, i) => {
    const itemId = `${id}-${i}`
    if (s.modo === 'livre') return { id: itemId, papel: s.papel, livre: { texto: s.texto, detalhe: s.detalhe }, opcoes: [] }
    const ordem = i === iComp && compIdx > 0 ? [s.opcoes[compIdx], ...s.opcoes.filter((_, j) => j !== compIdx)] : s.opcoes
    const base = FOODS[ordem[0]]
    const g = gramas.get(i) ?? base.min
    const sugestao = portion(base, g)
    const porProteina = s.modo === 'proteina'
    const ref = porProteina ? sugestao.macros.p : sugestao.macros.kcal
    const trocas = ordem.slice(1).flatMap((fid) => {
      const alt = FOODS[fid]
      const troca = portion(alt, roundPortion(alt, equivalent(base, g, alt, porProteina)))
      const valor = porProteina ? troca.macros.p : troca.macros.kcal
      return ref > 0 && Math.abs(valor - ref) / ref > TOLERANCIA_TROCA ? [] : [troca]
    })
    return { id: itemId, papel: s.papel, opcoes: [sugestao, ...trocas] }
  })

  return { id, nome: meal.nome, horario: meal.horario, percentual, alvo, itens }
}

export function buildMealPlan(dia: { calorias: number; proteina_g: number }, refeicoes: MealCount): PlannedMeal[] {
  const escala = clamp(dia.calorias / 2000, 0.75, 1.5)
  const dist = DISTRIBUICAO[refeicoes]
  const alvoDe = (pct: number): Macros => ({ kcal: dia.calorias * pct, p: dia.proteina_g * pct, c: 0, g: 0 })

  // Lanches primeiro; o que sobrar ou faltar neles (porções arredondadas) vai
  // para o almoço e o jantar, para o dia fechar perto da meta
  const result = new Map<MealId, PlannedMeal>()
  let sobraK = 0
  let sobraP = 0
  for (const [id, pct] of dist) {
    if (MAIN_MEALS.includes(id)) continue
    const meal = buildMeal(id, pct, alvoDe(pct), escala)
    const t = mealTotals(meal, {})
    sobraK += meal.alvo.kcal - t.kcal
    sobraP += meal.alvo.p - t.p
    result.set(id, meal)
  }
  const pctMain = dist.filter(([id]) => MAIN_MEALS.includes(id)).reduce((s, [, pct]) => s + pct, 0)
  for (const [id, pct] of dist) {
    if (!MAIN_MEALS.includes(id)) continue
    const share = pct / pctMain
    const alvo = alvoDe(pct)
    alvo.kcal = Math.max(alvo.kcal * 0.6, alvo.kcal + sobraK * share)
    alvo.p = Math.max(alvo.p * 0.6, alvo.p + sobraP * share)
    result.set(id, buildMeal(id, pct, alvo, escala))
  }
  return dist.map(([id]) => result.get(id)!)
}

/** Troca escolhida por item: id do item → nome do alimento escolhido. */
export type SwapSelection = Record<string, string>

export function selectedPortion(item: MealItem, sel: SwapSelection): Portion | null {
  if (item.opcoes.length === 0) return null
  return item.opcoes.find((o) => o.alimento === sel[item.id]) ?? item.opcoes[0]
}

export function mealTotals(meal: PlannedMeal, sel: SwapSelection): Macros {
  return sumMacros(meal.itens.map((it) => selectedPortion(it, sel)?.macros ?? ZERO))
}
