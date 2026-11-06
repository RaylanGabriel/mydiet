'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Flag, PartyPopper, Scale, Settings2, Target, Trophy, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useWeightGoal } from '@/hooks/use-weight-goal'
import { objetivosLabel, type BodyData, type Objetivo } from '@/lib/fitness-plan'
import { formatShortDate } from '@/lib/date'
import {
  crossedMilestone,
  estimateWeeks,
  formatKg,
  formatWeeks,
  goalDirection,
  goalProgress,
  isGoalReached,
  motivationMessage,
  nextStepOptions,
  objetivoMismatch,
  remainingKg,
  validateGoal,
  type WeightGoal,
} from '@/lib/weight-goal'
import { cn } from '@/lib/utils'

interface WeightGoalCardProps {
  bodyData: BodyData
  onChangeObjetivos: (objetivos: Objetivo[]) => Promise<void>
  onEditPlan: () => void
}

interface Celebration {
  goal: WeightGoal
  pesoFinal: number
  dias: number
}

const parseKg = (value: string) => Number(value.replace(',', '.'))

export function WeightGoalCard({ bodyData, onChangeObjetivos, onEditPlan }: WeightGoalCardProps) {
  const { activeGoal, logs, conquistas, error, isLoading, createGoal, cancelGoal, completeGoal, logWeight } = useWeightGoal()
  const pesoAtual = bodyData.peso_kg

  const [metaInput, setMetaInput] = useState('')
  const [pesoInput, setPesoInput] = useState('')
  const [creating, setCreating] = useState(false)
  const [logging, setLogging] = useState(false)
  const [celebration, setCelebration] = useState<Celebration | null>(null)
  const [applying, setApplying] = useState<string | null>(null)
  const metaInputRef = useRef<HTMLInputElement>(null)
  const completingRef = useRef<string | null>(null)

  // Detecta a meta batida (seja registrando o peso aqui ou editando os dados do plano)
  useEffect(() => {
    if (!activeGoal || !isGoalReached(activeGoal, pesoAtual)) return
    if (completingRef.current === activeGoal.id) return
    completingRef.current = activeGoal.id
    const dias = Math.max(1, Math.round((Date.now() - new Date(activeGoal.criado_em).getTime()) / 86_400_000))
    completeGoal(activeGoal.id)
      .then(() => setCelebration({ goal: activeGoal, pesoFinal: pesoAtual, dias }))
      .catch(() => {
        completingRef.current = null
      })
  }, [activeGoal, pesoAtual, completeGoal])

  if (isLoading) {
    return (
      <section className="flex justify-center rounded-2xl border border-border bg-card p-6">
        <Spinner className="h-5 w-5" />
      </section>
    )
  }

  if (error) {
    return (
      <section className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
          <Target className="h-4 w-4 text-primary" aria-hidden="true" />
          Meta de peso
        </h2>
        <p className="text-sm text-muted-foreground">
          {error.name === 'MissingMigration' ? error.message : 'Não foi possível carregar sua meta agora.'}
        </p>
      </section>
    )
  }

  // ----- Formulário de nova meta -----
  const metaNum = parseKg(metaInput)
  const metaPreenchida = metaInput.trim() !== '' && Number.isFinite(metaNum)
  const validation = metaPreenchida ? validateGoal(metaNum, bodyData) : null
  const previewGoal = { peso_inicial_kg: pesoAtual, peso_meta_kg: metaNum }
  const previewDir = metaPreenchida ? goalDirection(previewGoal) : null

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validation || validation.error || creating) return
    setCreating(true)
    try {
      await createGoal(pesoAtual, Math.round(metaNum * 10) / 10)
      setMetaInput('')
      toast.success('Meta criada! Bora conquistar 💪', {
        description: `${formatKg(pesoAtual)} → ${formatKg(metaNum)}`,
      })
    } catch (err) {
      toast.error('Não foi possível criar a meta', { description: err instanceof Error ? err.message : undefined })
    } finally {
      setCreating(false)
    }
  }

  // ----- Registro de peso -----
  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault()
    const peso = parseKg(pesoInput)
    if (!Number.isFinite(peso) || peso < 30 || peso > 300) {
      toast.error('Informe um peso entre 30 e 300 kg.')
      return
    }
    if (logging) return
    setLogging(true)
    const antes = pesoAtual
    try {
      await logWeight(peso)
      setPesoInput('')
      if (activeGoal && isGoalReached(activeGoal, peso)) return // a comemoração cuida do resto
      const marco = activeGoal ? crossedMilestone(activeGoal, antes, peso) : null
      if (marco) {
        const textos = {
          25: 'Um quarto do caminho! O começo é a parte mais difícil, e você já passou por ela.',
          50: 'Metade do caminho! Daqui pra frente é ladeira abaixo. Continue assim!',
          75: 'Faltam só 25%! A linha de chegada já está à vista.',
        }
        toast.success(`🎯 ${marco}% da meta!`, { description: textos[marco], duration: 6000 })
      } else {
        const diff = Math.round((peso - antes) * 10) / 10
        toast.success('Peso registrado!', {
          description: diff === 0 ? 'Mesmo peso do último registro.' : `${diff > 0 ? '+' : ''}${diff.toString().replace('.', ',')} kg desde o último registro.`,
        })
      }
    } catch (err) {
      toast.error('Não foi possível registrar o peso', { description: err instanceof Error ? err.message : undefined })
    } finally {
      setLogging(false)
    }
  }

  // ----- Próximo passo depois da conquista -----
  const handleNextStep = async (option: ReturnType<typeof nextStepOptions>[number]) => {
    setApplying(option.id)
    try {
      if (option.objetivos) {
        await onChangeObjetivos(option.objetivos)
        toast.success('Plano atualizado!', { description: `Novo foco: ${objetivosLabel(option.objetivos)}.` })
      }
      setCelebration(null)
      if (option.novaMeta) setTimeout(() => metaInputRef.current?.focus(), 300)
    } catch {
      toast.error('Não foi possível atualizar o plano. Tente novamente.')
    } finally {
      setApplying(null)
    }
  }

  const mismatch = activeGoal ? objetivoMismatch(goalDirection(activeGoal), bodyData.objetivos) : null

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4" aria-labelledby="meta-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="meta-title" className="flex items-center gap-2 font-semibold text-card-foreground">
          <Target className="h-4 w-4 text-primary" aria-hidden="true" />
          Meta de peso
        </h2>
        {conquistas > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            {conquistas} {conquistas === 1 ? 'meta conquistada' : 'metas conquistadas'}
          </span>
        )}
      </div>

      {activeGoal ? (
        <ActiveGoal
          goal={activeGoal}
          pesoAtual={pesoAtual}
          experiencia={bodyData.experiencia_treino}
          onCancel={async () => {
            await cancelGoal(activeGoal.id)
            toast('Meta cancelada.')
          }}
        />
      ) : (
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Defina onde quer chegar. A gente acompanha seu progresso e comemora com você quando bater a meta.
          </p>
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Peso atual: {formatKg(pesoAtual)}. Quero chegar em:</span>
              <Input
                ref={metaInputRef}
                inputMode="decimal"
                placeholder={`Ex.: ${Math.round(pesoAtual - 5)}`}
                value={metaInput}
                onChange={(e) => setMetaInput(e.target.value)}
                aria-describedby="meta-preview"
              />
            </label>
            <Button type="submit" className="self-end" disabled={creating || !validation || !!validation.error}>
              {creating ? <Spinner className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
              Criar meta
            </Button>
          </div>
          <div id="meta-preview" aria-live="polite">
            {validation?.error ? (
              <p className="text-sm text-destructive">{validation.error}</p>
            ) : validation && previewDir ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-sm text-foreground">
                  {previewDir === 'perder' ? 'Perder' : 'Ganhar'} <strong>{formatKg(remainingKg(previewGoal, pesoAtual))}</strong> · previsão de{' '}
                  <strong>{formatWeeks(estimateWeeks(previewGoal, pesoAtual, bodyData.experiencia_treino))}</strong> em ritmo saudável
                </p>
                {validation.warnings.map((w) => (
                  <p key={w} className="flex gap-1.5 text-xs text-muted-foreground">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />
                    {w}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        </form>
      )}

      {mismatch && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="flex gap-2 text-foreground">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
            {mismatch.texto}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="self-start"
            onClick={() =>
              onChangeObjetivos(mismatch.sugestao)
                .then(() => toast.success('Plano ajustado!', { description: `Novo foco: ${objetivosLabel(mismatch.sugestao)}.` }))
                .catch(() => toast.error('Não foi possível ajustar o plano.'))
            }
          >
            Ajustar plano para {objetivosLabel(mismatch.sugestao)}
          </Button>
        </div>
      )}

      {/* Registro de peso */}
      <form onSubmit={handleLog} className="flex flex-col gap-2 border-t border-border pt-4">
        <span className="flex items-center gap-1.5 text-sm font-medium text-card-foreground">
          <Scale className="h-4 w-4 text-primary" aria-hidden="true" />
          Registrar peso de hoje
        </span>
        <div className="flex gap-2">
          <Input
            inputMode="decimal"
            placeholder={pesoAtual.toString().replace('.', ',')}
            value={pesoInput}
            onChange={(e) => setPesoInput(e.target.value)}
            aria-label="Peso de hoje em kg"
          />
          <Button type="submit" variant="secondary" disabled={logging || pesoInput.trim() === ''}>
            {logging && <Spinner className="h-4 w-4" />}
            Registrar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Dica: pese-se sempre no mesmo horário, de preferência ao acordar. Seu plano é recalculado com o novo peso.
        </p>

        {logs.length > 0 && (
          <ul className="mt-1 flex flex-col divide-y divide-border">
            {logs.slice(0, 5).map((log, i) => {
              const anterior = logs[i + 1]
              const diff = anterior ? Math.round((log.peso_kg - anterior.peso_kg) * 10) / 10 : null
              return (
                <li key={log.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-muted-foreground">{formatShortDate(log.data)}</span>
                  <span className="flex items-center gap-2">
                    {diff !== null && diff !== 0 && (
                      <span className={cn('flex items-center text-xs', diff < 0 ? 'text-sky-600 dark:text-sky-400' : 'text-orange-600 dark:text-orange-400')}>
                        {diff < 0 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                        {Math.abs(diff).toString().replace('.', ',')}
                      </span>
                    )}
                    <span className="font-medium text-card-foreground">{formatKg(log.peso_kg)}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </form>

      {/* Comemoração */}
      <Dialog open={!!celebration} onOpenChange={(open) => !open && !applying && setCelebration(null)}>
        {celebration && (
          <DialogContent className="max-w-sm">
            <DialogHeader className="items-center text-center">
              <span className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15">
                <PartyPopper className="h-8 w-8 text-amber-500" aria-hidden="true" />
              </span>
              <DialogTitle className="text-xl">Parabéns! Meta alcançada! 🎉</DialogTitle>
              <DialogDescription className="text-pretty">
                Você saiu de <strong>{formatKg(celebration.goal.peso_inicial_kg)}</strong> para{' '}
                <strong>{formatKg(celebration.pesoFinal)}</strong> em {celebration.dias}{' '}
                {celebration.dias === 1 ? 'dia' : 'dias'}.
              </DialogDescription>
            </DialogHeader>
            <p className="rounded-xl bg-primary/10 p-3 text-center text-sm leading-relaxed text-foreground">
              {motivationMessage(celebration.goal.id)}
            </p>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">E agora, qual é o próximo desafio?</p>
              {nextStepOptions(goalDirection(celebration.goal), bodyData.objetivos).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!!applying}
                  onClick={() => handleNextStep(opt)}
                  className="flex items-start gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-60"
                >
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-foreground">{opt.titulo}</span>
                    <span className="block text-xs text-muted-foreground">{opt.descricao}</span>
                  </span>
                  {applying === opt.id && <Spinner className="h-4 w-4" />}
                </button>
              ))}
              <Button
                variant="ghost"
                disabled={!!applying}
                onClick={() => {
                  setCelebration(null)
                  onEditPlan()
                }}
              >
                <Settings2 className="h-4 w-4" />
                Personalizar meu plano
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </section>
  )
}

function ActiveGoal({
  goal,
  pesoAtual,
  experiencia,
  onCancel,
}: {
  goal: WeightGoal
  pesoAtual: number
  experiencia: BodyData['experiencia_treino']
  onCancel: () => Promise<void>
}) {
  const progresso = goalProgress(goal, pesoAtual)
  const pct = Math.round(progresso * 100)
  const restante = remainingKg(goal, pesoAtual)
  const dir = goalDirection(goal)
  const semanas = estimateWeeks(goal, pesoAtual, experiencia)
  const foiNaDirecaoErrada = dir === 'perder' ? pesoAtual > goal.peso_inicial_kg : pesoAtual < goal.peso_inicial_kg

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            {dir === 'perder' ? 'Perder' : 'Ganhar'} {formatKg(Math.abs(goal.peso_meta_kg - goal.peso_inicial_kg))}
          </p>
          <p className="text-2xl font-bold tracking-tight text-card-foreground">
            {formatKg(pesoAtual)} <span className="text-base font-medium text-muted-foreground">→ {formatKg(goal.peso_meta_kg)}</span>
          </p>
        </div>
        <p className="text-right text-sm">
          <span className="block text-lg font-bold text-primary">{pct}%</span>
          <span className="text-xs text-muted-foreground">do caminho</span>
        </p>
      </div>

      <div className="relative h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da meta">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.max(pct, 2)}%` }} />
        {[25, 50, 75].map((m) => (
          <span key={m} className="absolute top-0 h-full w-px bg-background/70" style={{ left: `${m}%` }} aria-hidden="true" />
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Início: {formatKg(goal.peso_inicial_kg)}</span>
        <span>
          Faltam <strong className="text-foreground">{formatKg(restante)}</strong> · {formatWeeks(semanas)}
        </span>
      </div>

      {foiNaDirecaoErrada && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          O peso oscila de um dia para o outro (água, sal, intestino). Olhe a tendência das últimas semanas, não um dia isolado.
        </p>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button type="button" className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline">
            Cancelar meta
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Seu histórico de pesagens continua salvo. Você pode criar uma nova meta quando quiser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter meta</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onCancel().catch(() => toast.error('Não foi possível cancelar a meta.'))}
            >
              Cancelar meta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
