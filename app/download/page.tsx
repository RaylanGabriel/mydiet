import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Apple,
  Camera,
  Download,
  Dumbbell,
  Droplets,
  Leaf,
  LineChart,
  Search,
  Share,
  Smartphone,
  SquarePlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const APK_URL = '/MyDiet.apk'

export const metadata: Metadata = {
  title: 'Baixar o MyDiet - Dieta e Treinos',
  description:
    'Baixe o MyDiet para Android ou instale no iPhone. Analise refeições por foto com IA, controle calorias, água e treinos.',
  openGraph: {
    title: 'Baixar o MyDiet',
    description:
      'App de dieta e treino com análise de refeições por foto usando IA. Disponível para Android e iPhone.',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'MyDiet' }],
    locale: 'pt_BR',
    type: 'website',
  },
}

const features = [
  { icon: Camera, text: 'Tire uma foto do prato e a IA estima calorias e macros' },
  { icon: Search, text: 'Alimentos brasileiros das tabelas TACO e TBCA' },
  { icon: Droplets, text: 'Calorias, macros e água com histórico por dia' },
  { icon: LineChart, text: 'Metas de peso com gráfico de evolução' },
  { icon: Dumbbell, text: 'Treinos com mais de 55 exercícios e recordes' },
]

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-background px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-[calc(env(safe-area-inset-top)+2rem)]">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <Leaf className="h-8 w-8 text-primary-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Baixar o MyDiet</h1>
          <p className="text-sm text-muted-foreground">Sua dieta e seus treinos em um só app</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-4 w-4 text-primary" aria-hidden="true" />
              Android
            </CardTitle>
            <CardDescription>Instale o aplicativo direto pelo arquivo APK.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button asChild size="lg" className="w-full">
              <a href={APK_URL} download="MyDiet.apk">
                <Download className="h-4 w-4" aria-hidden="true" />
                Baixar para Android
              </a>
            </Button>
            <ol className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <li>1. Abra o arquivo baixado</li>
              <li>2. Se aparecer um aviso, permita instalar apps desta fonte</li>
              <li>3. Toque em Instalar</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Apple className="h-4 w-4 text-primary" aria-hidden="true" />
              iPhone
            </CardTitle>
            <CardDescription>Instale pelo Safari, sem precisar da App Store.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ol className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <li>1. Abra esta página no Safari</li>
              <li className="flex items-center gap-2">
                2. Toque em <Share className="h-4 w-4 text-foreground" aria-label="Compartilhar" /> Compartilhar
              </li>
              <li className="flex items-center gap-2">
                3. Escolha <SquarePlus className="h-4 w-4 text-foreground" aria-hidden="true" /> Adicionar à Tela de Início
              </li>
            </ol>
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/cadastro">Abrir o MyDiet</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">O que o MyDiet faz</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {features.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm text-foreground">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link href="/auth/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  )
}
