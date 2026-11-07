# 🌿 MyDiet

**Controle de dieta e treinos em um só app, com análise de refeições por foto usando IA.**

Web app mobile-first em português, instalável como aplicativo no Android e no iPhone, feito para uso próprio e de amigos e testado em celulares reais.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20Postgres-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor&logoColor=white)](https://capacitorjs.com)

**[🔗 Acessar o app](https://controle-dieta.vercel.app)**

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/foto.png" width="200" alt="IA identificando arroz, feijão e frango em uma foto, com porções, calorias e macronutrientes"><br><b>Refeição analisada por foto</b></td>
    <td align="center"><img src="docs/screenshots/treino.gif" width="200" alt="Registro de séries com detecção de recorde, cronômetro de descanso e resumo do treino"><br><b>Treino com recordes em tempo real</b></td>
    <td align="center"><img src="docs/screenshots/painel.png" width="200" alt="Painel diário com calorias, macronutrientes, água e refeições"><br><b>Painel do dia</b></td>
    <td align="center"><img src="docs/screenshots/resumo.png" width="200" alt="Resumo do treino com duração, volume, evolução e recordes pessoais"><br><b>Resumo e evolução</b></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/busca.png" width="200" alt="Busca de alimentos com calorias e macronutrientes por 100 gramas"><br><b>Busca de alimentos</b></td>
    <td align="center"><img src="docs/screenshots/plano.png" width="200" alt="Dieta sugerida com calorias, macronutrientes e distribuição nas refeições"><br><b>Plano calculado</b></td>
    <td align="center"><img src="docs/screenshots/temas.gif" width="200" alt="Troca entre as cinco cores do app e entre os modos claro e escuro"><br><b>Temas personalizáveis</b></td>
  </tr>
</table>

<sub>Imagens de uma conta de demonstração, com dados de exemplo.</sub>

---

## Sobre o projeto

Criei o MyDiet para resolver um problema meu: acompanhar alimentação e academia sem depender de vários apps diferentes. O projeto cobre o ciclo completo de um produto: da modelagem do banco e da integração com IA até a publicação e os testes em celulares reais.

## Funcionalidades

### 🍽️ Dieta
- **Análise de refeição por foto:** a IA estima porção, calorias e macronutrientes
- **Busca de alimentos** com autocomplete, combinando Open Food Facts, FatSecret e IA
- Valores priorizando as tabelas brasileiras **TACO** e **TBCA**
- Painel diário com calorias, macros, hidratação e histórico por dia

### 🏋️ Treinos
- Criação de treinos com dias da semana, capa, cargas por série e vídeos de execução
- **Modo de execução** com cronômetro de descanso e troca de exercício durante o treino
- Registro por tipo de exercício: carga, peso corporal, tempo e cardio
- **Detecção de recordes** de carga, repetições, tempo e 1RM estimado
- Resumo final com volume total, comparação com o treino anterior e calendário de histórico

### 🎯 Plano e personalização
- Plano nutricional e de treino calculado a partir dos dados corporais, com um ou mais objetivos
- Metas de peso com gráfico de evolução
- Modo claro e escuro, com 5 cores de tema

## Stack

| Camada | Tecnologias |
|---|---|
| **Front-end** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Recharts |
| **Dados** | SWR, Zod, React Hook Form, Fuse.js |
| **Back-end** | Route Handlers, Server Actions, Supabase (Auth, Postgres, Storage) |
| **IA** | Google Gemini, com fallback para modelos via OpenRouter |
| **Mobile** | Capacitor 8 (Android) e PWA (iPhone) |
| **Infra** | Vercel, com deploy contínuo a partir da `main` |

## Arquitetura

```mermaid
flowchart LR
    A["App Android<br/>(Capacitor)"] --> W
    I["iPhone<br/>(PWA)"] --> W
    B["Navegador"] --> W
    W["Next.js na Vercel"]
    W -->|"Rotas de API<br/>com segredos"| G["Gemini e OpenRouter"]
    W -->|"Rotas de API<br/>com segredos"| F["Open Food Facts<br/>e FatSecret"]
    W -->|"Sessão no servidor"| S[("Supabase")]
    W -.->|"Hooks SWR no cliente<br/>protegidos por RLS"| S
```

As páginas falam direto com o Supabase por meio de hooks SWR, e a segurança dos dados fica no **Row Level Security** do Postgres. As rotas de API existem só para o que depende de segredos do servidor, como IA e fontes externas de alimentos.

## Desafios técnicos

**IA resiliente com serviços gratuitos.** Provedores gratuitos falham, atrasam e têm cota diária. Por isso, a análise percorre uma lista de tentativas, com timeout por modelo e um orçamento total abaixo do limite da função serverless. O OpenRouter fica por último porque até as falhas contam no limite diário. As respostas passam por validação com Zod, já que alguns modelos devolvem números como texto.

**Dados de alimentos confiáveis.** Cada fonte usa um formato diferente e bases abertas têm erros. Todos os alimentos são normalizados para 100 g ou 100 ml e descartados quando as calorias informadas não batem com os macronutrientes.

**Autenticação em três camadas.** O middleware valida o JWT localmente, sem ida à rede a cada requisição, e renova a sessão. O layout valida de novo no servidor, e o RLS protege os dados no banco.

**Um site, três formas de uso.** Publicar sem lojas exigiu tratar diferenças de cada plataforma: o app Android carrega o site em uma WebView nativa com Capacitor, então cada deploy atualiza o app sem novo APK. Na prática, isso incluiu corrigir conteúdo atrás da barra de status com as áreas seguras do sistema, o botão voltar do Android e um manifest que respondia localmente, mas dava 404 em produção.

**Treino sem risco de perder dados.** O progresso fica salvo no aparelho a cada série e só é enviado ao banco ao concluir, então fechar o app no meio do treino não apaga o que foi registrado.

**Datas no fuso local.** `toISOString()` usa UTC e, no Brasil, retorna o dia seguinte depois das 21h. Um módulo próprio garante que as refeições fiquem no dia certo.

## Como rodar

Pré-requisitos: Node.js 22+, pnpm e um projeto no Supabase.

```bash
git clone https://github.com/RaylanGabriel/mydiet.git
cd mydiet
pnpm install
```

Crie um arquivo `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
FATSECRET_CLIENT_ID=
FATSECRET_CLIENT_SECRET=
```

Execute os arquivos de `scripts/` em ordem no SQL Editor do Supabase e inicie com `pnpm dev`. Os scripts ainda não cobrem todas as tabelas: as de treinos, água e alimentos comuns não têm `CREATE TABLE` versionado.

## Estrutura

```text
app/          Rotas, páginas e rotas de API
components/   Componentes da interface, de treinos e do plano
hooks/        Leitura e escrita de dados com SWR
lib/          Regras de negócio, cálculos e integrações
scripts/      Migrações SQL numeradas
android/      Projeto nativo do Capacitor
```

## Próximos passos

- [ ] Testes automatizados nas regras de negócio
- [ ] Recuperação de senha por e-mail
- [ ] Script completo para recriar o banco do zero
- [ ] Modo offline para os treinos

## Autor

Feito por **Raylan Miranda** · [LinkedIn](https://www.linkedin.com/in/raylan-miranda/) · [GitHub](https://github.com/RaylanGabriel)

Desenvolvido com apoio de ferramentas de IA, como v0 e Claude Code.
