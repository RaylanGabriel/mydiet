'use client'

import { useState } from 'react'
import { Check, ChevronDown, Coffee, GlassWater, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface DrinkItem {
  id: string
  nome: string
  quantidade: string
  calorias: number
  proteina: number
  carboidratos: number
  gordura: number
}

type DrinkPreset = {
  id: string
  nome: string
  icon: 'coffee' | 'glass'
  portions: { label: string; quantidade: string; calorias: number; proteina: number; carboidratos: number; gordura: number }[]
}

const DRINKS: DrinkPreset[] = [
  {
    id: 'cafe-sem-acucar',
    nome: 'Café sem açúcar',
    icon: 'coffee',
    portions: [
      { label: '1 xícara', quantidade: '1 xícara (50 ml)', calorias: 2, proteina: 0.1, carboidratos: 0, gordura: 0 },
      { label: '1 caneca', quantidade: '1 caneca (200 ml)', calorias: 4, proteina: 0.3, carboidratos: 0, gordura: 0 },
    ],
  },
  {
    id: 'cafe-com-leite',
    nome: 'Café com leite',
    icon: 'coffee',
    portions: [
      { label: '1 xícara', quantidade: '1 xícara', calorias: 61, proteina: 3.2, carboidratos: 4.7, gordura: 3.2 },
      { label: '1 caneca', quantidade: '1 caneca', calorias: 122, proteina: 6.4, carboidratos: 9.4, gordura: 6.4 },
    ],
  },
  {
    id: 'suco-laranja',
    nome: 'Suco de laranja',
    icon: 'glass',
    portions: [
      { label: '1 copo', quantidade: '1 copo (200 ml)', calorias: 90, proteina: 1.4, carboidratos: 20.8, gordura: 0.4 },
      { label: '1 jarra pequena', quantidade: '1 jarra pequena (300 ml)', calorias: 135, proteina: 2.1, carboidratos: 31.2, gordura: 0.6 },
    ],
  },
  {
    id: 'suco-uva',
    nome: 'Suco de uva integral',
    icon: 'glass',
    portions: [
      { label: '1 copo', quantidade: '1 copo (200 ml)', calorias: 120, proteina: 0.6, carboidratos: 29, gordura: 0.2 },
      { label: '1 garrafa pequena', quantidade: '1 garrafa pequena (300 ml)', calorias: 180, proteina: 0.9, carboidratos: 43.5, gordura: 0.3 },
    ],
  },
  {
    id: 'refrigerante',
    nome: 'Refrigerante comum',
    icon: 'glass',
    portions: [
      { label: '1 copo', quantidade: '1 copo (200 ml)', calorias: 84, proteina: 0, carboidratos: 21, gordura: 0 },
      { label: '1 lata', quantidade: '1 lata (350 ml)', calorias: 147, proteina: 0, carboidratos: 36.8, gordura: 0 },
      { label: '1 garrafa', quantidade: '1 garrafa (600 ml)', calorias: 252, proteina: 0, carboidratos: 63, gordura: 0 },
    ],
  },
  {
    id: 'cha-acucar',
    nome: 'Chá com açúcar',
    icon: 'coffee',
    portions: [
      { label: '1 xícara', quantidade: '1 xícara (200 ml)', calorias: 40, proteina: 0, carboidratos: 10, gordura: 0 },
      { label: '1 caneca', quantidade: '1 caneca (300 ml)', calorias: 60, proteina: 0, carboidratos: 15, gordura: 0 },
    ],
  },
  {
    id: 'leite',
    nome: 'Leite integral',
    icon: 'glass',
    portions: [
      { label: '1 copo', quantidade: '1 copo (200 ml)', calorias: 122, proteina: 6.4, carboidratos: 9.4, gordura: 6.4 },
      { label: '1 caneca', quantidade: '1 caneca (300 ml)', calorias: 183, proteina: 9.6, carboidratos: 14.1, gordura: 9.6 },
    ],
  },
]

interface DrinkPickerProps {
  onAdd: (drink: DrinkItem) => void
}

export function DrinkPicker({ onAdd }: DrinkPickerProps) {
  const [open, setOpen] = useState(false)
  const [selectedDrinkId, setSelectedDrinkId] = useState<string | null>(null)
  const selectedDrink = DRINKS.find((drink) => drink.id === selectedDrinkId)

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex items-center gap-2">
          <GlassWater className="h-4 w-4 text-primary" aria-hidden="true" />
          Adicionar bebida
        </span>
        <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />
      </Button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {DRINKS.map((drink) => {
              const selected = selectedDrinkId === drink.id
              const Icon = drink.icon === 'coffee' ? Coffee : GlassWater
              return (
                <button
                  key={drink.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedDrinkId(drink.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all duration-200 ease-in-out',
                    selected ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:bg-muted',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="truncate">{drink.nome}</span>
                  {selected && <Check className="ml-auto h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                </button>
              )
            })}
          </div>

          {selectedDrink && (
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground">Escolha a porção de {selectedDrink.nome}</p>
              <div className="flex flex-wrap gap-2">
                {selectedDrink.portions.map((portion) => (
                  <Button
                    key={portion.quantidade}
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      onAdd({ id: `${selectedDrink.id}-${Date.now()}`, nome: selectedDrink.nome, ...portion })
                      setSelectedDrinkId(null)
                      setOpen(false)
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {portion.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
