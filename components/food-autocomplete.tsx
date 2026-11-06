'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Fuse from 'fuse.js'
import useSWR, { mutate as globalMutate } from 'swr'
import { Globe, Search, Sparkles } from 'lucide-react'
import { SearchResultsSkeleton } from '@/components/search-results-skeleton'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/supabase/client'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { cn } from '@/lib/utils'
import type { CommonFood } from '@/lib/types'

interface FoodAutocompleteProps {
  value: string
  quantidade: string
  onChange: (value: string) => void
  onQuantidadeChange: (value: string) => void
  onValuesChange: (values: { calorias: number; proteina: number; carboidratos: number; gordura: number }) => void
  placeholder?: string
  className?: string
}

/** Com menos resultados locais que isso, a busca na internet roda sozinha. */
const MIN_LOCAL_RESULTS = 4

const SOURCE_LABEL: Record<NonNullable<CommonFood['source']>, string> = {
  supabase: '',
  'taco-tbca': 'TACO/TBCA',
  openfoodfacts: 'Open Food Facts',
  fatsecret: 'FatSecret',
  ia: 'Estimativa IA',
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const displayName = (food: CommonFood) => (food.marca ? `${food.nome} (${food.marca})` : food.nome)

async function fetchRemote(q: string): Promise<CommonFood[]> {
  const res = await fetch(`/api/foods/search?q=${encodeURIComponent(q)}`)
  if (!res.ok) return []
  const data = (await res.json()) as { foods?: CommonFood[] }
  return (data.foods ?? []).map((f) => ({ ...f, categoria: SOURCE_LABEL[f.source ?? 'supabase'] }))
}

export function FoodAutocomplete({
  value,
  quantidade,
  onChange,
  onQuantidadeChange,
  onValuesChange,
  placeholder = 'Digite o nome do alimento...',
  className,
}: FoodAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedFood, setSelectedFood] = useState<CommonFood | null>(null)
  const [forceRemote, setForceRemote] = useState(false)
  const [ai, setAi] = useState<{ query: string; foods: CommonFood[]; fonte: 'google' | 'ia'; error?: string } | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const { data: foods = [], isLoading } = useSWR<CommonFood[]>(
    'common-foods',
    async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('common_foods').select('*').order('nome')
      if (error) throw error
      return (data ?? []).map((food) => ({ ...food, source: 'supabase' as const }))
    },
    { revalidateOnFocus: false },
  )

  const fuse = useMemo(
    () =>
      new Fuse(foods, {
        keys: ['nome'],
        threshold: 0.35,
        ignoreLocation: true,
        ignoreDiacritics: true,
        isCaseSensitive: false,
        minMatchCharLength: 2,
      }),
    [foods],
  )

  const searchTerm = value.trim()
  const suggestions = useMemo(() => {
    if (searchTerm.length < 2) return []
    return fuse.search(searchTerm, { limit: 8 }).map(({ item }) => item)
  }, [fuse, searchTerm])

  // ---- Busca na internet (Open Food Facts + FatSecret), com debounce ----
  const debounced = useDebouncedValue(searchTerm, 600)
  const wantsRemote =
    isOpen && !selectedFood && debounced.length >= 3 && (forceRemote || suggestions.length < MIN_LOCAL_RESULTS)
  const { data: remote = [], isLoading: remoteLoading } = useSWR(
    wantsRemote ? ['food-remote', normalize(debounced)] : null,
    () => fetchRemote(debounced),
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  )

  // Esconde da internet o que já existe na base local
  const localNames = useMemo(() => new Set(foods.map((f) => normalize(f.nome))), [foods])
  const remoteFiltered = remote.filter((f) => !localNames.has(normalize(displayName(f))) && !localNames.has(normalize(f.nome)))
  const aiFoods = ai && normalize(ai.query) === normalize(searchTerm) ? ai.foods : []
  const aiError = ai && normalize(ai.query) === normalize(searchTerm) ? ai.error : undefined

  // Novo termo: volta ao comportamento automático
  useEffect(() => {
    setForceRemote(false)
  }, [debounced])

  const parseQuantityToGrams = (qty: string): number => {
    const match = qty.replace(',', '.').match(/(\d+(?:\.\d+)?)/)
    return match ? parseFloat(match[1]) : 100
  }

  const calculateValues = (food: CommonFood, grams: number) => {
    const multiplier = grams / 100
    return {
      calorias: Math.round(food.calorias * multiplier),
      proteina: Math.round(food.proteina * multiplier * 10) / 10,
      carboidratos: Math.round(food.carboidratos * multiplier * 10) / 10,
      gordura: Math.round(food.gordura * multiplier * 10) / 10,
    }
  }

  useEffect(() => {
    if (selectedFood && quantidade) {
      onValuesChange(calculateValues(selectedFood, parseQuantityToGrams(quantidade)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantidade, selectedFood])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchWithAi = async () => {
    const q = searchTerm
    if (q.length < 2 || aiLoading) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/foods/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q }),
      })
      const data = (await res.json()) as { foods?: CommonFood[]; fonte?: 'google' | 'ia'; error?: string }
      setAi({
        query: q,
        fonte: data.fonte ?? 'ia',
        foods: (data.foods ?? []).map((f) => ({ ...f, categoria: data.fonte === 'google' ? 'Pesquisa Google (IA)' : 'Estimativa IA' })),
        error: !res.ok ? data.error ?? 'Não foi possível pesquisar agora.' : (data.foods ?? []).length === 0 ? 'A IA não reconheceu esse alimento.' : undefined,
      })
    } catch {
      setAi({ query: q, fonte: 'ia', foods: [], error: 'Sem conexão. Tente de novo.' })
    } finally {
      setAiLoading(false)
    }
  }

  const handleSelect = async (food: CommonFood) => {
    const external = food.source && food.source !== 'supabase' && food.source !== 'taco-tbca'
    const nome = displayName(food)

    if (external && !localNames.has(normalize(nome))) {
      // Salva na base para a próxima busca ser instantânea (para todos os usuários)
      const supabase = createClient()
      const { error } = await supabase.from('common_foods').insert({
        nome,
        quantidade_padrao: '100g',
        calorias: food.calorias,
        proteina: food.proteina,
        carboidratos: food.carboidratos,
        gordura: food.gordura,
        categoria: food.categoria || SOURCE_LABEL[food.source!],
      })
      if (!error) void globalMutate('common-foods')
    }

    setSelectedFood({ ...food, nome })
    onChange(nome)
    onQuantidadeChange(food.quantidade_padrao)
    onValuesChange(calculateValues(food, parseQuantityToGrams(food.quantidade_padrao)))
    setIsOpen(false)
  }

  const showRemoteSection = wantsRemote || remoteFiltered.length > 0
  const nothingLocal = !isLoading && suggestions.length === 0

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => {
            const nextValue = e.target.value
            onChange(nextValue)
            setIsOpen(nextValue.trim().length >= 2)
            if (nextValue !== selectedFood?.nome) setSelectedFood(null)
          }}
          onFocus={() => value.trim().length >= 2 && !selectedFood && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10"
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          <div className="max-h-80 overflow-auto">
            {/* 1. Base local */}
            {isLoading ? (
              <SearchResultsSkeleton rows={3} />
            ) : (
              suggestions.length > 0 && (
                <ul>
                  {suggestions.map((food) => (
                    <FoodRow key={food.id} food={food} onSelect={handleSelect} />
                  ))}
                </ul>
              )
            )}

            {/* 2. Internet */}
            {showRemoteSection && (
              <Section icon={<Globe className="h-3.5 w-3.5" />} title="Da internet">
                {remoteLoading || (wantsRemote && debounced !== searchTerm) ? (
                  <SearchResultsSkeleton rows={2} />
                ) : remoteFiltered.length > 0 ? (
                  <ul>
                    {remoteFiltered.map((food) => (
                      <FoodRow key={food.id} food={food} onSelect={handleSelect} />
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Nada encontrado na internet para &quot;{debounced}&quot;.</p>
                )}
              </Section>
            )}

            {/* 3. IA */}
            {(aiFoods.length > 0 || aiError) && (
              <Section
                icon={<Sparkles className="h-3.5 w-3.5" />}
                title={ai?.fonte === 'google' ? 'Pesquisa no Google (IA)' : 'Estimativa da IA (TACO/TBCA)'}
              >
                {aiError ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">{aiError}</p>
                ) : (
                  <ul>
                    {aiFoods.map((food) => (
                      <FoodRow key={food.id} food={food} onSelect={handleSelect} />
                    ))}
                  </ul>
                )}
              </Section>
            )}

            {nothingLocal && !showRemoteSection && aiFoods.length === 0 && !aiError && searchTerm.length >= 2 && (
              <p className="px-3 py-3 text-xs text-muted-foreground">
                {searchTerm.length < 3 ? 'Digite mais uma letra para buscar na internet.' : 'Nenhum alimento na sua base.'}
              </p>
            )}
          </div>

          {/* Ações */}
          {searchTerm.length >= 3 && (
            <div className="flex flex-wrap gap-2 border-t border-border bg-muted/40 p-2">
              {!wantsRemote && !forceRemote && (
                <button
                  type="button"
                  onClick={() => setForceRemote(true)}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                  Buscar mais na internet
                </button>
              )}
              <button
                type="button"
                onClick={searchWithAi}
                disabled={aiLoading || aiFoods.length > 0}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-muted disabled:opacity-60"
              >
                {aiLoading ? <Spinner className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
                {aiLoading ? 'Pesquisando...' : 'Não achou? Pesquisar com IA'}
              </button>
            </div>
          )}
        </div>
      )}

      {selectedFood && (
        <p className="mt-1 text-xs text-primary">
          Valores calculados para {quantidade || '100g'} de {selectedFood.nome}
          {selectedFood.source === 'ia'
            ? ' · estimativa da IA, confira se possível'
            : selectedFood.source && selectedFood.source !== 'supabase'
              ? ` · ${SOURCE_LABEL[selectedFood.source]}`
              : ''}
          {selectedFood.source && selectedFood.source !== 'supabase' && ' · salvo na sua base'}
        </p>
      )}
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border first:border-t-0">
      <h4 className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </h4>
      {children}
    </section>
  )
}

function FoodRow({ food, onSelect }: { food: CommonFood; onSelect: (food: CommonFood) => void }) {
  const fonte = food.source && food.source !== 'supabase' ? food.categoria || SOURCE_LABEL[food.source] : food.categoria
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(food)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-muted"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {food.nome}
            {food.marca && <span className="font-normal text-muted-foreground"> · {food.marca}</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            por 100g{fonte ? ` · ${fonte}` : ''}
            {food.porcao ? ` · porção: ${food.porcao}` : ''}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-primary">{food.calorias} kcal</p>
          <p className="text-xs text-muted-foreground">
            P:{food.proteina}g C:{food.carboidratos}g G:{food.gordura}g
          </p>
        </div>
      </button>
    </li>
  )
}
