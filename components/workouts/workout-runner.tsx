'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeftRight, Check, PlayCircle, Timer, Trophy, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ExerciseVideo } from '@/components/workouts/exercise-video'
import { RestTimer } from '@/components/workouts/rest-timer'
import { WorkoutSummary, type SummaryData } from '@/components/workouts/workout-summary'
import {
  estimate1RM,
  useExerciseHistory,
  useWorkoutSessions,
  type CompletedSet,
  type ExerciseHistory,
  type HistorySet,
} from '@/hooks/use-workouts'
import { formatDuration, getWorkoutExerciseLoads, type Exercise, type Workout, type WorkoutExercise } from '@/lib/workout-types'
import { SwapExerciseSheet } from '@/components/workouts/swap-exercise-sheet'
import { CARDIO_METRIC_INFO, cardioHint, cardioMetrics, formatCardio, parseMinutes, type CardioMetric } from '@/lib/cardio'
import { exerciseKind, formatSeconds, parseSeconds, type ExerciseKind } from '@/lib/exercise-kind'
import { cn } from '@/lib/utils'

interface SetState {
  reps: string
  carga: string
  done: boolean
  /** Exercício por tempo: segundos */
  seg?: string
  /** Cardio: minutos e ritmo (podem faltar em progresso salvo antes desta versão) */
  min?: string
  velocidade?: string
  inclinacao?: string
  nivel?: string
}

interface RunState {
  startedAt: string
  sets: Record<string, SetState[]>
  /** Trocas feitas só neste treino (máquina ocupada): id do item do treino → exercício usado */
  swaps?: Record<string, Exercise>
}

const str = (n: number | null | undefined) => (n == null ? '' : String(Number(n)))
const toNum = (s: string | undefined) => {
  if (!s || s.trim() === '') return null
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const kg = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',')

function storageKey(workoutId: string) {
  return `treino-em-andamento-${workoutId}`
}

/**
 * Séries iniciais de um item do treino. `exercise` pode ser um substituto:
 * nesse caso as cargas planejadas (do exercício original) não são reaproveitadas.
 */
function setsFor(we: WorkoutExercise, exercise: Exercise = we.exercise): SetState[] {
  const swapped = exercise.id !== we.exercise.id
  const kind = exerciseKind(exercise)
  const originalKind = exerciseKind(we.exercise)
  if (kind === 'cardio') {
    return Array.from({ length: we.series }, () => ({
      reps: '',
      carga: '',
      done: false,
      min: str(originalKind === 'cardio' ? parseMinutes(we.repeticoes) : 20),
      velocidade: swapped ? '' : str(we.velocidade_kmh),
      inclinacao: swapped ? '' : str(we.inclinacao_pct),
      nivel: swapped ? '' : str(we.nivel),
    }))
  }
  if (kind === 'tempo') {
    return Array.from({ length: we.series }, () => ({
      reps: '',
      carga: '',
      done: false,
      seg: str(originalKind === 'tempo' ? parseSeconds(we.repeticoes) : 30),
    }))
  }
  const reps = originalKind === 'carga' || originalKind === 'peso_corporal' ? String(parseInt(we.repeticoes) || '') : '12'
  const cargasPorSerie = swapped ? [] : getWorkoutExerciseLoads(we)
  return Array.from({ length: we.series }, (_, index) => ({
    reps,
    carga: cargasPorSerie[index] != null ? String(Number(cargasPorSerie[index])) : '',
    done: false,
  }))
}

function buildInitialState(workout: Workout): RunState {
  const sets: Record<string, SetState[]> = {}
  for (const we of workout.workout_exercises) sets[we.id] = setsFor(we)
  return { startedAt: new Date().toISOString(), sets, swaps: {} }
}

function loadState(workout: Workout): RunState {
  try {
    const saved = localStorage.getItem(storageKey(workout.id))
    if (saved) {
      const parsed = JSON.parse(saved) as RunState
      const fresh = buildInitialState(workout)
      const swaps: Record<string, Exercise> = {}
      for (const id of Object.keys(fresh.sets)) {
        if (parsed.sets[id]) fresh.sets[id] = parsed.sets[id]
        if (parsed.swaps?.[id]) swaps[id] = parsed.swaps[id]
      }
      return { startedAt: parsed.startedAt, sets: fresh.sets, swaps }
    }
  } catch {
    // ignore corrupted saved progress
  }
  return buildInitialState(workout)
}

/** Recorde batido nesta série? (só conta se já existe histórico para comparar) */
function setRecord(kind: ExerciseKind, set: SetState, history: ExerciseHistory | undefined): string | null {
  if (!history || !set.done) return null
  const { best } = history
  const carga = toNum(set.carga) ?? 0
  const reps = toNum(set.reps) ?? 0
  if (kind === 'tempo') {
    const seg = toNum(set.seg) ?? 0
    return best.segundos != null && seg > best.segundos ? 'Recorde de tempo' : null
  }
  if (kind === 'peso_corporal' && carga === 0) {
    return best.reps != null && reps > best.reps ? 'Recorde de repetições' : null
  }
  if (kind === 'carga' || kind === 'peso_corporal') {
    if (best.carga != null && carga > best.carga) return 'Recorde de carga'
    const e1rm = estimate1RM(carga, reps)
    if (best.e1rm != null && e1rm > best.e1rm + 0.05) return 'Melhor série'
  }
  return null
}

function describeLast(kind: ExerciseKind, s: HistorySet) {
  if (kind === 'tempo') return s.duracao_seg != null ? `${s.duracao_seg}s` : '—'
  if (kind === 'cardio') return formatCardio(s) || '—'
  const carga = s.carga_kg == null ? null : Number(s.carga_kg)
  if (kind === 'peso_corporal' && !carga) return `PC×${s.repeticoes}`
  return carga == null ? `${s.repeticoes} reps` : `${kg(carga)}×${s.repeticoes}`
}

export function WorkoutRunner({ workout }: { workout: Workout }) {
  const router = useRouter()
  const { sessions, saveSession } = useWorkoutSessions()
  const [state, setState] = useState<RunState | null>(null)
  const [swapTarget, setSwapTarget] = useState<WorkoutExercise | null>(null)
  const swaps = state?.swaps
  // Histórico inclui os substitutos, para a coluna "Anterior" e os recordes valerem para eles
  const exerciseIds = useMemo(
    () => Array.from(new Set([...workout.workout_exercises.map((we) => we.exercise_id), ...Object.values(swaps ?? {}).map((e) => e.id)])),
    [workout, swaps],
  )
  const { history } = useExerciseHistory(exerciseIds)
  const [now, setNow] = useState(() => Date.now())
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null)
  const [restTotal, setRestTotal] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmExit, setConfirmExit] = useState(false)
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const recordToastRef = useRef(new Set<string>())

  useEffect(() => {
    setState(loadState(workout))
  }, [workout])

  useEffect(() => {
    if (state && !summary) localStorage.setItem(storageKey(workout.id), JSON.stringify(state))
  }, [state, workout.id, summary])

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const { doneCount, totalCount } = useMemo(() => {
    if (!state) return { doneCount: 0, totalCount: 0 }
    const all = Object.values(state.sets).flat()
    return { doneCount: all.filter((s) => s.done).length, totalCount: all.length }
  }, [state])

  if (summary) return <WorkoutSummary data={summary} onClose={() => router.push('/treinos')} />

  if (!state) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const elapsed = Math.max(0, Math.floor((now - new Date(state.startedAt).getTime()) / 1000))
  const progress = totalCount ? Math.round((doneCount / totalCount) * 100) : 0

  /** Exercício que está sendo feito de fato (o original ou o substituto escolhido) */
  const effective = (we: WorkoutExercise): Exercise => state.swaps?.[we.id] ?? we.exercise

  const swapExercise = (we: WorkoutExercise, exercise: Exercise) => {
    const backToOriginal = exercise.id === we.exercise.id
    setState((prev) => {
      if (!prev) return prev
      const nextSwaps = { ...(prev.swaps ?? {}) }
      if (backToOriginal) delete nextSwaps[we.id]
      else nextSwaps[we.id] = exercise
      return { ...prev, swaps: nextSwaps, sets: { ...prev.sets, [we.id]: setsFor(we, exercise) } }
    })
    setSwapTarget(null)
    toast.success(backToOriginal ? 'Troca desfeita' : 'Exercício trocado', {
      description: backToOriginal ? `De volta para ${we.exercise.nome}.` : `${we.exercise.nome} → ${exercise.nome} (só neste treino)`,
    })
  }

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
    const marking = !current.done
    updateSet(we.id, index, { done: marking })
    if (marking && we.descanso_segundos > 0) {
      setRestTotal(we.descanso_segundos)
      setRestEndsAt(Date.now() + we.descanso_segundos * 1000)
    }
    // Comemora o recorde na hora (uma vez por série)
    if (marking) {
      const ex = effective(we)
      const record = setRecord(exerciseKind(ex), { ...current, done: true }, history[ex.id])
      const key = `${we.id}-${ex.id}-${index}`
      if (record && !recordToastRef.current.has(key)) {
        recordToastRef.current.add(key)
        toast.success(`🏆 ${record}!`, { description: ex.nome })
      }
    }
  }

  const addSet = (weId: string) => {
    setState((prev) => {
      if (!prev) return prev
      const list = prev.sets[weId]
      const last = list[list.length - 1]
      return {
        ...prev,
        sets: { ...prev.sets, [weId]: [...list, { ...(last ?? { reps: '', carga: '' }), done: false }] },
      }
    })
  }

  const buildSummary = (completed: CompletedSet[]): SummaryData => {
    const volume = completed.reduce((sum, s) => sum + s.repeticoes * (s.carga_kg ?? 0), 0)
    const cardioMin = completed.reduce((sum, s) => sum + (s.cardio?.duracao_min ?? 0), 0)
    const anterior = sessions.find((s) => s.workout_id === workout.id)

    const recordes: SummaryData['recordes'] = []
    for (const we of workout.workout_exercises) {
      const ex = effective(we)
      const h = history[ex.id]
      if (!h) continue
      const kind = exerciseKind(ex)
      const done = state.sets[we.id].filter((s) => s.done)
      if (done.length === 0) continue
      if (kind === 'tempo') {
        const max = Math.max(...done.map((s) => toNum(s.seg) ?? 0))
        if (h.best.segundos != null && max > h.best.segundos)
          recordes.push({ exercicio: ex.nome, tipo: 'Maior tempo', valor: formatSeconds(max), antes: formatSeconds(h.best.segundos) })
        continue
      }
      if (kind === 'cardio') continue
      const maxCarga = Math.max(...done.map((s) => toNum(s.carga) ?? 0))
      if (kind === 'peso_corporal' && maxCarga === 0) {
        const maxReps = Math.max(...done.map((s) => toNum(s.reps) ?? 0))
        if (h.best.reps != null && maxReps > h.best.reps)
          recordes.push({ exercicio: ex.nome, tipo: 'Mais repetições', valor: `${maxReps}`, antes: `${h.best.reps}` })
        continue
      }
      if (h.best.carga != null && maxCarga > h.best.carga) {
        recordes.push({ exercicio: ex.nome, tipo: 'Maior carga', valor: `${kg(maxCarga)} kg`, antes: `${kg(h.best.carga)} kg` })
        continue
      }
      const bestSet = done.reduce(
        (acc, s) => {
          const e = estimate1RM(toNum(s.carga) ?? 0, toNum(s.reps) ?? 0)
          return e > acc.e ? { e, s } : acc
        },
        { e: 0, s: done[0] },
      )
      if (h.best.e1rm != null && bestSet.e > h.best.e1rm + 0.05)
        recordes.push({
          exercicio: ex.nome,
          tipo: 'Melhor série',
          valor: `${kg(toNum(bestSet.s.carga) ?? 0)} kg × ${toNum(bestSet.s.reps) ?? 0}`,
          antes: `1RM est. ${kg(h.best.e1rm)} kg → ${kg(bestSet.e)} kg`,
        })
    }

    return {
      workoutNome: workout.nome,
      duracaoSegundos: elapsed,
      series: completed.length,
      exercicios: new Set(completed.map((s) => s.exercise_id)).size,
      volumeKg: volume,
      cardioMin,
      volumeAnteriorKg: anterior ? Number(anterior.volume_total_kg) : null,
      recordes,
    }
  }

  const handleFinish = async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    const completed: CompletedSet[] = []
    for (const we of workout.workout_exercises) {
      const ex = effective(we)
      const kind = exerciseKind(ex)
      state.sets[we.id].forEach((set, i) => {
        if (!set.done) return
        // Com troca, a série fica registrada no exercício realmente feito
        const base = { exercise_id: ex.id, exercise_nome: ex.nome, serie_numero: i + 1 }
        if (kind === 'cardio') {
          completed.push({
            ...base,
            repeticoes: 0,
            carga_kg: null,
            cardio: {
              duracao_min: toNum(set.min),
              velocidade_kmh: toNum(set.velocidade),
              inclinacao_pct: toNum(set.inclinacao),
              nivel: toNum(set.nivel),
            },
          })
        } else if (kind === 'tempo') {
          completed.push({ ...base, repeticoes: 0, carga_kg: null, duracao_seg: Math.round(toNum(set.seg) ?? 0) })
        } else {
          completed.push({
            ...base,
            repeticoes: parseInt(set.reps) || 0,
            carga_kg: set.carga === '' ? null : parseFloat(set.carga.replace(',', '.')) || 0,
          })
        }
      })
    }
    // Calcula o resumo ANTES de salvar, comparando com o histórico anterior
    const data = buildSummary(completed)
    try {
      await saveSession({
        workout_id: workout.id,
        workout_nome: workout.nome,
        iniciado_em: state.startedAt,
        sets: completed,
      })
      localStorage.removeItem(storageKey(workout.id))
      setRestEndsAt(null)
      setSummary(data)
      window.scrollTo({ top: 0 })
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes('script')
          ? err.message
          : 'Não foi possível salvar o treino. Tente novamente.',
      )
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    localStorage.removeItem(storageKey(workout.id))
    toast('Treino descartado.')
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
              className="-ml-2 text-muted-foreground"
              onClick={() => (doneCount === 0 ? handleDiscard() : setConfirmExit(true))}
              aria-label="Descartar treino"
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-semibold text-foreground">{workout.nome}</h1>
              <p className="text-xs text-muted-foreground">
                {doneCount} de {totalCount} séries
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
                exercise={effective(we)}
                index={index}
                sets={state.sets[we.id]}
                history={history[effective(we).id]}
                onToggle={(i) => toggleSet(we, i)}
                onChange={(i, patch) => updateSet(we.id, i, patch)}
                onAddSet={() => addSet(we.id)}
                onSwap={() => setSwapTarget(we)}
                onUndoSwap={() => swapExercise(we, we.exercise)}
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

      <SwapExerciseSheet
        original={swapTarget ? effective(swapTarget) : null}
        excludeIds={workout.workout_exercises.map((we) => effective(we).id)}
        doneSets={swapTarget ? state.sets[swapTarget.id].filter((s) => s.done).length : 0}
        onOpenChange={(open) => !open && setSwapTarget(null)}
        onSwap={(exercise) => swapTarget && swapExercise(swapTarget, exercise)}
      />

      <AlertDialog open={confirmExit} onOpenChange={setConfirmExit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar este treino?</AlertDialogTitle>
            <AlertDialogDescription>
              Você já marcou {doneCount} {doneCount === 1 ? 'série' : 'séries'}. Ao descartar, nada será salvo no histórico.
              Se quiser terminar mais tarde, use &quot;Continuar depois&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar ao treino</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscard}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ExerciseRunCard({
  item,
  exercise,
  index,
  sets,
  history,
  onToggle,
  onChange,
  onAddSet,
  onSwap,
  onUndoSwap,
}: {
  item: WorkoutExercise
  /** Exercício efetivo: o original ou o substituto escolhido neste treino */
  exercise: Exercise
  index: number
  sets: SetState[]
  history: ExerciseHistory | undefined
  onToggle: (index: number) => void
  onChange: (index: number, patch: Partial<SetState>) => void
  onAddSet: () => void
  onSwap: () => void
  onUndoSwap: () => void
}) {
  const [showVideo, setShowVideo] = useState(false)
  const allDone = sets.length > 0 && sets.every((s) => s.done)
  const swapped = exercise.id !== item.exercise.id
  const kind = exerciseKind(exercise)
  const metrics = cardioMetrics(exercise)
  // Se o substituto é de outro tipo (ex.: carga → tempo), a meta original não se aplica
  const sameKindAsPlanned = exerciseKind(item.exercise) === kind
  const subtitle = !sameKindAsPlanned
    ? `${item.series} ${kind === 'cardio' ? (item.series === 1 ? 'bloco' : 'blocos') : 'séries'}`
    : kind === 'cardio'
      ? `${item.series > 1 ? `${item.series} blocos · ` : ''}Meta: ${
          formatCardio({
            duracao_min: parseMinutes(item.repeticoes),
            velocidade_kmh: item.velocidade_kmh,
            inclinacao_pct: item.inclinacao_pct,
            nivel: item.nivel,
          }) || item.repeticoes
        }`
      : `${item.series} x ${item.repeticoes}`
  const lastLabel = history?.lastDate
    ? new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'numeric' }).format(new Date(history.lastDate))
    : null

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
          <h2 className="font-semibold leading-tight text-card-foreground">{exercise.nome}</h2>
          {swapped && (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
              <ArrowLeftRight className="h-3 w-3" aria-hidden="true" />
              <span>
                no lugar de <span className="line-through">{item.exercise.nome}</span>
              </span>
              <button type="button" onClick={onUndoSwap} className="font-medium text-primary underline-offset-2 hover:underline">
                Desfazer
              </button>
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {subtitle}
            {item.descanso_segundos > 0 && ` · descanso ${item.descanso_segundos}s`}
          </p>
          {item.observacoes && <p className="mt-1 text-xs text-accent">{item.observacoes}</p>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={onSwap}
          aria-label={`Trocar ${exercise.nome} (aparelho ocupado)`}
          title="Aparelho ocupado? Trocar exercício"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </Button>
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

      {showVideo && <ExerciseVideo exercise={exercise} />}

      {kind === 'cardio' ? (
        <>
          <CardioSets sets={sets} metrics={metrics} blocos={item.series > 1} onToggle={onToggle} onChange={onChange} />
          {history?.last[0] && (
            <p className="px-1 text-xs text-muted-foreground">
              Última vez ({lastLabel}): {describeLast('cardio', history.last[0])}
            </p>
          )}
        </>
      ) : (
        <StrengthSets
          kind={kind}
          sets={sets}
          last={history?.last ?? []}
          lastLabel={lastLabel}
          history={history}
          onToggle={onToggle}
          onChange={onChange}
        />
      )}

      <button type="button" onClick={onAddSet} className="self-start text-sm font-medium text-primary">
        {kind === 'cardio' ? '+ Adicionar bloco' : '+ Adicionar série'}
      </button>
    </div>
  )
}

const inputClass =
  'h-10 w-full min-w-0 rounded-md border border-input bg-background text-center text-base font-medium tabular-nums placeholder:text-muted-foreground/60'

function DoneButton({ done, onClick, label }: { done: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={done}
      aria-label={label}
      className={cn(
        'flex h-10 w-11 items-center justify-center rounded-md border transition-colors',
        done ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background text-muted-foreground hover:text-foreground',
      )}
    >
      <Check className="h-5 w-5" />
    </button>
  )
}

/** Séries de musculação: carga, peso corporal (+kg opcional) ou tempo, com a coluna "Anterior". */
function StrengthSets({
  kind,
  sets,
  last,
  lastLabel,
  history,
  onToggle,
  onChange,
}: {
  kind: Exclude<ExerciseKind, 'cardio'>
  sets: SetState[]
  last: HistorySet[]
  lastLabel: string | null
  history: ExerciseHistory | undefined
  onToggle: (index: number) => void
  onChange: (index: number, patch: Partial<SetState>) => void
}) {
  const columns = kind === 'tempo' ? '2rem 4.5rem minmax(0,1fr) 2.75rem' : '2rem 4.5rem minmax(0,1fr) minmax(0,1fr) 2.75rem'

  // Copia o que foi feito da última vez para a série (toque na coluna "Anterior")
  const copyLast = (i: number, prev: HistorySet) => {
    if (kind === 'tempo') onChange(i, { seg: str(prev.duracao_seg) })
    else onChange(i, { reps: String(prev.repeticoes || ''), carga: str(prev.carga_kg) })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="grid items-center gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
        style={{ gridTemplateColumns: columns }}
      >
        <span>Série</span>
        <span className="text-center" title={lastLabel ? `Treino de ${lastLabel}` : undefined}>
          Anterior
        </span>
        {kind === 'tempo' ? (
          <span className="text-center">Seg</span>
        ) : (
          <>
            <span className="text-center">Reps</span>
            <span className="text-center">{kind === 'peso_corporal' ? '+Kg' : 'Kg'}</span>
          </>
        )}
        <span className="sr-only">Concluir</span>
      </div>

      {sets.map((set, i) => {
        const prev = last[i] ?? last[last.length - 1]
        const record = setRecord(kind, set, history)
        return (
          <div key={i} className="flex flex-col">
            <div
              className={cn('grid items-center gap-2 rounded-lg px-1 py-1 transition-colors', set.done && 'bg-primary/10')}
              style={{ gridTemplateColumns: columns }}
            >
              <span className="text-center text-sm font-semibold text-muted-foreground">{i + 1}</span>
              {prev ? (
                <button
                  type="button"
                  onClick={() => !set.done && copyLast(i, prev)}
                  disabled={set.done}
                  className="truncate rounded-md px-1 py-2 text-center text-xs font-medium tabular-nums text-muted-foreground hover:bg-muted disabled:hover:bg-transparent"
                  aria-label={`Última vez: ${describeLast(kind, prev)}. Toque para copiar`}
                >
                  {describeLast(kind, prev)}
                </button>
              ) : (
                <span className="text-center text-xs text-muted-foreground/60">—</span>
              )}
              {kind === 'tempo' ? (
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={set.seg ?? ''}
                  placeholder={prev?.duracao_seg != null ? String(prev.duracao_seg) : '-'}
                  onChange={(e) => onChange(i, { seg: e.target.value })}
                  aria-label={`Segundos da série ${i + 1}`}
                  className={inputClass}
                />
              ) : (
                <>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={set.reps}
                    placeholder={prev ? String(prev.repeticoes) : '-'}
                    onChange={(e) => onChange(i, { reps: e.target.value })}
                    aria-label={`Repetições da série ${i + 1}`}
                    className={inputClass}
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    value={set.carga}
                    placeholder={prev?.carga_kg != null ? str(prev.carga_kg) : kind === 'peso_corporal' ? 'PC' : '-'}
                    onChange={(e) => onChange(i, { carga: e.target.value })}
                    aria-label={kind === 'peso_corporal' ? `Carga extra em kg da série ${i + 1} (opcional)` : `Carga em kg da série ${i + 1}`}
                    className={inputClass}
                  />
                </>
              )}
              <DoneButton
                done={set.done}
                onClick={() => onToggle(i)}
                label={set.done ? `Desmarcar série ${i + 1}` : `Concluir série ${i + 1}`}
              />
            </div>
            {record && (
              <span className="ml-10 mt-0.5 flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                {record}!
              </span>
            )}
          </div>
        )
      })}
      {kind === 'peso_corporal' && (
        <p className="px-1 text-xs text-muted-foreground">PC = peso corporal. Preencha &quot;+Kg&quot; só se usar carga extra.</p>
      )}
    </div>
  )
}

const METRIC_FIELD: Record<CardioMetric, keyof SetState> = {
  velocidade: 'velocidade',
  inclinacao: 'inclinacao',
  nivel: 'nivel',
}

/** Linhas do cardio: tempo + ritmo (velocidade/inclinação ou nível), no lugar de reps e kg. */
function CardioSets({
  sets,
  metrics,
  blocos,
  onToggle,
  onChange,
}: {
  sets: SetState[]
  metrics: CardioMetric[]
  blocos: boolean
  onToggle: (index: number) => void
  onChange: (index: number, patch: Partial<SetState>) => void
}) {
  const columns = `${blocos ? '2rem ' : ''}repeat(${1 + metrics.length}, minmax(0, 1fr)) 2.75rem`
  const hint = cardioHint(metrics)

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="grid items-center gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
        style={{ gridTemplateColumns: columns }}
      >
        {blocos && <span>Bloco</span>}
        <span className="text-center">Min</span>
        {metrics.map((m) => (
          <span key={m} className="text-center">
            {CARDIO_METRIC_INFO[m].short}
          </span>
        ))}
        <span className="sr-only">Concluir</span>
      </div>
      {sets.map((set, i) => (
        <div
          key={i}
          className={cn('grid items-center gap-2 rounded-lg px-1 py-1 transition-colors', set.done && 'bg-primary/10')}
          style={{ gridTemplateColumns: columns }}
        >
          {blocos && <span className="text-center text-sm font-semibold text-muted-foreground">{i + 1}</span>}
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min={0}
            value={set.min ?? ''}
            placeholder="-"
            onChange={(e) => onChange(i, { min: e.target.value })}
            aria-label={`Minutos${blocos ? ` do bloco ${i + 1}` : ''}`}
            className={inputClass}
          />
          {metrics.map((m) => {
            const info = CARDIO_METRIC_INFO[m]
            const field = METRIC_FIELD[m]
            return (
              <input
                key={m}
                type="number"
                inputMode="decimal"
                step={info.step}
                min={0}
                max={info.max}
                value={(set[field] as string | undefined) ?? ''}
                placeholder="-"
                onChange={(e) => onChange(i, { [field]: e.target.value })}
                aria-label={`${info.label}${info.unit ? ` em ${info.unit}` : ''}${blocos ? ` do bloco ${i + 1}` : ''}`}
                className={inputClass}
              />
            )
          })}
          <DoneButton done={set.done} onClick={() => onToggle(i)} label={set.done ? 'Desmarcar' : 'Concluir'} />
        </div>
      ))}
      {hint && <p className="px-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
