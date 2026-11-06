'use client'

import { useState } from 'react'
import { Check, Droplets, Flame, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { NutritionPlan } from '@/lib/fitness-plan'

interface NutritionPlanCardProps {
  plan: NutritionPlan
  applied: boolean
  onApply: () => Promise<void>
}

export function NutritionPlanCard({ plan, applied, onApply }: NutritionPlanCardProps) {
  const [busy, setBusy] = useState(false)

  const macros = [
    { label: 'Proteína', grams: plan.proteina_g, kcal: plan.proteina_g * 4, className: 'bg-primary' },
    { label: 'Carboidratos', grams: plan.carboidratos_g, kcal: plan.carboidratos_g * 4, className: 'bg-chart-2' },
    { label: 'Gorduras', grams: plan.gordura_g, kcal: plan.gordura_g * 9, className: 'bg-chart-3' },
  ]
  const totalKcal = macros.reduce((s, m) => s + m.kcal, 0) || 1

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4" aria-labelledby="dieta-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="dieta-title" className="font-semibold text-card-foreground">
            Dieta sugerida
          </h2>
          <p className="text-sm text-muted-foreground">{plan.ajusteDescricao}</p>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <Flame className="mb-1.5 h-6 w-6 text-primary" aria-hidden="true" />
        <span className="text-4xl font-bold tracking-tight text-card-foreground">{plan.calorias}</span>
        <span className="mb-1 text-sm text-muted-foreground">kcal / dia</span>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Metabolismo basal {plan.bmr} kcal · Gasto diário estimado {plan.tdee} kcal
      </p>

      {plan.avisos.length > 0 && (
        <ul className="flex flex-col gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground">
          {plan.avisos.map((a) => (
            <li key={a} className="flex gap-2">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
              <span className="leading-relaxed">{a}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          {macros.map((m) => (
            <div key={m.label} className={m.className} style={{ width: `${(m.kcal / totalKcal) * 100}%` }} />
          ))}
        </div>
        <dl className="grid grid-cols-3 gap-2">
          {macros.map((m) => (
            <div key={m.label} className="flex flex-col rounded-xl bg-muted px-3 py-2">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${m.className}`} aria-hidden="true" />
                {m.label}
              </dt>
              <dd className="text-lg font-bold text-foreground">{m.grams} g</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm text-foreground">
        <Droplets className="h-4 w-4 text-chart-2" aria-hidden="true" />
        Água: <strong>{(plan.agua_ml / 1000).toFixed(2).replace('.', ',')} L</strong> por dia
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-card-foreground">Distribuição nas refeições</h3>
        <ul className="flex flex-col divide-y divide-border">
          {plan.refeicoes.map((r) => (
            <li key={r.refeicao} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-card-foreground">{r.refeicao}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{r.exemplo}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-card-foreground">{r.calorias} kcal</p>
                <p className="text-xs text-muted-foreground">~{r.proteina_g} g prot.</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Button
        onClick={async () => {
          setBusy(true)
          try {
            await onApply()
          } finally {
            setBusy(false)
          }
        }}
        disabled={busy || applied}
        variant={applied ? 'secondary' : 'default'}
      >
        {busy ? <Spinner className="h-4 w-4" /> : applied ? <Check className="h-4 w-4" /> : null}
        {applied ? 'Metas aplicadas ao app' : 'Usar estas metas de calorias e água'}
      </Button>
    </section>
  )
}
