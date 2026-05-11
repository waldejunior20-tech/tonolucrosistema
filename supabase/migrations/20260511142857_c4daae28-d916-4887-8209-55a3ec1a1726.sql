CREATE TABLE IF NOT EXISTS public.bordas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  preco_p NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_m NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_g NUMERIC(10,2) NOT NULL DEFAULT 0,
  custo_p NUMERIC(10,2) NOT NULL DEFAULT 0,
  custo_m NUMERIC(10,2) NOT NULL DEFAULT 0,
  custo_g NUMERIC(10,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  unidade_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bordas_unidade ON public.bordas(unidade_id);

ALTER TABLE public.bordas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bd_select" ON public.bordas FOR SELECT
  USING (public.is_member_of_unidade(auth.uid(), unidade_id));

CREATE POLICY "bd_insert" ON public.bordas FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.pode_editar_negocio(auth.uid(), unidade_id));

CREATE POLICY "bd_update" ON public.bordas FOR UPDATE
  USING (public.pode_editar_negocio(auth.uid(), unidade_id));

CREATE POLICY "bd_delete" ON public.bordas FOR DELETE
  USING (public.pode_editar_negocio(auth.uid(), unidade_id));

CREATE TRIGGER trg_bordas_updated_at
  BEFORE UPDATE ON public.bordas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();