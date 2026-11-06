'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock, Play, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useWorkout } from '@/hooks/use-workouts'
import { ExercisePicker } from '@/components/workouts/exercise-picker'
import { WorkoutExerciseEditor } from '@/components/workouts/workout-exercise-editor'
import { DaysOfWeekPicker } from '@/components/workouts/days-of-week-picker'
import { CoverPicker } from '@/components/workouts/cover-picker'
import { estimateWorkoutMinutes } from '@/lib/workout-types'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export default function EditarTreinoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const {
    workout,
    isLoading,
    updateWorkout,
    uploadCover,
    deleteWorkout,
    addExercise,
    updateExercise,
    moveExercise,
    removeExercise,
  } = useWorkout(id)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!workout) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-muted-foreground">Treino não encontrado.</p>
        <Button asChild variant="outline">
          <Link href="/treinos">Voltar aos treinos</Link>
        </Button>
      </div>
    )
  }

  const exercises = workout.workout_exercises
  const minutes = estimateWorkoutMinutes(exercises)

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-safe z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-2 py-2">
          <Button asChild variant="ghost" size="icon" aria-label="Voltar">
            <Link href="/treinos">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <Input
            key={workout.id + workout.nome}
            defaultValue={workout.nome}
            aria-label="Nome do treino"
            className="h-10 flex-1 border-transparent bg-transparent text-lg font-semibold shadow-none focus-visible:border-input"
            onBlur={(e) => {
              const nome = e.target.value.trim()
              if (nome && nome !== workout.nome) updateWorkout({ nome })
            }}
          />
          <AlertDialog
            open={confirmDelete}
            onOpenChange={(open) => {
              if (!deleting) setConfirmDelete(open)
            }}
          >
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label="Excluir treino">
                <Trash2 className="h-5 w-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir {workout.nome}?</AlertDialogTitle>
                <AlertDialogDescription>
                  O treino e seus {exercises.length} {exercises.length === 1 ? 'exercício' : 'exercícios'} serão removidos. Os
                  treinos que você já fez continuam no histórico. Essa ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true)
                    try {
                      await deleteWorkout()
                      toast.success('Treino excluído', { description: workout.nome })
                      router.push('/treinos')
                    } catch {
                      toast.error('Não foi possível excluir o treino.')
                      setDeleting(false)
                    }
                  }}
                >
                  {deleting ? <Spinner className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <main className="flex-1 px-4 py-4">
        <div className="mx-auto flex max-w-lg flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Foto de capa</span>
            <CoverPicker
              workoutName={workout.nome}
              coverUrl={workout.capa_url}
              onUpload={uploadCover}
              onSelectPreset={(url) => updateWorkout({ capa_url: url })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Dias da semana</span>
            <DaysOfWeekPicker value={workout.dias_semana ?? []} onChange={(dias) => updateWorkout({ dias_semana: dias })} />
          </div>

          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              Exercícios <span className="font-normal text-muted-foreground">({exercises.length})</span>
            </h2>
            {minutes > 0 && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" aria-hidden="true" />~{minutes} min
              </span>
            )}
          </div>

          {exercises.length === 0 ? (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-10 text-center transition-colors hover:bg-muted"
            >
              <Plus className="h-8 w-8 text-primary" aria-hidden="true" />
              <span className="font-medium text-foreground">Adicionar primeiro exercício</span>
              <span className="text-sm text-muted-foreground">Escolha da biblioteca ou crie o seu</span>
            </button>
          ) : (
            <ol className="flex flex-col gap-3">
              {exercises.map((we, index) => (
                <li key={we.id}>
                  <WorkoutExerciseEditor
                    item={we}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === exercises.length - 1}
                    onUpdate={(updates) => updateExercise(we.id, updates)}
                    onMove={(direction) => moveExercise(we.id, direction)}
                    onRemove={() => removeExercise(we.id)}
                  />
                </li>
              ))}
            </ol>
          )}

          {exercises.length > 0 && (
            <Button variant="outline" onClick={() => setPickerOpen(true)}>
              <Plus className="h-4 w-4" />
              Adicionar exercício
            </Button>
          )}
        </div>
      </main>

      {exercises.length > 0 && (
        <div
          className="sticky z-30 px-4 pb-3"
          style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="mx-auto max-w-lg">
            <Button asChild size="lg" className="w-full shadow-lg">
              <Link href={`/treinos/${workout.id}/executar`}>
                <Play className="h-5 w-5" />
                Iniciar treino
              </Link>
            </Button>
          </div>
        </div>
      )}

      <ExercisePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selectedIds={exercises.map((ex) => ex.exercise_id)}
        onSelect={async (exercise) => {
          await addExercise(exercise)
          setPickerOpen(false)
        }}
      />
    </div>
  )
}
