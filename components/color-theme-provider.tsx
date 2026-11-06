'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { COLOR_STORAGE_KEY, COLOR_THEMES, DEFAULT_COLOR, colorCookie, isColorThemeId, type ColorThemeId } from '@/lib/theme-colors'

interface ColorThemeContextValue {
  color: ColorThemeId
  setColor: (color: ColorThemeId) => void
}

const ColorThemeContext = createContext<ColorThemeContextValue | null>(null)

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [color, setColorState] = useState<ColorThemeId>(DEFAULT_COLOR)
  const { resolvedTheme } = useTheme()

  // Lê o valor já aplicado pelo script inline do <head>
  useEffect(() => {
    const current = document.documentElement.getAttribute('data-color')
    if (isColorThemeId(current)) setColorState(current)
  }, [])

  // Mantém a cor da barra do navegador/PWA alinhada com o tema
  useEffect(() => {
    const theme = COLOR_THEMES.find((t) => t.id === color) ?? COLOR_THEMES[0]
    const mode = resolvedTheme === 'dark' ? 'dark' : 'light'
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
      const media = meta.getAttribute('media')
      if (media?.includes('dark')) meta.content = theme.bar.dark
      else if (media?.includes('light')) meta.content = theme.bar.light
      else meta.content = theme.bar[mode]
    })
  }, [color, resolvedTheme])

  const setColor = useCallback((next: ColorThemeId) => {
    setColorState(next)
    document.documentElement.setAttribute('data-color', next)
    try {
      localStorage.setItem(COLOR_STORAGE_KEY, next)
    } catch {
      // Navegação privada / armazenamento bloqueado: vale só para esta sessão
    }
    // Cookie lido pelo /manifest.json: no Android, é o manifest que colore a
    // barra de botões do sistema no app instalado
    document.cookie = colorCookie(next)
  }, [])

  return <ColorThemeContext.Provider value={{ color, setColor }}>{children}</ColorThemeContext.Provider>
}

export function useColorTheme() {
  const ctx = useContext(ColorThemeContext)
  if (!ctx) throw new Error('useColorTheme deve ser usado dentro de <ColorThemeProvider>')
  return ctx
}
