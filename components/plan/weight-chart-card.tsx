'use client'

import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts'
import { ArrowDown, ArrowUp, LineChart as LineChartIcon, Minus } from 'lucide-react'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { useWeightGoal } from '@/hooks/use-weight-goal'
import { addDays, formatDayLabel, formatShortDate, parseLocalDate, toLocalDateString } from '@/lib/date'
import { formatKg } from '@/lib/weight-goal'
import { cn } from '@/lib/utils'

// --chart-line acompanha a cor de tema escolhida (definida em globals.css).
// Cada valor foi validado para contraste e faixa de luminosidade nos modos claro e escuro.
const chartConfig = {
  peso: {
    label: 'Peso',
    color: 'var(--chart-line)',
  },
} satisfies ChartConfig

const RANGES = [
  { id: '1m', label: '1M', days: 30 },
  { id: '3m', label: '3M', days: 90 },
  { id: '6m', label: '6M', days: 180 },
  { id: '1a', label: '1A', days: 365 },
  { id: 'tudo', label: 'Tudo', days: null },
] as const
type RangeId = (typeof RANGES)[number]['id']

interface Point {
  x: number
  data: string
  peso: number
  diff: number | null
  anterior: string | null
}

const kg = (n: number) => n.toFixed(1).replace('.', ',')

export function WeightChartCard() {
  const { logs, activeGoal, isLoading, error } = useWeightGoal()

  // Padrão: "Tudo" se o histórico for curto, senão os últimos 3 meses
  const spanDays = logs.length > 1
    ? Math.round((parseLocalDate(logs[0].data).getTime() - parseLocalDate(logs[logs.length - 1].data).getTime()) / 86_400_000)
    : 0
  const [range, setRange] = useState<RangeId | null>(null)
  const activeRange: RangeId = range ?? (spanDays > 90 ? '3m' : 'tudo')

  const points = useMemo<Point[]>(() => {
    const days = RANGES.find((r) => r.id === activeRange)?.days ?? null
    const cutoff = days ? addDays(toLocalDateString(), -days) : null
    const asc = [...logs].reverse()
    return asc
      .map((log, i) => ({
        x: parseLocalDate(log.data).getTime(),
        data: log.data,
        peso: log.peso_kg,
        diff: i > 0 ? Math.round((log.peso_kg - asc[i - 1].peso_kg) * 10) / 10 : null,
        anterior: i > 0 ? asc[i - 1].data : null,
      }))
      .filter((p) => !cutoff || p.data >= cutoff)
  }, [logs, activeRange])

  // Tabelas do script 007 ausentes ou carregando: o card da meta já explica
  if (isLoading || error) return null

  const meta = activeGoal?.peso_meta_kg ?? null
  const first = points[0]
  const last = points[points.length - 1]
  const variacao = first && last ? Math.round((last.peso - first.peso) * 10) / 10 : 0

  // Eixo Y: inclui a meta para a linha de referência ficar visível
  const valores = points.map((p) => p.peso).concat(meta != null ? [meta] : [])
  const minV = Math.min(...valores)
  const maxV = Math.max(...valores)
  const pad = Math.max(0.5, (maxV - minV) * 0.15)
  const yDomain: [number, number] = [Math.floor(minV - pad), Math.ceil(maxV + pad)]

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4" aria-labelledby="evolucao-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="evolucao-title" className="flex items-center gap-2 font-semibold text-card-foreground">
            <LineChartIcon className="h-4 w-4 text-primary" aria-hidden="true" />
            Evolução do peso
          </h2>
          {points.length >= 2 && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
              {variacao < 0 ? <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" /> : variacao > 0 ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /> : <Minus className="h-3.5 w-3.5" aria-hidden="true" />}
              <span>
                <strong className="text-foreground">
                  {variacao > 0 ? '+' : ''}
                  {kg(variacao)} kg
                </strong>{' '}
                desde {formatShortDate(first.data)}
              </span>
            </p>
          )}
        </div>
      </div>

      {logs.length >= 2 && (
        <div className="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Período do gráfico">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              aria-pressed={activeRange === r.id}
              className={cn(
                'flex-1 rounded-md py-1 text-xs font-medium transition-colors',
                activeRange === r.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {points.length < 2 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-1 rounded-xl bg-muted/50 px-6 text-center">
          <LineChartIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            {logs.length < 2
              ? 'Registre seu peso em pelo menos 2 dias para ver sua evolução aqui.'
              : 'Nenhuma pesagem suficiente neste período. Escolha um período maior.'}
          </p>
        </div>
      ) : (
        <div
          role="img"
          aria-label={`Gráfico de peso: ${formatKg(first.peso)} em ${formatShortDate(first.data)} e ${formatKg(last.peso)} em ${formatShortDate(last.data)}${meta != null ? `. Meta: ${formatKg(meta)}` : ''}.`}
        >
          <ChartContainer config={chartConfig} className="aspect-auto h-52 w-full">
            <LineChart data={points} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
              <XAxis
                dataKey="x"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(v: number) => formatShortDate(toLocalDateString(new Date(v)))}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={28}
              />
              <YAxis
                domain={yDomain}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={32}
                tickCount={5}
              />
              {meta != null && (
                <ReferenceLine
                  y={meta}
                  stroke="var(--muted-foreground)"
                  strokeOpacity={0.7}
                  strokeWidth={1}
                  label={{
                    value: `Meta ${kg(meta)} kg`,
                    position: 'insideTopRight',
                    fill: 'var(--muted-foreground)',
                    fontSize: 11,
                  }}
                />
              )}
              <Tooltip
                cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1, strokeOpacity: 0.5 }}
                content={<WeightTooltip meta={meta} />}
                isAnimationActive={false}
              />
              <Line
                dataKey="peso"
                type="monotone"
                stroke="var(--color-peso)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={points.length <= 20 ? { r: 4, fill: 'var(--color-peso)', stroke: 'var(--card)', strokeWidth: 2 } : false}
                activeDot={{ r: 5, fill: 'var(--color-peso)', stroke: 'var(--card)', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        </div>
      )}

      {points.length >= 2 && (
        <details className="group text-sm">
          <summary className="cursor-pointer list-none text-xs text-muted-foreground underline-offset-2 hover:underline">
            <span className="group-open:hidden">Ver dados em tabela</span>
            <span className="hidden group-open:inline">Ocultar tabela</span>
          </summary>
          <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-1.5 text-left font-medium">Data</th>
                  <th scope="col" className="px-3 py-1.5 text-right font-medium">Peso</th>
                  <th scope="col" className="px-3 py-1.5 text-right font-medium">Variação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...points].reverse().map((p) => (
                  <tr key={p.data}>
                    <td className="px-3 py-1.5 text-muted-foreground">{formatShortDate(p.data)}</td>
                    <td className="px-3 py-1.5 text-right font-medium text-foreground">{formatKg(p.peso)}</td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">
                      {p.diff == null || p.diff === 0 ? '–' : `${p.diff > 0 ? '+' : ''}${kg(p.diff)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  )
}

function WeightTooltip({ active, payload, meta }: TooltipProps<number, string> & { meta: number | null }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload as Point
  const falta = meta != null ? Math.round(Math.abs(p.peso - meta) * 10) / 10 : null
  return (
    <div className="min-w-36 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="text-muted-foreground">
        {formatDayLabel(p.data)}, {formatShortDate(p.data)}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold">
        <span className="h-0.5 w-3 rounded-full bg-[var(--color-peso)]" aria-hidden="true" />
        {formatKg(p.peso)}
      </p>
      {p.diff != null && p.anterior && (
        <p className="mt-0.5 text-muted-foreground">
          {p.diff === 0 ? 'Igual' : `${p.diff > 0 ? '+' : ''}${kg(p.diff)} kg`} desde {formatShortDate(p.anterior)}
        </p>
      )}
      {falta != null && falta > 0 && <p className="text-muted-foreground">{kg(falta)} kg da meta</p>}
    </div>
  )
}
