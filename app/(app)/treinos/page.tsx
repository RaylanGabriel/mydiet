'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Clock, Dumbbell, Play, Plus, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useWorkouts, useWorkoutSessions } from '@/hooks/use-workouts'
import { CreateWorkoutDialog } from '@/components/workouts/create-workout-dialog'
import { WorkoutHistory } from '@/components/workouts/workout-history'
import { DIAS_SEMANA, estimateWorkoutMinutes, muscleGroupsOf, type Workout } from '@/lib/workout-types'
import { cn } from '@/lib/utils'

export default function TreinosPage() {
  const router = useRouter()
  const { workouts, isLoading, createWorkout } = useWorkouts()
  const { sessions } = useWorkoutSessions()
  const [createOpen, setCreateOpen] = useState(false)

  const today = new Date().getDay()
  const todayWorkout = workouts.find((w) => w.dias_semana?.includes(today))

  const weekStart = new Date()
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const sessionsThisWeek = sessions.filter((s) => new Date(s.iniciado_em) >= weekStart).length

  return (
    <div className="flex flex-1 flex-col">
      <header className="rounded-b-3xl bg-primary px-4 pb-6 pt-8">
        <div className="mx-auto flex max-w-lg flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-foreground/70">Seus treinos</p>
              <h1 className="text-2xl font-bold text-primary-foreground">Treinos</h1>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-2xl font-bold text-primary-foreground">{sessionsThisWeek}</span>
              <span className="text-xs text-primary-foreground/70">nesta semana</span>
            </div>
          </div>

          {todayWorkout && (
            <div className="flex items-center gap-3 rounded-2xl bg-primary-foreground/15 p-4">
              <div className="flex-1">
                <p className="text-xs text-primary-foreground/70">Treino de hoje</p>
                <p className="font-semibold text-primary-foreground">{todayWorkout.nome}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/treinos/${todayWorkout.id}/executar`)}
                disabled={todayWorkout.workout_exercises.length === 0}
              >
                <Play className="h-4 w-4" />
                Iniciar
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto flex max-w-lg flex-col gap-6">
          <section className="flex flex-col gap-3" aria-labelledby="fichas-title">
            <div className="flex items-center justify-between">
              <h2 id="fichas-title" className="font-semibold text-foreground">
                Fichas de treino
              </h2>
              <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Novo treino
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-10">
                <Spinner className="h-6 w-6" />
              </div>
            ) : workouts.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
                <Dumbbell className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium text-foreground">Nenhum treino criado</p>
                  <p className="text-sm text-muted-foreground">Crie seu Treino A, B, C para começar.</p>
                </div>
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Criar primeiro treino
                </Button>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {workouts.map((workout) => (
                  <li key={workout.id}>
                    <WorkoutCard workout={workout} isToday={workout.id === todayWorkout?.id} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <WorkoutHistory />
        </div>
      </main>

      <CreateWorkoutDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        suggestedName={`Treino ${String.fromCharCode(65 + workouts.length)}`}
        onCreate={async (input) => {
          const id = await createWorkout(input)
          setCreateOpen(false)
          router.push(`/treinos/${id}`)
        }}
      />
    </div>
  )
}

function WorkoutCard({ workout, isToday }: { workout: Workout; isToday: boolean }) {
  const exercises = workout.workout_exercises
  const groups = muscleGroupsOf(exercises)
  const minutes = estimateWorkoutMinutes(exercises)
  const letter = workout.nome.replace(/^treino\s*/i, '').charAt(0).toUpperCase() || 'T'

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-2xl border bg-card p-4',
        isToday ? 'border-primary' : 'border-border',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-lg font-bold text-secondary-foreground">
          {letter}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-card-foreground">{workout.nome}</h3>
          <p className="text-sm text-muted-foreground">
            {exercises.length} {exercises.length === 1 ? 'exercício' : 'exercícios'}
            {minutes > 0 && (
              <>
                {' · '}
                <Clock className="inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" /> ~{minutes} min
              </>
            )}
          </p>
          {groups.length > 0 && (
            <p className="mt-1 truncate text-xs text-muted-foreground">{groups.join(' · ')}</p>
          )}
        </div>
      </div>

      {workout.dias_semana?.length > 0 && (
        <div className="flex gap-1" aria-label="Dias da semana">
          {DIAS_SEMANA.map((dia, i) => (
            <span
              key={dia}
              className={cn(
                'flex-1 rounded-md py-1 text-center text-[11px] font-medium',
                workout.dias_semana.includes(i)
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted text-muted-foreground/60',
              )}
            >
              {dia}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/treinos/${workout.id}`}>
            <Settings2 className="h-4 w-4" />
            Editar
          </Link>
        </Button>
        {exercises.length > 0 ? (
          <Button asChild className="flex-1">
            <Link href={`/treinos/${workout.id}/executar`}>
              <Play className="h-4 w-4" />
              Iniciar
            </Link>
          </Button>
        ) : (
          <Button className="flex-1" disabled>
            <Play className="h-4 w-4" />
            Iniciar
          </Button>
        )}
      </div>
    </div>
  )
}
