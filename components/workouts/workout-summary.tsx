'use client'

import { useEffect } from 'react'
import { ArrowDownRight, ArrowUpRight, Clock, Dumbbell, HeartPulse, ListChecks, PartyPopper, Trophy, Weight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDuration } from '@/lib/workout-types'

export interface SummaryData {
  workoutNome: string
  duracaoSegundos: number
  series: number
  exercicios: number
  volumeKg: number
  cardioMin: number
  /** Volume da última vez que este mesmo treino foi feito */
  volumeAnteriorKg: number | null
  recordes: { exercicio: string; tipo: string; valor: string; antes: string }[]
}

const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR')

export function WorkoutSummary({ data, onClose }: { data: SummaryData; onClose: () => void }) {
  useEffect(() => {
    if ('vibrate' in navigator) navigator.vibrate?.(data.recordes.length ? [100, 60, 100, 60, 200] : 120)
  }, [data.recordes.length])

  const variacao =
    data.volumeAnteriorKg && data.volumeAnteriorKg > 0 && data.volumeKg > 0
      ? Math.round(((data.volumeKg - data.volumeAnteriorKg) / data.volumeAnteriorKg) * 100)
      : null

  const stats = [
    { icon: Clock, label: 'Duração', value: formatDuration(data.duracaoSegundos) },
    { icon: ListChecks, label: 'Séries', value: String(data.series) },
    { icon: Dumbbell, label: 'Exercícios', value: String(data.exercicios) },
    data.volumeKg > 0
      ? { icon: Weight, label: 'Volume', value: `${fmt(data.volumeKg)} kg` }
      : data.cardioMin > 0
        ? { icon: HeartPulse, label: 'Cardio', value: `${fmt(data.cardioMin)} min` }
        : null,
  ].filter(Boolean) as { icon: typeof Clock; label: string; value: string }[]

  return (
    <div className="flex flex-1 flex-col">
      <header className="rounded-b-3xl bg-primary px-4 pb-8 pt-10 text-center">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-2">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-foreground/15">
            <PartyPopper className="h-8 w-8 text-primary-foreground" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold text-primary-foreground">Treino concluído! 💪</h1>
          <p className="text-sm text-primary-foreground/80">{data.workoutNome}</p>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto flex max-w-lg flex-col gap-5">
          <dl className="grid grid-cols-2 gap-3">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </dt>
                <dd className="text-xl font-bold tabular-nums text-card-foreground">{value}</dd>
              </div>
            ))}
          </dl>

          {variacao !== null && (
            <p className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-foreground">
              {variacao >= 0 ? (
                <ArrowUpRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <span>
                {variacao === 0
                  ? 'Mesmo volume da última vez que fez este treino.'
                  : variacao > 0
                    ? <>Volume <strong>{variacao}% maior</strong> que da última vez. Evolução!</>
                    : <>Volume {Math.abs(variacao)}% menor que da última vez. Tudo bem, dias assim fazem parte.</>}
              </span>
            </p>
          )}

          {data.recordes.length > 0 ? (
            <section className="flex flex-col gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4" aria-labelledby="recordes-title">
              <h2 id="recordes-title" className="flex items-center gap-2 font-semibold text-foreground">
                <Trophy className="h-5 w-5 text-amber-500" aria-hidden="true" />
                {data.recordes.length === 1 ? 'Novo recorde pessoal!' : `${data.recordes.length} recordes pessoais!`}
              </h2>
              <ul className="flex flex-col gap-2">
                {data.recordes.map((r) => (
                  <li key={r.exercicio + r.tipo} className="flex flex-col rounded-lg bg-card px-3 py-2">
                    <span className="text-sm font-medium text-card-foreground">{r.exercicio}</span>
                    <span className="text-xs text-muted-foreground">
                      {r.tipo}: <strong className="text-foreground">{r.valor}</strong> (antes {r.antes})
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="text-center text-sm text-muted-foreground text-pretty">
              Cada treino feito conta. Na próxima, tente aumentar um pouco a carga ou as repetições.
            </p>
          )}

          <Button size="lg" onClick={onClose}>
            Voltar aos treinos
          </Button>
        </div>
      </main>
    </div>
  )
}
