-- Add user_id to fichas_tecnicas_produtos and its ingredients
ALTER TABLE public.fichas_tecnicas_produtos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE public.fichas_tecnicas_produtos_ingredientes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Update RLS policies for fichas_tecnicas_produtos
DROP POLICY IF EXISTS "Anyone can view products technical sheets" ON public.fichas_tecnicas_produtos;
DROP POLICY IF EXISTS "Anyone can insert products technical sheets" ON public.fichas_tecnicas_produtos;
DROP POLICY IF EXISTS "Anyone can update products technical sheets" ON public.fichas_tecnicas_produtos;
DROP POLICY IF EXISTS "Anyone can delete products technical sheets" ON public.fichas_tecnicas_produtos;

CREATE POLICY "Users can manage their own products technical sheets" 
ON public.fichas_tecnicas_produtos FOR ALL USING (auth.uid() = user_id);

-- Update RLS policies for fichas_tecnicas_produtos_ingredientes
DROP POLICY IF EXISTS "Anyone can view products ingredients" ON public.fichas_tecnicas_produtos_ingredientes;
DROP POLICY IF EXISTS "Anyone can insert products ingredients" ON public.fichas_tecnicas_produtos_ingredientes;
DROP POLICY IF EXISTS "Anyone can update products ingredients" ON public.fichas_tecnicas_produtos_ingredientes;
DROP POLICY IF EXISTS "Anyone can delete products ingredients" ON public.fichas_tecnicas_produtos_ingredientes;

CREATE POLICY "Users can manage their own products ingredients" 
ON public.fichas_tecnicas_produtos_ingredientes FOR ALL USING (auth.uid() = user_id);

-- Add missing columns to fichas_tecnicas_produtos
ALTER TABLE public.fichas_tecnicas_produtos ADD COLUMN IF NOT EXISTS preco_venda DECIMAL;
ALTER TABLE public.fichas_tecnicas_produtos ADD COLUMN IF NOT EXISTS numero_ficha TEXT;
