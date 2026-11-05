'use client'

import { useState, useEffect, useRef } from 'react'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { SearchResultsSkeleton } from '@/components/search-results-skeleton'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CommonFood } from '@/lib/types'
import { searchFatSecret } from '@/app/(app)/adicionar/actions'

interface FoodAutocompleteProps {
  value: string
  quantidade: string
  onChange: (value: string) => void
  onQuantidadeChange: (value: string) => void
  onValuesChange: (values: { calorias: number; proteina: number; carboidratos: number; gordura: number }) => void
  placeholder?: string
  className?: string
}

export function FoodAutocomplete({ 
  value, 
  quantidade,
  onChange,
  onQuantidadeChange,
  onValuesChange,
  placeholder = "Digite o nome do alimento...",
  className 
}: FoodAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CommonFood[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFood, setSelectedFood] = useState<CommonFood | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debouncedValue = useDebouncedValue(value, 400)

  // Parse quantity to get grams
  const parseQuantityToGrams = (qty: string): number => {
    const match = qty.match(/(\d+)/)
    return match ? parseInt(match[1]) : 100
  }

  // Calculate proportional values based on quantity
  const calculateValues = (food: CommonFood, grams: number) => {
    const multiplier = grams / 100
    return {
      calorias: Math.round(food.calorias * multiplier),
      proteina: Math.round(food.proteina * multiplier * 10) / 10,
      carboidratos: Math.round(food.carboidratos * multiplier * 10) / 10,
      gordura: Math.round(food.gordura * multiplier * 10) / 10,
    }
  }

  // Update values when quantity changes
  useEffect(() => {
    if (selectedFood && quantidade) {
      const grams = parseQuantityToGrams(quantidade)
      const values = calculateValues(selectedFood, grams)
      onValuesChange(values)
    }
  }, [quantidade, selectedFood])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const searchFoods = async () => {
      const searchTerm = debouncedValue.trim()
      if (searchTerm.length < 2) {
        setSuggestions([])
        setIsOpen(false)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('common_foods')
        .select('*')
        .ilike('nome', `%${searchTerm}%`)
        .limit(8)

      let foods: CommonFood[] = (data ?? []).map((food) => ({ ...food, source: 'supabase' }))
      if (!error && foods.length < 3) {
        const external = await searchFatSecret(searchTerm)
        const existingNames = new Set(foods.map((food) => food.nome.toLowerCase()))
        foods = [...foods, ...external.foods.filter((food) => !existingNames.has(food.nome.toLowerCase()))]
      }

      if (searchTerm === debouncedValue.trim()) {
        setSuggestions(foods)
        setIsOpen(foods.length > 0)
      }
      setIsLoading(false)
    }

    void searchFoods()
  }, [debouncedValue])

  const handleSelect = async (food: CommonFood) => {
    if (food.source === 'openfoodfacts' || food.source === 'fatsecret') {
      const supabase = createClient()
      await supabase.from('common_foods').insert({
        nome: food.nome,
        quantidade_padrao: '100g',
        calorias: food.calorias,
        proteina: food.proteina,
        carboidratos: food.carboidratos,
        gordura: food.gordura,
        categoria: food.categoria,
      })
    }

    setSelectedFood(food)
    onChange(food.nome)
    onQuantidadeChange(food.quantidade_padrao)
    
    const grams = parseQuantityToGrams(food.quantidade_padrao)
    const values = calculateValues(food, grams)
    onValuesChange(values)
    
    setIsOpen(false)
  }

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            if (e.target.value !== selectedFood?.nome) {
              setSelectedFood(null)
            }
          }}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10"
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {isLoading ? (
            <SearchResultsSkeleton rows={3} />
          ) : (
            <ul className="max-h-64 overflow-auto">
              {suggestions.map((food) => (
                <li key={food.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(food)}
                    className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-sm">{food.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        por 100g{food.source === 'fatsecret' ? ' · FatSecret Brasil' : food.source === 'openfoodfacts' ? ' · Open Food Facts Brasil' : food.source === 'taco-tbca' ? ' · TACO/TBCA' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">{food.calorias} kcal</p>
                      <p className="text-xs text-muted-foreground">
                        P:{food.proteina}g C:{food.carboidratos}g G:{food.gordura}g
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selectedFood && (
        <p className="text-xs text-primary mt-1">
          Valores calculados para {quantidade || '100g'} de {selectedFood.nome}
          {(selectedFood.source === 'openfoodfacts' || selectedFood.source === 'fatsecret') && ' · salvo na base para próximas buscas'}
        </p>
      )}
    </div>
  )
}
