'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  EXPERIENCIA_OPTIONS,
  NIVEL_ATIVIDADE_OPTIONS,
  OBJETIVO_OPTIONS,
  describeCombination,
  toggleObjetivo,
  type BodyData,
  type Experiencia,
  type NivelAtividade,
  type Objetivo,
  type Sexo,
} from '@/lib/fitness-plan'
import type { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

interface BodyDataFormProps {
  initial: Profile | null
  onSubmit: (data: BodyData) => Promise<void>
  onCancel?: () => void
}

function OptionButton({
  selected,
  onClick,
  title,
  description,
  multiple = false,
}: {
  selected: boolean
  onClick: () => void
  title: string
  description?: string
  /** Mostra uma caixa de seleção para indicar escolha múltipla */
  multiple?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'relative flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-colors',
        multiple && 'pr-8',
        selected
          ? 'border-primary bg-primary/10 text-foreground'
          : 'border-border bg-card text-card-foreground hover:border-muted-foreground/40',
      )}
    >
      <span className="text-sm font-semibold">{title}</span>
      {description && <span className="text-xs text-muted-foreground">{description}</span>}
      {multiple && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded border',
            selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
          )}
        >
          {selected && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
      )}
    </button>
  )
}

export function BodyDataForm({ initial, onSubmit, onCancel }: BodyDataFormProps) {
  const [sexo, setSexo] = useState<Sexo | null>(initial?.sexo ?? null)
  const [idade, setIdade] = useState(initial?.idade?.toString() ?? '')
  const [altura, setAltura] = useState(initial?.altura_cm?.toString() ?? '')
  const [peso, setPeso] = useState(initial?.peso_kg?.toString() ?? '')
  const [nivel, setNivel] = useState<NivelAtividade | null>(initial?.nivel_atividade ?? null)
  const [objetivos, setObjetivos] = useState<Objetivo[]>(
    initial?.objetivos?.length ? initial.objetivos : initial?.objetivo ? [initial.objetivo] : [],
  )
  const combinacao = describeCombination(objetivos)
  const [experiencia, setExperiencia] = useState<Experiencia | null>(initial?.experiencia_treino ?? null)
  const [dias, setDias] = useState<number | null>(initial?.dias_treino_semana ?? null)
  const [fullbody, setFullbody] = useState(initial?.prefere_fullbody === true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const idadeN = Number(idade)
    const alturaN = Number(altura)
    const pesoN = Number(peso.replace(',', '.'))

    if (!sexo || !nivel || objetivos.length === 0 || !experiencia || !dias) {
      setError('Preencha todos os campos para gerar seu plano.')
      return
    }
    if (!Number.isInteger(idadeN) || idadeN < 12 || idadeN > 100) {
      setError('Informe uma idade entre 12 e 100 anos.')
      return
    }
    if (!Number.isInteger(alturaN) || alturaN < 100 || alturaN > 250) {
      setError('Informe a altura em centímetros (entre 100 e 250).')
      return
    }
    if (!Number.isFinite(pesoN) || pesoN < 30 || pesoN > 300) {
      setError('Informe um peso entre 30 e 300 kg.')
      return
    }

    setSaving(true)
    try {
      await onSubmit({
        sexo,
        idade: idadeN,
        altura_cm: alturaN,
        peso_kg: Math.round(pesoN * 10) / 10,
        nivel_atividade: nivel,
        objetivos,
        experiencia_treino: experiencia,
        dias_treino_semana: dias,
        prefere_fullbody: fullbody,
      })
    } catch (err) {
      setError(
        err instanceof Error && err.name === 'PlanSaveError'
          ? err.message
          : 'Não foi possível salvar seus dados. Tente novamente.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-foreground">Sexo biológico</legend>
        <div className="grid grid-cols-2 gap-2">
          <OptionButton selected={sexo === 'masculino'} onClick={() => setSexo('masculino')} title="Masculino" />
          <OptionButton selected={sexo === 'feminino'} onClick={() => setSexo('feminino')} title="Feminino" />
        </div>
      </fieldset>

      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Idade</span>
          <Input inputMode="numeric" placeholder="25" value={idade} onChange={(e) => setIdade(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Altura (cm)</span>
          <Input inputMode="numeric" placeholder="180" value={altura} onChange={(e) => setAltura(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Peso (kg)</span>
          <Input inputMode="decimal" placeholder="85" value={peso} onChange={(e) => setPeso(e.target.value)} />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-foreground">O que você deseja?</legend>
        <p className="mb-2 text-xs text-muted-foreground">
          Escolha um ou mais. &quot;Manter&quot; não combina com emagrecer ou ganhar massa.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {OBJETIVO_OPTIONS.map((o) => (
            <OptionButton
              key={o.value}
              selected={objetivos.includes(o.value)}
              onClick={() => setObjetivos((prev) => toggleObjetivo(prev, o.value))}
              title={o.label}
              description={o.description}
              multiple
            />
          ))}
        </div>
        {combinacao && (
          <p className="mt-1 rounded-lg bg-primary/10 px-3 py-2 text-xs leading-relaxed text-foreground" aria-live="polite">
            {combinacao}
          </p>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-foreground">Nível de atividade no dia a dia</legend>
        <div className="flex flex-col gap-2">
          {NIVEL_ATIVIDADE_OPTIONS.map((o) => (
            <OptionButton
              key={o.value}
              selected={nivel === o.value}
              onClick={() => setNivel(o.value)}
              title={o.label}
              description={o.description}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-foreground">Experiência com musculação</legend>
        <div className="grid grid-cols-3 gap-2">
          {EXPERIENCIA_OPTIONS.map((o) => (
            <OptionButton
              key={o.value}
              selected={experiencia === o.value}
              onClick={() => setExperiencia(o.value)}
              title={o.label}
              description={o.description}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-foreground">Quantos dias por semana pode treinar?</legend>
        <div className="grid grid-cols-7 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setDias(n)}
              aria-pressed={dias === n}
              aria-label={`${n} ${n === 1 ? 'dia' : 'dias'}`}
              className={cn(
                'flex h-11 items-center justify-center rounded-xl border text-sm font-semibold transition-colors',
                dias === n
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-card-foreground hover:border-muted-foreground/40',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-foreground">Tipo de treino</legend>
        <OptionButton
          selected={fullbody}
          onClick={() => setFullbody((v) => !v)}
          title="Quero treinar full body"
          description="Todos os treinos trabalham o corpo inteiro, nos dias que você escolheu acima"
          multiple
        />
      </fieldset>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving && <Spinner className="h-4 w-4" />}
          Gerar meu plano
        </Button>
      </div>
    </form>
  )
}
