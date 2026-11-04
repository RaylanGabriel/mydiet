import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Download, ExternalLink, FileText, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Tabela de Composição de Alimentos | MyDiet',
  description: 'Consulte a tabela TACO (Unicamp) e a TBCA (USP) para conferir calorias e macronutrientes.',
}

const TACO_PDF = '/docs/tabela-taco.pdf'
const TBCA_URL = 'https://www.tbca.net.br/base-dados/composicao_alimentos.php'

export default function TabelaPage() {
  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/adicionar" className="p-2 -ml-2 rounded-lg hover:bg-muted" aria-label="Voltar para adicionar refeição">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">Tabela de Alimentos</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 overflow-auto">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            Use estas tabelas oficiais para conferir os valores quando a análise por foto parecer incorreta. Os valores
            são sempre por 100 g do alimento — multiplique pela quantidade que você comeu (ex.: 150 g = valor × 1,5).
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4 text-primary" aria-hidden="true" />
                  TACO — Unicamp (PDF)
                </CardTitle>
                <CardDescription className="leading-relaxed">
                  Tabela Brasileira de Composição de Alimentos, 4ª edição revisada e ampliada. Funciona offline depois
                  de baixada.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild>
                  <a href={TACO_PDF} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    Abrir PDF
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={TACO_PDF} download="Tabela-TACO-4a-edicao.pdf">
                    <Download className="w-4 h-4" aria-hidden="true" />
                    Baixar
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="w-4 h-4 text-primary" aria-hidden="true" />
                  TBCA — USP (online)
                </CardTitle>
                <CardDescription className="leading-relaxed">
                  Base mais completa, com alimentos industrializados e preparações. A TBCA só é disponibilizada para
                  consulta online, não em PDF.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <a href={TBCA_URL} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    Pesquisar na TBCA
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>

          <section aria-labelledby="taco-preview" className="hidden md:flex flex-col gap-3">
            <h2 id="taco-preview" className="text-sm font-medium text-foreground">
              Visualizar TACO
            </h2>
            <iframe
              src={`${TACO_PDF}#view=FitH`}
              title="Tabela TACO em PDF"
              className="w-full h-[75vh] rounded-lg border border-border bg-card"
            />
          </section>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Fontes: NEPA/Unicamp — TACO 4ª ed. (2011); FoRC/USP — TBCA. Conteúdo de uso livre para consulta, com
            créditos às instituições.
          </p>
        </div>
      </main>
    </div>
  )
}
