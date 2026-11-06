export const COLOR_THEMES = [
  // swatch = cor principal no modo claro/escuro; bar = barra do navegador/PWA; splash = fundo da abertura do app instalado
  { id: 'verde', label: 'Verde', swatch: { light: '#16a34a', dark: '#4bc680' }, bar: { light: '#16a34a', dark: '#0f1714' }, splash: '#f0fdf4' },
  { id: 'azul', label: 'Azul', swatch: { light: '#2068cb', dark: '#60aaf3' }, bar: { light: '#2068cb', dark: '#0f141c' }, splash: '#eff6ff' },
  { id: 'amarelo', label: 'Amarelo', swatch: { light: '#f3ba25', dark: '#f3c443' }, bar: { light: '#f3ba25', dark: '#17150f' }, splash: '#fefce8' },
  { id: 'roxo', label: 'Roxo', swatch: { light: '#7847d0', dark: '#b298f9' }, bar: { light: '#7847d0', dark: '#15121c' }, splash: '#f5f3ff' },
  { id: 'rosa', label: 'Rosa', swatch: { light: '#cb2e77', dark: '#f18db5' }, bar: { light: '#cb2e77', dark: '#1b1216' }, splash: '#fdf2f8' },
] as const

export type ColorThemeId = (typeof COLOR_THEMES)[number]['id']

export const DEFAULT_COLOR: ColorThemeId = 'verde'
/** Mesmo nome no localStorage e no cookie (o cookie é lido pelo /app-manifest) */
export const COLOR_STORAGE_KEY = 'mydiet-color'

export function isColorThemeId(value: unknown): value is ColorThemeId {
  return COLOR_THEMES.some((t) => t.id === value)
}

/** Grava a cor num cookie de 1 ano para o servidor gerar o manifest com ela. */
export function colorCookie(color: ColorThemeId) {
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
  return `${COLOR_STORAGE_KEY}=${color}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`
}

/**
 * Script inline executado no <head> antes da pintura, para não "piscar" verde
 * ao abrir o app com outra cor salva. Também recria o cookie a partir do
 * localStorage (usuários que escolheram a cor antes do cookie existir).
 */
export const COLOR_INIT_SCRIPT = `(function(){var d=document.documentElement;try{var k='${COLOR_STORAGE_KEY}',c=localStorage.getItem(k);if(${JSON.stringify(
  COLOR_THEMES.map((t) => t.id),
)}.indexOf(c)<0)c='${DEFAULT_COLOR}';d.setAttribute('data-color',c);if(document.cookie.indexOf(k+'='+c)<0)document.cookie=k+'='+c+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');}catch(e){d.setAttribute('data-color','${DEFAULT_COLOR}');}})();`
