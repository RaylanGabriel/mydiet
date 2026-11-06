'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useWorkoutSessions } from '@/hooks/use-workouts'
import { formatDuration, type WorkoutSession } from '@/lib/workout-types'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
})

export function WorkoutHistory() {
  const { sessions, deleteSession } = useWorkoutSessions()
  const [toDelete, setToDelete] = useState<WorkoutSession | null>(null)
  const [deleting, setDeleting] = useState(false)

  if (sessions.length === 0) return null

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteSession(toDelete.id)
      toast.success('Treino removido do histórico', { description: toDelete.workout_nome })
      setToDelete(null)
    } catch {
      toast.error('Não foi possível remover do histórico.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="historico-title">
      <h2 id="historico-title" className="font-semibold text-foreground">
        Histórico
      </h2>
      <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
        {sessions.map((session) => (
          <li key={session.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-card-foreground">{session.workout_nome}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {dateFormatter.format(new Date(session.iniciado_em))}
              </p>
            </div>
            <div className="flex flex-col items-end text-xs text-muted-foreground">
              <span className="font-mono font-medium text-foreground">{formatDuration(session.duracao_segundos)}</span>
              <span>
                {session.series_concluidas} séries
                {Number(session.volume_total_kg) > 0 && ` · ${Math.round(Number(session.volume_total_kg))} kg`}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              aria-label={`Remover ${session.workout_nome} do histórico`}
              onClick={() => setToDelete(session)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && !deleting && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover do histórico?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && (
                <>
                  O registro de <strong>{toDelete.workout_nome}</strong> em {dateFormatter.format(new Date(toDelete.iniciado_em))}{' '}
                  e suas {toDelete.series_concluidas} séries serão apagados. Isso também afeta os recordes e a coluna
                  &quot;Anterior&quot;. Essa ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Spinner className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
              {deleting ? 'Removendo...' : 'Remover'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
