'use client'

import { useMemo, useState } from 'react'
import { ArrowLeftRight, Search, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SearchResultsSkeleton } from '@/components/search-results-skeleton'
import { useExerciseLibrary } from '@/hooks/use-workouts'
import { findAlternatives, type Alternative } from '@/lib/exercise-alternatives'
import type { Exercise } from '@/lib/workout-types'

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()

interface SwapExerciseSheetProps {
  /** Exercício a ser trocado (null = fechado) */
  original: Exercise | null
  /** Exercícios que já estão no treino (não aparecem como opção) */
  excludeIds: string[]
  /** Séries já concluídas deste exercício (serão reiniciadas) */
  doneSets: number
  onOpenChange: (open: boolean) => void
  onSwap: (exercise: Exercise) => void
}

export function SwapExerciseSheet({ original, excludeIds, doneSets, onOpenChange, onSwap }: SwapExerciseSheetProps) {
  const { exercises, isLoading } = useExerciseLibrary()
  const [query, setQuery] = useState('')

  const alternatives = useMemo(
    () => (original ? findAlternatives(original, exercises, excludeIds) : []),
    [original, exercises, excludeIds],
  )

  const termo = normalize(query)
  const filtradas = termo
    ? alternatives.filter((a) => normalize(`${a.exercise.nome} ${a.exercise.equipamento ?? ''}`).includes(termo))
    : alternatives
  const diretos = filtradas.filter((a) => a.direto)
  const outros = filtradas.filter((a) => !a.direto)

  return (
    <Sheet
      open={!!original}
      onOpenChange={(open) => {
        if (!open) setQuery('')
        onOpenChange(open)
      }}
    >
      <SheetContent side="bottom" className="flex h-[80vh] flex-col gap-0 rounded-t-2xl p-0">
        <SheetHeader className="border-b border-border px-4 py-4">
          <SheetTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-primary" aria-hidden="true" />
            Trocar exercício
          </SheetTitle>
          <SheetDescription>
            {original ? (
              <>
                Substituir <strong className="text-foreground">{original.nome}</strong> só neste treino. O treino salvo não muda.
              </>
            ) : null}
          </SheetDescription>
          {doneSets > 0 && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-foreground">
              Você já marcou {doneSets} {doneSets === 1 ? 'série' : 'séries'} deste exercício. Ao trocar, elas serão reiniciadas.
            </p>
          )}
        </SheetHeader>

        <div className="border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={original ? `Buscar em ${original.grupo_muscular}...` : 'Buscar...'}
              className="pl-9"
              aria-label="Buscar exercício substituto"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-safe">
          {isLoading ? (
            <SearchResultsSkeleton rows={5} />
          ) : filtradas.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma alternativa encontrada.</p>
          ) : (
            <>
              {diretos.length > 0 && (
                <AlternativeSection
                  title="Melhores substitutos"
                  icon
                  items={diretos}
                  onSelect={(ex) => {
                    setQuery('')
                    onSwap(ex)
                  }}
                />
              )}
              {outros.length > 0 && (
                <AlternativeSection
                  title={`Outros de ${original?.grupo_muscular ?? ''}`}
                  items={outros}
                  onSelect={(ex) => {
                    setQuery('')
                    onSwap(ex)
                  }}
                />
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function AlternativeSection({
  title,
  icon = false,
  items,
  onSelect,
}: {
  title: string
  icon?: boolean
  items: Alternative[]
  onSelect: (exercise: Exercise) => void
}) {
  return (
    <section>
      <h3 className="flex items-center gap-1.5 bg-muted/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon && <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
        {title}
      </h3>
      <ul className="divide-y divide-border">
        {items.map(({ exercise, outroEquipamento }) => (
          <li key={exercise.id}>
            <button
              type="button"
              onClick={() => onSelect(exercise)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted"
            >
              <span className="flex-1">
                <span className="block font-medium text-foreground">{exercise.nome}</span>
                <span className="block text-xs text-muted-foreground">
                  {exercise.equipamento ?? 'Sem equipamento'}
                  {outroEquipamento ? ' · outro aparelho' : ''}
                  {exercise.user_id ? ' · Personalizado' : ''}
                </span>
              </span>
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
