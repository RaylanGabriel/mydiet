'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { FoodAutocomplete } from '@/components/food-autocomplete'
import { FoodPhotoScanner, type DetectedFood } from '@/components/food-photo-scanner'
import { ArrowLeft, BookOpen, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

const mealTypes = [
  { value: 'cafe_manha', label: 'Cafe da Manha', defaultTime: '07:00' },
  { value: 'almoco', label: 'Almoco', defaultTime: '12:00' },
  { value: 'lanche_tarde', label: 'Lanche da Tarde', defaultTime: '15:00' },
  { value: 'cafe_tarde', label: 'Cafe da Tarde', defaultTime: '16:30' },
  { value: 'janta', label: 'Janta', defaultTime: '19:00' },
]

interface MealItemInput {
  id: string
  nome: string
  quantidade: string
  calorias: number
  proteina: number
  carboidratos: number
  gordura: number
}

export default function AdicionarPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState(mealTypes[0].value)
  const [horario, setHorario] = useState(mealTypes[0].defaultTime)
  const [items, setItems] = useState<MealItemInput[]>([
    { id: '1', nome: '', quantidade: '100g', calorias: 0, proteina: 0, carboidratos: 0, gordura: 0 }
  ])

  const handleTypeChange = (type: string) => {
    setSelectedType(type)
    const mealType = mealTypes.find(t => t.value === type)
    if (mealType) {
      setHorario(mealType.defaultTime)
    }
  }

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), nome: '', quantidade: '100g', calorias: 0, proteina: 0, carboidratos: 0, gordura: 0 }
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
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const updateItem = (id: string, field: keyof MealItemInput, value: string | number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const updateItemValues = (id: string, values: { calorias: number; proteina: number; carboidratos: number; gordura: number }) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, ...values } : item
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      const today = new Date().toISOString().split('T')[0]
      const mealType = mealTypes.find(t => t.value === selectedType)

      // Create meal
      const { data: meal, error: mealError } = await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          nome: mealType?.label || '',
          horario: horario,
          data: today,
          tipo: selectedType,
          concluida: false,
          ordem: mealTypes.findIndex(t => t.value === selectedType),
        })
        .select()
        .single()

      if (mealError) throw mealError

      // Create meal items
      const validItems = items.filter(item => item.nome.trim() !== '')
      if (validItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('meal_items')
          .insert(
            validItems.map((item, index) => ({
              meal_id: meal.id,
              user_id: user.id,
              nome: item.nome,
              quantidade: item.quantidade,
              calorias: item.calorias,
              proteina: item.proteina,
              carboidratos: item.carboidratos,
              gordura: item.gordura,
              ordem: index,
            }))
          )

        if (itemsError) throw itemsError
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('Error creating meal:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">Adicionar Refeicao</h1>
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
              <CardTitle className="text-base">Tipo de Refeicao</CardTitle>
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
                <FieldLabel htmlFor="horario">Horario</FieldLabel>
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
              <CardTitle className="text-base">Itens da Refeicao</CardTitle>
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
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Nome do alimento</FieldLabel>
                      <FoodAutocomplete
                        value={item.nome}
                        quantidade={item.quantidade}
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
                        <FieldLabel>Proteina (g)</FieldLabel>
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

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner className="mr-2" /> : null}
            {loading ? 'Salvando...' : 'Salvar Refeicao'}
          </Button>
        </form>
      </main>
    </div>
  )
}
