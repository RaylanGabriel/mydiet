'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { z } from 'zod'

const signUpSchema = z.object({
  nome: z.string().trim().min(2, 'Informe seu nome').max(80),
  email: z.string().trim().toLowerCase().email('Email inválido').max(254),
  password: z
    .string()
    .min(8, 'A senha precisa ter pelo menos 8 caracteres')
    .max(72)
    .regex(/[A-Za-z]/, 'A senha precisa ter pelo menos uma letra')
    .regex(/[0-9]/, 'A senha precisa ter pelo menos um número'),
})

// Best-effort throttle per IP; resets when the server instance restarts.
const WINDOW_MS = 60 * 60 * 1000
const MAX_SIGNUPS_PER_WINDOW = 20
const attempts = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(key: string) {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > MAX_SIGNUPS_PER_WINDOW
}

export type SignUpResult = { ok: true } | { ok: false; error: string }

export async function signUpAction(input: {
  nome: string
  email: string
  password: string
}): Promise<SignUpResult> {
  const parsed = signUpSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const headerList = await headers()
  const ip = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return { ok: false, error: 'Muitas tentativas. Tente novamente mais tarde.' }
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { nome, email, password } = parsed.data
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome },
  })

  if (error) {
    const message = error.message.toLowerCase()
    if (message.includes('already') || message.includes('registered') || message.includes('exists')) {
      return { ok: false, error: 'Já existe uma conta com este email.' }
    }
    console.error('[signup] createUser failed:', error.message)
    return { ok: false, error: 'Não foi possível criar a conta. Tente novamente.' }
  }

  return { ok: true }
}
