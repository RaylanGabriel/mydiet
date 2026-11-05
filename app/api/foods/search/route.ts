import { NextRequest } from 'next/server'
import { z } from 'zod'

const querySchema = z.object({ q: z.string().trim().min(2).max(80) })

// Referência nacional para itens sem bons resultados no Open Food Facts.
// Valores médios por 100 g, alinhados às tabelas TACO/TBCA.
const BRAZILIAN_FOODS = [
  ['Filé mignon suíno grelhado', 219, 32.8, 0, 9.5],
  ['Lombo suíno assado', 210, 35.7, 0, 7.7],
  ['Arroz branco cozido', 128, 2.5, 28.1, 0.2],
  ['Arroz integral cozido', 124, 2.6, 25.8, 1.0],
  ['Feijão carioca cozido', 76, 4.8, 13.6, 0.5],
  ['Feijão preto cozido', 77, 4.5, 14.0, 0.5],
  ['Frango grelhado', 159, 32.0, 0, 2.5],
  ['Carne bovina grelhada', 219, 32.0, 0, 9.0],
  ['Ovo de galinha cozido', 146, 13.3, 0.6, 9.5],
  ['Pão francês', 300, 8.0, 58.6, 3.1],
  ['Tapioca com goma hidratada', 240, 0.2, 59.0, 0],
  ['Cuscuz de milho cozido', 113, 2.2, 25.3, 0.7],
  ['Mandioca cozida', 125, 0.6, 30.1, 0.3],
  ['Batata-doce cozida', 77, 0.6, 18.4, 0.1],
  ['Banana-prata', 98, 1.3, 26.0, 0.1],
  ['Açaí na tigela sem xarope', 58, 0.8, 6.2, 3.9],
].map(([nome, calorias, proteina, carboidratos, gordura], index) => ({
  id: `tbca-taco-${index}`,
  nome: nome as string,
  quantidade_padrao: '100g',
  calorias: calorias as number,
  proteina: proteina as number,
  carboidratos: carboidratos as number,
  gordura: gordura as number,
  categoria: 'TACO/TBCA',
  source: 'taco-tbca' as const,
}))

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase()
}

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse({ q: request.nextUrl.searchParams.get('q') ?? '' })
  if (!parsed.success) return Response.json({ foods: [] })

  const query = parsed.data.q
  const localBrazilian = BRAZILIAN_FOODS.filter((food) => normalize(food.nome).includes(normalize(query)))
  if (localBrazilian.length > 0) {
    return Response.json({ foods: localBrazilian.slice(0, 8) })
  }

  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl')
  url.searchParams.set('search_terms', query)
  url.searchParams.set('search_simple', '1')
  url.searchParams.set('action', 'process')
  url.searchParams.set('json', '1')
  url.searchParams.set('page_size', '8')
  url.searchParams.set('tagtype_0', 'countries')
  url.searchParams.set('tag_contains_0', 'contains')
  url.searchParams.set('tag_0', 'brazil')
  url.searchParams.set('fields', 'code,product_name,nutriments,serving_size,countries_tags')

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
          categoria: 'Open Food Facts Brasil',
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
