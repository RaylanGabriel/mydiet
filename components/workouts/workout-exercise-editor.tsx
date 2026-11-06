'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, PlayCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ExerciseVideo } from '@/components/workouts/exercise-video'
import { getWorkoutExerciseLoads, type WorkoutExercise } from '@/lib/workout-types'
import { CARDIO_METRIC_INFO, cardioMetrics, parseMinutes, type CardioMetric } from '@/lib/cardio'
import { exerciseKind, parseSeconds } from '@/lib/exercise-kind'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const METRIC_COLUMN: Record<CardioMetric, 'velocidade_kmh' | 'inclinacao_pct' | 'nivel'> = {
  velocidade: 'velocidade_kmh',
  inclinacao: 'inclinacao_pct',
  nivel: 'nivel',
}

type Updates = Partial<
  Pick<
    WorkoutExercise,
    'series' | 'repeticoes' | 'cargas_por_serie' | 'descanso_segundos' | 'observacoes' | 'velocidade_kmh' | 'inclinacao_pct' | 'nivel'
  >
>

interface Props {
  item: WorkoutExercise
  index: number
  isFirst: boolean
  isLast: boolean
  onUpdate: (updates: Updates) => Promise<void>
  onMove: (direction: -1 | 1) => Promise<void>
  onRemove: () => Promise<void>
}

const DESCANSO_OPCOES = [0, 30, 45, 60, 90, 120, 180]

export function WorkoutExerciseEditor({ item, index, isFirst, isLast, onUpdate, onMove, onRemove }: Props) {
  const [showVideo, setShowVideo] = useState(false)
  const fieldId = (name: string) => `${item.id}-${name}`
  const cargasPorSerie = getWorkoutExerciseLoads(item)
  const kind = exerciseKind(item.exercise)
  const cardio = kind === 'cardio'
  const metrics = cardioMetrics(item.exercise)

  // Erros (ex.: script 008 não executado) aparecem como aviso em vez de falhar em silêncio
  const save = (updates: Updates) =>
    onUpdate(updates).catch((err: unknown) =>
      toast.error('Não foi possível salvar', { description: err instanceof Error ? err.message : undefined }),
    )

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-tight text-card-foreground">{item.exercise.nome}</h3>
          <p className="text-xs text-muted-foreground">
            {item.exercise.grupo_muscular}
            {item.exercise.equipamento ? ` · ${item.exercise.equipamento}` : ''}
          </p>
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isFirst} onClick={() => onMove(-1)} aria-label="Mover para cima">
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isLast} onClick={() => onMove(1)} aria-label="Mover para baixo">
            <ChevronDown className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label={`Remover ${item.exercise.nome}`}>
                <X className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover {item.exercise.nome}?</AlertDialogTitle>
                <AlertDialogDescription>
                  O exercício sai deste treino junto com as séries, cargas e observações configuradas. O histórico de treinos
                  já feitos não é afetado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={() =>
                    onRemove()
                      .then(() => toast.success('Exercício removido', { description: item.exercise.nome }))
                      .catch(() => toast.error('Não foi possível remover o exercício.'))
                  }
                >
                  Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={fieldId('series')} className="text-xs text-muted-foreground">{cardio ? 'Blocos' : 'Séries'}</Label>
          <Input
            id={fieldId('series')}
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            defaultValue={item.series}
            className="h-9 px-2 text-center"
            onBlur={(e) => {
              const series = Math.min(20, Math.max(1, parseInt(e.target.value) || 1))
              if (series !== item.series) {
                const cargas_por_serie = Array.from({ length: series }, (_, i) =>
                  i < cargasPorSerie.length
                    ? cargasPorSerie[i]
                    : cargasPorSerie[cargasPorSerie.length - 1] ?? null,
                )
                save(cardio || kind === 'tempo' ? { series } : { series, cargas_por_serie })
              }
            }}
          />
        </div>
        {cardio ? (
          <div className="flex flex-col gap-1">
            <Label htmlFor={fieldId('min')} className="text-xs text-muted-foreground">Minutos</Label>
            <Input
              id={fieldId('min')}
              type="number"
              inputMode="decimal"
              min={1}
              defaultValue={parseMinutes(item.repeticoes) ?? ''}
              placeholder="20"
              className="h-9 px-2 text-center"
              onBlur={(e) => {
                const min = Number(e.target.value.replace(',', '.'))
                if (!Number.isFinite(min) || min <= 0) return
                if (min !== parseMinutes(item.repeticoes)) save({ repeticoes: `${min} min` })
              }}
            />
          </div>
        ) : kind === 'tempo' ? (
          <div className="flex flex-col gap-1">
            <Label htmlFor={fieldId('seg')} className="text-xs text-muted-foreground">Segundos</Label>
            <Input
              id={fieldId('seg')}
              type="number"
              inputMode="numeric"
              min={5}
              defaultValue={parseSeconds(item.repeticoes) ?? ''}
              placeholder="30"
              className="h-9 px-2 text-center"
              onBlur={(e) => {
                const seg = parseInt(e.target.value)
                if (!Number.isFinite(seg) || seg <= 0) return
                if (seg !== parseSeconds(item.repeticoes)) save({ repeticoes: `${seg} s` })
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <Label htmlFor={fieldId('reps')} className="text-xs text-muted-foreground">Reps</Label>
            <Input
              id={fieldId('reps')}
              defaultValue={item.repeticoes}
              placeholder="12"
              className="h-9 px-2 text-center"
              onBlur={(e) => {
                const repeticoes = e.target.value.trim() || '12'
                if (repeticoes !== item.repeticoes) save({ repeticoes })
              }}
            />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <Label htmlFor={fieldId('descanso')} className="text-xs text-muted-foreground">Descanso</Label>
          <select
            id={fieldId('descanso')}
            value={item.descanso_segundos}
            onChange={(e) => save({ descanso_segundos: parseInt(e.target.value) })}
            className="h-9 rounded-md border border-input bg-transparent px-1 text-center text-sm"
          >
            {DESCANSO_OPCOES.map((s) => (
              <option key={s} value={s}>
                {s === 0 ? 'Sem' : s < 60 ? `${s}s` : `${s / 60}${s % 60 ? '.5' : ''} min`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {cardio ? (
        metrics.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Ritmo alvo (opcional)</Label>
            <div className="grid grid-cols-3 gap-2">
              {metrics.map((m) => {
                const info = CARDIO_METRIC_INFO[m]
                const column = METRIC_COLUMN[m]
                const current = item[column] ?? null
                return (
                  <div key={m} className="flex flex-col gap-1">
                    <Label htmlFor={fieldId(m)} className="text-xs text-muted-foreground">
                      {info.label}
                      {info.unit ? ` (${info.unit})` : ''}
                    </Label>
                    <Input
                      id={fieldId(m)}
                      type="number"
                      inputMode="decimal"
                      step={info.step}
                      min={0}
                      max={info.max}
                      defaultValue={current ?? ''}
                      placeholder="-"
                      className="h-9 px-2 text-center"
                      onBlur={(e) => {
                        const value = e.target.value === '' ? null : Number(e.target.value.replace(',', '.'))
                        if (value !== null && (!Number.isFinite(value) || value < 0 || value > info.max)) return
                        if (value === (current == null ? null : Number(current))) return
                        save({ [column]: value })
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )
      ) : kind === 'tempo' ? null : (
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">
          {kind === 'peso_corporal' ? 'Carga extra por série (kg, opcional)' : 'Carga por série (kg)'}
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {cargasPorSerie.map((carga, i) => (
            <div key={i} className="flex flex-col gap-1">
              <Label htmlFor={fieldId(`carga-${i}`)} className="text-xs text-muted-foreground">
                Série {i + 1}
              </Label>
              <Input
                id={fieldId(`carga-${i}`)}
                type="number"
                inputMode="decimal"
                step="0.5"
                min={0}
                defaultValue={carga ?? ''}
                placeholder="-"
                className="h-9 px-2 text-center"
                onBlur={(e) => {
                  const value = e.target.value === '' ? null : Number(e.target.value)
                  if (value !== null && (!Number.isFinite(value) || value < 0)) return
                  if (value === carga) return
                  const updatedLoads = [...cargasPorSerie]
                  updatedLoads[i] = value
                  save({ cargas_por_serie: updatedLoads })
                }}
              />
            </div>
          ))}
        </div>
      </div>
      )}

      <Input
        defaultValue={item.observacoes ?? ''}
        placeholder={cardio ? 'Observações (ex: 1 min forte / 2 min leve)' : 'Observações (ex: drop-set na última série)'}
        aria-label={`Observações de ${item.exercise.nome}`}
        className="h-9 text-sm"
        onBlur={(e) => {
          const observacoes = e.target.value.trim() || null
          if (observacoes !== item.observacoes) save({ observacoes })
        }}
      />

      <button
        type="button"
        onClick={() => setShowVideo((v) => !v)}
        aria-expanded={showVideo}
        className="flex items-center gap-2 self-start text-sm font-medium text-primary"
      >
        <PlayCircle className="h-4 w-4" aria-hidden="true" />
        {showVideo ? 'Ocultar execução' : 'Ver execução'}
      </button>
      {showVideo && <ExerciseVideo exercise={item.exercise} />}
    </div>
  )
}
