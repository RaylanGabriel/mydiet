'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, HeartPulse, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { DIAS_SEMANA } from '@/lib/workout-types'
import type { TrainingPlan } from '@/lib/fitness-plan'

interface TrainingPlanCardProps {
  plan: TrainingPlan
  onCreate: () => Promise<void>
}

export function TrainingPlanCard({ plan, onCreate }: TrainingPlanCardProps) {
  const [status, setStatus] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4" aria-labelledby="treino-title">
      <div>
        <h2 id="treino-title" className="font-semibold text-card-foreground">
          Treino sugerido
        </h2>
        <p className="text-sm font-medium text-primary">{plan.divisao}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{plan.descricao}</p>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        <div className="flex flex-col rounded-xl bg-muted px-3 py-2">
          <dt className="text-xs text-muted-foreground">Séries</dt>
          <dd className="text-lg font-bold text-foreground">{plan.prescricao.series}</dd>
        </div>
        <div className="flex flex-col rounded-xl bg-muted px-3 py-2">
          <dt className="text-xs text-muted-foreground">Repetições</dt>
          <dd className="text-lg font-bold text-foreground">{plan.prescricao.repeticoes}</dd>
        </div>
        <div className="flex flex-col rounded-xl bg-muted px-3 py-2">
          <dt className="text-xs text-muted-foreground">Descanso</dt>
          <dd className="text-lg font-bold text-foreground">{plan.prescricao.descanso_segundos}s</dd>
        </div>
      </dl>

      <ul className="flex flex-col gap-3">
        {plan.workouts.map((w) => (
          <li key={w.nome} className="rounded-xl border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-card-foreground">{w.nome}</p>
                <p className="text-sm text-muted-foreground">{w.foco}</p>
              </div>
              <p className="text-right text-xs font-medium text-primary">
                {w.dias_semana.map((d) => DIAS_SEMANA[d]).join(' · ')}
              </p>
            </div>
            <ol className="mt-2 flex flex-col gap-1">
              {w.exercicios.map((ex) => (
                <li key={ex.nome} className="flex justify-between gap-2 text-sm">
                  <span className="text-card-foreground">{ex.nome}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {ex.series} x {ex.repeticoes}
                  </span>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ul>

      <div className="flex gap-2 rounded-xl bg-muted p-3 text-sm text-foreground">
        <HeartPulse className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="leading-relaxed">
          <strong>Cardio:</strong> {plan.cardio}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-medium text-card-foreground">
          <Lightbulb className="h-4 w-4 text-primary" aria-hidden="true" />
          Dicas para progredir
        </h3>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          {plan.dicas.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </div>

      {status === 'done' ? (
        <Button asChild variant="secondary">
          <Link href="/treinos">
            <Check className="h-4 w-4" />
            Treinos criados. Ver meus treinos
          </Link>
        </Button>
      ) : (
        <Button
          disabled={status === 'busy'}
          onClick={async () => {
            setStatus('busy')
            try {
              await onCreate()
              setStatus('done')
            } catch {
              setStatus('error')
            }
          }}
        >
          {status === 'busy' && <Spinner className="h-4 w-4" />}
          Criar estes treinos no app
        </Button>
      )}
      {status === 'error' && (
        <p className="text-sm text-destructive" role="alert">
          Não foi possível criar os treinos. Tente novamente.
        </p>
      )}
    </section>
  )
}
