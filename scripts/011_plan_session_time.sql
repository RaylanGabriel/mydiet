-- Tempo disponível por treino (em minutos). O plano usa para gerar sessões que caibam na rotina.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tempo_treino_min SMALLINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_tempo_treino_min_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_tempo_treino_min_check
      CHECK (tempo_treino_min IS NULL OR tempo_treino_min BETWEEN 15 AND 240);
  END IF;
END $$;
