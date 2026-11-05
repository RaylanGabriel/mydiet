'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/use-profile'
import { compressImage } from '@/lib/image-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import Link from 'next/link'
import { ImagePlus, LogOut, Save, User, Droplets, Flame, Target, ChevronRight } from 'lucide-react'
import { InstallAppCard } from '@/components/install-app-card'
import { ThemeToggle } from '@/components/theme-toggle'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function PerfilPage() {
  const router = useRouter()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const { profile, isLoading, updateProfile } = useProfile()
  const [nome, setNome] = useState('')
  const [metaCalorias, setMetaCalorias] = useState(2000)
  const [metaAgua, setMetaAgua] = useState(2500)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploadingPhoto(true)
    setPhotoError(null)
    try {
      const compressed = await compressImage(file, 512, 0.82)
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error('Faça login novamente para atualizar sua foto.')

      const path = `${user.id}/avatar.jpg`
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
        <div className="max-w-lg mx-auto space-y-6">
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aparencia</CardTitle>
              <CardDescription>Escolha entre tema claro, escuro ou o do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeToggle />
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
