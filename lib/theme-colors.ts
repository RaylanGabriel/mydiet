export const COLOR_THEMES = [
  // swatch = cor principal no modo claro/escuro; bar = cor da barra do navegador/PWA
  { id: 'verde', label: 'Verde', swatch: { light: '#16a34a', dark: '#4bc680' }, bar: { light: '#16a34a', dark: '#0f1714' } },
  { id: 'azul', label: 'Azul', swatch: { light: '#2068cb', dark: '#60aaf3' }, bar: { light: '#2068cb', dark: '#0f141c' } },
  { id: 'amarelo', label: 'Amarelo', swatch: { light: '#f3ba25', dark: '#f3c443' }, bar: { light: '#f3ba25', dark: '#17150f' } },
  { id: 'roxo', label: 'Roxo', swatch: { light: '#7847d0', dark: '#b298f9' }, bar: { light: '#7847d0', dark: '#15121c' } },
  { id: 'rosa', label: 'Rosa', swatch: { light: '#cb2e77', dark: '#f18db5' }, bar: { light: '#cb2e77', dark: '#1b1216' } },
] as const

export type ColorThemeId = (typeof COLOR_THEMES)[number]['id']

export const DEFAULT_COLOR: ColorThemeId = 'verde'
export const COLOR_STORAGE_KEY = 'mydiet-color'

export function isColorThemeId(value: unknown): value is ColorThemeId {
  return COLOR_THEMES.some((t) => t.id === value)
}

/**
 * Script inline executado no <head> antes da pintura, para não "piscar" verde
 * ao abrir o app com outra cor salva.
 */
export const COLOR_INIT_SCRIPT = `(function(){try{var c=localStorage.getItem('${COLOR_STORAGE_KEY}');if(${JSON.stringify(
  COLOR_THEMES.map((t) => t.id),
)}.indexOf(c)<0)c='${DEFAULT_COLOR}';document.documentElement.setAttribute('data-color',c);}catch(e){document.documentElement.setAttribute('data-color','${DEFAULT_COLOR}');}})();`
