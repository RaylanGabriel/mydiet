'use client'

import { MealCard } from '@/components/meal-card'
import type { MealWithItems } from '@/hooks/use-meals'

interface MealTimelineProps {
  meals: MealWithItems[]
  onToggleComplete: (mealId: string, completed: boolean) => void
  onSelectOption: (itemId: string, optionId: string) => void
  onDelete: (mealId: string) => Promise<void>
}

export function MealTimeline({ meals, onToggleComplete, onSelectOption, onDelete }: MealTimelineProps) {
  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-[25px] top-0 bottom-0 w-0.5 bg-border" />

      {/* Meal cards */}
      <div className="space-y-4 relative">
        {meals.map((meal) => (
          <div key={meal.id} className="relative pl-14">
            {/* Timeline dot */}
            <div className="absolute left-[21px] top-4 w-2 h-2 rounded-full bg-primary ring-4 ring-background" />
            
            <MealCard
              meal={meal}
              onToggleComplete={onToggleComplete}
              onSelectOption={onSelectOption}
              onDelete={onDelete}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
