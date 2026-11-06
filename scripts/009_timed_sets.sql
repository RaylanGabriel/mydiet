-- Exercícios por tempo (prancha, isometrias): segundos sustentados em cada série.
ALTER TABLE public.session_sets
  ADD COLUMN IF NOT EXISTS duracao_seg INTEGER CHECK (duracao_seg IS NULL OR duracao_seg BETWEEN 0 AND 3600);
