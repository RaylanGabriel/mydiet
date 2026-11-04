-- MyDiet Database Schema
-- Diet tracking and meal planning app

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  meta_calorias_diarias INTEGER DEFAULT 2000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'nome', new.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Meals table (refeicoes)
CREATE TABLE IF NOT EXISTS public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  horario TIME NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo TEXT NOT NULL CHECK (tipo IN ('cafe_manha', 'almoco', 'lanche_tarde', 'cafe_tarde', 'janta')),
  concluida BOOLEAN DEFAULT FALSE,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meals_select_own" ON public.meals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "meals_insert_own" ON public.meals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meals_update_own" ON public.meals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "meals_delete_own" ON public.meals FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_meals_user_date ON public.meals(user_id, data);

-- Meal items table (itens de refeicao)
CREATE TABLE IF NOT EXISTS public.meal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  quantidade TEXT NOT NULL,
  calorias INTEGER NOT NULL,
  proteina NUMERIC(6,2),
  carboidratos NUMERIC(6,2),
  gordura NUMERIC(6,2),
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.meal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meal_items_select_own" ON public.meal_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "meal_items_insert_own" ON public.meal_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meal_items_update_own" ON public.meal_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "meal_items_delete_own" ON public.meal_items FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_meal_items_meal ON public.meal_items(meal_id);

-- Food substitution options (opcoes de substituicao)
CREATE TABLE IF NOT EXISTS public.food_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_item_id UUID NOT NULL REFERENCES public.meal_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  quantidade TEXT NOT NULL,
  calorias INTEGER NOT NULL,
  proteina NUMERIC(6,2),
  carboidratos NUMERIC(6,2),
  gordura NUMERIC(6,2),
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.food_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "food_options_select_own" ON public.food_options FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "food_options_insert_own" ON public.food_options FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "food_options_update_own" ON public.food_options FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "food_options_delete_own" ON public.food_options FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_food_options_item ON public.food_options(meal_item_id);
