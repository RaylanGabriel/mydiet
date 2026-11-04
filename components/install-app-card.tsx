'use client'

import { useEffect, useState } from 'react'
import { Download, Share, Smartphone, SquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Platform = 'ios' | 'android' | 'other'

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'other'
}

export function InstallAppCard() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [platform, setPlatform] = useState<Platform>('other')

  useEffect(() => {
    setPlatform(detectPlatform())
    setInstalled(window.matchMedia('(display-mode: standalone)').matches)

    if ('serviceWorker' in navigator && window.self === window.top) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Smartphone className="h-4 w-4 text-primary" aria-hidden="true" />
          Instalar no celular
        </CardTitle>
        <CardDescription>
          Use o MeuDiet como aplicativo, com ícone na tela inicial e em tela cheia.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {installEvent && (
          <Button
            className="w-full"
            onClick={async () => {
              await installEvent.prompt()
              const { outcome } = await installEvent.userChoice
              if (outcome === 'accepted') setInstalled(true)
              setInstallEvent(null)
            }}
          >
            <Download className="h-4 w-4" />
            Instalar aplicativo
          </Button>
        )}

        {(platform === 'ios' || platform === 'other') && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">iPhone (Safari)</p>
            <ol className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                1. Toque em <Share className="h-4 w-4 text-foreground" aria-label="Compartilhar" /> Compartilhar
              </li>
              <li className="flex items-center gap-2">
                2. Escolha <SquarePlus className="h-4 w-4 text-foreground" aria-hidden="true" /> Adicionar à Tela de Início
              </li>
            </ol>
          </div>
        )}

        {(platform === 'android' || platform === 'other') && !installEvent && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">Android (Chrome)</p>
            <ol className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <li>1. Toque no menu de três pontos</li>
              <li>2. Escolha Instalar app ou Adicionar à tela inicial</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
