'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeftRight, Check, Clock, FileDown, Info, TriangleAlert, Utensils } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import type { NutritionPlan } from '@/lib/fitness-plan'
import {
  MEAL_COUNT_OPTIONS,
  PAPEL_LABEL,
  buildMealPlan,
  mealTotals,
  selectedPortion,
  sumMacros,
  type MealCount,
  type MealItem,
  type Papel,
  type SwapSelection,
} from '@/lib/meal-plan'

const STORAGE_KEY = 'mydiet-cardapio'

const PAPEL_DOT: Record<Papel, string> = {
  proteina: 'bg-primary',
  carboidrato: 'bg-chart-2',
  leguminosa: 'bg-chart-4',
  fruta: 'bg-chart-5',
  gordura: 'bg-chart-3',
  vegetais: 'bg-emerald-500',
  bebida: 'bg-muted-foreground/50',
}

const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR')

function readStored(): { refeicoes?: MealCount; sel?: SwapSelection } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function MealPlanCard({ plan }: { plan: NutritionPlan }) {
  const defaultCount: MealCount = plan.calorias > 2800 ? 6 : 5
  const [refeicoes, setRefeicoes] = useState<MealCount>(defaultCount)
  const [sel, setSel] = useState<SwapSelection>({})
  const [aberto, setAberto] = useState<string | null>(null)
  const [gerando, setGerando] = useState(false)
  const [loaded, setLoaded] = useState(false)
  // Módulo do PDF pré-carregado: no toque, o PDF é gerado e compartilhado sem
  // esperar download de código (o iPhone exige isso para abrir o compartilhamento)
  const pdfModule = useRef<typeof import('@/lib/diet-pdf') | null>(null)

  useEffect(() => {
    import('@/lib/diet-pdf')
      .then((m) => {
        pdfModule.current = m
      })
      .catch(() => {
        // Tenta de novo no toque
      })
  }, [])

  useEffect(() => {
    const stored = readStored()
    if (stored.refeicoes && MEAL_COUNT_OPTIONS.includes(stored.refeicoes)) setRefeicoes(stored.refeicoes)
    if (stored.sel && typeof stored.sel === 'object') setSel(stored.sel)
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ refeicoes, sel }))
    } catch {
      // Sem armazenamento local: as escolhas valem só nesta visita
    }
  }, [refeicoes, sel, loaded])

  const meals = useMemo(
    () => buildMealPlan({ calorias: plan.calorias, proteina_g: plan.proteina_g }, refeicoes),
    [plan.calorias, plan.proteina_g, refeicoes],
  )
  const dia = useMemo(() => sumMacros(meals.map((m) => mealTotals(m, sel))), [meals, sel])
  const fechaMeta = dia.kcal >= plan.calorias * 0.93

  const escolher = (item: MealItem, alimento: string) => {
    setSel((s) => {
      const next = { ...s }
      if (alimento === item.opcoes[0].alimento) delete next[item.id]
      else next[item.id] = alimento
      return next
    })
  }

  const baixarPdf = async () => {
    setGerando(true)
    try {
      const { buildDietPdf, deliverPdf } = pdfModule.current ?? (pdfModule.current = await import('@/lib/diet-pdf'))
      const { blob, fileName } = buildDietPdf({
        meals,
        sel,
        calorias: plan.calorias,
        proteina_g: plan.proteina_g,
        carboidratos_g: plan.carboidratos_g,
        gordura_g: plan.gordura_g,
        agua_ml: plan.agua_ml,
        estrategia: plan.estrategia,
      })
      await deliverPdf(blob, fileName)
    } catch (e) {
      console.error(e)
      toast.error('Não foi possível gerar o PDF. Tente novamente.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4" aria-labelledby="cardapio-title">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="cardapio-title" className="flex items-center gap-2 font-semibold text-card-foreground">
            <Utensils className="h-4 w-4 text-primary" aria-hidden="true" />
            Cardápio do dia
          </h2>
          <p className="text-sm text-muted-foreground text-pretty">
            Quantidades calculadas para {fmt(plan.calorias)} kcal. Toque em trocar para ver equivalentes.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-card-foreground">Refeições por dia</span>
        <div role="radiogroup" aria-label="Refeições por dia" className="flex rounded-full bg-muted p-1">
          {MEAL_COUNT_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={refeicoes === n}
              onClick={() => setRefeicoes(n)}
              className={cn(
                'h-8 min-w-10 rounded-full px-3 text-sm font-semibold transition-colors',
                refeicoes === n ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-muted p-2.5 text-center">
        {[
          { label: 'kcal', value: fmt(dia.kcal) },
          { label: 'Proteína', value: `${fmt(dia.p)} g` },
          { label: 'Carbo', value: `${fmt(dia.c)} g` },
          { label: 'Gordura', value: `${fmt(dia.g)} g` },
        ].map((m) => (
          <div key={m.label} className="flex flex-col">
            <span className="text-sm font-bold text-foreground">{m.value}</span>
            <span className="text-[11px] text-muted-foreground">{m.label}</span>
          </div>
        ))}
      </div>

      {!fechaMeta && (
        <p className="flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-foreground">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
          <span className="leading-relaxed">
            Com {refeicoes} refeições as porções ficariam grandes demais para bater {fmt(plan.calorias)} kcal.
            {refeicoes < 6 ? ' Experimente dividir em mais refeições.' : ' Complete com um lanche extra.'}
          </span>
        </p>
      )}

      <ol className="flex flex-col gap-3">
        {meals.map((meal) => {
          const total = mealTotals(meal, sel)
          return (
            <li key={meal.id} className="overflow-hidden rounded-2xl border border-border bg-background">
              <div className="flex items-center gap-3 border-b border-border bg-muted/50 px-3.5 py-2.5">
                <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {meal.horario}
                </span>
                <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{meal.nome}</h3>
                <div className="shrink-0 text-right leading-tight">
                  <p className="text-sm font-bold text-foreground">{fmt(total.kcal)} kcal</p>
                  <p className="text-[11px] text-muted-foreground">{fmt(total.p)} g prot.</p>
                </div>
              </div>

              <ul className="flex flex-col divide-y divide-border">
                {meal.itens.map((item) => {
                  const atual = selectedPortion(item, sel)
                  const trocas = item.opcoes.length - 1
                  const expandido = aberto === item.id
                  return (
                    <li key={item.id} className="px-3.5 py-2.5">
                      <div className="flex items-start gap-2.5">
                        <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', PAPEL_DOT[item.papel])} aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {PAPEL_LABEL[item.papel]}
                          </p>
                          <p className="text-sm font-medium leading-snug text-foreground">
                            {item.livre ? item.livre.texto : atual?.texto}
                          </p>
                          {item.livre?.detalhe && (
                            <p className="text-xs leading-relaxed text-muted-foreground">{item.livre.detalhe}</p>
                          )}
                        </div>
                        {trocas > 0 && (
                          <button
                            type="button"
                            onClick={() => setAberto(expandido ? null : item.id)}
                            aria-expanded={expandido}
                            className={cn(
                              'flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                              expandido
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border text-muted-foreground hover:border-primary hover:text-primary',
                            )}
                          >
                            <ArrowLeftRight className="h-3 w-3" aria-hidden="true" />
                            Trocar
                          </button>
                        )}
                      </div>

                      {expandido && (
                        <div className="mt-2.5 flex flex-col gap-1.5 pl-4.5">
                          <p className="text-xs text-muted-foreground">
                            {item.papel === 'proteina' ? 'Mesma quantidade de proteína:' : 'Mesmas calorias:'}
                          </p>
                          <div className="flex flex-col gap-1.5">
                            {item.opcoes.map((op, idx) => {
                              const ativo = op.alimento === atual?.alimento
                              return (
                                <button
                                  key={op.alimento}
                                  type="button"
                                  onClick={() => {
                                    escolher(item, op.alimento)
                                    setAberto(null)
                                  }}
                                  className={cn(
                                    'flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                                    ativo
                                      ? 'border-primary bg-primary/10 text-foreground'
                                      : 'border-border bg-card text-foreground hover:border-primary/60',
                                  )}
                                >
                                  <span className="min-w-0">
                                    {op.texto}
                                    {idx === 0 && <span className="ml-1.5 text-xs text-muted-foreground">(sugestão)</span>}
                                  </span>
                                  {ativo ? (
                                    <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                                  ) : (
                                    <span className="shrink-0 text-xs text-muted-foreground">{fmt(op.macros.kcal)} kcal</span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </li>
          )
        })}
      </ol>

      <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Pese os alimentos já prontos (cozidos, grelhados ou assados). Tempere com sal, alho, cebola e ervas à vontade.
      </p>

      <Button variant="outline" onClick={baixarPdf} disabled={gerando}>
        {gerando ? <Spinner className="h-4 w-4" /> : <FileDown className="h-4 w-4" />}
        Baixar dieta em PDF
      </Button>
    </section>
  )
}
