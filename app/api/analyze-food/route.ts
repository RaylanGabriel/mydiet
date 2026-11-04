import { generateText, Output } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const MAX_IMAGE_BYTES = 4 * 1024 * 1024

const foodAnalysisSchema = z.object({
  itens: z
    .array(
      z.object({
        nome: z.string().describe('Nome do alimento em português, ex: "Arroz branco cozido"'),
        quantidade: z.string().describe('Porção estimada em gramas ou ml, ex: "150g"'),
        calorias: z.number().describe('kcal da porção estimada'),
        proteina: z.number().describe('gramas de proteína da porção'),
        carboidratos: z.number().describe('gramas de carboidratos da porção'),
        gordura: z.number().describe('gramas de gordura da porção'),
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

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Faça login para analisar fotos.' }, { status: 401 })
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: 'Imagem inválida.' }, { status: 400 })
  }

  const [header, base64] = parsed.data.image.split(',')
  const mediaType = header.slice(5, header.indexOf(';'))
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return Response.json({ error: 'Imagem muito grande.' }, { status: 413 })
  }

  try {
    const { output } = await generateText({
      model: 'google/gemini-3-flash',
      output: Output.object({ schema: foodAnalysisSchema }),
      system:
        'Você é um nutricionista que estima porções e macronutrientes a partir de fotos de refeições. ' +
        'Identifique cada alimento visível separadamente, estime a porção em gramas usando referências visuais ' +
        '(tamanho do prato, talheres) e calcule os valores com base em tabelas nutricionais confiáveis como TACO e USDA. ' +
        'Considere preparo (frito, cozido, grelhado) e molhos visíveis. Arredonde calorias para inteiros e macros para 1 casa decimal.',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Identifique os alimentos desta foto e estime os macronutrientes de cada um.' },
            { type: 'file', mediaType, data: bytes },
          ],
        },
      ],
    })

    return Response.json(output)
  } catch (error) {
    console.error('Food analysis failed:', error)
    return Response.json({ error: 'Não foi possível analisar a foto agora. Tente novamente.' }, { status: 502 })
  }
}
