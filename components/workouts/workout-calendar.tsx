'use client'

import { useMemo, useState } from 'react'
import { CalendarCheck, ChevronLeft, ChevronRight, Clock, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useMonthSessions } from '@/hooks/use-workouts'
import { DIAS_SEMANA, formatDuration, workoutLetter, type WorkoutSession } from '@/lib/workout-types'
import { cn } from '@/lib/utils'

const MONTH_FORMATTER = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const DAY_FORMATTER = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
const TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function WorkoutCalendar() {
  const today = new Date()
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate())
  const { sessions, isLoading } = useMonthSessions(cursor.year, cursor.month)

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>()
    for (const session of sessions) {
      const key = dayKey(new Date(session.iniciado_em))
      map.set(key, [...(map.get(key) ?? []), session])
    }
    return map
  }, [sessions])

  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay()
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const trainedDays = sessionsByDay.size
  const totalSeconds = sessions.reduce((sum, s) => sum + s.duracao_segundos, 0)
  const isCurrentMonth = cursor.year === today.getFullYear() && cursor.month === today.getMonth()

  const changeMonth = (delta: number) => {
    const next = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: next.getFullYear(), month: next.getMonth() })
    const isToday = next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth()
    setSelectedDay(isToday ? today.getDate() : null)
  }

  const selectedSessions =
    selectedDay !== null
      ? sessionsByDay.get(dayKey(new Date(cursor.year, cursor.month, selectedDay))) ?? []
      : []

  return (
    <section className="flex flex-col gap-3" aria-labelledby="agenda-title">
      <div className="flex items-center justify-between">
        <h2 id="agenda-title" className="flex items-center gap-2 font-semibold text-foreground">
          <CalendarCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          Agenda de treinos
        </h2>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => changeMonth(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <p className="font-semibold capitalize text-card-foreground" aria-live="polite">
            {MONTH_FORMATTER.format(new Date(cursor.year, cursor.month, 1))}
          </p>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Próximo mês"
            onClick={() => changeMonth(1)}
            disabled={isCurrentMonth}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col rounded-xl bg-muted px-3 py-2">
            <span className="text-xl font-bold text-foreground">{trainedDays}</span>
            <span className="text-xs text-muted-foreground">
              {trainedDays === 1 ? 'dia treinado' : 'dias treinados'}
            </span>
          </div>
          <div className="flex flex-col rounded-xl bg-muted px-3 py-2">
            <span className="text-xl font-bold text-foreground">{Math.round(totalSeconds / 60)} min</span>
            <span className="text-xs text-muted-foreground">tempo total no mês</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label="Calendário do mês">
          {DIAS_SEMANA.map((dia) => (
            <span key={dia} className="pb-1 text-[11px] font-medium text-muted-foreground" role="columnheader">
              {dia.charAt(0)}
            </span>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <span key={`empty-${i}`} aria-hidden="true" />
            const date = new Date(cursor.year, cursor.month, day)
            const daySessions = sessionsByDay.get(dayKey(date)) ?? []
            const trained = daySessions.length > 0
            const isToday = isCurrentMonth && day === today.getDate()
            const isSelected = selectedDay === day
            const letters = Array.from(new Set(daySessions.map((s) => workoutLetter(s.workout_nome)))).join('')

            return (
              <button
                key={day}
                type="button"
                role="gridcell"
                aria-selected={isSelected}
                aria-label={`${DAY_FORMATTER.format(date)}${trained ? `, ${daySessions.length} treino(s)` : ''}`}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  'relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors',
                  trained
                    ? 'bg-primary font-semibold text-primary-foreground'
                    : 'text-card-foreground hover:bg-muted',
                  isToday && !trained && 'ring-1 ring-primary',
                  isSelected && 'ring-2 ring-ring ring-offset-2 ring-offset-card',
                )}
              >
                <span>{day}</span>
                {trained && <span className="text-[9px] leading-none opacity-80">{letters}</span>}
              </button>
            )
          })}
        </div>

        {isLoading && (
          <div className="flex justify-center">
            <Spinner className="h-5 w-5" />
          </div>
        )}

        {selectedDay !== null && !isLoading && (
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <p className="text-sm font-medium capitalize text-card-foreground">
              {DAY_FORMATTER.format(new Date(cursor.year, cursor.month, selectedDay))}
            </p>
            {selectedSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum treino registrado neste dia.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {selectedSessions.map((session) => (
                  <li key={session.id} className="flex items-center gap-3 rounded-xl bg-muted p-2">
                    {session.workout?.capa_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={session.workout.capa_url} alt="" className="h-11 w-11 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                        <Dumbbell className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{session.workout_nome}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {TIME_FORMATTER.format(new Date(session.iniciado_em))} · {formatDuration(session.duracao_segundos)}
                        {' · '}
                        {session.series_concluidas} séries
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
