-- Permite escolher mais de um objetivo no plano (ex.: emagrecer + ganhar massa).
-- A coluna antiga `objetivo` continua existindo e guarda o objetivo principal.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS objetivos TEXT[];

UPDATE public.profiles
SET objetivos = ARRAY[objetivo]
WHERE objetivos IS NULL AND objetivo IS NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_objetivos_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_objetivos_check
  CHECK (objetivos IS NULL OR objetivos <@ ARRAY['emagrecer', 'ganhar_massa', 'manter', 'condicionamento']::TEXT[]);

-- Garante que todos os exercícios sugeridos pelo plano existam na biblioteca global.
-- Só insere os que ainda não existem (pode rodar mais de uma vez).
-- Lista espelhada de PLAN_EXERCISE_CATALOG em lib/fitness-plan.ts.
INSERT INTO public.exercises (user_id, nome, grupo_muscular, equipamento)
SELECT NULL, v.nome, v.grupo, v.equipamento
FROM (VALUES
  ('Supino reto com barra', 'Peito', 'Barra'),
  ('Supino inclinado com halteres', 'Peito', 'Halteres'),
  ('Supino máquina', 'Peito', 'Máquina'),
  ('Crossover na polia', 'Peito', 'Polia'),
  ('Flexão de braço', 'Peito', 'Peso corporal'),
  ('Puxada frontal', 'Costas', 'Polia'),
  ('Remada baixa', 'Costas', 'Polia'),
  ('Remada curvada com barra', 'Costas', 'Barra'),
  ('Remada unilateral com halter', 'Costas', 'Halteres'),
  ('Barra fixa', 'Costas', 'Peso corporal'),
  ('Levantamento terra', 'Costas', 'Barra'),
  ('Desenvolvimento com halteres', 'Ombros', 'Halteres'),
  ('Desenvolvimento máquina', 'Ombros', 'Máquina'),
  ('Elevação lateral', 'Ombros', 'Halteres'),
  ('Crucifixo inverso', 'Ombros', 'Halteres'),
  ('Rosca direta com barra', 'Bíceps', 'Barra'),
  ('Rosca alternada com halteres', 'Bíceps', 'Halteres'),
  ('Rosca martelo', 'Bíceps', 'Halteres'),
  ('Tríceps pulley', 'Tríceps', 'Polia'),
  ('Tríceps francês', 'Tríceps', 'Halteres'),
  ('Agachamento livre', 'Pernas', 'Barra'),
  ('Agachamento goblet', 'Pernas', 'Halteres'),
  ('Leg press 45', 'Pernas', 'Máquina'),
  ('Cadeira extensora', 'Pernas', 'Máquina'),
  ('Mesa flexora', 'Pernas', 'Máquina'),
  ('Stiff', 'Pernas', 'Barra'),
  ('Afundo com halteres', 'Pernas', 'Halteres'),
  ('Elevação pélvica', 'Glúteos', 'Barra'),
  ('Cadeira abdutora', 'Glúteos', 'Máquina'),
  ('Kettlebell swing', 'Glúteos', 'Kettlebell'),
  ('Panturrilha em pé', 'Panturrilha', 'Máquina'),
  ('Panturrilha sentado', 'Panturrilha', 'Máquina'),
  ('Prancha', 'Abdômen', 'Peso corporal'),
  ('Prancha lateral', 'Abdômen', 'Peso corporal'),
  ('Abdominal supra', 'Abdômen', 'Peso corporal'),
  ('Perdigueiro', 'Abdômen', 'Peso corporal'),
  ('Esteira', 'Cardio', 'Máquina'),
  ('Bicicleta ergométrica', 'Cardio', 'Máquina'),
  ('Elíptico', 'Cardio', 'Máquina'),
  ('Remo ergômetro', 'Cardio', 'Máquina'),
  ('Pular corda', 'Cardio', 'Corda')
) AS v(nome, grupo, equipamento)
WHERE NOT EXISTS (
  SELECT 1 FROM public.exercises e
  WHERE e.user_id IS NULL AND lower(e.nome) = lower(v.nome)
);
