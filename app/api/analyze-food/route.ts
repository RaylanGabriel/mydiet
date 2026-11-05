import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const MAX_IMAGE_BYTES = 4 * 1024 * 1024

// Total time budget for all AI attempts, below maxDuration (60s) to leave room for auth and parsing.
const AI_BUDGET_MS = 54_000

const foodAnalysisSchema = z.object({
  itens: z
    .array(
      z.object({
        nome: z.string().describe('Nome do alimento em português, ex: "Arroz branco cozido"'),
        quantidade: z.string().describe('Porção estimada em gramas ou ml, ex: "150g"'),
        // coerce: some fallback models return numbers as strings ("150").
        calorias: z.coerce.number().describe('kcal da porção estimada'),
        proteina: z.coerce.number().describe('gramas de proteína da porção'),
        carboidratos: z.coerce.number().describe('gramas de carboidratos da porção'),
        gordura: z.coerce.number().describe('gramas de gordura da porção'),
      }),
    )
    .describe('Lista de alimentos identificados. Vazia se não houver comida na foto.'),
  observacao: z
    .string()
    .describe('Uma frase curta em português sobre a confiança da estimativa ou dica para melhorar a foto.'),
})

export type FoodAnalysis = z.infer<typeof foodAnalysisSchema>

const requestSchema = z.object({
  image: z.string().regex(/^data:image\/(jpeg|png|webp);base64,/),
})

const SYSTEM_PROMPT =
  'Você é um nutricionista que estima porções e macronutrientes a partir de fotos de refeições. ' +
  'Identifique cada alimento visível separadamente, estime a porção em gramas usando referências visuais ' +
  '(tamanho do prato, talheres) e calcule os valores priorizando a TACO (Tabela Brasileira de Composição de Alimentos) e a TBCA (Tabela Brasileira de Composição de Alimentos da USP). Use USDA somente quando o alimento não existir nessas tabelas. ' +
  'Considere preparo (frito, cozido, grelhado) e molhos visíveis. Arredonde calorias para inteiros e macros para 1 casa decimal.'

const USER_PROMPT =
  'Identifique os alimentos desta foto e estime os macronutrientes de cada um. Retorne somente um JSON com as propriedades "itens" e "observacao". ' +
  'Cada item deve ter "nome" (texto), "quantidade" (texto, ex: "150g"), "calorias", "proteina", "carboidratos" e "gordura" (números). ' +
  'Se não houver comida na foto, retorne "itens" como lista vazia.'

type AttemptResult =
  | { ok: true; data: FoodAnalysis }
  | { ok: false; status?: number; timedOut?: boolean }

interface ImageInput {
  dataUrl: string
  mediaType: string
  base64: string
}

interface Attempt {
  label: string
  timeoutMs: number
  delayMs?: number
  run: (signal: AbortSignal) => Promise<AttemptResult>
}

/** Parses model text into FoodAnalysis, tolerating ```json fences around the JSON. */
function parseAnalysis(label: string, text: string | undefined): AttemptResult {
  if (!text) {
    console.warn(`${label} returned no text.`)
    return { ok: false }
  }
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  let json: unknown
  try {
    json = JSON.parse(cleaned)
  } catch {
    console.warn(`${label} returned invalid JSON.`)
    return { ok: false }
  }
  const parsed = foodAnalysisSchema.safeParse(json)
  if (!parsed.success) {
    console.warn(`${label} returned JSON in an unexpected shape:`, parsed.error.issues)
    return { ok: false }
  }
  return { ok: true, data: parsed.data }
}

async function logHttpFailure(label: string, response: Response): Promise<AttemptResult> {
  const errorBody = await response.json().catch(() => null)
  const providerMessage = errorBody?.error?.message
  console.warn(`${label} returned HTTP ${response.status}:`, typeof providerMessage === 'string' ? providerMessage : 'no message')
  return { ok: false, status: response.status }
}

function geminiAttempt(apiKey: string, model: string, image: ImageInput) {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{
      role: 'user',
      parts: [
        { text: USER_PROMPT },
        { inlineData: { mimeType: image.mediaType, data: image.base64 } },
      ],
    }],
    generationConfig: { responseMimeType: 'application/json' },
  })
  const label = `Gemini ${model}`

  return async (signal: AbortSignal): Promise<AttemptResult> => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body,
        signal,
      },
    )
    if (!response.ok) return logHttpFailure(label, response)

    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? '')
      .join('')
    return parseAnalysis(label, text)
  }
}

function openRouterAttempt(apiKey: string, model: string, image: ImageInput) {
  const body = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: USER_PROMPT },
          { type: 'image_url', image_url: { url: image.dataUrl } },
        ],
      },
    ],
  })
  const label = `OpenRouter ${model}`

  return async (signal: AbortSignal): Promise<AttemptResult> => {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body,
      signal,
    })
    if (!response.ok) return logHttpFailure(label, response)

    const result = await response.json()
    if (result.error) {
      console.warn(`${label} returned an error:`, result.error?.message ?? result.error)
      return { ok: false, status: typeof result.error?.code === 'number' ? result.error.code : undefined }
    }
    return parseAnalysis(label, result.choices?.[0]?.message?.content)
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) {
    return Response.json({ error: 'Faça login para analisar fotos.' }, { status: 401 })
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: 'Imagem inválida.' }, { status: 400 })
  }

  const dataUrl = parsed.data.image
  const [header, base64] = dataUrl.split(',')
  const mediaType = header.slice(5, header.indexOf(';'))
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return Response.json({ error: 'Imagem muito grande.' }, { status: 413 })
  }
  const image: ImageInput = { dataUrl, mediaType, base64 }

  const geminiKey = process.env.GEMINI_API_KEY
  const openRouterKey = process.env.OPENROUTER_API_KEY
  if (!geminiKey && !openRouterKey) {
    console.error('Food analysis is unavailable: neither GEMINI_API_KEY nor OPENROUTER_API_KEY is configured.')
    return Response.json({ error: 'A análise por IA não está configurada no servidor.' }, { status: 503 })
  }

  // Gemini first (best quality, free). OpenRouter free models only when Gemini fails,
  // since they have a 50 requests/day cap that counts failed attempts too.
  const attempts: Attempt[] = []
  if (geminiKey) {
    attempts.push(
      { label: 'Gemini lite', timeoutMs: 12_000, run: geminiAttempt(geminiKey, 'gemini-flash-lite-latest', image) },
      { label: 'Gemini flash', timeoutMs: 15_000, run: geminiAttempt(geminiKey, 'gemini-flash-latest', image) },
    )
  }
  if (openRouterKey) {
    // Nemotron first: the free Gemma 4 is served by Google AI Studio, the same upstream
    // as Gemini, so it tends to be overloaded at the same moments.
    attempts.push(
      { label: 'OpenRouter Nemotron VL', timeoutMs: 15_000, run: openRouterAttempt(openRouterKey, 'nvidia/nemotron-3.5-super-vl:free', image) },
      { label: 'OpenRouter Gemma 4', timeoutMs: 12_000, run: openRouterAttempt(openRouterKey, 'google/gemma-4-26b-a4b-it:free', image) },
    )
  } else if (geminiKey) {
    // No fallback provider: retry lite after a short pause, since 503 spikes are usually brief.
    attempts.push({ label: 'Gemini lite (retry)', timeoutMs: 15_000, delayMs: 2_000, run: geminiAttempt(geminiKey, 'gemini-flash-lite-latest', image) })
  }

  const deadline = Date.now() + AI_BUDGET_MS
  const failures: AttemptResult[] = []

  for (const attempt of attempts) {
    if (attempt.delayMs && deadline - Date.now() > attempt.delayMs + 5_000) {
      await new Promise((resolve) => setTimeout(resolve, attempt.delayMs))
    }
    const remaining = deadline - Date.now()
    if (remaining < 5_000) break

    let result: AttemptResult
    try {
      result = await attempt.run(AbortSignal.timeout(Math.min(attempt.timeoutMs, remaining)))
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
      console.warn(`${attempt.label} ${timedOut ? 'timed out' : 'request failed'}.`, timedOut ? '' : error)
      result = { ok: false, timedOut }
    }

    if (result.ok) return Response.json(result.data)
    failures.push(result)
    console.warn(`${attempt.label} failed; trying next model.`)
  }

  const statuses = failures.map((f) => (f.ok ? undefined : f.status))
  const anyTimeout = failures.some((f) => !f.ok && f.timedOut)
  console.error('Food analysis failed on every model:', { statuses, anyTimeout })

  const errorMessage = statuses.some((s) => s === 503 || s === 429)
    ? 'Os serviços de IA estão sobrecarregados agora. Tente novamente em alguns minutos.'
    : anyTimeout
      ? 'A análise demorou demais para responder. Tente novamente em instantes.'
      : statuses.every((s) => s === 400)
        ? 'A IA recusou a imagem. Tente escolher outra foto em JPG, PNG ou WEBP.'
        : statuses.some((s) => s === 401 || s === 403)
          ? 'A chave da IA não tem autorização para analisar imagens. Confira as API keys no servidor.'
          : 'Não foi possível analisar a foto agora. Tente novamente mais tarde.'

  return Response.json({ error: errorMessage }, { status: anyTimeout && failures.every((f) => !f.ok && f.timedOut) ? 504 : 502 })
}
