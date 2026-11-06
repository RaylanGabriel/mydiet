'use client'

import { memo, useMemo, useState } from 'react'
import { Check, Plus, Search } from 'lucide-react'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { SearchResultsSkeleton } from '@/components/search-results-skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { useExerciseLibrary } from '@/hooks/use-workouts'
import { GRUPOS_MUSCULARES, type Exercise } from '@/lib/workout-types'
import { cn } from '@/lib/utils'

const normalizeText = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()

/** Agrupa os equipamentos da biblioteca em poucas categorias para o filtro. */
const EQUIPAMENTO_CATEGORIAS = [
  { id: 'maquina', label: 'Máquina', test: (e: string) => e.includes('maquina') },
  { id: 'polia', label: 'Polia', test: (e: string) => e.includes('polia') || e.includes('cabo') || e.includes('crossover') },
  { id: 'halteres', label: 'Halteres', test: (e: string) => e.includes('halter') },
  { id: 'barra', label: 'Barra', test: (e: string) => e.startsWith('barra') },
  { id: 'smith', label: 'Smith', test: (e: string) => e.includes('smith') },
  { id: 'peso-corporal', label: 'Peso corporal', test: (e: string) => e.includes('peso corporal') || e.includes('livre') || e === '' },
] as const
type CategoriaId = (typeof EQUIPAMENTO_CATEGORIAS)[number]['id'] | 'outros'

function categoriaDe(equipamento: string | null): CategoriaId {
  const e = normalizeText(equipamento ?? '')
  return EQUIPAMENTO_CATEGORIAS.find((c) => c.test(e))?.id ?? 'outros'
}

interface ExercisePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (exercise: Exercise) => Promise<void>
  selectedIds: string[]
}

export function ExercisePicker({ open, onOpenChange, onSelect, selectedIds }: ExercisePickerProps) {
  const { exercises, isLoading, createExercise } = useExerciseLibrary()
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<string | null>(null)
  const [equip, setEquip] = useState<CategoriaId | null>(null)

  // Só mostra categorias que existem na biblioteca
  const categorias = useMemo(() => {
    const presentes = new Set(exercises.map((ex) => categoriaDe(ex.equipamento)))
    const lista: { id: CategoriaId; label: string }[] = EQUIPAMENTO_CATEGORIAS.filter((c) => presentes.has(c.id)).map((c) => ({
      id: c.id,
      label: c.label,
    }))
    if (presentes.has('outros')) lista.push({ id: 'outros', label: 'Outros' })
    return lista
  }, [exercises])
  const [addingId, setAddingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const debouncedQuery = useDebouncedValue(query, 350)

  const filtered = useMemo(() => {
    const termos = normalizeText(debouncedQuery).split(/\s+/).filter(Boolean)
    return exercises
      .filter((ex) => {
        if (group && ex.grupo_muscular !== group) return false
        if (equip && categoriaDe(ex.equipamento) !== equip) return false
        if (termos.length === 0) return true
        // Busca no nome, equipamento e instruções, sem acento e em qualquer ordem:
        // "extensora" também acha "Extensora na polia (substitui cadeira extensora)"
        const alvo = normalizeText(`${ex.nome} ${ex.equipamento ?? ''} ${ex.instrucoes ?? ''}`)
        return termos.every((t) => alvo.includes(t))
      })
      .sort((a, b) => {
        // Quem tem o termo no nome aparece antes de quem só tem nas instruções
        if (termos.length === 0) return 0
        const na = termos.every((t) => normalizeText(a.nome).includes(t)) ? 0 : 1
        const nb = termos.every((t) => normalizeText(b.nome).includes(t)) ? 0 : 1
        return na - nb
      })
      .slice(0, 30)
  }, [exercises, debouncedQuery, group, equip])

  const handleSelect = async (exercise: Exercise) => {
    setAddingId(exercise.id)
    try {
      await onSelect(exercise)
    } finally {
      setAddingId(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex h-[88vh] flex-col gap-0 rounded-t-2xl p-0">
        <SheetHeader className="border-b border-border px-4 py-4">
          <SheetTitle>{creating ? 'Novo exercício' : 'Adicionar exercício'}</SheetTitle>
          <SheetDescription>
            {creating ? 'Crie um exercício personalizado' : 'Toque para adicionar ao treino'}
          </SheetDescription>
        </SheetHeader>

        {creating ? (
          <CustomExerciseForm
            onCancel={() => setCreating(false)}
            onSubmit={async (input) => {
              const created = await createExercise(input)
              await onSelect(created)
              setCreating(false)
            }}
          />
        ) : (
          <>
            <div className="flex flex-col gap-3 border-b border-border px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar exercício..."
                  className="pl-9"
                  aria-label="Buscar exercício"
                />
              </div>
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
                {[null, ...GRUPOS_MUSCULARES].map((g) => (
                  <button
                    key={g ?? 'todos'}
                    type="button"
                    onClick={() => setGroup(g)}
                    aria-pressed={group === g}
                    className={cn(
                      'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 ease-in-out',
                      group === g
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {g ?? 'Todos'}
                  </button>
                ))}
              </div>
              {categorias.length > 1 && (
                <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4" role="group" aria-label="Filtrar por equipamento">
                  <span className="shrink-0 text-xs text-muted-foreground">Equipamento:</span>
                  {categorias.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setEquip((cur) => (cur === c.id ? null : c.id))}
                      aria-pressed={equip === c.id}
                      className={cn(
                        'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        equip === c.id
                          ? 'border-foreground/60 bg-muted text-foreground'
                          : 'border-dashed border-border text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <SearchResultsSkeleton rows={6} />
              ) : (
                <ul className="divide-y divide-border">
                  {filtered.map((exercise) => (
                    <ExerciseResultRow
                      key={exercise.id}
                      exercise={exercise}
                      alreadyAdded={selectedIds.includes(exercise.id)}
                      adding={addingId === exercise.id || addingId !== null}
                      onSelect={handleSelect}
                    />
                  ))}
                  {filtered.length === 0 && (
                    <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                      Nenhum exercício encontrado.
                    </li>
                  )}
                  {filtered.length === 30 && (
                    <li className="px-4 py-3 text-center text-xs text-muted-foreground">
                      Mostrando os 30 primeiros resultados. Refine sua busca para encontrar mais.
                    </li>
                  )}
                </ul>
              )}
            </div>

            <div className="border-t border-border p-4 pb-safe">
              <Button variant="outline" className="w-full" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
                Criar exercício personalizado
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

const ExerciseResultRow = memo(function ExerciseResultRow({
  exercise,
  alreadyAdded,
  adding,
  onSelect,
}: {
  exercise: Exercise
  alreadyAdded: boolean
  adding: boolean
  onSelect: (exercise: Exercise) => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(exercise)}
        disabled={adding}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-all duration-200 ease-in-out hover:bg-muted disabled:opacity-60"
      >
        <span className="flex-1">
          <span className="flex flex-wrap items-center gap-1.5 font-medium text-foreground">
            {exercise.nome}
            {/substitui/i.test(exercise.nome) && (
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
                Improviso
              </span>
            )}
          </span>
          <span className="block text-xs text-muted-foreground">
            {exercise.grupo_muscular}
            {exercise.equipamento ? ` · ${exercise.equipamento}` : ''}
            {exercise.user_id ? ' · Personalizado' : ''}
          </span>
        </span>
        {adding ? (
          <Spinner className="h-4 w-4" />
        ) : alreadyAdded ? (
          <Check className="h-5 w-5 text-primary" aria-label="Já adicionado" />
        ) : (
          <Plus className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        )}
      </button>
    </li>
  )
})

function CustomExerciseForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void
  onSubmit: (input: {
    nome: string
    grupo_muscular: string
    equipamento?: string
    video_url?: string
    instrucoes?: string
  }) => Promise<void>
}) {
  const [nome, setNome] = useState('')
  const [grupo, setGrupo] = useState<string>(GRUPOS_MUSCULARES[0])
  const [equipamento, setEquipamento] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [instrucoes, setInstrucoes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        nome: nome.trim(),
        grupo_muscular: grupo,
        equipamento: equipamento.trim(),
        video_url: videoUrl.trim(),
        instrucoes: instrucoes.trim(),
      })
    } catch {
      setError('Não foi possível salvar o exercício.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="ex-nome">Nome</Label>
          <Input id="ex-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Supino declinado" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ex-grupo">Grupo muscular</Label>
          <Select value={grupo} onValueChange={setGrupo}>
            <SelectTrigger id="ex-grupo" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GRUPOS_MUSCULARES.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ex-equip">Equipamento (opcional)</Label>
          <Input id="ex-equip" value={equipamento} onChange={(e) => setEquipamento(e.target.value)} placeholder="Ex: Máquina" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ex-video">Link do vídeo no YouTube (opcional)</Label>
          <Input
            id="ex-video"
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ex-instr">Como executar (opcional)</Label>
          <Textarea id="ex-instr" value={instrucoes} onChange={(e) => setInstrucoes(e.target.value)} rows={3} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <div className="flex gap-2 border-t border-border p-4 pb-safe">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Voltar
        </Button>
        <Button type="submit" className="flex-1" disabled={saving || !nome.trim()}>
          {saving && <Spinner className="h-4 w-4" />}
          Salvar e adicionar
        </Button>
      </div>
    </form>
  )
}
