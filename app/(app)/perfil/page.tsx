'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getUserId } from '@/lib/supabase/get-user-id'
import { useProfile } from '@/hooks/use-profile'
import { compressImage } from '@/lib/image-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import Link from 'next/link'
import { ImagePlus, LogOut, Save, User, Droplets, Flame, Target, ChevronRight, GlassWater, Palette } from 'lucide-react'
import { InstallAppCard } from '@/components/install-app-card'
import { ThemeToggle } from '@/components/theme-toggle'
import { ThemeColorPicker, ThemePreview } from '@/components/theme-color-picker'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const WATER_STEP_PRESETS = [150, 200, 250, 300, 500, 1000]

export default function PerfilPage() {
  const router = useRouter()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const { profile, isLoading, updateProfile } = useProfile()
  const [nome, setNome] = useState('')
  const [metaCalorias, setMetaCalorias] = useState(2000)
  const [metaAgua, setMetaAgua] = useState(2500)
  const [aguaPorCopo, setAguaPorCopo] = useState(250)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (profile) {
      setNome(profile.nome || '')
      setMetaCalorias(profile.meta_calorias_diarias || 2000)
      setMetaAgua(profile.meta_agua_ml || 2500)
      setAguaPorCopo(profile.agua_por_copo_ml || 250)
    }
  }, [profile])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return

    if (aguaPorCopo < 50 || aguaPorCopo > 2000) {
      toast.error('Quantidade por toque invalida', {
        description: 'Escolha um valor entre 50 ml e 2000 ml.',
      })
      return
    }

    setSaving(true)
    try {
      await updateProfile({
        nome,
        meta_calorias_diarias: metaCalorias,
        meta_agua_ml: metaAgua,
        agua_por_copo_ml: aguaPorCopo,
      })
      toast.success('Perfil atualizado!')
    } catch (error) {
      console.error('Error saving profile:', error)
      const message = error instanceof Error ? error.message : String((error as { message?: string })?.message ?? '')
      toast.error('Nao foi possivel salvar', {
        description: message.includes('agua_por_copo_ml')
          ? 'Execute o script scripts/005_profile_water_step.sql no SQL Editor do Supabase.'
          : 'Tente novamente em instantes.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploadingPhoto(true)
    setPhotoError(null)
    try {
      const compressed = await compressImage(file, 512, 0.82)
      const supabase = createClient()
      const userId = await getUserId()
      if (!userId) throw new Error('Faça login novamente para atualizar sua foto.')

      const path = `${userId}/avatar.jpg`
      const { error: uploadError } = await supabase.storage
        .from('profile-avatars')
        .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) {
        if (uploadError.message.toLowerCase().includes('bucket not found')) {
          throw new Error('O armazenamento de fotos ainda não foi configurado. Execute o script scripts/004_profile_avatar_storage.sql no SQL Editor do Supabase.')
        }
        throw uploadError
      }

      const { data } = supabase.storage.from('profile-avatars').getPublicUrl(path)
      await updateProfile({ foto_perfil_url: `${data.publicUrl}?v=${Date.now()}` })
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Não foi possível atualizar sua foto.')
    } finally {
      setUploadingPhoto(false)
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
          <Avatar className="mb-3 h-20 w-20 border-2 border-primary-foreground/40">
            <AvatarImage src={profile?.foto_perfil_url ?? undefined} alt="Foto de perfil" />
            <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
              <User className="h-10 w-10" />
            </AvatarFallback>
          </Avatar>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-label="Escolher foto de perfil da galeria"
            onChange={handlePhotoChange}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mb-3"
            disabled={uploadingPhoto}
            onClick={() => photoInputRef.current?.click()}
          >
            {uploadingPhoto ? <Spinner className="mr-2" /> : <ImagePlus className="mr-2 h-4 w-4" />}
            {uploadingPhoto ? 'Enviando foto...' : profile?.foto_perfil_url ? 'Trocar foto' : 'Adicionar foto'}
          </Button>
          {photoError && <p className="mb-3 text-center text-sm text-primary-foreground" role="alert">{photoError}</p>}
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
        <Tabs defaultValue="perfil" className="max-w-lg mx-auto gap-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="perfil">
              <User className="h-4 w-4" aria-hidden="true" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="tema">
              <Palette className="h-4 w-4" aria-hidden="true" />
              Tema
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tema" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Modo</CardTitle>
                <CardDescription>Claro, escuro ou seguir o sistema do celular</CardDescription>
              </CardHeader>
              <CardContent>
                <ThemeToggle />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cor do app</CardTitle>
                <CardDescription>A cor muda na hora e fica salva neste aparelho</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ThemeColorPicker />
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Prévia</p>
                  <ThemePreview />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="perfil" className="space-y-6">
          <Link
            href="/plano"
            className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 transition-colors hover:bg-primary/15"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Target className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-foreground">Dados corporais e plano</span>
              <span className="block text-xs text-muted-foreground">
                Peso, altura, objetivo e sugestões de dieta e treino
              </span>
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </Link>

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
                      step={50}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Recomendado: 2000-3000 ml (2-3 litros) por dia
                    </p>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="aguaPorCopo">
                      <span className="flex items-center gap-2">
                        <GlassWater className="w-4 h-4 text-blue-500" />
                        Quantidade por toque (ml)
                      </span>
                    </FieldLabel>
                    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Valores sugeridos">
                      {WATER_STEP_PRESETS.map((ml) => (
                        <button
                          key={ml}
                          type="button"
                          onClick={() => setAguaPorCopo(ml)}
                          aria-pressed={aguaPorCopo === ml}
                          className={cn(
                            'rounded-lg py-2 text-sm font-medium transition-colors',
                            aguaPorCopo === ml
                              ? 'bg-blue-500 text-white'
                              : 'bg-muted hover:bg-muted/80 text-foreground',
                          )}
                        >
                          {ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
                        </button>
                      ))}
                    </div>
                    <Input
                      id="aguaPorCopo"
                      type="number"
                      inputMode="numeric"
                      placeholder="Outro valor"
                      value={aguaPorCopo || ''}
                      onChange={(e) => setAguaPorCopo(parseInt(e.target.value) || 0)}
                      min={50}
                      max={2000}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Quanto de agua e somado cada vez que voce toca no + na tela inicial
                      {aguaPorCopo >= 50 && metaAgua > 0
                        ? ` (${Math.ceil(metaAgua / aguaPorCopo)} ${Math.ceil(metaAgua / aguaPorCopo) === 1 ? 'vez' : 'vezes'} para bater a meta)`
                        : ''}
                      .
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
