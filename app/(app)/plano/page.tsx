'use client'

import { useMemo, useState } from 'react'
import { BookOpen, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { BodyDataForm } from '@/components/plan/body-data-form'
import { NutritionPlanCard } from '@/components/plan/nutrition-plan-card'
import { TrainingPlanCard } from '@/components/plan/training-plan-card'
import { useProfile } from '@/hooks/use-profile'
import { useWorkouts } from '@/hooks/use-workouts'
import { useWeightGoal } from '@/hooks/use-weight-goal'
import { WeightGoalCard } from '@/components/plan/weight-goal-card'
import { WeightChartCard } from '@/components/plan/weight-chart-card'
import {
  OBJETIVO_OPTIONS,
  SCIENTIFIC_SOURCES,
  calculateNutritionPlan,
  calculateTrainingPlan,
  getBodyData,
  primaryObjetivo,
  type BodyData,
  type Objetivo,
} from '@/lib/fitness-plan'

export default function PlanoPage() {
  const { profile, isLoading, updateProfile } = useProfile()
  const { createFromPlan } = useWorkouts()
  const { logWeight } = useWeightGoal()
  const [editing, setEditing] = useState(false)

  const bodyData = useMemo(() => getBodyData(profile), [profile])
  const nutrition = useMemo(() => (bodyData ? calculateNutritionPlan(bodyData) : null), [bodyData])
  const training = useMemo(() => (bodyData ? calculateTrainingPlan(bodyData) : null), [bodyData])
  const showForm = editing || !bodyData

  const changeObjetivos = async (objetivos: Objetivo[]) => {
    await updateProfile({ objetivos, objetivo: primaryObjetivo(objetivos) })
  }

  const handleSubmit = async (data: BodyData) => {
    const pesoAnterior = profile?.peso_kg != null ? Number(profile.peso_kg) : null
    try {
      await updateProfile({ ...data, objetivo: primaryObjetivo(data.objetivos) })
      // Peso alterado pelo formulário também entra no histórico de pesagens
      if (pesoAnterior !== data.peso_kg) {
        logWeight(data.peso_kg, { updateProfile: false }).catch(() => {
          // Tabela de pesagens pode não existir ainda (script 007); não bloqueia o plano
        })
      }
    } catch (error) {
      const message = String((error as { message?: string })?.message ?? '')
      if (message.includes('objetivos')) {
        const friendly = new Error('Para salvar mais de um objetivo, execute o script scripts/006_plan_multiple_goals.sql no SQL Editor do Supabase.')
        friendly.name = 'PlanSaveError'
        throw friendly
      }
      throw error
    }
    setEditing(false)
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const objetivoLabels = OBJETIVO_OPTIONS.filter((o) => bodyData?.objetivos.includes(o.value)).map((o) => o.label)

  return (
    <div className="flex flex-1 flex-col">
      <header className="rounded-b-3xl bg-primary px-4 pb-6 pt-8">
        <div className="mx-auto flex max-w-lg flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">Seu plano</h1>
              <p className="text-sm text-primary-foreground/70 text-pretty">
                Dieta e treino calculados a partir dos seus dados e de estudos científicos.
              </p>
            </div>
            {bodyData && !editing && (
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            )}
          </div>

          {bodyData && nutrition && !editing && (
            <dl className="grid grid-cols-3 gap-2">
              {[
                { label: 'Peso', value: `${bodyData.peso_kg.toString().replace('.', ',')} kg` },
                { label: 'Altura', value: `${bodyData.altura_cm} cm` },
                { label: 'IMC', value: nutrition.imc.toString().replace('.', ',') },
              ].map((item) => (
                <div key={item.label} className="flex flex-col rounded-xl bg-primary-foreground/10 px-2.5 py-2">
                  <dt className="text-[11px] text-primary-foreground/70">{item.label}</dt>
                  <dd className="truncate text-sm font-semibold text-primary-foreground">{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {bodyData && nutrition && !editing && (
            <p className="-mt-2 text-xs text-primary-foreground/70">Classificação OMS: {nutrition.imcClassificacao}</p>
          )}
          {bodyData && nutrition && !editing && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-primary-foreground/70">Objetivos:</span>
              {objetivoLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-xs font-semibold text-primary-foreground"
                >
                  {label}
                </span>
              ))}
              <span className="text-xs text-primary-foreground/70">· {nutrition.estrategia}</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto flex max-w-lg flex-col gap-5">
          {showForm ? (
            <section className="rounded-2xl border border-border bg-card p-4" aria-labelledby="dados-title">
              <h2 id="dados-title" className="mb-1 font-semibold text-card-foreground">
                Dados corporais
              </h2>
              <p className="mb-5 text-sm text-muted-foreground">
                Usamos essas informações apenas para calcular suas metas.
              </p>
              <BodyDataForm
                key={profile?.id}
                initial={profile ?? null}
                onSubmit={handleSubmit}
                onCancel={bodyData ? () => setEditing(false) : undefined}
              />
            </section>
          ) : (
            bodyData &&
            nutrition &&
            training && (
              <>
                <WeightGoalCard
                  bodyData={bodyData}
                  onChangeObjetivos={changeObjetivos}
                  onEditPlan={() => {
                    setEditing(true)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                />
                <WeightChartCard />
                <NutritionPlanCard
                  plan={nutrition}
                  applied={
                    profile?.meta_calorias_diarias === nutrition.calorias && profile?.meta_agua_ml === nutrition.agua_ml
                  }
                  onApply={() =>
                    updateProfile({ meta_calorias_diarias: nutrition.calorias, meta_agua_ml: nutrition.agua_ml })
                  }
                />
                <TrainingPlanCard plan={training} onCreate={() => createFromPlan(training.workouts)} />

                <details className="group rounded-2xl border border-border bg-card p-4">
                  <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-card-foreground">
                    <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
                    Fontes científicas
                    <span className="ml-auto text-xs font-normal text-muted-foreground group-open:hidden">Ver</span>
                  </summary>
                  <ul className="mt-3 flex flex-col gap-3">
                    {SCIENTIFIC_SOURCES.map((s) => (
                      <li key={s.citacao} className="text-sm leading-relaxed">
                        <p className="font-medium text-card-foreground">{s.tema}</p>
                        <p className="text-muted-foreground">{s.citacao}</p>
                      </li>
                    ))}
                  </ul>
                </details>

                <p className="text-center text-xs leading-relaxed text-muted-foreground text-pretty">
                  Estas sugestões são estimativas gerais e não substituem a orientação de um nutricionista,
                  médico ou profissional de educação física.
                </p>
              </>
            )
          )}
        </div>
      </main>
    </div>
  )
}
