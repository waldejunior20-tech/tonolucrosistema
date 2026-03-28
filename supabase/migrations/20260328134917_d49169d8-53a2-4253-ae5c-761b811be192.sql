-- Disable RLS temporarily or modify policies for single-user access
-- Table: insumos_comprados
DROP POLICY IF EXISTS "Users can manage their own insumos_comprados" ON public.insumos_comprados;
ALTER TABLE public.insumos_comprados DROP COLUMN IF EXISTS user_id;
CREATE POLICY "Public access for insumos_comprados" ON public.insumos_comprados FOR ALL USING (true) WITH CHECK (true);

-- Table: insumos_proprios
DROP POLICY IF EXISTS "Users can manage their own insumos_proprios" ON public.insumos_proprios;
ALTER TABLE public.insumos_proprios DROP COLUMN IF EXISTS user_id;
CREATE POLICY "Public access for insumos_proprios" ON public.insumos_proprios FOR ALL USING (true) WITH CHECK (true);

-- Table: insumos_proprios_ingredientes
DROP POLICY IF EXISTS "Users can manage their own insumos_proprios_ingredientes" ON public.insumos_proprios_ingredientes;
ALTER TABLE public.insumos_proprios_ingredientes DROP COLUMN IF EXISTS user_id;
CREATE POLICY "Public access for insumos_proprios_ingredientes" ON public.insumos_proprios_ingredientes FOR ALL USING (true) WITH CHECK (true);

-- Table: fichas_tecnicas_pizza
DROP POLICY IF EXISTS "Users can manage their own fichas_tecnicas_pizza" ON public.fichas_tecnicas_pizza;
ALTER TABLE public.fichas_tecnicas_pizza DROP COLUMN IF EXISTS user_id;
CREATE POLICY "Public access for fichas_tecnicas_pizza" ON public.fichas_tecnicas_pizza FOR ALL USING (true) WITH CHECK (true);

-- Table: fichas_tecnicas_pizza_ingredientes
DROP POLICY IF EXISTS "Users can manage their own fichas_tecnicas_pizza_ingredientes" ON public.fichas_tecnicas_pizza_ingredientes;
ALTER TABLE public.fichas_tecnicas_pizza_ingredientes DROP COLUMN IF EXISTS user_id;
CREATE POLICY "Public access for fichas_tecnicas_pizza_ingredientes" ON public.fichas_tecnicas_pizza_ingredientes FOR ALL USING (true) WITH CHECK (true);

-- Table: fichas_tecnicas_produtos
DROP POLICY IF EXISTS "Users can manage their own products technical sheets" ON public.fichas_tecnicas_produtos;
ALTER TABLE public.fichas_tecnicas_produtos DROP COLUMN IF EXISTS user_id;
CREATE POLICY "Public access for fichas_tecnicas_produtos" ON public.fichas_tecnicas_produtos FOR ALL USING (true) WITH CHECK (true);

-- Table: fichas_tecnicas_produtos_ingredientes
DROP POLICY IF EXISTS "Users can manage their own products ingredients" ON public.fichas_tecnicas_produtos_ingredientes;
ALTER TABLE public.fichas_tecnicas_produtos_ingredientes DROP COLUMN IF EXISTS user_id;
CREATE POLICY "Public access for fichas_tecnicas_produtos_ingredientes" ON public.fichas_tecnicas_produtos_ingredientes FOR ALL USING (true) WITH CHECK (true);

-- Also including configuracoes_preco as it was in the query result and likely part of the system
DROP POLICY IF EXISTS "Users can manage their own configuracoes_preco" ON public.configuracoes_preco;
ALTER TABLE public.configuracoes_preco DROP COLUMN IF EXISTS user_id;
CREATE POLICY "Public access for configuracoes_preco" ON public.configuracoes_preco FOR ALL USING (true) WITH CHECK (true);