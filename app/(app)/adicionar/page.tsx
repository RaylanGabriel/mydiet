'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { formatShortDate, toLocalDateString } from '@/lib/date'
import { fetchMeal, saveMeal } from '@/hooks/use-meals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { FoodAutocomplete, foodFromSavedItem } from '@/components/food-autocomplete'
import { FoodPhotoScanner, type DetectedFood } from '@/components/food-photo-scanner'
import { DrinkPicker, type DrinkItem } from '@/components/drink-picker'
import { ArrowLeft, BookOpen, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { CommonFood, MealType } from '@/lib/types'

const mealTypes: { value: MealType; label: string; defaultTime: string }[] = [
  { value: 'cafe_manha', label: 'Café da Manhã', defaultTime: '09:00' },
  { value: 'almoco', label: 'Almoço', defaultTime: '12:00' },
  { value: 'lanche_tarde', label: 'Lanche da Tarde', defaultTime: '15:00' },
  { value: 'cafe_tarde', label: 'Café da Tarde', defaultTime: '18:00' },
  { value: 'janta', label: 'Janta', defaultTime: '21:00' },
]

interface MealItemInput {
  /** Chave local do formulário */
  id: string
  /** id em `meal_items`, quando o item já estava salvo */
  dbId?: string
  /** Base para recalcular os macros de um item salvo ao mudar a quantidade */
  initialFood?: CommonFood | null
  nome: string
  quantidade: string
  calorias: number
  proteina: number
  carboidratos: number
  gordura: number
}

const emptyItem = (): MealItemInput => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  nome: '',
  quantidade: '100g',
  calorias: 0,
  proteina: 0,
  carboidratos: 0,
  gordura: 0,
})

const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)

export default function AdicionarPage() {
  // useSearchParams precisa de Suspense no App Router
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <MealForm />
    </Suspense>
  )
}

function MealForm() {
  const router = useRouter()
  const params = useSearchParams()
  const editId = params.get('editar')
  const today = toLocalDateString()
  const dataParam = params.get('data')
  const [data, setData] = useState(isDate(dataParam) && dataParam <= today ? dataParam : today)

  const [loading, setLoading] = useState(false)
  const [loadingMeal, setLoadingMeal] = useState(!!editId)
  // Trava síncrona: impede envios duplicados por cliques rápidos antes do re-render
  const submittingRef = useRef(false)
  const [selectedType, setSelectedType] = useState<MealType>(mealTypes[0].value)
  const [horario, setHorario] = useState(mealTypes[0].defaultTime)
  const [items, setItems] = useState<MealItemInput[]>([emptyItem()])

  // Edição: carrega a refeição salva no formulário
  useEffect(() => {
    if (!editId) return
    let cancelled = false
    fetchMeal(editId)
      .then((meal) => {
        if (cancelled) return
        if (!meal) {
          toast.error('Refeição não encontrada')
          router.replace('/dashboard')
          return
        }
        setData(meal.data)
        setSelectedType(meal.tipo)
        setHorario(meal.horario.slice(0, 5))
        setItems(
          meal.items.length > 0
            ? meal.items.map((item) => {
                const values = {
                  nome: item.nome,
                  quantidade: item.quantidade,
                  calorias: item.calorias,
                  proteina: Number(item.proteina ?? 0),
                  carboidratos: Number(item.carboidratos ?? 0),
                  gordura: Number(item.gordura ?? 0),
                }
                return { id: item.id, dbId: item.id, initialFood: foodFromSavedItem(values), ...values }
              })
            : [emptyItem()],
        )
        setLoadingMeal(false)
      })
      .catch(() => {
        if (cancelled) return
        toast.error('Não foi possível abrir a refeição')
        router.replace('/dashboard')
      })
    return () => {
      cancelled = true
    }
  }, [editId, router])

  const handleTypeChange = (type: MealType) => {
    setSelectedType(type)
    const mealType = mealTypes.find((t) => t.value === type)
    if (mealType && !editId) setHorario(mealType.defaultTime)
  }

  const addItem = () => setItems((prev) => [...prev, emptyItem()])

  const addDrink = (drink: DrinkItem) => {
    setItems((prev) => [
      ...prev.filter((item) => item.nome.trim() !== ''),
      {
        id: drink.id,
        nome: drink.nome,
        quantidade: drink.quantidade,
        calorias: drink.calorias,
        proteina: drink.proteina,
        carboidratos: drink.carboidratos,
        gordura: drink.gordura,
      },
    ])
  }

  const addDetectedItems = (detected: DetectedFood[]) => {
    const stamp = Date.now()
    const newItems = detected.map((d, i) => ({
      id: `${stamp}-${i}`,
      nome: d.nome,
      quantidade: d.quantidade,
      calorias: Math.round(d.calorias),
      proteina: d.proteina,
      carboidratos: d.carboidratos,
      gordura: d.gordura,
    }))
    setItems((prev) => [...prev.filter((item) => item.nome.trim() !== ''), ...newItems])
  }

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev))
  }

  // Forma funcional: o autocomplete dispara várias atualizações seguidas
  const updateItem = (id: string, field: keyof MealItemInput, value: string | number) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const updateItemValues = (
    id: string,
    values: { calorias: number; proteina: number; carboidratos: number; gordura: number },
  ) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...values } : item)))
  }

  const totals = items.reduce(
    (acc, item) => ({
      calorias: acc.calorias + (item.calorias || 0),
      proteina: acc.proteina + (item.proteina || 0),
      carboidratos: acc.carboidratos + (item.carboidratos || 0),
      gordura: acc.gordura + (item.gordura || 0),
    }),
    { calorias: 0, proteina: 0, carboidratos: 0, gordura: 0 },
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setLoading(true)

    let success = false
    try {
      const mealType = mealTypes.find((t) => t.value === selectedType)!
      const validItems = items.filter((item) => item.nome.trim() !== '')
      await saveMeal({
        id: editId ?? undefined,
        data,
        tipo: selectedType,
        nome: mealType.label,
        horario,
        ordem: mealTypes.findIndex((t) => t.value === selectedType),
        items: validItems,
      })

      success = true
      const qtd = validItems.length
      if (editId) {
        toast.success(`${mealType.label} atualizada`, {
          description: `${Math.round(totals.calorias)} kcal no total.`,
        })
      } else {
        toast.success(`${mealType.label} adicionada!`, {
          description:
            qtd === 0
              ? undefined
              : qtd === 1
                ? `${validItems[0].nome} foi adicionado.`
                : `${qtd} alimentos foram adicionados.`,
        })
      }
      router.push(data === today ? '/dashboard' : `/dashboard?data=${data}`)
    } catch (error) {
      console.error('Error saving meal:', error)
      if (error instanceof Error && error.message === 'Sessão expirada') {
        router.push('/auth/login')
        return
      }
      toast.error('Não foi possível salvar a refeição', {
        description: 'Tente novamente em instantes.',
      })
    } finally {
      // Em caso de sucesso, mantém o botão travado até a navegação concluir
      if (!success) {
        submittingRef.current = false
        setLoading(false)
      }
    }
  }

  const backHref = data === today ? '/dashboard' : `/dashboard?data=${data}`

  if (loadingMeal) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <Link href={backHref} className="p-2 -ml-2 rounded-lg hover:bg-muted" aria-label="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">{editId ? 'Editar Refeição' : 'Adicionar Refeição'}</h1>
            {data !== today && <p className="text-xs text-muted-foreground">{formatShortDate(data, today)}</p>}
          </div>
          <Link
            href="/tabela"
            className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-muted"
          >
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            Tabela TACO/TBCA
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-6 overflow-auto">
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-6">
          {/* Meal type selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tipo de Refeição</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {mealTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleTypeChange(type.value)}
                    className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                      selectedType === type.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <Field className="mt-4">
                <FieldLabel htmlFor="horario">Horário</FieldLabel>
                <Input
                  id="horario"
                  type="time"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  required
                />
              </Field>
            </CardContent>
          </Card>

          <FoodPhotoScanner onAddItems={addDetectedItems} />

          {/* Meal items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Itens da Refeição</CardTitle>
              <Button type="button" variant="ghost" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Item {index + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded"
                        aria-label={`Remover item ${index + 1}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <FieldGroup>
                    <Field>
                      <FieldLabel>Nome do alimento ou item</FieldLabel>
                      <FoodAutocomplete
                        value={item.nome}
                        quantidade={item.quantidade}
                        initialFood={item.initialFood}
                        onChange={(value) => updateItem(item.id, 'nome', value)}
                        onQuantidadeChange={(value) => updateItem(item.id, 'quantidade', value)}
                        onValuesChange={(values) => updateItemValues(item.id, values)}
                        placeholder="Digite para buscar alimentos..."
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Quantidade</FieldLabel>
                      <Input
                        placeholder="Ex: 100g, 150g, 200g"
                        value={item.quantidade}
                        onChange={(e) => updateItem(item.id, 'quantidade', e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Altere a quantidade para recalcular automaticamente
                      </p>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field>
                        <FieldLabel>Calorias</FieldLabel>
                        <Input
                          type="number"
                          placeholder="0"
                          value={item.calorias || ''}
                          onChange={(e) => updateItem(item.id, 'calorias', parseInt(e.target.value) || 0)}
                          required
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Proteína (g)</FieldLabel>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0"
                          value={item.proteina || ''}
                          onChange={(e) => updateItem(item.id, 'proteina', parseFloat(e.target.value) || 0)}
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Carboidratos (g)</FieldLabel>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0"
                          value={item.carboidratos || ''}
                          onChange={(e) => updateItem(item.id, 'carboidratos', parseFloat(e.target.value) || 0)}
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Gordura (g)</FieldLabel>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0"
                          value={item.gordura || ''}
                          onChange={(e) => updateItem(item.id, 'gordura', parseFloat(e.target.value) || 0)}
                        />
                      </Field>
                    </div>
                  </FieldGroup>
                </div>
              ))}
            </CardContent>
          </Card>

          <DrinkPicker onAdd={addDrink} />

          {/* Total da refeição, atualizado a cada mudança */}
          <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-border bg-card p-3 text-center">
            {[
              { label: 'kcal', value: Math.round(totals.calorias) },
              { label: 'Proteína', value: `${Math.round(totals.proteina)} g` },
              { label: 'Carbo', value: `${Math.round(totals.carboidratos)} g` },
              { label: 'Gordura', value: `${Math.round(totals.gordura)} g` },
            ].map((m) => (
              <div key={m.label} className="flex flex-col">
                <span className="text-sm font-bold text-foreground">{m.value}</span>
                <span className="text-[11px] text-muted-foreground">{m.label}</span>
              </div>
            ))}
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner className="mr-2" /> : null}
            {loading ? 'Salvando...' : editId ? 'Salvar alterações' : 'Salvar Refeição'}
          </Button>
        </form>
      </main>
    </div>
  )
}
