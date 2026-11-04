'use client'

import { useRef, useState } from 'react'
import { Camera, Check, ImageIcon, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { COVER_PRESETS } from '@/lib/workout-types'
import { cn } from '@/lib/utils'

interface CoverPickerProps {
  workoutName: string
  coverUrl: string | null
  onUpload: (file: File) => Promise<void>
  onSelectPreset: (url: string | null) => Promise<void>
}

export function CoverPicker({ workoutName, coverUrl, onUpload, onSelectPreset }: CoverPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPresets, setShowPresets] = useState(false)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar a capa.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[16/7] overflow-hidden rounded-2xl border border-border bg-muted">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={`Capa do ${workoutName}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
            <ImageIcon className="h-8 w-8" aria-hidden="true" />
            <span className="text-sm">Sem foto de capa</span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Spinner className="h-6 w-6" />
          </div>
        )}
        <div className="absolute bottom-2 right-2 flex gap-2">
          {coverUrl && (
            <Button
              size="icon"
              variant="secondary"
              aria-label="Remover capa"
              disabled={busy}
              onClick={() => run(() => onSelectPreset(null))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Camera className="h-4 w-4" />
            {coverUrl ? 'Trocar foto' : 'Enviar foto'}
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Escolher foto de capa"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) run(() => onUpload(file))
        }}
      />

      <button
        type="button"
        onClick={() => setShowPresets((v) => !v)}
        className="self-start text-sm font-medium text-primary hover:underline"
        aria-expanded={showPresets}
      >
        {showPresets ? 'Ocultar capas prontas' : 'Ou escolha uma capa pronta'}
      </button>

      {showPresets && (
        <div className="grid grid-cols-2 gap-2">
          {COVER_PRESETS.map((preset) => {
            const selected = coverUrl === preset.url
            return (
              <button
                key={preset.url}
                type="button"
                disabled={busy}
                onClick={() => run(() => onSelectPreset(preset.url))}
                aria-pressed={selected}
                className={cn(
                  'relative aspect-video overflow-hidden rounded-xl border-2 transition-colors',
                  selected ? 'border-primary' : 'border-transparent hover:border-border',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preset.url} alt="" className="h-full w-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-background/80 px-2 py-1 text-left text-xs font-medium text-foreground">
                  {preset.label}
                </span>
                {selected && (
                  <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
