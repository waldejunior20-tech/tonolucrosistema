-- 1. Corrige tr_historico_atualiza_insumo: usa preco_total (não preco_unitario) ao atualizar canônico
CREATE OR REPLACE FUNCTION public.tr_historico_atualiza_insumo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_avg numeric; v_min numeric; v_max numeric; v_count int;
  v_preco_medio_atual numeric; v_total_atual int;
  v_suspeito boolean := false;
BEGIN
  IF NEW.insumo_id IS NULL THEN RETURN NEW; END IF;

  SELECT preco_medio, total_compras
    INTO v_preco_medio_atual, v_total_atual
    FROM public.insumos_comprados WHERE id = NEW.insumo_id;

  IF v_preco_medio_atual IS NOT NULL AND v_preco_medio_atual > 0
     AND COALESCE(v_total_atual,0) >= 2
     AND NEW.preco_unitario > v_preco_medio_atual * 3 THEN
    v_suspeito := true;
    UPDATE public.insumos_compras_historico
       SET destino = 'revisar', confianca_classificacao = 0.0
     WHERE id = NEW.id;
    INSERT INTO public.auditoria_correcoes_precos
      (insumo_id, unidade_id, motivo, detalhes)
    VALUES (NEW.insumo_id, NEW.unidade_id, 'preco_suspeito_bloqueado',
      jsonb_build_object('historico_id', NEW.id,
        'preco_unitario_novo', NEW.preco_unitario,
        'preco_medio_anterior', v_preco_medio_atual,
        'fator', ROUND((NEW.preco_unitario / v_preco_medio_atual)::numeric, 2),
        'fornecedor', NEW.fornecedor, 'nome_original', NEW.nome_original));
    RAISE WARNING 'Preço suspeito bloqueado: novo=% médio=%', NEW.preco_unitario, v_preco_medio_atual;
  END IF;

  SELECT AVG(preco_unitario), MIN(preco_unitario), MAX(preco_unitario), COUNT(*)
    INTO v_avg, v_min, v_max, v_count
    FROM public.insumos_compras_historico
   WHERE insumo_id = NEW.insumo_id
     AND COALESCE(destino,'insumo') <> 'revisar';

  IF NOT v_suspeito THEN
    -- CORREÇÃO: preco_pago é o TOTAL pago, não o unitário.
    UPDATE public.insumos_comprados ic
       SET preco_pago    = COALESCE(NEW.preco_total, NEW.preco_unitario * NEW.quantidade),
           fornecedor    = COALESCE(NEW.fornecedor, ic.fornecedor),
           data_compra   = NEW.data_compra,
           quantidade    = COALESCE(NEW.quantidade, ic.quantidade),
           unidade       = COALESCE(NEW.unidade_medida, ic.unidade),
           preco_medio   = COALESCE(v_avg, ic.preco_medio),
           preco_minimo  = COALESCE(v_min, ic.preco_minimo),
           preco_maximo  = COALESCE(v_max, ic.preco_maximo),
           total_compras = COALESCE(v_count, ic.total_compras),
           updated_at    = now()
     WHERE ic.id = NEW.insumo_id
       AND (ic.data_compra IS NULL OR NEW.data_compra >= ic.data_compra);
  END IF;

  UPDATE public.insumos_comprados
     SET preco_medio   = COALESCE(v_avg, preco_medio),
         preco_minimo  = COALESCE(v_min, preco_minimo),
         preco_maximo  = COALESCE(v_max, preco_maximo),
         total_compras = COALESCE(v_count, total_compras)
   WHERE id = NEW.insumo_id;

  RETURN NEW;
END;
$$;

-- 2. Limpa cascata residual da Banana Prata gerada pela migração anterior
DO $$
DECLARE
  v_insumo UUID := 'df678226-2ad9-49b6-aa3d-cb751c63c657';
  v_unidade UUID;
  v_snap JSONB;
  v_avg numeric; v_min numeric; v_max numeric; v_count int;
BEGIN
  SELECT unidade_id INTO v_unidade FROM public.insumos_comprados WHERE id = v_insumo;
  IF v_unidade IS NULL THEN RETURN; END IF;

  SELECT jsonb_agg(to_jsonb(h.*)) INTO v_snap
    FROM public.insumos_compras_historico h
   WHERE h.insumo_id = v_insumo
     AND h.created_at >= '2026-05-14 22:00:00+00'::timestamptz;

  IF v_snap IS NOT NULL THEN
    INSERT INTO public.auditoria_correcoes_precos
      (insumo_id, unidade_id, motivo, detalhes, snapshot_historico)
    VALUES (v_insumo, v_unidade, 'cascata_residual_banana_prata',
      jsonb_build_object('descricao','Linhas geradas pelo loop dos triggers antes da correção'),
      v_snap);
  END IF;

  DELETE FROM public.insumos_compras_historico
   WHERE insumo_id = v_insumo
     AND created_at >= '2026-05-14 22:00:00+00'::timestamptz;

  SELECT AVG(preco_unitario), MIN(preco_unitario), MAX(preco_unitario), COUNT(*)
    INTO v_avg, v_min, v_max, v_count
    FROM public.insumos_compras_historico WHERE insumo_id = v_insumo;

  -- Restaura canônico: R$ 6,99 (total) / 0,840 kg = R$ 8,32/kg
  UPDATE public.insumos_comprados
     SET preco_pago    = 6.99,
         quantidade    = 0.840,
         unidade       = 'kg',
         data_compra   = '2026-06-14',
         fornecedor    = 'SUPERMERCADO BRISA',
         preco_medio   = COALESCE(v_avg, 8.3214),
         preco_minimo  = COALESCE(v_min, 8.3214),
         preco_maximo  = COALESCE(v_max, 8.3214),
         total_compras = COALESCE(v_count, 1),
         updated_at    = now()
   WHERE id = v_insumo;
END $$;