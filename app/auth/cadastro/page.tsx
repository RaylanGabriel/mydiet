'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Leaf } from 'lucide-react'

export default function CadastroPage() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || 
          `${window.location.origin}/dashboard`,
        data: {
          nome,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/auth/verificar-email')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <Leaf className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">MyDiet</h1>
          <p className="text-muted-foreground text-sm">Controle sua dieta com facilidade</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Criar conta</CardTitle>
            <CardDescription>
              Preencha os dados abaixo para comecar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="nome">Nome</FieldLabel>
                  <Input
                    id="nome"
                    type="text"
                    placeholder="Seu nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </Field>
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
                <Field>
                  <FieldLabel htmlFor="password">Senha</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </Field>
              </FieldGroup>

              {error && (
                <p className="text-sm text-destructive mt-4">{error}</p>
              )}

              <Button type="submit" className="w-full mt-6" disabled={loading}>
                {loading ? <Spinner className="mr-2" /> : null}
                {loading ? 'Criando conta...' : 'Criar conta'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Ja tem uma conta?{' '}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Entrar
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
