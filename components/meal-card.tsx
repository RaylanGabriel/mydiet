'use client'

import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, Clock, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Meal, MealItem } from '@/lib/types'
import { MealItemRow } from '@/components/meal-item-row'

interface MealCardProps {
  meal: Meal & { items: (MealItem & { options?: { id: string; nome: string; quantidade: string; calorias: number; is_active: boolean }[] })[] }
  onToggleComplete: (mealId: string, completed: boolean) => void
  onSelectOption: (itemId: string, optionId: string) => void
  onDelete: (mealId: string) => Promise<void>
}

export function MealCard({ meal, onToggleComplete, onSelectOption, onDelete }: MealCardProps) {
  const [expanded, setExpanded] = useState(!meal.concluida)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const totalCalories = meal.items.reduce((acc, item) => acc + item.calorias, 0)

  const mealTypeLabels: Record<string, string> = {
    cafe_manha: 'Cafe da Manha',
    almoco: 'Almoco',
    lanche_tarde: 'Lanche da Tarde',
    cafe_tarde: 'Cafe da Tarde',
    janta: 'Janta',
  }

  const formatTime = (time: string) => {
    return time.slice(0, 5)
  }

  const mealName = meal.nome || mealTypeLabels[meal.tipo] || 'Refeicao'

  const handleDelete = async () => {
    if (deleting) return
    setDeleting(true)
    try {
      await onDelete(meal.id)
      setConfirmOpen(false)
      toast.success(`${mealName} excluida`, {
        description: `${meal.items.length} ${meal.items.length === 1 ? 'item removido' : 'itens removidos'} do dia.`,
      })
    } catch (error) {
      console.error('Error deleting meal:', error)
      toast.error('Nao foi possivel excluir a refeicao', {
        description: 'Tente novamente em instantes.',
      })
      setDeleting(false)
    }
  }

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      meal.concluida && "opacity-70"
    )}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors"
      >
        {/* Time indicator */}
        <div className="flex flex-col items-center justify-center min-w-[50px]">
          <Clock className="w-4 h-4 text-muted-foreground mb-1" />
          <span className="text-sm font-medium">{formatTime(meal.horario)}</span>
        </div>

        {/* Meal info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            {meal.nome || mealTypeLabels[meal.tipo]}
          </h3>
          <p className="text-sm text-muted-foreground">
            {meal.items.length} {meal.items.length === 1 ? 'item' : 'itens'} • {totalCalories} kcal
          </p>
        </div>

        {/* Status & expand */}
        <div className="flex items-center gap-2">
          {meal.concluida && (
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expandable content */}
      {expanded && (
        <CardContent className="pt-0 pb-4 px-4 border-t border-border">
          <div className="space-y-3 mt-4">
            {meal.items.map((item) => (
              <MealItemRow 
                key={item.id} 
                item={item} 
                onSelectOption={onSelectOption}
              />
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            {!meal.concluida && (
              <Button
                onClick={() => onToggleComplete(meal.id, true)}
                className="flex-1"
                variant="secondary"
              >
                <Check className="w-4 h-4 mr-2" />
                Marcar como concluida
              </Button>
            )}
            
            <AlertDialog
              open={confirmOpen}
              onOpenChange={(open) => {
                if (!deleting) setConfirmOpen(open)
              }}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size={meal.concluida ? "default" : "icon"}
                  className={cn(meal.concluida && "flex-1")}
                  aria-label="Excluir refeicao"
                >
                  <Trash2 className="w-4 h-4" />
                  {meal.concluida && <span className="ml-2">Excluir</span>}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir {mealName}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A refeicao e {meal.items.length === 1 ? 'seu item' : `seus ${meal.items.length} itens`} ({totalCalories} kcal) serao removidos. Essa acao nao pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                  <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                    {deleting ? <Spinner className="mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    {deleting ? 'Excluindo...' : 'Excluir'}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
