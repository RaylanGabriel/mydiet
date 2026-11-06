import type { Exercise } from './workout-types'
import { exerciseKind } from './exercise-kind'

const normalize = (s: string | null | undefined) =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** Nome "base" sem parênteses: "Voador (peck deck)" → "voador" */
const baseName = (nome: string) => normalize(nome.replace(/\([^)]*\)/g, ''))

/** "Extensora na polia (substitui cadeira extensora)" → "cadeira extensora" */
function substitutedName(ex: Pick<Exercise, 'nome'>) {
  const match = normalize(ex.nome).match(/substitui ([^)]+)/)
  return match ? match[1].trim() : null
}

export interface Alternative {
  exercise: Exercise
  /** Substituto direto (improviso para esta máquina, ou a máquina deste improviso) */
  direto: boolean
  /** Equipamento diferente do original: útil quando o aparelho está ocupado */
  outroEquipamento: boolean
}

/**
 * Exercícios que podem substituir `original`, do melhor para o pior:
 * 1. substitutos diretos ("Extensora na polia (substitui cadeira extensora)" ↔ "Cadeira extensora")
 * 2. mesmo grupo muscular e mesmo tipo de registro, com outro equipamento
 * 3. demais exercícios do mesmo grupo
 */
export function findAlternatives(original: Exercise, library: Exercise[], excludeIds: string[] = []): Alternative[] {
  const exclude = new Set([original.id, ...excludeIds])
  const originalBase = baseName(original.nome)
  const originalSubstitui = substitutedName(original)
  const originalKind = exerciseKind(original)
  const originalEquip = normalize(original.equipamento)

  return library
    .filter((ex) => !exclude.has(ex.id) && ex.grupo_muscular === original.grupo_muscular)
    .map((ex) => {
      const substitui = substitutedName(ex)
      const texto = normalize(`${ex.nome} ${ex.instrucoes ?? ''}`)
      const direto =
        (substitui != null && (originalBase.includes(substitui) || substitui.includes(originalBase))) ||
        (originalSubstitui != null && (baseName(ex.nome).includes(originalSubstitui) || originalSubstitui.includes(baseName(ex.nome)))) ||
        (originalBase.length > 4 && texto.includes(`substitui ${originalBase}`))
      const outroEquipamento = normalize(ex.equipamento) !== originalEquip
      const mesmoTipo = exerciseKind(ex) === originalKind
      const score = (direto ? 100 : 0) + (mesmoTipo ? 20 : 0) + (outroEquipamento ? 10 : 0) + (ex.user_id ? 1 : 0)
      return { exercise: ex, direto, outroEquipamento, score }
    })
    .sort((a, b) => b.score - a.score || a.exercise.nome.localeCompare(b.exercise.nome, 'pt-BR'))
    .map(({ exercise, direto, outroEquipamento }) => ({ exercise, direto, outroEquipamento }))
}
