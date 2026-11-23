'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { traduzErroAuth } from '@/lib/auth-errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Leaf, Mail } from 'lucide-react'

function EsqueciSenhaForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(
    searchParams.get('erro') === 'link-invalido'
      ? 'Link inválido ou expirado. Peça um novo.'
      : null,
  )
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/confirm`,
    })

    setLoading(false)
    if (error) {
      setError(traduzErroAuth(error.message))
      return
    }
    // Resposta neutra: não revela se o email está cadastrado.
    setSent(true)
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
          {sent ? (
            <>
              <CardHeader className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Verifique seu email</CardTitle>
                <CardDescription>
                  Se existir uma conta com esse email, enviamos um link para redefinir a senha.
                  Olhe também a pasta de spam.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/auth/login">Voltar para o login</Link>
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl">Esqueci minha senha</CardTitle>
                <CardDescription>
                  Informe seu email e enviaremos um link para criar uma nova senha.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="email">Email</FieldLabel>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </Field>
                  </FieldGroup>

                  {error && <p className="text-sm text-destructive mt-4">{error}</p>}

                  <Button type="submit" className="w-full mt-6" disabled={loading}>
                    {loading ? <Spinner className="mr-2" /> : null}
                    {loading ? 'Enviando...' : 'Enviar link'}
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-6">
                  Lembrou a senha?{' '}
                  <Link href="/auth/login" className="text-primary hover:underline font-medium">
                    Entrar
                  </Link>
                </p>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </main>
  )
}

export default function EsqueciSenhaPage() {
  return (
    <Suspense>
      <EsqueciSenhaForm />
    </Suspense>
  )
}
