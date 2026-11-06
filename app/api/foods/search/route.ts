import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { cached, normalizeName, remember, searchFatSecret, searchOpenFoodFacts, type ExternalFood } from '@/lib/food-sources'

const querySchema = z.string().trim().min(3).max(80)

/**
 * Busca alimentos fora da base local: Open Food Facts (Brasil) e FatSecret, em paralelo.
 * Cada fonte tem 5 s; se uma falhar, as outras continuam valendo.
 */
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) return Response.json({ error: 'Faça login para buscar alimentos.' }, { status: 401 })

  const parsed = querySchema.safeParse(new URL(req.url).searchParams.get('q'))
  if (!parsed.success) return Response.json({ foods: [] })
  const query = parsed.data
  const key = `search:${normalizeName(query)}`

  const hit = cached(key)
  if (hit) return Response.json({ foods: hit, cached: true })

  const sources = [
    { name: 'openfoodfacts', run: searchOpenFoodFacts },
    { name: 'fatsecret', run: searchFatSecret },
  ] as const

  const results = await Promise.allSettled(sources.map((s) => s.run(query, AbortSignal.timeout(5_000))))
  const foods: ExternalFood[] = []
  const falhas: string[] = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') foods.push(...r.value)
    else {
      falhas.push(sources[i].name)
      console.warn(`[foods/search] ${sources[i].name} falhou:`, r.reason instanceof Error ? r.reason.message : r.reason)
    }
  })

  // Remove nomes repetidos entre as fontes e prioriza quem tem o termo no começo do nome
  const termo = normalizeName(query)
  const seen = new Set<string>()
  const unique = foods
    .filter((f) => {
      const k = normalizeName(`${f.nome} ${f.marca ?? ''}`)
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .sort((a, b) => Number(!normalizeName(a.nome).startsWith(termo)) - Number(!normalizeName(b.nome).startsWith(termo)))
    .slice(0, 12)

  // Só guarda no cache se todas as fontes responderam
  if (falhas.length === 0) remember(key, unique)
  return Response.json({ foods: unique, falhas })
}
