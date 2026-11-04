import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Leaf } from 'lucide-react'

export default function AuthErrorPage() {
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
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Erro de autenticacao</CardTitle>
            <CardDescription>
              Ocorreu um erro durante a autenticacao. Por favor, tente novamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button asChild className="w-full">
              <Link href="/auth/login">
                Voltar para login
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/cadastro">
                Criar nova conta
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
