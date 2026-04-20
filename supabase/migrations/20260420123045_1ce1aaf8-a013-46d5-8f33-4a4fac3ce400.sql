-- ─── historico_precos_insumos ──────────────────────────────────────
CREATE TABLE public.historico_precos_insumos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  insumo_id uuid NULL,
  nome_insumo text NOT NULL,
  preco_anterior numeric NOT NULL DEFAULT 0,
  preco_novo numeric NOT NULL DEFAULT 0,
  variacao_percentual numeric NOT NULL DEFAULT 0,
  unidade_id uuid NULL,
  user_id uuid NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hpi_insumo ON public.historico_precos_insumos(insumo_id);
CREATE INDEX idx_hpi_unidade ON public.historico_precos_insumos(unidade_id);
CREATE INDEX idx_hpi_created_at ON public.historico_precos_insumos(created_at DESC);

ALTER TABLE public.historico_precos_insumos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hpi_select" ON public.historico_precos_insumos
  FOR SELECT USING (public.is_member_of_unidade(auth.uid(), unidade_id));

CREATE POLICY "hpi_insert" ON public.historico_precos_insumos
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND public.pode_editar_negocio(auth.uid(), unidade_id)
  );

CREATE POLICY "hpi_update" ON public.historico_precos_insumos
  FOR UPDATE USING (public.pode_editar_negocio(auth.uid(), unidade_id));

CREATE POLICY "hpi_delete" ON public.historico_precos_insumos
  FOR DELETE USING (public.pode_editar_negocio(auth.uid(), unidade_id));

-- ─── alertas_cmv ───────────────────────────────────────────────────
CREATE TABLE public.alertas_cmv (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ficha_tecnica_id uuid NULL,
  nome_produto text NOT NULL,
  cmv_anterior numeric NOT NULL DEFAULT 0,
  cmv_atual numeric NOT NULL DEFAULT 0,
  preco_sugerido numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  unidade_id uuid NULL,
  user_id uuid NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ac_ficha ON public.alertas_cmv(ficha_tecnica_id);
CREATE INDEX idx_ac_unidade ON public.alertas_cmv(unidade_id);
CREATE INDEX idx_ac_status ON public.alertas_cmv(status);
CREATE INDEX idx_ac_created_at ON public.alertas_cmv(created_at DESC);

ALTER TABLE public.alertas_cmv ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ac_select" ON public.alertas_cmv
  FOR SELECT USING (public.is_member_of_unidade(auth.uid(), unidade_id));

CREATE POLICY "ac_insert" ON public.alertas_cmv
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND public.pode_editar_negocio(auth.uid(), unidade_id)
  );

CREATE POLICY "ac_update" ON public.alertas_cmv
  FOR UPDATE USING (public.pode_editar_negocio(auth.uid(), unidade_id));

CREATE POLICY "ac_delete" ON public.alertas_cmv
  FOR DELETE USING (public.pode_editar_negocio(auth.uid(), unidade_id));