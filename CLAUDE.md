# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão geral

MyDiet é um PWA mobile-first, em português do Brasil, para controle de dieta e treinos. Stack: Next.js 16 (App Router), React 19, Supabase (auth e Postgres), SWR, Tailwind 4 e shadcn/ui.

O repositório está ligado a um projeto no v0, que pode enviar commits direto para `main`. Todo merge em `main` faz deploy automático, então um push em `main` já vai para produção.

## Comandos

O gerenciador de pacotes é o pnpm (`pnpm-lock.yaml`).

```bash
pnpm dev                 # servidor em http://localhost:3000
pnpm build               # build de produção
pnpm exec tsc --noEmit   # checagem de tipos
```

- `next.config.mjs` usa `ignoreBuildErrors: true`, então `pnpm build` **não** detecta erros de tipo. Rode o `tsc` para validar.
- `pnpm lint` existe no `package.json`, mas o ESLint não está instalado nem configurado.
- Não há framework de testes. Para validar uma mudança, use o `tsc` e rode o app.

As variáveis de ambiente ficam em `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `FATSECRET_CLIENT_ID`, `FATSECRET_CLIENT_SECRET`, `NEXT_PUBLIC_SITE_URL` e `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL`.

## Arquitetura

### Autenticação

São três camadas, e o modelo só funciona com as três:

1. `proxy.ts` (o middleware do Next 16) chama `lib/supabase/proxy.ts`, que valida o JWT localmente com `getClaims()`, renova a sessão e redireciona entre `/auth/*`, `/` e `/dashboard`.
2. `app/(app)/layout.tsx` valida de novo no servidor.
3. O RLS do Postgres protege os dados de fato.

No navegador, use `getUserId()` de `lib/supabase/get-user-id.ts`, que lê a sessão local sem ida à rede. Rotas de API checam `getClaims()` por conta própria e retornam 401.

O cadastro (`app/auth/cadastro/actions.ts`) é a exceção: é uma server action que usa a service role para criar o usuário já com email confirmado, com rate limit por IP.

Existem dois clientes Supabase: `lib/supabase/client.ts` (navegador) e `lib/supabase/server.ts` (servidor).

### Acesso a dados

Não há camada de API para o CRUD. As páginas são client components que falam direto com o Supabase por meio dos hooks SWR em `hooks/` (`use-meals`, `use-workouts`, `use-profile`, `use-weight-goal`), e a segurança depende do RLS. Coloque leituras e mutações novas nesses hooks. As chaves SWR são arrays, como `['meals', date]`. Depois de uma mutação, chame `mutate` para revalidar, e use o `mutate` global quando a chave tiver parâmetros (veja `revalidateMonthSessions` em `use-workouts.ts`).

As rotas em `app/api/` existem só para o que precisa de segredos do servidor: IA e fontes externas de alimentos.

### Banco de dados

Os nomes de tabelas e colunas são em português (`calorias`, `ordem`, `iniciado_em`). Os tipos são escritos à mão em `lib/types.ts` e `lib/workout-types.ts`, então atualize-os junto com o schema.

As migrações são arquivos SQL numerados em `scripts/`, executados à mão e em ordem no SQL Editor do Supabase. Não há ferramenta de migração. Escreva scripts novos de forma idempotente (`IF NOT EXISTS`) e com a numeração seguinte. Depois de criar um script, avise que ele precisa ser executado antes do deploy.

`scripts/` não é o schema completo: `workouts`, `exercises`, `workout_exercises`, `workout_sessions`, `session_sets`, `water_intake` e `common_foods` são usadas pelo código, mas não têm `CREATE TABLE` em nenhum script.

### IA e alimentos

- `app/api/analyze-food` (foto para macros) e `app/api/foods/ai` (nome para macros) percorrem uma lista de tentativas: Gemini primeiro, OpenRouter (modelos gratuitos) como fallback. Há um orçamento de tempo total abaixo do `maxDuration` da rota. O OpenRouter vem depois porque o limite diário gratuito conta também as falhas.
- As respostas são validadas com zod usando `z.coerce.number()`, porque alguns modelos devolvem números como string. Os prompts priorizam TACO e TBCA.
- `lib/food-sources.ts` é só de servidor e integra Open Food Facts e FatSecret. Os alimentos são sempre normalizados para 100 g ou 100 ml e filtrados por `isPlausible` (calorias precisam bater com os macros). O cache é em memória, por instância.

### Treinos

- `exerciseKind()` em `lib/exercise-kind.ts` define como cada exercício é registrado (`carga`, `peso_corporal`, `tempo` ou `cardio`). O tipo é **inferido do nome e do equipamento por regex**, não vem de uma coluna. Exercícios novos com nomes fora dos padrões podem cair no tipo errado.
- `workout_exercises` guarda o alvo; `session_sets` guarda o que foi feito.
- `lib/fitness-plan.ts` calcula o plano nutricional e de treino a partir dos dados corporais.

### Temas e PWA

- A cor do tema (`lib/theme-colors.ts`) fica no localStorage e também em um cookie, porque `app/app-manifest/route.ts` gera o manifest no servidor com essa cor.
- `public/sw.js` é um service worker sem cache: ele existe só para o app poder ser instalado.

## Convenções

- Os textos da interface são em português.
- Datas: use `lib/date.ts`. Nunca use `toISOString().split('T')[0]`, que usa UTC e, no Brasil, retorna o dia seguinte depois das 21h. Datas de calendário são strings `YYYY-MM-DD` no fuso local.
- `app/globals.css` é o CSS em uso; `styles/globals.css` não é importado.
- `components/ui/` são componentes gerados pelo shadcn/ui.
