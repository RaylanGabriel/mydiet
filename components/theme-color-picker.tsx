'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Check, Dumbbell, Home, Target, User } from 'lucide-react'
import { toast } from 'sonner'
import { useColorTheme } from '@/components/color-theme-provider'
import { COLOR_THEMES } from '@/lib/theme-colors'
import { cn } from '@/lib/utils'

export function ThemeColorPicker() {
  const { color, setColor } = useColorTheme()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const mode = mounted && resolvedTheme === 'dark' ? 'dark' : 'light'

  return (
    <div role="radiogroup" aria-label="Cor do app" className="grid grid-cols-5 gap-2">
      {COLOR_THEMES.map((t) => {
        const active = mounted && color === t.id
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t.label}
            onClick={() => {
              if (color === t.id) return
              setColor(t.id)
              toast.success('Tema atualizado com sucesso', {
                id: 'theme-updated', // substitui o aviso anterior em vez de empilhar
                description: `Cor do app: ${t.label}.`,
              })
            }}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors',
              active ? 'border-foreground/60 bg-muted' : 'border-border hover:bg-muted/60',
            )}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-card shadow-sm"
              style={{ backgroundColor: t.swatch[mode] }}
              aria-hidden="true"
            >
              {active && (
                <Check
                  className="h-4 w-4"
                  strokeWidth={3}
                  // Check escuro no amarelo e nos tons claros do modo escuro; branco nos demais
                  color={t.id === 'amarelo' || mode === 'dark' ? '#1a1a1a' : '#ffffff'}
                />
              )}
            </span>
            <span className={cn('text-xs', active ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
              {t.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Miniatura que mostra como o app fica com o tema atual. */
export function ThemePreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background" aria-hidden="true">
      <div className="bg-primary px-3 py-2.5">
        <p className="text-[11px] text-primary-foreground/80">Hoje</p>
        <p className="text-base font-bold text-primary-foreground">1.450 kcal</p>
      </div>
      <div className="flex flex-col gap-1.5 px-3 py-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Meta de peso</span>
          <span className="font-semibold text-primary">65%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-2/3 rounded-full bg-primary" />
        </div>
      </div>
      {/* Mini barra de navegação: o item ativo mostra a cor do tema */}
      <div className="flex justify-around border-t border-border bg-card py-2">
        {[
          { Icon: Home, label: 'Início', active: true },
          { Icon: Target, label: 'Plano', active: false },
          { Icon: Dumbbell, label: 'Treinos', active: false },
          { Icon: User, label: 'Perfil', active: false },
        ].map(({ Icon, label, active }) => (
          <span
            key={label}
            className={cn('flex flex-col items-center gap-0.5', active ? 'text-primary' : 'text-muted-foreground')}
          >
            <Icon className={cn('h-4 w-4', active && 'stroke-[2.5px]')} />
            <span className="text-[10px] font-medium">{label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
