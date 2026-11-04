'use client'

import { DIAS_SEMANA } from '@/lib/workout-types'
import { cn } from '@/lib/utils'

export function DaysOfWeekPicker({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  const toggle = (day: number) => {
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort())
  }

  return (
    <div className="flex gap-1" role="group" aria-label="Dias da semana">
      {DIAS_SEMANA.map((dia, i) => {
        const active = value.includes(i)
        return (
          <button
            key={dia}
            type="button"
            onClick={() => toggle(i)}
            aria-pressed={active}
            className={cn(
              'flex-1 rounded-lg border py-2 text-xs font-medium transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            {dia}
          </button>
        )
      })}
    </div>
  )
}
