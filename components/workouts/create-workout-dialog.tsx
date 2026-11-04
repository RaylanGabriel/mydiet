'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { DaysOfWeekPicker } from '@/components/workouts/days-of-week-picker'

interface CreateWorkoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  suggestedName: string
  onCreate: (input: { nome: string; descricao?: string; dias_semana: number[] }) => Promise<void>
}

export function CreateWorkoutDialog({ open, onOpenChange, suggestedName, onCreate }: CreateWorkoutDialogProps) {
  const [nome, setNome] = useState(suggestedName)
  const [descricao, setDescricao] = useState('')
  const [dias, setDias] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setNome(suggestedName)
      setDescricao('')
      setDias([])
      setError(null)
    }
  }, [open, suggestedName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onCreate({ nome: nome.trim(), descricao: descricao.trim(), dias_semana: dias })
    } catch {
      setError('Não foi possível criar o treino.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Novo treino</DialogTitle>
            <DialogDescription>Depois você adiciona os exercícios.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="workout-nome">Nome</Label>
            <Input id="workout-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="workout-desc">Foco (opcional)</Label>
            <Textarea
              id="workout-desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Peito, ombro e tríceps"
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Dias da semana</span>
            <DaysOfWeekPicker value={dias} onChange={setDias} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" className="w-full" disabled={saving || !nome.trim()}>
              {saving && <Spinner className="h-4 w-4" />}
              Criar treino
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
