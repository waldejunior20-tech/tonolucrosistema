-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Add user_id to existing tables for multi-tenancy
ALTER TABLE public.insumos_comprados ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE public.insumos_proprios ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE public.insumos_proprios_ingredientes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE public.fichas_tecnicas_pizza ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE public.fichas_tecnicas_pizza_ingredientes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Add preco_venda to fichas_tecnicas_pizza
ALTER TABLE public.fichas_tecnicas_pizza ADD COLUMN IF NOT EXISTS preco_venda_p DECIMAL;
ALTER TABLE public.fichas_tecnicas_pizza ADD COLUMN IF NOT EXISTS preco_venda_m DECIMAL;
ALTER TABLE public.fichas_tecnicas_pizza ADD COLUMN IF NOT EXISTS preco_venda_g DECIMAL;

-- Enable RLS on all tables
ALTER TABLE public.insumos_comprados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumos_proprios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumos_proprios_ingredientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas_tecnicas_pizza ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas_tecnicas_pizza_ingredientes ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- insumos_comprados
CREATE POLICY "Users can manage their own insumos_comprados" 
ON public.insumos_comprados FOR ALL USING (auth.uid() = user_id);

-- insumos_proprios
CREATE POLICY "Users can manage their own insumos_proprios" 
ON public.insumos_proprios FOR ALL USING (auth.uid() = user_id);

-- insumos_proprios_ingredientes
CREATE POLICY "Users can manage their own insumos_proprios_ingredientes" 
ON public.insumos_proprios_ingredientes FOR ALL USING (auth.uid() = user_id);

-- fichas_tecnicas_pizza
CREATE POLICY "Users can manage their own fichas_tecnicas_pizza" 
ON public.fichas_tecnicas_pizza FOR ALL USING (auth.uid() = user_id);

-- fichas_tecnicas_pizza_ingredientes
CREATE POLICY "Users can manage their own fichas_tecnicas_pizza_ingredientes" 
ON public.fichas_tecnicas_pizza_ingredientes FOR ALL USING (auth.uid() = user_id);

-- Create table for price configuration
CREATE TABLE IF NOT EXISTS public.configuracoes_preco (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  margem_desejada DECIMAL DEFAULT 30,
  impostos DECIMAL DEFAULT 0,
  comissao_marketplace DECIMAL DEFAULT 0,
  custos_fixos DECIMAL DEFAULT 0,
  outros_custos_variaveis DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.configuracoes_preco ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own configuracoes_preco" 
ON public.configuracoes_preco FOR ALL USING (auth.uid() = user_id);

-- Function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, new.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user profiles
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
