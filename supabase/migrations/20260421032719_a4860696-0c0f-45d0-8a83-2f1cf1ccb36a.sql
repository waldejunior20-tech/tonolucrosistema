-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 001: AUDITORIA E ORIGEM
-- Adiciona created_by/source para distinguir escritas do user vs n8n
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.historico_precos_insumos
  ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE public.alertas_cmv
  ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS preco_sugerido_p NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS preco_sugerido_m NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS preco_sugerido_g NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS tipo_ficha TEXT NOT NULL DEFAULT 'pizza';

-- Trigger para manter alertas_cmv.updated_at automático
DROP TRIGGER IF EXISTS trg_alertas_cmv_updated_at ON public.alertas_cmv;
CREATE TRIGGER trg_alertas_cmv_updated_at
  BEFORE UPDATE ON public.alertas_cmv
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 002: ÍNDICES (idempotência + performance)
-- ═══════════════════════════════════════════════════════════════════

-- Idempotência: 1 linha por insumo por dia (timezone Brasília)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_hist_insumo_dia
  ON public.historico_precos_insumos
  (insumo_id, ((created_at AT TIME ZONE 'America/Sao_Paulo')::date));

-- Idempotência: 1 alerta por ficha+severidade por dia
CREATE UNIQUE INDEX IF NOT EXISTS uniq_alerta_ficha_status_dia
  ON public.alertas_cmv
  (ficha_tecnica_id, status, ((created_at AT TIME ZONE 'America/Sao_Paulo')::date));

-- Performance da cascata recursiva
CREATE INDEX IF NOT EXISTS idx_ftp_ing_insumo_comprado
  ON public.fichas_tecnicas_pizza_ingredientes (insumo_comprado_id);
CREATE INDEX IF NOT EXISTS idx_ftp_ing_insumo_proprio
  ON public.fichas_tecnicas_pizza_ingredientes (insumo_proprio_id);
CREATE INDEX IF NOT EXISTS idx_ftpd_ing_insumo_comprado
  ON public.fichas_tecnicas_produtos_ingredientes (insumo_comprado_id);
CREATE INDEX IF NOT EXISTS idx_ftpd_ing_insumo_proprio
  ON public.fichas_tecnicas_produtos_ingredientes (insumo_proprio_id);
CREATE INDEX IF NOT EXISTS idx_ipi_insumo_comprado
  ON public.insumos_proprios_ingredientes (insumo_comprado_id);
CREATE INDEX IF NOT EXISTS idx_ipi_insumo_proprio
  ON public.insumos_proprios_ingredientes (insumo_proprio_id);

-- Matching case-insensitive de nomes (para o n8n detectar "mussarela" = "Mussarela")
CREATE INDEX IF NOT EXISTS idx_insumos_nome_norm
  ON public.insumos_comprados (LOWER(TRIM(nome)), unidade_id, data_compra DESC);


-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 003: OBSERVABILIDADE (workflow_runs + warnings)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_name TEXT NOT NULL,
  trigger_source TEXT NOT NULL,
  trigger_record_id UUID,
  unidade_id UUID REFERENCES public.unidades(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('success','partial','failed','skipped_first_purchase','skipped_no_change')),
  fichas_processadas INT NOT NULL DEFAULT 0,
  fichas_com_erro JSONB NOT NULL DEFAULT '[]'::jsonb,
  alertas_criados INT NOT NULL DEFAULT 0,
  duration_ms INT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_unidade_started
  ON public.workflow_runs (unidade_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.fichas_tecnicas_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_tecnica_id UUID NOT NULL,
  tipo_ficha TEXT NOT NULL CHECK (tipo_ficha IN ('pizza','produto','bebida')),
  motivo TEXT NOT NULL,
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  resolvido BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE (ficha_tecnica_id, tipo_ficha, motivo)
);

CREATE INDEX IF NOT EXISTS idx_warnings_unidade_resolvido
  ON public.fichas_tecnicas_warnings (unidade_id, resolvido);

-- RLS: usuários só veem da própria unidade. n8n usa service_role e bypassa.
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas_tecnicas_warnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wr_select" ON public.workflow_runs;
CREATE POLICY "wr_select" ON public.workflow_runs FOR SELECT
  USING (public.is_member_of_unidade(auth.uid(), unidade_id));

DROP POLICY IF EXISTS "ftw_select" ON public.fichas_tecnicas_warnings;
CREATE POLICY "ftw_select" ON public.fichas_tecnicas_warnings FOR SELECT
  USING (public.is_member_of_unidade(auth.uid(), unidade_id));

-- UPDATE permitido para o user marcar warning como resolvido manualmente
DROP POLICY IF EXISTS "ftw_update" ON public.fichas_tecnicas_warnings;
CREATE POLICY "ftw_update" ON public.fichas_tecnicas_warnings FOR UPDATE
  USING (public.pode_editar_negocio(auth.uid(), unidade_id));


-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 004: TRIGGER DE INTEGRIDADE DE FICHA DE PIZZA
-- (não bloqueia INSERT — só registra warning)
-- Atenção: a coluna na tabela é `ficha_id`, não `ficha_tecnica_id`.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.validar_ficha_pizza_completa(p_ficha_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  tem_embalagem BOOLEAN;
  tem_insumo_real BOOLEAN;
BEGIN
  SELECT
    EXISTS(SELECT 1 FROM public.fichas_tecnicas_pizza_ingredientes
           WHERE ficha_id = p_ficha_id AND tipo_insumo LIKE 'embalagem_%'),
    EXISTS(SELECT 1 FROM public.fichas_tecnicas_pizza_ingredientes
           WHERE ficha_id = p_ficha_id AND tipo_insumo IN ('comprado','proprio'))
  INTO tem_embalagem, tem_insumo_real;

  RETURN tem_embalagem AND tem_insumo_real;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_reavaliar_ficha_pizza()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ficha_id UUID := COALESCE(NEW.ficha_id, OLD.ficha_id);
  v_unidade_id UUID;
BEGIN
  SELECT unidade_id INTO v_unidade_id
    FROM public.fichas_tecnicas_pizza
   WHERE id = v_ficha_id;

  IF v_unidade_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF NOT public.validar_ficha_pizza_completa(v_ficha_id) THEN
    INSERT INTO public.fichas_tecnicas_warnings
      (ficha_tecnica_id, tipo_ficha, motivo, unidade_id)
    VALUES
      (v_ficha_id, 'pizza', 'ficha_incompleta_embalagem_ou_insumo', v_unidade_id)
    ON CONFLICT (ficha_tecnica_id, tipo_ficha, motivo) DO UPDATE
      SET resolvido = FALSE, resolved_at = NULL;
  ELSE
    UPDATE public.fichas_tecnicas_warnings
       SET resolvido = TRUE, resolved_at = NOW()
     WHERE ficha_tecnica_id = v_ficha_id
       AND motivo = 'ficha_incompleta_embalagem_ou_insumo'
       AND NOT resolvido;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_reavaliar_ficha_pizza ON public.fichas_tecnicas_pizza_ingredientes;
CREATE TRIGGER trg_reavaliar_ficha_pizza
  AFTER INSERT OR UPDATE OR DELETE ON public.fichas_tecnicas_pizza_ingredientes
  FOR EACH ROW EXECUTE FUNCTION public.trigger_reavaliar_ficha_pizza();


-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 006: CATÁLOGO CANÔNICO DE INSUMOS
-- (a 005 é só consulta manual de fichas órfãs — não vai como migration)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.insumos_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_canonico TEXT UNIQUE NOT NULL,
  categoria TEXT,
  aliases TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  unidade_padrao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.insumos_comprados
  ADD COLUMN IF NOT EXISTS insumo_catalog_id UUID REFERENCES public.insumos_catalog(id);

CREATE INDEX IF NOT EXISTS idx_insumos_comprados_catalog
  ON public.insumos_comprados (insumo_catalog_id);

-- Catálogo é compartilhado entre unidades (lista canônica). Leitura pública para autenticados.
ALTER TABLE public.insumos_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ic_cat_select" ON public.insumos_catalog;
CREATE POLICY "ic_cat_select" ON public.insumos_catalog
  FOR SELECT TO authenticated USING (true);

-- Popular catálogo com nomes únicos existentes (categoria/unidade = mais frequente)
INSERT INTO public.insumos_catalog (nome_canonico, categoria, unidade_padrao)
SELECT
  INITCAP(TRIM(nome)) AS nome_canonico,
  MODE() WITHIN GROUP (ORDER BY categoria) AS categoria,
  MODE() WITHIN GROUP (ORDER BY unidade) AS unidade_padrao
FROM public.insumos_comprados
GROUP BY INITCAP(TRIM(nome))
ON CONFLICT (nome_canonico) DO NOTHING;

-- Linkar insumos existentes
UPDATE public.insumos_comprados ic
   SET insumo_catalog_id = ica.id
  FROM public.insumos_catalog ica
 WHERE LOWER(TRIM(ic.nome)) = LOWER(TRIM(ica.nome_canonico))
   AND ic.insumo_catalog_id IS NULL;