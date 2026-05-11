
CREATE TABLE IF NOT EXISTS public.bordas_ingredientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borda_id UUID NOT NULL REFERENCES public.bordas(id) ON DELETE CASCADE,
  tipo_insumo TEXT NOT NULL,
  insumo_comprado_id UUID REFERENCES public.insumos_comprados(id) ON DELETE SET NULL,
  insumo_proprio_id UUID REFERENCES public.insumos_proprios(id) ON DELETE SET NULL,
  unidade TEXT NOT NULL,
  qtds_por_tamanho JSONB NOT NULL DEFAULT '{}'::jsonb,
  unidade_id UUID NOT NULL,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bordas_ingredientes_borda_id ON public.bordas_ingredientes(borda_id);
CREATE INDEX IF NOT EXISTS idx_bordas_ingredientes_unidade_id ON public.bordas_ingredientes(unidade_id);

ALTER TABLE public.bordas_ingredientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bdi_select" ON public.bordas_ingredientes
  FOR SELECT USING (public.is_member_of_unidade(auth.uid(), unidade_id));

CREATE POLICY "bdi_insert" ON public.bordas_ingredientes
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.pode_editar_negocio(auth.uid(), unidade_id));

CREATE POLICY "bdi_update" ON public.bordas_ingredientes
  FOR UPDATE USING (public.pode_editar_negocio(auth.uid(), unidade_id));

CREATE POLICY "bdi_delete" ON public.bordas_ingredientes
  FOR DELETE USING (public.pode_editar_negocio(auth.uid(), unidade_id));

CREATE TRIGGER update_bordas_ingredientes_updated_at
  BEFORE UPDATE ON public.bordas_ingredientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
