-- Replace RPC to clear existing ingredients before applying a base, preventing duplication
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
    -- Limpa ingredientes existentes para evitar duplicação ao reaplicar uma base
    DELETE FROM public.fichas_tecnicas_pizza_ingredientes WHERE ficha_id = p_ficha_id;

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
    DELETE FROM public.fichas_tecnicas_produtos_ingredientes WHERE ficha_id = p_ficha_id;

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