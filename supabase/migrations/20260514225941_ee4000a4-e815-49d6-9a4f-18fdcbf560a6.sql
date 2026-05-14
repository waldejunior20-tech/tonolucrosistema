-- =========================================================
-- 1. AUDITORIA DE CORREÇÕES DE PREÇO
-- =========================================================
CREATE TABLE IF NOT EXISTS public.auditoria_correcoes_precos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id UUID,
  unidade_id UUID,
  motivo TEXT NOT NULL,
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot_historico JSONB,
  snapshot_canonico JSONB,
  executado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.auditoria_correcoes_precos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membros leem auditoria de correções" ON public.auditoria_correcoes_precos;
CREATE POLICY "Membros leem auditoria de correções"
  ON public.auditoria_correcoes_precos FOR SELECT
  USING (unidade_id IS NULL OR public.is_member_of_unidade(auth.uid(), unidade_id));

-- =========================================================
-- 2. CORREÇÃO BANANA PRATA — snapshot + remoção da cascata
-- =========================================================
DO $$
DECLARE
  v_insumo UUID := 'df678226-2ad9-49b6-aa3d-cb751c63c657';
  v_unidade UUID;
  v_snap_hist JSONB;
  v_snap_canon JSONB;
  v_avg numeric; v_min numeric; v_max numeric; v_count int;
BEGIN
  SELECT unidade_id, to_jsonb(ic.*) INTO v_unidade, v_snap_canon
    FROM public.insumos_comprados ic WHERE id = v_insumo;

  IF v_unidade IS NULL THEN RETURN; END IF;

  -- Snapshot das linhas em cascata (timestamp 2026-05-14 21:07:02.611867 do reprocesso)
  SELECT jsonb_agg(to_jsonb(h.*))
    INTO v_snap_hist
    FROM public.insumos_compras_historico h
   WHERE h.insumo_id = v_insumo
     AND h.created_at = '2026-05-14 21:07:02.611867+00'::timestamptz;

  INSERT INTO public.auditoria_correcoes_precos
    (insumo_id, unidade_id, motivo, detalhes, snapshot_historico, snapshot_canonico)
  VALUES (v_insumo, v_unidade,
          'cascata_recursiva_preco_banana_prata',
          jsonb_build_object(
            'descricao','Loop de reprocesso multiplicou preco_unitario; canônico estava em R$ 7466.',
            'preco_canonico_corrigido_para', 8.3214,
            'linhas_removidas_count',
              (SELECT count(*) FROM public.insumos_compras_historico
                WHERE insumo_id = v_insumo
                  AND created_at = '2026-05-14 21:07:02.611867+00'::timestamptz)
          ),
          v_snap_hist, v_snap_canon);

  -- Remove a cascata (preserva as 2 compras legítimas: Sacolão R$6.46 e BRISA R$6.99/0.96kg)
  DELETE FROM public.insumos_compras_historico
   WHERE insumo_id = v_insumo
     AND created_at = '2026-05-14 21:07:02.611867+00'::timestamptz;

  -- Recalcula agregados a partir do histórico restante
  SELECT AVG(preco_unitario), MIN(preco_unitario), MAX(preco_unitario), COUNT(*)
    INTO v_avg, v_min, v_max, v_count
    FROM public.insumos_compras_historico WHERE insumo_id = v_insumo;

  UPDATE public.insumos_comprados
     SET preco_pago    = 8.3214,   -- R$ 6,99 ÷ 0,840 kg
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

-- =========================================================
-- 3. TRAVA ANTI-LOOP: idempotência no INSERT do histórico
-- =========================================================
CREATE OR REPLACE FUNCTION public.tr_historico_idempotencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existe boolean;
BEGIN
  -- Chave de idempotência: nf+nome+qty+un+total+fornecedor+data
  SELECT EXISTS (
    SELECT 1 FROM public.insumos_compras_historico h
     WHERE h.insumo_id = NEW.insumo_id
       AND COALESCE(h.nota_fiscal_id::text,'') = COALESCE(NEW.nota_fiscal_id::text,'')
       AND lower(trim(COALESCE(h.nome_original,''))) = lower(trim(COALESCE(NEW.nome_original,'')))
       AND COALESCE(h.quantidade,0) = COALESCE(NEW.quantidade,0)
       AND lower(COALESCE(h.unidade_medida,'')) = lower(COALESCE(NEW.unidade_medida,''))
       AND ROUND(COALESCE(h.preco_total,0)::numeric, 2) = ROUND(COALESCE(NEW.preco_total,0)::numeric, 2)
       AND lower(trim(COALESCE(h.fornecedor,''))) = lower(trim(COALESCE(NEW.fornecedor,'')))
       AND h.data_compra = NEW.data_compra
  ) INTO v_existe;

  IF v_existe THEN
    RAISE NOTICE 'Histórico duplicado ignorado (idempotência): % / % / % / %',
      NEW.nome_original, NEW.fornecedor, NEW.quantidade, NEW.preco_total;
    RETURN NULL; -- aborta o INSERT silenciosamente
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_historico_idempotencia ON public.insumos_compras_historico;
CREATE TRIGGER tr_historico_idempotencia
  BEFORE INSERT ON public.insumos_compras_historico
  FOR EACH ROW EXECUTE FUNCTION public.tr_historico_idempotencia();

-- =========================================================
-- 4. TRAVA ANTI-LOOP: bloqueio de salto suspeito no canônico
-- =========================================================
CREATE OR REPLACE FUNCTION public.tr_historico_atualiza_insumo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg numeric; v_min numeric; v_max numeric; v_count int;
  v_preco_medio_atual numeric;
  v_total_compras_atual int;
  v_suspeito boolean := false;
BEGIN
  IF NEW.insumo_id IS NULL THEN RETURN NEW; END IF;

  SELECT preco_medio, total_compras
    INTO v_preco_medio_atual, v_total_compras_atual
    FROM public.insumos_comprados WHERE id = NEW.insumo_id;

  -- Detecta salto suspeito: novo unitário > 3x média (com pelo menos 2 compras prévias)
  IF v_preco_medio_atual IS NOT NULL
     AND v_preco_medio_atual > 0
     AND COALESCE(v_total_compras_atual,0) >= 2
     AND NEW.preco_unitario > v_preco_medio_atual * 3 THEN
    v_suspeito := true;

    UPDATE public.insumos_compras_historico
       SET destino = 'revisar',
           confianca_classificacao = 0.0
     WHERE id = NEW.id;

    INSERT INTO public.auditoria_correcoes_precos
      (insumo_id, unidade_id, motivo, detalhes)
    VALUES (NEW.insumo_id, NEW.unidade_id,
            'preco_suspeito_bloqueado',
            jsonb_build_object(
              'historico_id', NEW.id,
              'preco_unitario_novo', NEW.preco_unitario,
              'preco_medio_anterior', v_preco_medio_atual,
              'fator', ROUND((NEW.preco_unitario / v_preco_medio_atual)::numeric, 2),
              'fornecedor', NEW.fornecedor,
              'nome_original', NEW.nome_original
            ));

    RAISE WARNING 'Preço suspeito (>%x média) bloqueado para insumo %: novo=% médio=%',
      3, NEW.insumo_id, NEW.preco_unitario, v_preco_medio_atual;
  END IF;

  -- Recalcula agregados sempre (incluindo a nova linha)
  SELECT AVG(preco_unitario), MIN(preco_unitario), MAX(preco_unitario), COUNT(*)
    INTO v_avg, v_min, v_max, v_count
    FROM public.insumos_compras_historico
   WHERE insumo_id = NEW.insumo_id
     AND COALESCE(destino,'insumo') <> 'revisar';

  -- Atualiza canônico apenas se NÃO suspeito E for compra mais recente
  IF NOT v_suspeito THEN
    UPDATE public.insumos_comprados ic
       SET preco_pago    = NEW.preco_unitario,
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

  -- Atualiza só agregados (sem mexer em preco_pago) quando é compra antiga ou suspeita
  UPDATE public.insumos_comprados
     SET preco_medio   = COALESCE(v_avg, preco_medio),
         preco_minimo  = COALESCE(v_min, preco_minimo),
         preco_maximo  = COALESCE(v_max, preco_maximo),
         total_compras = COALESCE(v_count, total_compras)
   WHERE id = NEW.insumo_id;

  RETURN NEW;
END;
$$;