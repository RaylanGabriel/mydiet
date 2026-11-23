import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Troca o token do email de recuperação por uma sessão e leva o usuário
// para a tela de nova senha.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  const code = searchParams.get('code')

  if (tokenHash && type === 'recovery') {
    // Template de email customizado: funciona em qualquer dispositivo.
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      return NextResponse.redirect(`${origin}/auth/redefinir-senha`)
    }
  } else if (code) {
    // Template padrão (PKCE): só funciona no mesmo navegador que pediu o link.
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/auth/redefinir-senha`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/esqueci-senha?erro=link-invalido`)
}
