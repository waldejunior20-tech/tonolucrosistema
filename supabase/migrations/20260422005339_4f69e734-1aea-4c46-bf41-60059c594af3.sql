-- ============================================================
-- BASES DE FICHA TÉCNICA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bases_ficha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo_ficha TEXT NOT NULL CHECK (tipo_ficha IN ('pizza','produto')),
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  is_padrao BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (nome, unidade_id, tipo_ficha)
);

CREATE TABLE IF NOT EXISTS public.bases_ficha_ingredientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_id UUID NOT NULL REFERENCES public.bases_ficha(id) ON DELETE CASCADE,
  tipo_insumo TEXT NOT NULL CHECK (tipo_insumo IN ('comprado','proprio','embalagem_p','embalagem_m','embalagem_g')),
  insumo_comprado_id UUID REFERENCES public.insumos_comprados(id) ON DELETE SET NULL,
  insumo_proprio_id UUID REFERENCES public.insumos_proprios(id) ON DELETE SET NULL,
  qtd_p NUMERIC(10,3) DEFAULT 0,
  qtd_m NUMERIC(10,3) DEFAULT 0,
  qtd_g NUMERIC(10,3) DEFAULT 0,
  quantidade NUMERIC(10,3),
  unidade TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (insumo_comprado_id IS NOT NULL AND insumo_proprio_id IS NULL) OR
    (insumo_comprado_id IS NULL AND insumo_proprio_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_bases_ficha_unidade ON public.bases_ficha(unidade_id, tipo_ficha);
CREATE INDEX IF NOT EXISTS idx_bases_ing_base ON public.bases_ficha_ingredientes(base_id);

-- RLS
ALTER TABLE public.bases_ficha ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bases_ficha_ingredientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bf_select" ON public.bases_ficha FOR SELECT
  USING (public.is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY "bf_insert" ON public.bases_ficha FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY "bf_update" ON public.bases_ficha FOR UPDATE
  USING (public.pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY "bf_delete" ON public.bases_ficha FOR DELETE
  USING (public.pode_editar_negocio(auth.uid(), unidade_id));

CREATE POLICY "bfi_select" ON public.bases_ficha_ingredientes FOR SELECT
  USING (public.is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY "bfi_insert" ON public.bases_ficha_ingredientes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY "bfi_update" ON public.bases_ficha_ingredientes FOR UPDATE
  USING (public.pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY "bfi_delete" ON public.bases_ficha_ingredientes FOR DELETE
  USING (public.pode_editar_negocio(auth.uid(), unidade_id));

-- Trigger updated_at (reusa função existente)
DROP TRIGGER IF EXISTS bases_ficha_updated_at ON public.bases_ficha;
CREATE TRIGGER bases_ficha_updated_at
  BEFORE UPDATE ON public.bases_ficha
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Rastreabilidade nas fichas
ALTER TABLE public.fichas_tecnicas_pizza
  ADD COLUMN IF NOT EXISTS base_origem_id UUID REFERENCES public.bases_ficha(id) ON DELETE SET NULL;
ALTER TABLE public.fichas_tecnicas_produtos
  ADD COLUMN IF NOT EXISTS base_origem_id UUID REFERENCES public.bases_ficha(id) ON DELETE SET NULL;

-- ============================================================
-- RPC: aplicar_base_em_ficha
-- ============================================================
CREATE OR REPLACE FUNCTION public.aplicar_base_em_ficha(
  p_base_id UUID,
  p_ficha_id UUID,
  p_tipo_ficha TEXT
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  v_unidade_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  IF p_tipo_ficha NOT IN ('pizza','produto') THEN
    RAISE EXCEPTION 'tipo_ficha inválido: %', p_tipo_ficha;
  END IF;

  IF p_tipo_ficha = 'pizza' THEN
    SELECT unidade_id INTO v_unidade_id FROM public.fichas_tecnicas_pizza WHERE id = p_ficha_id;
  ELSE
    SELECT unidade_id INTO v_unidade_id FROM public.fichas_tecnicas_produtos WHERE id = p_ficha_id;
  END IF;

  IF v_unidade_id IS NULL THEN
    RAISE EXCEPTION 'Ficha não encontrada';
  END IF;

  IF NOT public.pode_editar_negocio(v_user_id, v_unidade_id) THEN
    RAISE EXCEPTION 'Sem permissão para editar esta ficha';
  END IF;

  IF p_tipo_ficha = 'pizza' THEN
    INSERT INTO public.fichas_tecnicas_pizza_ingredientes
      (ficha_id, tipo_insumo, insumo_comprado_id, insumo_proprio_id,
       qtd_p, qtd_m, qtd_g, unidade, unidade_id, user_id)
    SELECT
      p_ficha_id, bfi.tipo_insumo, bfi.insumo_comprado_id, bfi.insumo_proprio_id,
      COALESCE(bfi.qtd_p, 0), COALESCE(bfi.qtd_m, 0), COALESCE(bfi.qtd_g, 0),
      bfi.unidade, v_unidade_id, v_user_id
    FROM public.bases_ficha_ingredientes bfi
    WHERE bfi.base_id = p_base_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    UPDATE public.fichas_tecnicas_pizza SET base_origem_id = p_base_id WHERE id = p_ficha_id;
  ELSE
    INSERT INTO public.fichas_tecnicas_produtos_ingredientes
      (ficha_id, tipo_insumo, insumo_comprado_id, insumo_proprio_id,
       quantidade, unidade, unidade_id, user_id)
    SELECT
      p_ficha_id, bfi.tipo_insumo, bfi.insumo_comprado_id, bfi.insumo_proprio_id,
      COALESCE(bfi.quantidade, 0), bfi.unidade, v_unidade_id, v_user_id
    FROM public.bases_ficha_ingredientes bfi
    WHERE bfi.base_id = p_base_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    UPDATE public.fichas_tecnicas_produtos SET base_origem_id = p_base_id WHERE id = p_ficha_id;
  END IF;

  RETURN v_count;
END;
$$;