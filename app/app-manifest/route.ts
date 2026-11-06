import { cookies } from 'next/headers'
import { COLOR_STORAGE_KEY, COLOR_THEMES, DEFAULT_COLOR, isColorThemeId } from '@/lib/theme-colors'

/**
 * Manifest do PWA gerado por aparelho, com a cor de tema escolhida (cookie).
 * No Android, o app instalado pinta a barra de status e a barra de botões do
 * sistema com o `theme_color` do manifest — a meta tag theme-color não alcança
 * a barra de baixo. O Chrome detecta a mudança do manifest e atualiza o app
 * instalado na próxima verificação.
 */
export async function GET() {
  const cookieStore = await cookies()
  const saved = cookieStore.get(COLOR_STORAGE_KEY)?.value
  const colorId = isColorThemeId(saved) ? saved : DEFAULT_COLOR
  const theme = COLOR_THEMES.find((t) => t.id === colorId) ?? COLOR_THEMES[0]

  const manifest = {
    id: '/dashboard',
    name: 'MyDiet - Dieta e Treinos',
    short_name: 'MyDiet',
    description: 'Acompanhe sua dieta, hidratação e treinos de musculação.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: theme.splash,
    theme_color: theme.bar.light,
    orientation: 'portrait-primary',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Treinos', url: '/treinos' },
      { name: 'Adicionar refeição', url: '/adicionar' },
    ],
    categories: ['health', 'fitness', 'lifestyle'],
    lang: 'pt-BR',
  }

  return new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      // Varia por aparelho (cookie): não pode ser cacheado de forma compartilhada
      'Cache-Control': 'private, no-cache',
      Vary: 'Cookie',
    },
  })
}
