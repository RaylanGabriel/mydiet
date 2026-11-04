'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkoutSessions } from '@/hooks/use-workouts'
import { formatDuration } from '@/lib/workout-types'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
})

export function WorkoutHistory() {
  const { sessions, deleteSession } = useWorkoutSessions()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  if (sessions.length === 0) return null

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
              className={confirmId === session.id ? 'text-destructive' : 'text-muted-foreground'}
              aria-label={confirmId === session.id ? 'Confirmar exclusão' : 'Excluir treino do histórico'}
              onClick={async () => {
                if (confirmId === session.id) {
                  await deleteSession(session.id)
                  setConfirmId(null)
                } else {
                  setConfirmId(session.id)
                  setTimeout(() => setConfirmId((c) => (c === session.id ? null : c)), 3000)
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
