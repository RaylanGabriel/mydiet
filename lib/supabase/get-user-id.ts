import { createClient } from './client'

/**
 * Retorna o id do usuário logado lendo a sessão local (sem requisição de rede).
 * Uso exclusivo no navegador: a validação real do usuário acontece no servidor
 * (proxy/layout) e o acesso aos dados é protegido pelo RLS do banco.
 */
export async function getUserId(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.user.id ?? null
}
