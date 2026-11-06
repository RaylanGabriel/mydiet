-- Quantidade de agua (ml) adicionada a cada toque no contador da tela inicial.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agua_por_copo_ml INTEGER NOT NULL DEFAULT 250;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_agua_por_copo_ml_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_agua_por_copo_ml_check
  CHECK (agua_por_copo_ml BETWEEN 50 AND 2000);
