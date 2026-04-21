CREATE OR REPLACE FUNCTION public.varredura_fichas_incompletas()
RETURNS TABLE(out_tipo text, out_ficha_id uuid, out_nome text, out_motivo text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  v_tem_emb BOOLEAN;
  v_tem_real BOOLEAN;
BEGIN
  FOR r IN SELECT ftp.id AS fid, ftp.nome AS fnome, ftp.unidade_id AS uid
           FROM public.fichas_tecnicas_pizza ftp WHERE ftp.unidade_id IS NOT NULL LOOP
    SELECT
      EXISTS(SELECT 1 FROM public.fichas_tecnicas_pizza_ingredientes
             WHERE ficha_id = r.fid AND tipo_insumo LIKE 'embalagem_%'),
      EXISTS(SELECT 1 FROM public.fichas_tecnicas_pizza_ingredientes
             WHERE ficha_id = r.fid AND tipo_insumo IN ('comprado','proprio'))
    INTO v_tem_emb, v_tem_real;

    IF NOT (v_tem_emb AND v_tem_real) THEN
      INSERT INTO public.fichas_tecnicas_warnings
        (ficha_tecnica_id, tipo_ficha, motivo, unidade_id, detalhes)
      VALUES
        (r.fid, 'pizza', 'ficha_incompleta_embalagem_ou_insumo', r.uid,
         jsonb_build_object('tem_embalagem', v_tem_emb, 'tem_insumo_real', v_tem_real))
      ON CONFLICT (ficha_tecnica_id, tipo_ficha, motivo) DO UPDATE
        SET resolvido = FALSE, resolved_at = NULL,
            detalhes = EXCLUDED.detalhes;

      out_tipo := 'pizza'; out_ficha_id := r.fid; out_nome := r.fnome;
      out_motivo := 'ficha_incompleta_embalagem_ou_insumo';
      RETURN NEXT;
    ELSE
      UPDATE public.fichas_tecnicas_warnings
         SET resolvido = TRUE, resolved_at = NOW()
       WHERE ficha_tecnica_id = r.fid
         AND motivo = 'ficha_incompleta_embalagem_ou_insumo'
         AND NOT resolvido;
    END IF;
  END LOOP;

  FOR r IN SELECT ftpr.id AS fid, ftpr.nome AS fnome, ftpr.unidade_id AS uid
           FROM public.fichas_tecnicas_produtos ftpr WHERE ftpr.unidade_id IS NOT NULL LOOP
    SELECT EXISTS(SELECT 1 FROM public.fichas_tecnicas_produtos_ingredientes
                  WHERE ficha_id = r.fid AND tipo_insumo IN ('comprado','proprio'))
    INTO v_tem_real;

    IF NOT v_tem_real THEN
      INSERT INTO public.fichas_tecnicas_warnings
        (ficha_tecnica_id, tipo_ficha, motivo, unidade_id, detalhes)
      VALUES
        (r.fid, 'produto', 'ficha_sem_ingredientes', r.uid,
         jsonb_build_object('tem_insumo_real', false))
      ON CONFLICT (ficha_tecnica_id, tipo_ficha, motivo) DO UPDATE
        SET resolvido = FALSE, resolved_at = NULL;

      out_tipo := 'produto'; out_ficha_id := r.fid; out_nome := r.fnome;
      out_motivo := 'ficha_sem_ingredientes';
      RETURN NEXT;
    ELSE
      UPDATE public.fichas_tecnicas_warnings
         SET resolvido = TRUE, resolved_at = NOW()
       WHERE ficha_tecnica_id = r.fid
         AND motivo = 'ficha_sem_ingredientes'
         AND NOT resolvido;
    END IF;
  END LOOP;
END;
$$;

SELECT * FROM public.varredura_fichas_incompletas();