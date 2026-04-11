
-- 1. Drop "Public access" from all tables that already have ownership policies
DROP POLICY IF EXISTS "Public access for configuracoes_negocio" ON public.configuracoes_negocio;
DROP POLICY IF EXISTS "Public access for configuracoes_precificacao" ON public.configuracoes_precificacao;
DROP POLICY IF EXISTS "Public access for fichas_tecnicas_pizza" ON public.fichas_tecnicas_pizza;
DROP POLICY IF EXISTS "Public access for fichas_tecnicas_pizza_ingredientes" ON public.fichas_tecnicas_pizza_ingredientes;
DROP POLICY IF EXISTS "Public access for fichas_tecnicas_produtos" ON public.fichas_tecnicas_produtos;
DROP POLICY IF EXISTS "Public access for fichas_tecnicas_produtos_ingredientes" ON public.fichas_tecnicas_produtos_ingredientes;
DROP POLICY IF EXISTS "Public access for insumos_comprados" ON public.insumos_comprados;
DROP POLICY IF EXISTS "Public access for insumos_proprios" ON public.insumos_proprios;
DROP POLICY IF EXISTS "Public access for insumos_proprios_ingredientes" ON public.insumos_proprios_ingredientes;
DROP POLICY IF EXISTS "Public access for lancamentos_financeiros" ON public.lancamentos_financeiros;
DROP POLICY IF EXISTS "Public access for metas_financeiras" ON public.metas_financeiras;
DROP POLICY IF EXISTS "Public access for precificacao_bebidas" ON public.precificacao_bebidas;
DROP POLICY IF EXISTS "Public access for promocoes" ON public.promocoes;

-- 2. combos_fixos: drop public access + add ownership policies
DROP POLICY IF EXISTS "Public access for combos_fixos" ON public.combos_fixos;

CREATE POLICY "Users can view their own combos_fixos"
ON public.combos_fixos FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own combos_fixos"
ON public.combos_fixos FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own combos_fixos"
ON public.combos_fixos FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own combos_fixos"
ON public.combos_fixos FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 3. precificacao_produtos: add user_id, drop public access, add ownership policies
ALTER TABLE public.precificacao_produtos
ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();

DROP POLICY IF EXISTS "Public access for precificacao_produtos" ON public.precificacao_produtos;

CREATE POLICY "Users can view their own precificacao_produtos"
ON public.precificacao_produtos FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own precificacao_produtos"
ON public.precificacao_produtos FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own precificacao_produtos"
ON public.precificacao_produtos FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own precificacao_produtos"
ON public.precificacao_produtos FOR DELETE TO authenticated
USING (auth.uid() = user_id);
