'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CalorieHeader } from '@/components/calorie-header'
import { MealTimeline } from '@/components/meal-timeline'
import { WaterTracker } from '@/components/water-tracker'
import { useMeals } from '@/hooks/use-meals'
import { useProfile } from '@/hooks/use-profile'
import { Spinner } from '@/components/ui/spinner'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { addDays, formatDayLabel, formatShortDate, toLocalDateString } from '@/lib/date'

export default function DashboardPage() {
  // useSearchParams precisa de Suspense no App Router
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <Spinner className="w-8 h-8" />
        </div>
      }
    >
      <Dashboard />
    </Suspense>
  )
}

function Dashboard() {
  // Abre no dia atual (fuso local), a não ser que venha ?data= (ex.: depois de
  // editar uma refeição de outro dia). A escolha não é persistida de propósito.
  const params = useSearchParams()
  const [today, setToday] = useState(() => toLocalDateString())
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = params.get('data')
    return d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today ? d : today
  })

  // Se o app ficar aberto e virar o dia, acompanha a nova data
  // (só move a seleção se o usuário estava olhando o "hoje" antigo).
  const todayRef = useRef(today)
  useEffect(() => {
    const syncToday = () => {
      const now = toLocalDateString()
      if (now === todayRef.current) return
      const previous = todayRef.current
      todayRef.current = now
      setToday(now)
      setSelectedDate((current) => (current === previous ? now : current))
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncToday()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', syncToday)
    const interval = setInterval(syncToday, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', syncToday)
      clearInterval(interval)
    }
  }, [])

  const { meals, totals, isLoading: mealsLoading, toggleMealComplete, selectFoodOption, deleteMeal } = useMeals(selectedDate)
  const { profile, isLoading: profileLoading } = useProfile()

  const isToday = selectedDate === today
  const dayLabel = formatDayLabel(selectedDate, today)
  const shortDate = formatShortDate(selectedDate, today)

  const goPrevious = () => setSelectedDate((d) => addDays(d, -1))
  const goNext = () => setSelectedDate((d) => (d >= today ? d : addDays(d, 1)))
  const goToday = () => setSelectedDate(today)

  if (profileLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <CalorieHeader
        label={`${dayLabel}, ${shortDate}`}
        consumed={totals.calorias}
        goal={profile?.meta_calorias_diarias || 2000}
        proteina={totals.proteina}
        carboidratos={totals.carboidratos}
        gordura={totals.gordura}
      />

      {/* pb-24 deixa espaço para as setas flutuantes não cobrirem o último card */}
      <main className="flex-1 px-4 pt-6 pb-24">
        <div className="max-w-lg mx-auto space-y-6">
          {/* key força recarregar o consumo de água ao trocar de dia */}
          <WaterTracker key={selectedDate} date={selectedDate} metaAgua={profile?.meta_agua_ml || 2500}
            mlPorCopo={profile?.agua_por_copo_ml || 250}
          />

          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">
                {isToday ? 'Refeições de Hoje' : `Refeições de ${dayLabel === 'Ontem' ? 'Ontem' : shortDate}`}
              </h2>
              {!isToday && (
                <Link
                  href={`/adicionar?data=${selectedDate}`}
                  className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-primary hover:bg-muted"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Adicionar
                </Link>
              )}
            </div>

            {mealsLoading ? (
              <div className="flex justify-center py-10">
                <Spinner className="w-6 h-6" />
              </div>
            ) : meals.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Calendar className="w-10 h-10" />
                  </EmptyMedia>
                  <EmptyTitle>
                    {isToday ? 'Nenhuma refeicao cadastrada' : 'Nenhuma refeicao registrada'}
                  </EmptyTitle>
                  <EmptyDescription>
                    {isToday
                      ? 'Adicione suas refeicoes do dia para comecar a acompanhar sua dieta.'
                      : `Voce nao registrou refeicoes em ${shortDate}.`}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <MealTimeline
                meals={meals}
                onToggleComplete={toggleMealComplete}
                onSelectOption={selectFoodOption}
                onDelete={deleteMeal}
              />
            )}
          </div>
        </div>
      </main>

      {/* Navegação entre dias: setas nos cantos inferiores, acima da barra de navegação */}
      <div
        className="fixed inset-x-0 z-40 px-4 pointer-events-none"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goPrevious}
            aria-label="Dia anterior"
            className="pointer-events-auto h-12 w-12 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {!isToday && (
            <button
              type="button"
              onClick={goToday}
              className="pointer-events-auto rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-lg active:scale-95 transition"
            >
              Voltar para hoje
            </button>
          )}

          <button
            type="button"
            onClick={goNext}
            disabled={isToday}
            aria-label="Proximo dia"
            className="pointer-events-auto h-12 w-12 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition disabled:opacity-0 disabled:pointer-events-none"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  )
}
