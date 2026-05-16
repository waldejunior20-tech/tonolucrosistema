
ALTER TABLE public.precos_em_revisao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumo_aliases_manuais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedor_categoria_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "precos_revisao_select" ON public.precos_em_revisao FOR SELECT TO authenticated USING (public.is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY "precos_revisao_insert" ON public.precos_em_revisao FOR INSERT TO authenticated WITH CHECK (public.pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY "precos_revisao_update" ON public.precos_em_revisao FOR UPDATE TO authenticated USING (public.pode_editar_negocio(auth.uid(), unidade_id)) WITH CHECK (public.pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY "precos_revisao_delete" ON public.precos_em_revisao FOR DELETE TO authenticated USING (public.pode_editar_negocio(auth.uid(), unidade_id));

CREATE POLICY "pedidos_compra_select" ON public.pedidos_compra FOR SELECT TO authenticated USING (public.is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY "pedidos_compra_insert" ON public.pedidos_compra FOR INSERT TO authenticated WITH CHECK (public.pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY "pedidos_compra_update" ON public.pedidos_compra FOR UPDATE TO authenticated USING (public.pode_editar_negocio(auth.uid(), unidade_id)) WITH CHECK (public.pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY "pedidos_compra_delete" ON public.pedidos_compra FOR DELETE TO authenticated USING (public.pode_editar_negocio(auth.uid(), unidade_id));

CREATE POLICY "insumo_aliases_select" ON public.insumo_aliases_manuais FOR SELECT TO authenticated USING (public.is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY "insumo_aliases_insert" ON public.insumo_aliases_manuais FOR INSERT TO authenticated WITH CHECK (public.pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY "insumo_aliases_update" ON public.insumo_aliases_manuais FOR UPDATE TO authenticated USING (public.pode_editar_negocio(auth.uid(), unidade_id)) WITH CHECK (public.pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY "insumo_aliases_delete" ON public.insumo_aliases_manuais FOR DELETE TO authenticated USING (public.pode_editar_negocio(auth.uid(), unidade_id));

CREATE POLICY "fornecedor_cache_select" ON public.fornecedor_categoria_cache FOR SELECT TO authenticated USING (true);
