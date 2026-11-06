import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { cached, isPlausible, normalizeName, remember, type ExternalFood } from '@/lib/food-sources'

export const maxDuration = 30

const requestSchema = z.object({ q: z.string().trim().min(2).max(80) })

const itemSchema = z.object({
  nome: z.string().min(1),
  calorias: z.coerce.number(),
  proteina: z.coerce.number(),
  carboidratos: z.coerce.number(),
  gordura: z.coerce.number(),
  porcao: z.string().nullish(),
  porcao_gramas: z.coerce.number().nullish(),
})
const responseSchema = z.object({ alimentos: z.array(itemSchema) })

const prompt = (q: string) =>
  `Você é um nutricionista brasileiro. O usuário procura o alimento: "${q}".\n` +
  'Informe os valores nutricionais POR 100 g (ou 100 ml para bebidas), priorizando a TACO (UNICAMP) e a TBCA (USP); ' +
  'para produtos de marca, use o rótulo do fabricante. Se o nome for ambíguo, traga até 3 variações comuns ' +
  '(ex.: cru/cozido, com/sem açúcar), da mais provável para a menos provável.\n' +
  'Inclua também a porção caseira mais comum (ex.: "1 unidade média", "1 colher de sopa") e quantos gramas ela tem.\n' +
  'Responda SOMENTE com JSON, sem texto extra, no formato: ' +
  '{"alimentos":[{"nome":"Tapioca com coco","calorias":0,"proteina":0,"carboidratos":0,"gordura":0,"porcao":"1 unidade média","porcao_gramas":80}]}. ' +
  'Calorias inteiras, macros com 1 casa decimal. Se não for um alimento, retorne {"alimentos":[]}.'

type Attempt = { label: string; fonte: 'google' | 'ia'; run: (signal: AbortSignal) => Promise<{ text: string; fontes: string[] } | { status: number }> }

function gemini(apiKey: string, model: string, q: string, google: boolean): Attempt['run'] {
  return async (signal) => {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt(q) }] }],
        // A busca no Google não aceita responseMimeType JSON; o texto é tratado no parse
        ...(google ? { tools: [{ google_search: {} }] } : { generationConfig: { responseMimeType: 'application/json' } }),
      }),
      signal,
    })
    if (!res.ok) return { status: res.status }
    const data = await res.json()
    const text = (data.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('')
    const fontes = (data.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [])
      .map((c: { web?: { title?: string } }) => c.web?.title)
      .filter(Boolean)
      .slice(0, 3)
    return { text, fontes }
  }
}

function openRouter(apiKey: string, model: string, q: string): Attempt['run'] {
  return async (signal) => {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt(q) }] }),
      signal,
    })
    if (!res.ok) return { status: res.status }
    const data = await res.json()
    if (data.error) return { status: typeof data.error.code === 'number' ? data.error.code : 500 }
    return { text: data.choices?.[0]?.message?.content ?? '', fontes: [] }
  }
}

function parse(text: string, fonte: 'google' | 'ia'): ExternalFood[] | null {
  // Tolera ```json ... ``` e texto antes/depois do JSON
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  let json: unknown
  try {
    json = JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
  const parsed = responseSchema.safeParse(json)
  if (!parsed.success) return null
  return parsed.data.alimentos
    .map((a, i) => ({
      id: `${fonte}-${normalizeName(a.nome).replace(/\W+/g, '-')}-${i}`,
      nome: a.nome.trim(),
      marca: null,
      // Já sugere a porção caseira (ex.: "80g (1 unidade média)")
      quantidade_padrao: a.porcao_gramas && a.porcao_gramas > 0 && a.porcao_gramas <= 1000
        ? `${Math.round(a.porcao_gramas)}g${a.porcao ? ` (${a.porcao})` : ''}`
        : '100g',
      calorias: Math.round(a.calorias),
      proteina: Math.round(a.proteina * 10) / 10,
      carboidratos: Math.round(a.carboidratos * 10) / 10,
      gordura: Math.round(a.gordura * 10) / 10,
      source: 'ia' as const,
      porcao: a.porcao && a.porcao_gramas ? `${a.porcao} (${Math.round(a.porcao_gramas)}g)` : null,
    }))
    .filter(isPlausible)
    .slice(0, 3)
}

/**
 * "Pesquisar com IA": tenta o Gemini com busca no Google (precisa de faturamento ativo no
 * Google AI Studio) e, se não estiver disponível, usa a estimativa do próprio modelo.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) return Response.json({ error: 'Faça login para pesquisar.' }, { status: 401 })

  const body = requestSchema.safeParse(await req.json().catch(() => null))
  if (!body.success) return Response.json({ error: 'Digite o nome de um alimento.' }, { status: 400 })
  const q = body.data.q

  const key = `ai:${normalizeName(q)}`
  const hit = cached(key)
  if (hit) return Response.json({ foods: hit, fonte: hit[0]?.id.startsWith('google') ? 'google' : 'ia', fontes: [] })

  const geminiKey = process.env.GEMINI_API_KEY
  const openRouterKey = process.env.OPENROUTER_API_KEY
  const attempts: Attempt[] = []
  if (geminiKey) {
    attempts.push(
      { label: 'Gemini lite + Google', fonte: 'google', run: gemini(geminiKey, 'gemini-flash-lite-latest', q, true) },
      { label: 'Gemini lite', fonte: 'ia', run: gemini(geminiKey, 'gemini-flash-lite-latest', q, false) },
      { label: 'Gemini flash', fonte: 'ia', run: gemini(geminiKey, 'gemini-flash-latest', q, false) },
    )
  }
  if (openRouterKey) {
    attempts.push({ label: 'OpenRouter Gemma', fonte: 'ia', run: openRouter(openRouterKey, 'google/gemma-4-26b-a4b-it:free', q) })
  }
  if (attempts.length === 0) {
    return Response.json({ error: 'A pesquisa com IA não está configurada no servidor.' }, { status: 503 })
  }

  const deadline = Date.now() + 25_000
  let sobrecarga = false
  for (const attempt of attempts) {
    const remaining = deadline - Date.now()
    if (remaining < 3_000) break
    try {
      const result = await attempt.run(AbortSignal.timeout(Math.min(10_000, remaining)))
      if ('status' in result) {
        if (result.status === 429 || result.status === 503) sobrecarga = true
        // 429 na busca do Google = recurso não liberado no plano gratuito; segue para a estimativa
        console.warn(`[foods/ai] ${attempt.label} HTTP ${result.status}`)
        continue
      }
      const foods = parse(result.text, attempt.fonte)
      if (!foods) {
        console.warn(`[foods/ai] ${attempt.label} devolveu JSON inválido`)
        continue
      }
      if (foods.length > 0) remember(key, foods)
      return Response.json({ foods, fonte: attempt.fonte, fontes: result.fontes })
    } catch (error) {
      console.warn(`[foods/ai] ${attempt.label} falhou:`, error instanceof Error ? error.name : error)
    }
  }

  return Response.json(
    {
      error: sobrecarga
        ? 'A IA está sobrecarregada agora. Tente de novo em alguns instantes ou preencha os valores manualmente.'
        : 'Não foi possível pesquisar agora. Preencha os valores manualmente.',
    },
    { status: 502 },
  )
}
