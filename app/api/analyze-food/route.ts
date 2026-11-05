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

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('Food analysis is unavailable: GEMINI_API_KEY is not configured.')
    return Response.json({ error: 'A análise por IA não está configurada no servidor.' }, { status: 503 })
  }

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text:
                'Você é um nutricionista que estima porções e macronutrientes a partir de fotos de refeições. ' +
                'Identifique cada alimento visível separadamente, estime a porção em gramas usando referências visuais ' +
                '(tamanho do prato, talheres) e calcule os valores com base em tabelas nutricionais confiáveis como TACO e USDA. ' +
                'Considere preparo (frito, cozido, grelhado) e molhos visíveis. Arredonde calorias para inteiros e macros para 1 casa decimal.',
            }],
          },
          contents: [{
            role: 'user',
            parts: [
              { text: 'Identifique os alimentos desta foto e estime os macronutrientes de cada um. Retorne somente um JSON com as propriedades "itens" e "observacao". Cada item deve ter "nome", "quantidade", "calorias", "proteina", "carboidratos" e "gordura".' },
              { inlineData: { mimeType: mediaType, data: base64 } },
            ],
          }],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(55_000),
      },
    )

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null)
      const providerMessage = errorBody?.error?.message
      console.error('Gemini food analysis request failed:', {
        status: response.status,
        message: typeof providerMessage === 'string' ? providerMessage : 'No provider error message',
      })

      const errorMessage =
        response.status === 400
          ? 'O Gemini recusou a imagem. Tente escolher outra foto em JPG, PNG ou WEBP.'
          : response.status === 401 || response.status === 403
            ? 'A chave Gemini não tem autorização para analisar imagens. Confira a API key e o acesso ao Gemini API.'
            : response.status === 429
              ? 'O limite gratuito de solicitações do Gemini foi atingido. Aguarde e tente novamente mais tarde.'
              : response.status === 503
                ? 'O Gemini está temporariamente indisponível. Tente novamente mais tarde.'
                : 'O Gemini não conseguiu analisar a imagem. Tente novamente mais tarde.'

      return Response.json({ error: errorMessage }, { status: 502 })
    }

    const result = await response.json()
    const generatedText = result.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? '')
      .join('')
    if (!generatedText) {
      console.error('Gemini food analysis returned no text.')
      return Response.json({ error: 'O Gemini não retornou uma análise. Tente novamente com outra foto.' }, { status: 502 })
    }

    const parsedOutput = foodAnalysisSchema.safeParse(JSON.parse(generatedText))
    if (!parsedOutput.success) {
      console.error('Gemini food analysis returned an invalid response:', parsedOutput.error)
      return Response.json({ error: 'Não foi possível interpretar a análise da foto. Tente novamente.' }, { status: 502 })
    }

    return Response.json(parsedOutput.data)
  } catch (error) {
    console.error('Food analysis failed:', error)
    return Response.json({ error: 'Não foi possível conectar ao Gemini agora. Tente novamente mais tarde.' }, { status: 502 })
  }
}
