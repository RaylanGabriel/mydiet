ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS cargas_por_serie JSONB;
