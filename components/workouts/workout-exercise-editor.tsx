'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, PlayCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ExerciseVideo } from '@/components/workouts/exercise-video'
import type { WorkoutExercise } from '@/lib/workout-types'

type Updates = Partial<Pick<WorkoutExercise, 'series' | 'repeticoes' | 'carga_kg' | 'descanso_segundos' | 'observacoes'>>

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
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label={`Remover ${item.exercise.nome}`}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={fieldId('series')} className="text-xs text-muted-foreground">Séries</Label>
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
              if (series !== item.series) onUpdate({ series })
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={fieldId('reps')} className="text-xs text-muted-foreground">Reps</Label>
          <Input
            id={fieldId('reps')}
            defaultValue={item.repeticoes}
            placeholder="12"
            className="h-9 px-2 text-center"
            onBlur={(e) => {
              const repeticoes = e.target.value.trim() || '12'
              if (repeticoes !== item.repeticoes) onUpdate({ repeticoes })
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={fieldId('carga')} className="text-xs text-muted-foreground">Carga kg</Label>
          <Input
            id={fieldId('carga')}
            type="number"
            inputMode="decimal"
            step="0.5"
            min={0}
            defaultValue={item.carga_kg ?? ''}
            placeholder="-"
            className="h-9 px-2 text-center"
            onBlur={(e) => {
              const carga = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value))
              if (carga !== (item.carga_kg === null ? null : Number(item.carga_kg))) onUpdate({ carga_kg: carga })
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={fieldId('descanso')} className="text-xs text-muted-foreground">Descanso</Label>
          <select
            id={fieldId('descanso')}
            value={item.descanso_segundos}
            onChange={(e) => onUpdate({ descanso_segundos: parseInt(e.target.value) })}
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

      <Input
        defaultValue={item.observacoes ?? ''}
        placeholder="Observações (ex: drop-set na última série)"
        aria-label={`Observações de ${item.exercise.nome}`}
        className="h-9 text-sm"
        onBlur={(e) => {
          const observacoes = e.target.value.trim() || null
          if (observacoes !== item.observacoes) onUpdate({ observacoes })
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
