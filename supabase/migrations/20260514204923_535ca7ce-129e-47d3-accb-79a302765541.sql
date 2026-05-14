-- =========================================================
-- 1) Trigger: histórico → atualiza cadastro canônico
-- =========================================================
CREATE OR REPLACE FUNCTION public.tr_historico_atualiza_insumo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_avg numeric;
  v_min numeric;
  v_max numeric;
  v_count int;
BEGIN
  IF NEW.insumo_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT AVG(preco_unitario), MIN(preco_unitario), MAX(preco_unitario), COUNT(*)
    INTO v_avg, v_min, v_max, v_count
    FROM public.insumos_compras_historico
   WHERE insumo_id = NEW.insumo_id;

  -- Atualiza canônico apenas se essa nova compra for a mais recente
  UPDATE public.insumos_comprados ic
     SET preco_pago    = NEW.preco_unitario,
         fornecedor    = COALESCE(NEW.fornecedor, ic.fornecedor),
         data_compra   = NEW.data_compra,
         quantidade    = COALESCE(NEW.quantidade, ic.quantidade),
         unidade       = COALESCE(NEW.unidade_medida, ic.unidade),
         preco_medio   = v_avg,
         preco_minimo  = v_min,
         preco_maximo  = v_max,
         total_compras = v_count,
         updated_at    = now()
   WHERE ic.id = NEW.insumo_id
     AND (ic.data_compra IS NULL OR NEW.data_compra >= ic.data_compra);

  -- Mesmo se não atualizou preço (compra antiga), recalcula agregados
  UPDATE public.insumos_comprados
     SET preco_medio   = v_avg,
         preco_minimo  = v_min,
         preco_maximo  = v_max,
         total_compras = v_count
   WHERE id = NEW.insumo_id
     AND (preco_medio IS DISTINCT FROM v_avg
       OR preco_minimo IS DISTINCT FROM v_min
       OR preco_maximo IS DISTINCT FROM v_max
       OR total_compras IS DISTINCT FROM v_count);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_historico_atualiza_insumo ON public.insumos_compras_historico;
CREATE TRIGGER trg_historico_atualiza_insumo
AFTER INSERT ON public.insumos_compras_historico
FOR EACH ROW EXECUTE FUNCTION public.tr_historico_atualiza_insumo();

-- =========================================================
-- 2) Trigger: cadastro/edição manual → cria histórico
-- =========================================================
CREATE OR REPLACE FUNCTION public.tr_insumo_espelha_historico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Só espelha quando temos data + fornecedor (entrada manual completa)
  IF NEW.data_compra IS NULL OR NEW.fornecedor IS NULL OR NEW.fornecedor = '' THEN
    RETURN NEW;
  END IF;

  -- Em UPDATE, só cria histórico se preço/quantidade/data/fornecedor mudaram
  IF TG_OP = 'UPDATE' THEN
    IF NEW.preco_pago IS NOT DISTINCT FROM OLD.preco_pago
       AND NEW.quantidade IS NOT DISTINCT FROM OLD.quantidade
       AND NEW.fornecedor IS NOT DISTINCT FROM OLD.fornecedor
       AND NEW.data_compra IS NOT DISTINCT FROM OLD.data_compra THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Evita duplicação: já existe no histórico?
  IF EXISTS (
    SELECT 1 FROM public.insumos_compras_historico
     WHERE insumo_id = NEW.id
       AND data_compra = NEW.data_compra
       AND fornecedor IS NOT DISTINCT FROM NEW.fornecedor
       AND preco_unitario = NEW.preco_pago
       AND quantidade = NEW.quantidade
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.insumos_compras_historico (
    insumo_id, user_id, unidade_id,
    nome_original, quantidade, unidade_medida,
    preco_unitario, preco_total,
    fornecedor, data_compra
  ) VALUES (
    NEW.id, NEW.user_id, NEW.unidade_id,
    NEW.nome, NEW.quantidade, NEW.unidade,
    CASE WHEN NEW.quantidade > 0 THEN NEW.preco_pago / NEW.quantidade ELSE NEW.preco_pago END,
    NEW.preco_pago,
    NEW.fornecedor, NEW.data_compra
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_insumo_espelha_historico ON public.insumos_comprados;
CREATE TRIGGER trg_insumo_espelha_historico
AFTER INSERT OR UPDATE ON public.insumos_comprados
FOR EACH ROW EXECUTE FUNCTION public.tr_insumo_espelha_historico();

-- =========================================================
-- 3) Backfill: cria histórico para insumos sem histórico
-- =========================================================
INSERT INTO public.insumos_compras_historico (
  insumo_id, user_id, unidade_id, nome_original,
  quantidade, unidade_medida, preco_unitario, preco_total,
  fornecedor, data_compra
)
SELECT
  ic.id, ic.user_id, ic.unidade_id, ic.nome,
  COALESCE(ic.quantidade, 1), ic.unidade,
  CASE WHEN COALESCE(ic.quantidade, 0) > 0 THEN ic.preco_pago / ic.quantidade ELSE ic.preco_pago END,
  ic.preco_pago,
  ic.fornecedor, COALESCE(ic.data_compra, ic.created_at::date, CURRENT_DATE)
FROM public.insumos_comprados ic
WHERE ic.unidade_id IS NOT NULL
  AND ic.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.insumos_compras_historico h WHERE h.insumo_id = ic.id
  );

-- =========================================================
-- 4) View canônica
-- =========================================================
CREATE OR REPLACE VIEW public.vw_insumos_canonicos AS
WITH ult AS (
  SELECT DISTINCT ON (insumo_id)
    insumo_id, data_compra, fornecedor, preco_unitario, nome_original, id AS hist_id
  FROM public.insumos_compras_historico
  ORDER BY insumo_id, data_compra DESC, created_at DESC
),
ant AS (
  SELECT insumo_id, preco_unitario AS preco_anterior
  FROM (
    SELECT insumo_id, preco_unitario,
           row_number() OVER (PARTITION BY insumo_id ORDER BY data_compra DESC, created_at DESC) AS rn
    FROM public.insumos_compras_historico
  ) x WHERE rn = 2
),
fichas AS (
  SELECT insumo_comprado_id AS insumo_id, count(*)::int AS n
  FROM (
    SELECT insumo_comprado_id FROM public.fichas_tecnicas_pizza_ingredientes WHERE insumo_comprado_id IS NOT NULL
    UNION ALL
    SELECT insumo_comprado_id FROM public.fichas_tecnicas_produtos_ingredientes WHERE insumo_comprado_id IS NOT NULL
    UNION ALL
    SELECT insumo_comprado_id FROM public.bordas_ingredientes WHERE insumo_comprado_id IS NOT NULL
    UNION ALL
    SELECT insumo_comprado_id FROM public.bases_ficha_ingredientes WHERE insumo_comprado_id IS NOT NULL
    UNION ALL
    SELECT insumo_comprado_id FROM public.insumos_proprios_ingredientes WHERE insumo_comprado_id IS NOT NULL
  ) t
  GROUP BY insumo_comprado_id
)
SELECT
  ic.id, ic.nome, ic.nome_canonico, ic.categoria, ic.unidade, ic.quantidade,
  ic.preco_pago AS preco_atual,
  ic.fornecedor AS ultimo_fornecedor,
  ic.data_compra AS ultima_compra,
  ic.preco_medio, ic.preco_minimo, ic.preco_maximo, ic.total_compras,
  ic.unidade_id, ic.user_id, ic.created_at, ic.updated_at,
  ant.preco_anterior,
  CASE
    WHEN ant.preco_anterior IS NULL OR ant.preco_anterior = 0 THEN NULL
    ELSE ((ic.preco_pago - ant.preco_anterior) / ant.preco_anterior) * 100
  END AS variacao_pct,
  COALESCE(fichas.n, 0) AS usado_em_fichas
FROM public.insumos_comprados ic
LEFT JOIN ult ON ult.insumo_id = ic.id
LEFT JOIN ant ON ant.insumo_id = ic.id
LEFT JOIN fichas ON fichas.insumo_id = ic.id;

GRANT SELECT ON public.vw_insumos_canonicos TO authenticated;

-- =========================================================
-- 5) Tabela de duplicados ignorados
-- =========================================================
CREATE TABLE IF NOT EXISTS public.duplicados_ignorados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  insumo_a_id uuid NOT NULL,
  insumo_b_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT duplicados_ignorados_par_unico UNIQUE (unidade_id, insumo_a_id, insumo_b_id)
);

ALTER TABLE public.duplicados_ignorados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "di_select" ON public.duplicados_ignorados FOR SELECT
  USING (is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY "di_insert" ON public.duplicados_ignorados FOR INSERT
  WITH CHECK ((auth.uid() = user_id) AND pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY "di_delete" ON public.duplicados_ignorados FOR DELETE
  USING (pode_editar_negocio(auth.uid(), unidade_id));