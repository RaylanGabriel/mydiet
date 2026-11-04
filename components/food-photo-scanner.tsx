'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Camera, ImagePlus, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { compressImage, fileToDataUrl } from '@/lib/image-utils'
import type { FoodAnalysis } from '@/app/api/analyze-food/route'

export type DetectedFood = FoodAnalysis['itens'][number]

interface FoodPhotoScannerProps {
  onAddItems: (items: DetectedFood[]) => void
}

export function FoodPhotoScanner({ onAddItems }: FoodPhotoScannerProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<FoodAnalysis | null>(null)

  const reset = () => {
    setPreview(null)
    setResult(null)
    setError(null)
  }

  const analyze = async (file: File) => {
    setError(null)
    setResult(null)
    setAnalyzing(true)
    try {
      const compressed = await compressImage(file, 1024, 0.8)
      const dataUrl = await fileToDataUrl(compressed)
      setPreview(dataUrl)

      const res = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Falha ao analisar a foto.')
      setResult(data as FoodAnalysis)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao analisar a foto.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) analyze(file)
  }

  const totals = result?.itens.reduce(
    (acc, i) => ({
      calorias: acc.calorias + i.calorias,
      proteina: acc.proteina + i.proteina,
      carboidratos: acc.carboidratos + i.carboidratos,
      gordura: acc.gordura + i.gordura,
    }),
    { calorias: 0, proteina: 0, carboidratos: 0, gordura: 0 },
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          Analisar foto do prato
        </CardTitle>
        {preview && !analyzing && (
          <Button type="button" variant="ghost" size="icon" aria-label="Descartar foto" onClick={reset}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!preview && (
          <>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Tire uma foto da refeição e a IA estima os alimentos e macronutrientes. Você pode revisar tudo antes de salvar.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" onClick={() => cameraRef.current?.click()}>
                <Camera className="h-4 w-4" />
                Tirar foto
              </Button>
              <Button type="button" variant="outline" onClick={() => galleryRef.current?.click()}>
                <ImagePlus className="h-4 w-4" />
                Galeria
              </Button>
            </div>
          </>
        )}

        {preview && (
          <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Foto da refeição enviada" className="h-full w-full object-cover" />
            {analyzing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 text-sm font-medium text-foreground">
                <Spinner className="h-6 w-6" />
                Analisando alimentos...
              </div>
            )}
          </div>
        )}

        {analyzing && !preview && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Preparando imagem...
          </div>
        )}

        {result && totals && (
          <div className="flex flex-col gap-3">
            {result.itens.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum alimento identificado. Tente outra foto, mais de perto e com boa luz.</p>
            ) : (
              <>
                <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
                  {result.itens.map((item, i) => (
                    <li key={`${item.nome}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{item.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantidade} · P {item.proteina}g · C {item.carboidratos}g · G {item.gordura}g
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{Math.round(item.calorias)} kcal</span>
                    </li>
                  ))}
                </ul>

                <dl className="grid grid-cols-4 gap-2 rounded-xl bg-muted p-3 text-center">
                  {[
                    { label: 'Calorias', value: `${Math.round(totals.calorias)}` },
                    { label: 'Proteína', value: `${totals.proteina.toFixed(1)}g` },
                    { label: 'Carbo', value: `${totals.carboidratos.toFixed(1)}g` },
                    { label: 'Gordura', value: `${totals.gordura.toFixed(1)}g` },
                  ].map((t) => (
                    <div key={t.label} className="flex flex-col gap-0.5">
                      <dt className="text-xs text-muted-foreground">{t.label}</dt>
                      <dd className="text-sm font-semibold tabular-nums text-foreground">{t.value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}

            {result.observacao && <p className="text-xs leading-relaxed text-muted-foreground">{result.observacao}</p>}

            <p className="text-xs leading-relaxed text-muted-foreground">
              Valores estranhos?{' '}
              <Link href="/tabela" target="_blank" className="font-medium text-primary underline underline-offset-2">
                Confira na tabela TACO/TBCA
              </Link>{' '}
              e ajuste os itens depois de adicionar.
            </p>

            {result.itens.length > 0 && (
              <Button
                type="button"
                onClick={() => {
                  onAddItems(result.itens)
                  reset()
                }}
              >
                Adicionar {result.itens.length} {result.itens.length === 1 ? 'item' : 'itens'} à refeição
              </Button>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-label="Tirar foto da refeição" onChange={handleFile} />
        <input ref={galleryRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label="Escolher foto da galeria" onChange={handleFile} />
      </CardContent>
    </Card>
  )
}
