'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/use-profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { LogOut, Save, User, Droplets, Flame } from 'lucide-react'
import { InstallAppCard } from '@/components/install-app-card'

export default function PerfilPage() {
  const router = useRouter()
  const { profile, isLoading, updateProfile } = useProfile()
  const [nome, setNome] = useState('')
  const [metaCalorias, setMetaCalorias] = useState(2000)
  const [metaAgua, setMetaAgua] = useState(2500)
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (profile) {
      setNome(profile.nome || '')
      setMetaCalorias(profile.meta_calorias_diarias || 2000)
      setMetaAgua(profile.meta_agua_ml || 2500)
    }
  }, [profile])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      await updateProfile({
        nome,
        meta_calorias_diarias: metaCalorias,
        meta_agua_ml: metaAgua,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-primary px-4 py-8 rounded-b-3xl">
        <div className="max-w-lg mx-auto flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-primary-foreground/20 flex items-center justify-center mb-4">
            <User className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-primary-foreground">
            {profile?.nome || 'Usuario'}
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1 text-primary-foreground/70 text-sm">
              <Flame className="w-4 h-4" />
              {profile?.meta_calorias_diarias || 2000} kcal
            </span>
            <span className="flex items-center gap-1 text-primary-foreground/70 text-sm">
              <Droplets className="w-4 h-4" />
              {((profile?.meta_agua_ml || 2500) / 1000).toFixed(1)}L
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-6">
        <div className="max-w-lg mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuracoes do Perfil</CardTitle>
              <CardDescription>
                Atualize suas informacoes e metas diarias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="nome">Nome</FieldLabel>
                    <Input
                      id="nome"
                      type="text"
                      placeholder="Seu nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="metaCalorias">
                      <span className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500" />
                        Meta de Calorias Diarias
                      </span>
                    </FieldLabel>
                    <Input
                      id="metaCalorias"
                      type="number"
                      placeholder="2000"
                      value={metaCalorias}
                      onChange={(e) => setMetaCalorias(parseInt(e.target.value) || 2000)}
                      min={1000}
                      max={5000}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Recomendado: 1500-2500 kcal para adultos
                    </p>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="metaAgua">
                      <span className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-blue-500" />
                        Meta de Agua Diaria (ml)
                      </span>
                    </FieldLabel>
                    <Input
                      id="metaAgua"
                      type="number"
                      placeholder="2500"
                      value={metaAgua}
                      onChange={(e) => setMetaAgua(parseInt(e.target.value) || 2500)}
                      min={1000}
                      max={5000}
                      step={250}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Recomendado: 2000-3000 ml (2-3 litros) por dia
                    </p>
                  </Field>
                </FieldGroup>

                <Button type="submit" className="w-full mt-6" disabled={saving}>
                  {saving ? <Spinner className="mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {saving ? 'Salvando...' : 'Salvar Alteracoes'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <InstallAppCard />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conta</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleSignOut}
                disabled={signingOut}
              >
                {signingOut ? <Spinner className="mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                {signingOut ? 'Saindo...' : 'Sair da Conta'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
