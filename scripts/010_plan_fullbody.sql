-- Permite marcar no plano que a pessoa prefere treinar full body (corpo inteiro em todas as sessões).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS prefere_fullbody BOOLEAN NOT NULL DEFAULT FALSE;
