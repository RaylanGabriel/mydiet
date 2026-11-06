-- Metas de peso e histórico de pesagens.

-- Histórico de pesagens (uma por dia; registrar de novo no mesmo dia substitui)
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  peso_kg NUMERIC(5,1) NOT NULL CHECK (peso_kg BETWEEN 30 AND 300),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, data)
);

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weight_logs_select_own" ON public.weight_logs;
DROP POLICY IF EXISTS "weight_logs_insert_own" ON public.weight_logs;
DROP POLICY IF EXISTS "weight_logs_update_own" ON public.weight_logs;
DROP POLICY IF EXISTS "weight_logs_delete_own" ON public.weight_logs;
CREATE POLICY "weight_logs_select_own" ON public.weight_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "weight_logs_insert_own" ON public.weight_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weight_logs_update_own" ON public.weight_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "weight_logs_delete_own" ON public.weight_logs FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON public.weight_logs(user_id, data DESC);

-- Metas de peso. Só uma meta "ativa" por usuário; as concluídas ficam como histórico de conquistas.
CREATE TABLE IF NOT EXISTS public.weight_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  peso_inicial_kg NUMERIC(5,1) NOT NULL CHECK (peso_inicial_kg BETWEEN 30 AND 300),
  peso_meta_kg NUMERIC(5,1) NOT NULL CHECK (peso_meta_kg BETWEEN 30 AND 300),
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'concluida', 'cancelada')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  concluido_em TIMESTAMPTZ,
  CHECK (peso_meta_kg <> peso_inicial_kg)
);

ALTER TABLE public.weight_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weight_goals_select_own" ON public.weight_goals;
DROP POLICY IF EXISTS "weight_goals_insert_own" ON public.weight_goals;
DROP POLICY IF EXISTS "weight_goals_update_own" ON public.weight_goals;
DROP POLICY IF EXISTS "weight_goals_delete_own" ON public.weight_goals;
CREATE POLICY "weight_goals_select_own" ON public.weight_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "weight_goals_insert_own" ON public.weight_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weight_goals_update_own" ON public.weight_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "weight_goals_delete_own" ON public.weight_goals FOR DELETE USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_weight_goals_one_active
  ON public.weight_goals(user_id) WHERE status = 'ativa';
