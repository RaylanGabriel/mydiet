import { NextRequest } from 'next/server'
import { z } from 'zod'

const querySchema = z.object({ q: z.string().trim().min(2).max(80) })

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse({ q: request.nextUrl.searchParams.get('q') ?? '' })
  if (!parsed.success) return Response.json({ foods: [] })

  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl')
  url.searchParams.set('search_terms', parsed.data.q)
  url.searchParams.set('search_simple', '1')
  url.searchParams.set('action', 'process')
  url.searchParams.set('json', '1')
  url.searchParams.set('page_size', '8')
  url.searchParams.set('fields', 'code,product_name,nutriments,serving_size')

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'MyDiet/1.0 (food search)' },
      next: { revalidate: 3600 },
    })
    if (!response.ok) return Response.json({ foods: [] })

    const data = await response.json()
    const foods = (data.products ?? [])
      .map((product: {
        code?: string
        product_name?: string
        serving_size?: string
        nutriments?: Record<string, number | undefined>
      }) => {
        const n = product.nutriments ?? {}
        const calories = n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : undefined)
        if (!product.code || !product.product_name || calories == null) return null
        return {
          id: `openfoodfacts-${product.code}`,
          nome: product.product_name.trim(),
          quantidade_padrao: '100g',
          calorias: Math.round(calories),
          proteina: Math.round((n.proteins_100g ?? 0) * 10) / 10,
          carboidratos: Math.round((n.carbohydrates_100g ?? 0) * 10) / 10,
          gordura: Math.round((n.fat_100g ?? 0) * 10) / 10,
          categoria: 'API externa',
          source: 'openfoodfacts',
          serving_size: product.serving_size ?? null,
        }
      })
      .filter(Boolean)

    return Response.json({ foods })
  } catch {
    return Response.json({ foods: [] })
  }
}
