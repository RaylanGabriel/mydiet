'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface CalorieHeaderProps {
  consumed: number
  goal: number
  proteina: number
  carboidratos: number
  gordura: number
  label?: string
}

export function CalorieHeader({ 
  consumed, 
  goal, 
  proteina = 0, 
  carboidratos = 0, 
  gordura = 0,
  label = 'Hoje',
}: CalorieHeaderProps) {
  const remaining = goal - consumed
  const percentage = Math.min((consumed / goal) * 100, 100)
  const isOverLimit = consumed > goal

  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const macros = useMemo(() => [
    // bg-chart-1 é a cor primária, igual ao fundo deste cabeçalho, e não aparece
    { label: 'Proteinas', value: proteina, color: 'bg-primary-foreground' },
    { label: 'Carboidratos', value: carboidratos, color: 'bg-chart-2' },
    { label: 'Gorduras', value: gordura, color: 'bg-chart-3' },
  ], [proteina, carboidratos, gordura])

  return (
    <header className="bg-primary px-4 pt-6 pb-8 rounded-b-3xl">
      <div className="max-w-lg mx-auto">
        <p className="text-primary-foreground/80 text-sm mb-4">{label}</p>
        
        <div className="flex items-center justify-between gap-6">
          {/* Circular Progress */}
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-primary-foreground/20"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={cn(
                  "transition-all duration-500",
                  isOverLimit ? "text-destructive" : "text-primary-foreground"
                )}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">
                {consumed}
              </span>
              <span className="text-xs text-primary-foreground/70">kcal</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-primary-foreground/80 text-sm">Meta diaria</span>
              <span className="text-primary-foreground font-semibold">{goal} kcal</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-primary-foreground/80 text-sm">Restante</span>
              <span className={cn(
                "font-semibold",
                isOverLimit ? "text-destructive-foreground" : "text-primary-foreground"
              )}>
                {isOverLimit ? '+' : ''}{Math.abs(remaining)} kcal
              </span>
            </div>
          </div>
        </div>

        {/* Macros */}
        <div className="flex items-center gap-4 mt-6">
          {macros.map((macro) => (
            <div key={macro.label} className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className={cn("w-2 h-2 rounded-full", macro.color)} />
                <span className="text-xs text-primary-foreground/70">{macro.label}</span>
              </div>
              <span className="text-sm font-semibold text-primary-foreground">
                {macro.value.toFixed(0)}g
              </span>
            </div>
          ))}
        </div>
      </div>
    </header>
  )
}
