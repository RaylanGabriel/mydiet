// Usado apenas pelas rotas de API (servidor): lê segredos de process.env.

/** Alimento vindo de uma fonte externa, sempre normalizado para 100 g (ou 100 ml). */
export interface ExternalFood {
  id: string
  nome: string
  marca: string | null
  quantidade_padrao: string
  calorias: number
  proteina: number
  carboidratos: number
  gordura: number
  source: 'openfoodfacts' | 'fatsecret' | 'ia'
  /** Porção comum sugerida, ex.: "1 unidade (50g)" */
  porcao: string | null
}

const round1 = (n: number) => Math.round(n * 10) / 10

export const normalizeName = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Descarta dados incompletos ou absurdos: as calorias precisam bater
 * (com folga) com 4·P + 4·C + 9·G, e nada pode passar do limite físico por 100 g.
 */
export function isPlausible(f: Pick<ExternalFood, 'calorias' | 'proteina' | 'carboidratos' | 'gordura'>) {
  const { calorias, proteina, carboidratos, gordura } = f
  if (![calorias, proteina, carboidratos, gordura].every((n) => Number.isFinite(n) && n >= 0)) return false
  if (calorias > 900 || proteina > 100 || carboidratos > 100 || gordura > 100) return false
  if (proteina + carboidratos + gordura > 105) return false
  const estimado = proteina * 4 + carboidratos * 4 + gordura * 9
  if (calorias === 0) return estimado < 5 // água, café, chá…
  // Fibras, álcool e polióis explicam diferenças moderadas
  return Math.abs(calorias - estimado) <= Math.max(40, calorias * 0.3)
}

// ---------------------------------------------------------------------------
// Cache simples em memória (por instância do servidor), para poupar as APIs
// ---------------------------------------------------------------------------
const cache = new Map<string, { at: number; data: ExternalFood[] }>()
const TTL = 60 * 60 * 1000

export function cached(key: string) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL) return hit.data
  return null
}

export function remember(key: string, data: ExternalFood[]) {
  if (cache.size > 300) cache.delete(cache.keys().next().value as string)
  cache.set(key, { at: Date.now(), data })
}

// ---------------------------------------------------------------------------
// Open Food Facts (Brasil) — base aberta, forte em produtos industrializados
// ---------------------------------------------------------------------------
type OffProduct = {
  code?: string
  product_name?: string
  product_name_pt?: string
  /** A API nova devolve lista; a antiga, texto separado por vírgula */
  brands?: string | string[]
  quantity?: string
  nutriments?: Record<string, number | string | undefined>
}

const num = (v: unknown) => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : NaN
}

/**
 * Usa o serviço de busca novo do Open Food Facts (search.openfoodfacts.org), que é rápido e
 * não tem o limite de ~10 buscas/min da busca antiga. Primeiro produtos vendidos no Brasil;
 * se vierem poucos, completa com a base mundial.
 */
export async function searchOpenFoodFacts(query: string, signal: AbortSignal): Promise<ExternalFood[]> {
  const fetchHits = async (q: string) => {
    const params = new URLSearchParams({
      q,
      page_size: '30',
      langs: 'pt',
      fields: 'code,product_name,product_name_pt,brands,quantity,nutriments',
    })
    const res = await fetch(`https://search.openfoodfacts.org/search?${params}`, {
      headers: { 'User-Agent': 'MyDiet/1.0 (app de dieta)' },
      signal,
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`OFF_${res.status}`)
    return ((await res.json()) as { hits?: OffProduct[] }).hits ?? []
  }

  const brasil = mapOffProducts(await fetchHits(`${query} countries_tags:"en:brazil"`))
  if (brasil.length >= 3) return brasil
  const mundo = mapOffProducts(await fetchHits(query))
  const ids = new Set(brasil.map((f) => f.id))
  return [...brasil, ...mundo.filter((f) => !ids.has(f.id))].slice(0, 8)
}

function mapOffProducts(products: OffProduct[]): ExternalFood[] {
  const seen = new Set<string>()
  const out: ExternalFood[] = []
  for (const p of products) {
    const nome = (p.product_name_pt || p.product_name || '').trim()
    if (!nome || !p.code) continue
    const n = p.nutriments ?? {}
    const kcal = Number.isFinite(num(n['energy-kcal_100g'])) ? num(n['energy-kcal_100g']) : num(n.energy_100g) / 4.184
    const food = {
      calorias: Math.round(kcal),
      proteina: round1(num(n.proteins_100g)),
      carboidratos: round1(num(n.carbohydrates_100g)),
      gordura: round1(num(n.fat_100g)),
    }
    if (!isPlausible(food)) continue
    const marca = (Array.isArray(p.brands) ? p.brands[0] : p.brands?.split(',')[0])?.trim() || null
    const key = normalizeName(`${nome} ${marca ?? ''}`)
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ id: `off-${p.code}`, nome, marca, quantidade_padrao: '100g', ...food, source: 'openfoodfacts', porcao: p.quantity ?? null })
    if (out.length >= 8) break
  }
  return out
}

// ---------------------------------------------------------------------------
// FatSecret — exige o IP do servidor liberado no painel deles (erro 21)
// ---------------------------------------------------------------------------
const FATSECRET_TOKEN_URL = 'https://oauth.fatsecret.com/connect/token'
const FATSECRET_API_URL = 'https://platform.fatsecret.com/rest/server.api'
let fatSecretToken: { value: string; expiresAt: number } | null = null
let fatSecretBlockedUntil = 0

async function getFatSecretToken(signal: AbortSignal) {
  if (fatSecretToken && fatSecretToken.expiresAt > Date.now() + 30_000) return fatSecretToken.value
  const id = process.env.FATSECRET_CLIENT_ID
  const secret = process.env.FATSECRET_CLIENT_SECRET
  if (!id || !secret) return null
  const res = await fetch(FATSECRET_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=basic',
    cache: 'no-store',
    signal,
  })
  if (!res.ok) return null
  const data = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!data.access_token) return null
  fatSecretToken = { value: data.access_token, expiresAt: Date.now() + Math.max(60, (data.expires_in ?? 3600) - 60) * 1000 }
  return data.access_token
}

/**
 * O método básico devolve só um texto, ex.:
 * "Per 100g - Calories: 248kcal | Fat: 3.80g | Carbs: 53.40g | Protein: 1.10g"
 * ou "Per 1 unidade (50g) - ...". Convertemos tudo para 100 g quando há gramas.
 */
function parseFatSecretDescription(desc: string) {
  const m = desc.match(
    /(?:per|por)\s+(.+?)\s+-\s+cal\w*:\s*([\d.,]+)\s*kcal\s*\|\s*(?:fat|gord\w*):\s*([\d.,]+)\s*g\s*\|\s*(?:carbs|carb\w*):\s*([\d.,]+)\s*g\s*\|\s*(?:protein|prot\w*):\s*([\d.,]+)\s*g/i,
  )
  if (!m) return null
  const [, porcao, kcal, fat, carbs, prot] = m
  const grams = porcao.match(/([\d.,]+)\s*(g|ml)\b/i)
  if (!grams) return null
  const factor = 100 / num(grams[1])
  if (!Number.isFinite(factor) || factor <= 0) return null
  return {
    porcao: /^100\s*(g|ml)$/i.test(porcao.trim()) ? null : porcao.trim(),
    calorias: Math.round(num(kcal) * factor),
    gordura: round1(num(fat) * factor),
    carboidratos: round1(num(carbs) * factor),
    proteina: round1(num(prot) * factor),
  }
}

export async function searchFatSecret(query: string, signal: AbortSignal): Promise<ExternalFood[]> {
  if (Date.now() < fatSecretBlockedUntil) return []
  const token = await getFatSecretToken(signal)
  if (!token) return []
  const res = await fetch(FATSECRET_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ method: 'foods.search', search_expression: query, format: 'json', max_results: '10' }),
    cache: 'no-store',
    signal,
  })
  const data = (await res.json().catch(() => null)) as {
    error?: { code?: number; message?: string }
    foods?: { food?: FatSecretFood | FatSecretFood[] }
  } | null
  if (data?.error) {
    // Erro 21 = IP do servidor não liberado no painel do FatSecret. Pausa 10 min para não insistir.
    if (data.error.code === 21) {
      fatSecretBlockedUntil = Date.now() + 10 * 60 * 1000
      console.warn('[fatsecret] IP do servidor não liberado (erro 21). Libere-o em platform.fatsecret.com > API Key > Allowed IPs.')
    } else {
      console.warn('[fatsecret] erro:', data.error.code, data.error.message)
    }
    return []
  }
  const raw = data?.foods?.food
  const list = Array.isArray(raw) ? raw : raw ? [raw] : []
  const out: ExternalFood[] = []
  for (const f of list) {
    if (!f.food_id || !f.food_name || !f.food_description) continue
    const parsed = parseFatSecretDescription(f.food_description)
    if (!parsed || !isPlausible(parsed)) continue
    out.push({
      id: `fatsecret-${f.food_id}`,
      nome: f.food_name.trim(),
      marca: f.brand_name?.trim() || null,
      quantidade_padrao: '100g',
      calorias: parsed.calorias,
      proteina: parsed.proteina,
      carboidratos: parsed.carboidratos,
      gordura: parsed.gordura,
      source: 'fatsecret',
      porcao: parsed.porcao,
    })
  }
  return out
}

type FatSecretFood = { food_id?: string; food_name?: string; brand_name?: string; food_description?: string }
