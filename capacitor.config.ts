import type { CapacitorConfig } from '@capacitor/cli'

/**
 * App Android: uma WebView nativa que carrega o site de produção. Rotas de API,
 * autenticação e atualizações continuam na Vercel, então publicar o site já
 * atualiza o app. Um APK novo só é necessário ao mudar algo nativo.
 *
 * `webDir` guarda apenas a tela exibida quando o site não carrega (sem internet).
 */
const config: CapacitorConfig = {
  appId: 'com.raylangabriel.mydiet',
  appName: 'MyDiet',
  webDir: 'capacitor-web',
  server: {
    // A raiz basta: o proxy.ts redireciona para /dashboard ou /auth/login
    url: 'https://controle-dieta.vercel.app',
    errorPath: 'offline.html',
  },
}

export default config
