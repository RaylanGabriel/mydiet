import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, Leaf } from 'lucide-react'

export default function VerificarEmailPage() {
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
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Verifique seu email</CardTitle>
            <CardDescription>
              Enviamos um link de confirmacao para seu email. Clique no link para ativar sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Nao recebeu o email? Verifique sua pasta de spam ou tente novamente.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/login">
                Voltar para login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
