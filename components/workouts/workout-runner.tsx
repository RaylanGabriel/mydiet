'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, PlayCircle, Timer, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ExerciseVideo } from '@/components/workouts/exercise-video'
import { RestTimer } from '@/components/workouts/rest-timer'
import { useWorkoutSessions, type CompletedSet } from '@/hooks/use-workouts'
import { formatDuration, type Workout, type WorkoutExercise } from '@/lib/workout-types'
import { cn } from '@/lib/utils'

interface SetState {
  reps: string
  carga: string
  done: boolean
}

interface RunState {
  startedAt: string
  sets: Record<string, SetState[]>
}

function storageKey(workoutId: string) {
  return `treino-em-andamento-${workoutId}`
}

function buildInitialState(workout: Workout): RunState {
  const sets: Record<string, SetState[]> = {}
  for (const we of workout.workout_exercises) {
    const reps = String(parseInt(we.repeticoes) || '')
    sets[we.id] = Array.from({ length: we.series }, () => ({
      reps,
      carga: we.carga_kg !== null ? String(Number(we.carga_kg)) : '',
      done: false,
    }))
  }
  return { startedAt: new Date().toISOString(), sets }
}

function loadState(workout: Workout): RunState {
  try {
    const saved = localStorage.getItem(storageKey(workout.id))
    if (saved) {
      const parsed = JSON.parse(saved) as RunState
      const fresh = buildInitialState(workout)
      for (const id of Object.keys(fresh.sets)) {
        if (parsed.sets[id]) fresh.sets[id] = parsed.sets[id]
      }
      return { startedAt: parsed.startedAt, sets: fresh.sets }
    }
  } catch {
    // ignore corrupted saved progress
  }
  return buildInitialState(workout)
}

export function WorkoutRunner({ workout }: { workout: Workout }) {
  const router = useRouter()
  const { saveSession } = useWorkoutSessions()
  const [state, setState] = useState<RunState | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null)
  const [restTotal, setRestTotal] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmExit, setConfirmExit] = useState(false)

  useEffect(() => {
    setState(loadState(workout))
  }, [workout])

  useEffect(() => {
    if (state) localStorage.setItem(storageKey(workout.id), JSON.stringify(state))
  }, [state, workout.id])

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const { doneCount, totalCount } = useMemo(() => {
    if (!state) return { doneCount: 0, totalCount: 0 }
    const all = Object.values(state.sets).flat()
    return { doneCount: all.filter((s) => s.done).length, totalCount: all.length }
  }, [state])

  if (!state) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const elapsed = Math.max(0, Math.floor((now - new Date(state.startedAt).getTime()) / 1000))
  const progress = totalCount ? Math.round((doneCount / totalCount) * 100) : 0

  const updateSet = (weId: string, index: number, patch: Partial<SetState>) => {
    setState((prev) => {
      if (!prev) return prev
      const list = [...prev.sets[weId]]
      list[index] = { ...list[index], ...patch }
      return { ...prev, sets: { ...prev.sets, [weId]: list } }
    })
  }

  const toggleSet = (we: WorkoutExercise, index: number) => {
    const current = state.sets[we.id][index]
    updateSet(we.id, index, { done: !current.done })
    if (!current.done && we.descanso_segundos > 0) {
      setRestTotal(we.descanso_segundos)
      setRestEndsAt(Date.now() + we.descanso_segundos * 1000)
    }
  }

  const addSet = (weId: string) => {
    setState((prev) => {
      if (!prev) return prev
      const list = prev.sets[weId]
      const last = list[list.length - 1]
      return {
        ...prev,
        sets: { ...prev.sets, [weId]: [...list, { reps: last?.reps ?? '', carga: last?.carga ?? '', done: false }] },
      }
    })
  }

  const handleFinish = async () => {
    setSaving(true)
    setError(null)
    const completed: CompletedSet[] = []
    for (const we of workout.workout_exercises) {
      state.sets[we.id].forEach((set, i) => {
        if (!set.done) return
        completed.push({
          exercise_id: we.exercise_id,
          exercise_nome: we.exercise.nome,
          serie_numero: i + 1,
          repeticoes: parseInt(set.reps) || 0,
          carga_kg: set.carga === '' ? null : parseFloat(set.carga) || 0,
        })
      })
    }
    try {
      await saveSession({
        workout_id: workout.id,
        workout_nome: workout.nome,
        iniciado_em: state.startedAt,
        sets: completed,
      })
      localStorage.removeItem(storageKey(workout.id))
      router.push('/treinos')
    } catch {
      setError('Não foi possível salvar o treino. Tente novamente.')
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    if (!confirmExit) {
      setConfirmExit(true)
      setTimeout(() => setConfirmExit(false), 3000)
      return
    }
    localStorage.removeItem(storageKey(workout.id))
    router.push(`/treinos/${workout.id}`)
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg flex-col gap-2 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className={cn('-ml-2', confirmExit ? 'text-destructive' : 'text-muted-foreground')}
              onClick={handleDiscard}
              aria-label={confirmExit ? 'Confirmar descarte do treino' : 'Descartar treino'}
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-semibold text-foreground">{workout.nome}</h1>
              <p className="text-xs text-muted-foreground">
                {confirmExit ? 'Toque no X de novo para descartar' : `${doneCount} de ${totalCount} séries`}
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5" aria-label="Tempo de treino">
              <Timer className="h-4 w-4 text-secondary-foreground" aria-hidden="true" />
              <span className="font-mono text-sm font-semibold tabular-nums text-secondary-foreground">
                {formatDuration(elapsed)}
              </span>
            </div>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso do treino"
          >
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4">
        <ol className="mx-auto flex max-w-lg flex-col gap-4">
          {workout.workout_exercises.map((we, index) => (
            <li key={we.id}>
              <ExerciseRunCard
                item={we}
                index={index}
                sets={state.sets[we.id]}
                onToggle={(i) => toggleSet(we, i)}
                onChange={(i, patch) => updateSet(we.id, i, patch)}
                onAddSet={() => addSet(we.id)}
              />
            </li>
          ))}
        </ol>

        <div className="mx-auto mt-6 flex max-w-lg flex-col gap-2 pb-24">
          {error && <p className="text-center text-sm text-destructive">{error}</p>}
          <Button size="lg" onClick={handleFinish} disabled={saving || doneCount === 0}>
            {saving ? <Spinner className="h-4 w-4" /> : <Check className="h-5 w-5" />}
            Finalizar treino
          </Button>
          {doneCount === 0 && (
            <p className="text-center text-xs text-muted-foreground">Marque ao menos uma série para finalizar.</p>
          )}
          <Button asChild variant="ghost">
            <Link href="/treinos">Continuar depois</Link>
          </Button>
        </div>
      </main>

      {restEndsAt && (
        <RestTimer
          endsAt={restEndsAt}
          total={restTotal}
          now={now}
          onAdd={(seconds) => {
            setRestEndsAt((end) => (end ?? Date.now()) + seconds * 1000)
            setRestTotal((t) => t + seconds)
          }}
          onSkip={() => setRestEndsAt(null)}
        />
      )}
    </div>
  )
}

function ExerciseRunCard({
  item,
  index,
  sets,
  onToggle,
  onChange,
  onAddSet,
}: {
  item: WorkoutExercise
  index: number
  sets: SetState[]
  onToggle: (index: number) => void
  onChange: (index: number, patch: Partial<SetState>) => void
  onAddSet: () => void
}) {
  const [showVideo, setShowVideo] = useState(false)
  const allDone = sets.length > 0 && sets.every((s) => s.done)

  return (
    <div className={cn('flex flex-col gap-3 rounded-2xl border bg-card p-4', allDone ? 'border-primary/60' : 'border-border')}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
            allDone ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
          )}
        >
          {allDone ? <Check className="h-4 w-4" aria-label="Concluído" /> : index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold leading-tight text-card-foreground">{item.exercise.nome}</h2>
          <p className="text-xs text-muted-foreground">
            {item.series} x {item.repeticoes}
            {item.descanso_segundos > 0 && ` · descanso ${item.descanso_segundos}s`}
          </p>
          {item.observacoes && <p className="mt-1 text-xs text-accent">{item.observacoes}</p>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-primary"
          onClick={() => setShowVideo((v) => !v)}
          aria-expanded={showVideo}
          aria-label={showVideo ? 'Ocultar execução' : 'Ver execução'}
        >
          <PlayCircle className="h-5 w-5" />
        </Button>
      </div>

      {showVideo && <ExerciseVideo exercise={item.exercise} />}

      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <span>Série</span>
          <span className="text-center">Reps</span>
          <span className="text-center">Kg</span>
          <span className="sr-only">Concluir</span>
        </div>
        {sets.map((set, i) => (
          <div
            key={i}
            className={cn(
              'grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2 rounded-lg px-1 py-1 transition-colors',
              set.done && 'bg-primary/10',
            )}
          >
            <span className="text-center text-sm font-semibold text-muted-foreground">{i + 1}</span>
            <input
              type="number"
              inputMode="numeric"
              value={set.reps}
              onChange={(e) => onChange(i, { reps: e.target.value })}
              aria-label={`Repetições da série ${i + 1}`}
              className="h-10 w-full rounded-md border border-input bg-background text-center text-base font-medium tabular-nums"
            />
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={set.carga}
              placeholder="-"
              onChange={(e) => onChange(i, { carga: e.target.value })}
              aria-label={`Carga em kg da série ${i + 1}`}
              className="h-10 w-full rounded-md border border-input bg-background text-center text-base font-medium tabular-nums"
            />
            <button
              type="button"
              onClick={() => onToggle(i)}
              aria-pressed={set.done}
              aria-label={set.done ? `Desmarcar série ${i + 1}` : `Concluir série ${i + 1}`}
              className={cn(
                'flex h-10 w-11 items-center justify-center rounded-md border transition-colors',
                set.done
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background text-muted-foreground hover:text-foreground',
              )}
            >
              <Check className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={onAddSet} className="self-start text-sm font-medium text-primary">
        + Adicionar série
      </button>
    </div>
  )
}
