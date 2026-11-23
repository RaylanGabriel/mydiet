'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { traduzErroAuth } from '@/lib/auth-errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Leaf, Eye, EyeOff } from 'lucide-react'

export default function RedefinirSenhaPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8 || password.length > 72) {
      setError('A senha precisa ter entre 8 e 72 caracteres.')
      return
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('A senha precisa ter pelo menos uma letra e um número.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(traduzErroAuth(error.message))
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <Leaf className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">MyDiet</h1>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Nova senha</CardTitle>
            <CardDescription>Escolha uma nova senha para sua conta.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="password">Nova senha</FieldLabel>
                  <div className="relative">
                    <Input
                      id="password"
                      type={show ? 'text' : 'password'}
                      placeholder="********"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mínimo de 8 caracteres, com letras e números.
                  </p>
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirm">Confirmar senha</FieldLabel>
                  <Input
                    id="confirm"
                    type={show ? 'text' : 'password'}
                    placeholder="********"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </Field>
              </FieldGroup>

              {error && <p className="text-sm text-destructive mt-4">{error}</p>}

              <Button type="submit" className="w-full mt-6" disabled={loading}>
                {loading ? <Spinner className="mr-2" /> : null}
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              <Link href="/auth/esqueci-senha" className="text-primary hover:underline font-medium">
                Pedir um novo link
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
