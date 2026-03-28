-- Ensure all roles have access
ALTER POLICY "Public access for insumos_comprados" ON public.insumos_comprados TO anon, authenticated;
ALTER POLICY "Public access for insumos_proprios" ON public.insumos_proprios TO anon, authenticated;
ALTER POLICY "Public access for insumos_proprios_ingredientes" ON public.insumos_proprios_ingredientes TO anon, authenticated;
ALTER POLICY "Public access for fichas_tecnicas_pizza" ON public.fichas_tecnicas_pizza TO anon, authenticated;
ALTER POLICY "Public access for fichas_tecnicas_pizza_ingredientes" ON public.fichas_tecnicas_pizza_ingredientes TO anon, authenticated;
ALTER POLICY "Public access for fichas_tecnicas_produtos" ON public.fichas_tecnicas_produtos TO anon, authenticated;
ALTER POLICY "Public access for fichas_tecnicas_produtos_ingredientes" ON public.fichas_tecnicas_produtos_ingredientes TO anon, authenticated;
ALTER POLICY "Public access for configuracoes_preco" ON public.configuracoes_preco TO anon, authenticated;