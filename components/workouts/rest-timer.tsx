'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { formatDuration } from '@/lib/workout-types'

interface RestTimerProps {
  endsAt: number
  total: number
  now: number
  onAdd: (seconds: number) => void
  onSkip: () => void
}

export function RestTimer({ endsAt, total, now, onAdd, onSkip }: RestTimerProps) {
  const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000))
  const progress = total > 0 ? (remaining / total) * 100 : 0
  const finished = remaining === 0
  const notifiedRef = useRef(false)

  useEffect(() => {
    notifiedRef.current = false
  }, [endsAt])

  useEffect(() => {
    if (finished && !notifiedRef.current) {
      notifiedRef.current = true
      if ('vibrate' in navigator) navigator.vibrate?.([200, 100, 200])
      const timeout = setTimeout(onSkip, 4000)
      return () => clearTimeout(timeout)
    }
  }, [finished, onSkip])

  return (
    <div className="fixed inset-x-0 bottom-20 z-50 px-4 pb-safe" role="timer" aria-live="polite">
      <div className="mx-auto flex max-w-lg flex-col gap-3 overflow-hidden rounded-2xl bg-foreground p-4 text-background shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs opacity-70">{finished ? 'Descanso finalizado' : 'Descanso'}</p>
            <p className="font-mono text-3xl font-bold tabular-nums">
              {finished ? 'Bora!' : formatDuration(remaining)}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onAdd(15)}>
            +15s
          </Button>
          <Button variant="secondary" size="sm" onClick={onSkip}>
            Pular
          </Button>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-background/20">
          <div className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}
