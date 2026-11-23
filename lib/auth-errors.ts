// Traduz mensagens de erro do Supabase Auth para português.
export function traduzErroAuth(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Email ou senha incorretos.'
  if (m.includes('email not confirmed')) return 'Confirme seu email antes de entrar.'
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes'))
    return 'Muitas tentativas. Aguarde um pouco e tente novamente.'
  if (m.includes('same password') || m.includes('different from the old'))
    return 'A nova senha precisa ser diferente da atual.'
  if (m.includes('weak') || m.includes('at least'))
    return 'Senha fraca. Use pelo menos 8 caracteres, com letras e números.'
  if (m.includes('session') || m.includes('not authenticated'))
    return 'Link expirado. Peça um novo link de redefinição.'
  if (m.includes('network') || m.includes('fetch')) return 'Sem conexão. Verifique sua internet.'
  return 'Não foi possível concluir. Tente novamente.'
}
