'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Dumbbell, Hourglass } from 'lucide-react'
import { useActiveWorkout } from '@/lib/active-workout'
import { formatDuration } from '@/lib/workout-types'

const BAR_HEIGHT = '2.75rem'

/**
 * Barra fixa no topo com o tempo do treino em andamento. Aparece em todas as
 * abas, menos na própria tela de execução (que já mostra o cronômetro).
 */
export function ActiveWorkoutBar() {
  const active = useActiveWorkout()
  const pathname = usePathname()
  const [now, setNow] = useState(() => Date.now())

  const visible = !!active && pathname !== `/treinos/${active.workoutId}/executar`

  useEffect(() => {
    if (!visible) return
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [visible])

  // Cabeçalhos "sticky" das páginas descem para não ficar atrás da barra
  useEffect(() => {
    const root = document.documentElement
    if (visible) root.style.setProperty('--workout-bar-h', BAR_HEIGHT)
    else root.style.removeProperty('--workout-bar-h')
    return () => {
      root.style.removeProperty('--workout-bar-h')
    }
  }, [visible])

  if (!visible || !active) return null

  const elapsed = Math.max(0, Math.floor((now - new Date(active.startedAt).getTime()) / 1000))
  const rest = active.restEndsAt ? Math.ceil((active.restEndsAt - now) / 1000) : 0

  return (
    <div className="sticky z-45" style={{ top: 'env(safe-area-inset-top, 0px)', height: BAR_HEIGHT }}>
      <Link
        href={`/treinos/${active.workoutId}/executar`}
        className="block h-full bg-foreground px-4 text-background shadow-md"
        aria-label={`Treino em andamento: ${active.nome}, ${formatDuration(elapsed)}. Toque para voltar ao treino.`}
      >
        <span className="mx-auto flex h-full max-w-lg items-center gap-3">
        <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
        <Dumbbell className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {active.nome}
          <span className="ml-1.5 font-normal opacity-75">
            {active.doneCount}/{active.totalCount} séries
          </span>
        </span>
        {rest > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold tabular-nums text-primary-foreground">
            <Hourglass className="h-3 w-3" aria-hidden="true" />
            {formatDuration(rest)}
          </span>
        )}
        <span className="font-mono text-sm font-bold tabular-nums">{formatDuration(elapsed)}</span>
        <ChevronRight className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
        </span>
      </Link>
    </div>
  )
}
