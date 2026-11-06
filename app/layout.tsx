import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { ColorThemeProvider } from '@/components/color-theme-provider'
import { COLOR_INIT_SCRIPT, DEFAULT_COLOR } from '@/lib/theme-colors'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'MyDiet - Dieta e Treinos',
  description: 'Acompanhe sua dieta, hidratação e treinos de musculação (Treino A, B, C) em um só app.',
  generator: 'v0.app',
  // manifest: link escrito manualmente no <head> abaixo, com crossOrigin="use-credentials"
  // para o navegador enviar o cookie da cor (o Next só faz isso em previews da Vercel).
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MyDiet',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#16a34a' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1714' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="bg-background" data-color={DEFAULT_COLOR} suppressHydrationWarning>
      <head>
        {/* Aplica a cor de tema salva antes da pintura (evita piscar verde) */}
        <script dangerouslySetInnerHTML={{ __html: COLOR_INIT_SCRIPT }} />
        {/* Manifest gerado por aparelho (app/manifest.json/route.ts) com a cor escolhida */}
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ColorThemeProvider>
            {children}
            <Toaster position="top-center" richColors />
          </ColorThemeProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
