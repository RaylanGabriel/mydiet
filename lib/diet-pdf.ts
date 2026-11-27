'use client'

// Importado inteiro sob demanda pelo card do cardápio (que pré-carrega este
// módulo), então o jsPDF não pesa no carregamento inicial do app.
import { jsPDF } from 'jspdf'
import { Capacitor } from '@capacitor/core'
import { COLOR_THEMES, DEFAULT_COLOR } from './theme-colors'
import { toLocalDateString } from './date'
import { PAPEL_LABEL, mealTotals, selectedPortion, sumMacros, type PlannedMeal, type SwapSelection } from './meal-plan'

interface DietPdfInput {
  meals: PlannedMeal[]
  sel: SwapSelection
  calorias: number
  proteina_g: number
  carboidratos_g: number
  gordura_g: number
  agua_ml: number
  estrategia: string
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR')

/**
 * Gera o PDF do cardápio (sugestão escolhida + todas as trocas). É síncrono de
 * propósito: no iPhone, o compartilhamento só abre se for chamado logo depois
 * do toque, sem esperas no meio.
 */
export function buildDietPdf(input: DietPdfInput): { blob: Blob; fileName: string } {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const colorId = document.documentElement.getAttribute('data-color') ?? DEFAULT_COLOR
  const theme = COLOR_THEMES.find((t) => t.id === colorId) ?? COLOR_THEMES[0]
  const accent = hexToRgb(theme.swatch.light)
  const onAccent: [number, number, number] = theme.id === 'amarelo' ? [40, 30, 10] : [255, 255, 255]
  const ink: [number, number, number] = [28, 28, 30]
  const muted: [number, number, number] = [110, 110, 118]
  const line: [number, number, number] = [226, 226, 230]

  const W = 210
  const H = 297
  const M = 14
  const contentW = W - M * 2
  let y = 0

  const today = new Date()
  const dataBr = today.toLocaleDateString('pt-BR')

  const footer = () => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...muted)
    doc.text(
      'Sugestão gerada pelo MyDiet a partir dos seus dados. Não substitui a orientação de um nutricionista.',
      M,
      H - 8,
    )
    doc.text(`Página ${doc.getNumberOfPages()}`, W - M, H - 8, { align: 'right' })
  }

  const newPage = () => {
    footer()
    doc.addPage()
    y = M
  }

  const ensure = (h: number) => {
    if (y + h > H - 16) newPage()
  }

  // Cabeçalho
  doc.setFillColor(...accent)
  doc.rect(0, 0, W, 38, 'F')
  doc.setTextColor(...onAccent)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('Meu cardápio', M, 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`${input.estrategia} · gerado em ${dataBr}`, M, 23)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(
    `${fmt(input.calorias)} kcal/dia   ·   Proteína ${input.proteina_g} g   ·   Carboidratos ${input.carboidratos_g} g   ·   Gorduras ${input.gordura_g} g   ·   Água ${(input.agua_ml / 1000).toFixed(2).replace('.', ',')} L`,
    M,
    31,
  )
  y = 46

  doc.setTextColor(...muted)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  const dica = doc.splitTextToSize(
    'Pese os alimentos já prontos (cozidos, grelhados ou assados). Cada alimento pode ser trocado por uma das opções listadas abaixo dele, na quantidade indicada.',
    contentW,
  )
  doc.text(dica, M, y)
  y += dica.length * 4 + 4

  for (const meal of input.meals) {
    const total = mealTotals(meal, input.sel)

    // Calcula a altura do bloco para não quebrar a refeição no meio
    doc.setFontSize(10)
    const blocos = meal.itens.map((it) => {
      const principal = it.livre ? it.livre.texto : (selectedPortion(it, input.sel)?.texto ?? '')
      const escolhida = selectedPortion(it, input.sel)
      const trocas = it.livre
        ? it.livre.detalhe
          ? [it.livre.detalhe]
          : []
        : it.opcoes.filter((o) => o !== escolhida).map((o) => o.texto)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      const linhasPrincipal = doc.splitTextToSize(principal, contentW - 40)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      const trocaTxt = trocas.length === 0 ? [] : doc.splitTextToSize(it.livre ? trocas[0] : `Troca: ${trocas.join('  •  ')}`, contentW - 40)
      return { it, linhasPrincipal, trocaTxt, h: linhasPrincipal.length * 4.6 + trocaTxt.length * 3.9 + 3.5 }
    })
    const alturaBloco = 13 + blocos.reduce((s, b) => s + b.h, 0) + 2
    ensure(Math.min(alturaBloco, H - 40))

    // Título da refeição
    doc.setFillColor(...accent)
    doc.roundedRect(M, y, 15, 7, 1.5, 1.5, 'F')
    doc.setTextColor(...onAccent)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text(meal.horario, M + 7.5, y + 4.8, { align: 'center' })
    doc.setTextColor(...ink)
    doc.setFontSize(12.5)
    doc.text(meal.nome, M + 18, y + 5.2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...muted)
    doc.text(
      `${fmt(total.kcal)} kcal  ·  P ${fmt(total.p)} g  ·  C ${fmt(total.c)} g  ·  G ${fmt(total.g)} g`,
      W - M,
      y + 5,
      { align: 'right' },
    )
    y += 10
    doc.setDrawColor(...line)
    doc.setLineWidth(0.3)
    doc.line(M, y, W - M, y)
    y += 4

    for (const b of blocos) {
      ensure(b.h)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...accent.map((c) => (theme.id === 'amarelo' ? Math.round(c * 0.6) : c)) as [number, number, number])
      doc.text(PAPEL_LABEL[b.it.papel].toUpperCase(), M, y + 3)
      doc.setFontSize(10)
      doc.setTextColor(...ink)
      doc.text(b.linhasPrincipal, M + 30, y + 3)
      let yy = y + 3 + b.linhasPrincipal.length * 4.6
      if (b.trocaTxt.length) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(...muted)
        doc.text(b.trocaTxt, M + 30, yy - 0.6)
        yy += b.trocaTxt.length * 3.9
      }
      y = yy + 0.5
    }
    y += 5
  }

  // Resumo final
  const dia = sumMacros(input.meals.map((m) => mealTotals(m, input.sel)))
  ensure(14)
  doc.setFillColor(244, 244, 246)
  doc.roundedRect(M, y, contentW, 11, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...ink)
  doc.text(
    `Total do cardápio: ${fmt(dia.kcal)} kcal  ·  Proteína ${fmt(dia.p)} g  ·  Carboidratos ${fmt(dia.c)} g  ·  Gorduras ${fmt(dia.g)} g`,
    W / 2,
    y + 7,
    { align: 'center' },
  )
  footer()

  return { blob: doc.output('blob'), fileName: `cardapio-mydiet-${toLocalDateString(today)}.pdf` }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/**
 * Entrega o PDF. No app Android (WebView do Capacitor) o download de blob não
 * funciona, então o arquivo é salvo no cache e aberto no compartilhamento do
 * sistema. No celular pelo navegador usa o compartilhamento nativo quando há;
 * no computador baixa direto.
 */
export async function deliverPdf(blob: Blob, fileName: string): Promise<void> {
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Filesystem') && Capacitor.isPluginAvailable('Share')) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')])
    const { uri } = await Filesystem.writeFile({ path: fileName, data: await blobToBase64(blob), directory: Directory.Cache })
    await Share.share({ title: 'Meu cardápio', files: [uri] })
    return
  }

  const file = new File([blob], fileName, { type: 'application/pdf' })
  const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  if (isTouch && navigator.canShare?.({ files: [file] })) {
    try {
      // Primeira espera da função: mantém o "toque" válido para o Safari
      await navigator.share({ files: [file], title: 'Meu cardápio' })
      return
    } catch (e) {
      // Cancelado pela pessoa: não baixa. Outros erros (ex.: toque expirado): cai no download
      if ((e as Error).name === 'AbortError') return
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
