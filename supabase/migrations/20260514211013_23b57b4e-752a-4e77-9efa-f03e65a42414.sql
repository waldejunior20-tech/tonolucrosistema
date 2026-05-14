
-- ============================================================
-- 1. regras_classificacao
-- ============================================================
CREATE TABLE IF NOT EXISTS public.regras_classificacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  escopo text NOT NULL CHECK (escopo IN ('fornecedor','item','fornecedor_item')),
  chave_normalizada text NOT NULL,
  fornecedor_original text,
  item_original text,
  destino text NOT NULL CHECK (destino IN ('insumo','embalagem','financeiro','conta_pagar')),
  categoria text,
  subcategoria text,
  confianca numeric NOT NULL DEFAULT 1.0,
  criado_por text NOT NULL DEFAULT 'usuario' CHECK (criado_por IN ('usuario','sistema')),
  aprovada boolean NOT NULL DEFAULT true,
  vezes_aplicada integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unidade_id, escopo, chave_normalizada)
);

CREATE INDEX IF NOT EXISTS idx_regras_class_unidade ON public.regras_classificacao(unidade_id);
CREATE INDEX IF NOT EXISTS idx_regras_class_chave ON public.regras_classificacao(chave_normalizada);

ALTER TABLE public.regras_classificacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY rc_select ON public.regras_classificacao FOR SELECT
  USING (is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY rc_insert ON public.regras_classificacao FOR INSERT
  WITH CHECK ((auth.uid() = user_id) AND pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY rc_update ON public.regras_classificacao FOR UPDATE
  USING (pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY rc_delete ON public.regras_classificacao FOR DELETE
  USING (pode_editar_negocio(auth.uid(), unidade_id));

CREATE TRIGGER trg_regras_class_updated
BEFORE UPDATE ON public.regras_classificacao
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. auditoria_importacao
-- ============================================================
CREATE TABLE IF NOT EXISTS public.auditoria_importacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  nota_fiscal_id uuid,
  origem text NOT NULL DEFAULT 'manual',
  itens_lidos integer NOT NULL DEFAULT 0,
  enviados_insumos integer NOT NULL DEFAULT 0,
  enviados_financeiro integer NOT NULL DEFAULT 0,
  pendentes_revisao integer NOT NULL DEFAULT 0,
  regras_aplicadas jsonb NOT NULL DEFAULT '[]'::jsonb,
  duplicados_sugeridos jsonb NOT NULL DEFAULT '[]'::jsonb,
  fichas_impactadas jsonb NOT NULL DEFAULT '[]'::jsonb,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_imp_unidade ON public.auditoria_importacao(unidade_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_imp_nota ON public.auditoria_importacao(nota_fiscal_id);

ALTER TABLE public.auditoria_importacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_select ON public.auditoria_importacao FOR SELECT
  USING (is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY ai_insert ON public.auditoria_importacao FOR INSERT
  WITH CHECK ((auth.uid() = user_id) AND is_member_of_unidade(auth.uid(), unidade_id));

-- ============================================================
-- 3. destino + confianca em insumos_compras_historico
-- ============================================================
ALTER TABLE public.insumos_compras_historico
  ADD COLUMN IF NOT EXISTS destino text NOT NULL DEFAULT 'insumo'
    CHECK (destino IN ('insumo','embalagem','financeiro','conta_pagar','revisar')),
  ADD COLUMN IF NOT EXISTS confianca_classificacao numeric,
  ADD COLUMN IF NOT EXISTS regra_aplicada_id uuid,
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_hist_destino ON public.insumos_compras_historico(destino);

-- ============================================================
-- 4. Trigger: aplicar regra aprovada ao gravar histórico
-- ============================================================
CREATE OR REPLACE FUNCTION public.tr_aplicar_regra_classificacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_chave_forn text;
  v_chave_item text;
  v_chave_fi   text;
  v_regra      record;
BEGIN
  -- normaliza chaves
  v_chave_forn := lower(trim(coalesce(NEW.fornecedor,'')));
  v_chave_item := public.normalizar_nome_insumo(coalesce(NEW.nome_original,''));
  v_chave_fi   := v_chave_forn || '||' || v_chave_item;

  -- 1. fornecedor + item (mais específico)
  SELECT * INTO v_regra
    FROM public.regras_classificacao
   WHERE unidade_id = NEW.unidade_id
     AND aprovada = true
     AND escopo = 'fornecedor_item'
     AND chave_normalizada = v_chave_fi
   LIMIT 1;

  -- 2. item
  IF NOT FOUND THEN
    SELECT * INTO v_regra
      FROM public.regras_classificacao
     WHERE unidade_id = NEW.unidade_id
       AND aprovada = true
       AND escopo = 'item'
       AND chave_normalizada = v_chave_item
     LIMIT 1;
  END IF;

  -- 3. fornecedor
  IF NOT FOUND THEN
    SELECT * INTO v_regra
      FROM public.regras_classificacao
     WHERE unidade_id = NEW.unidade_id
       AND aprovada = true
       AND escopo = 'fornecedor'
       AND chave_normalizada = v_chave_forn
     LIMIT 1;
  END IF;

  IF FOUND THEN
    NEW.destino := v_regra.destino;
    NEW.regra_aplicada_id := v_regra.id;
    IF NEW.confianca_classificacao IS NULL THEN
      NEW.confianca_classificacao := v_regra.confianca;
    END IF;
    UPDATE public.regras_classificacao
       SET vezes_aplicada = vezes_aplicada + 1,
           updated_at = now()
     WHERE id = v_regra.id;
  ELSE
    -- sem regra: se confiança baixa, marcar para revisar
    IF NEW.confianca_classificacao IS NOT NULL
       AND NEW.confianca_classificacao < 0.7
       AND NEW.destino = 'insumo' THEN
      NEW.destino := 'revisar';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_aplicar_regra_class ON public.insumos_compras_historico;
CREATE TRIGGER trg_aplicar_regra_class
BEFORE INSERT ON public.insumos_compras_historico
FOR EACH ROW EXECUTE FUNCTION public.tr_aplicar_regra_classificacao();

-- ============================================================
-- 5. View: histórico completo
-- ============================================================
CREATE OR REPLACE VIEW public.vw_historico_compras_completo AS
SELECT
  h.id,
  h.unidade_id,
  h.user_id,
  h.data_compra,
  h.fornecedor,
  h.nome_original,
  h.insumo_id,
  ic.nome AS insumo_canonico_nome,
  ic.categoria AS insumo_categoria,
  h.quantidade,
  h.unidade_medida,
  h.preco_unitario,
  h.preco_total,
  h.destino,
  h.origem,
  h.confianca_classificacao,
  h.regra_aplicada_id,
  h.nota_fiscal_id,
  nf.numero_nf,
  nf.cnpj_fornecedor,
  h.created_at
FROM public.insumos_compras_historico h
LEFT JOIN public.insumos_comprados ic ON ic.id = h.insumo_id
LEFT JOIN public.notas_fiscais nf ON nf.id = h.nota_fiscal_id;

GRANT SELECT ON public.vw_historico_compras_completo TO authenticated;

-- ============================================================
-- 6. View: itens a revisar
-- ============================================================
CREATE OR REPLACE VIEW public.vw_revisar_classificacoes AS
SELECT
  h.id,
  h.unidade_id,
  h.user_id,
  h.data_compra,
  h.fornecedor,
  h.nome_original,
  h.insumo_id,
  h.quantidade,
  h.unidade_medida,
  h.preco_unitario,
  h.preco_total,
  h.destino,
  h.origem,
  h.confianca_classificacao,
  h.nota_fiscal_id,
  ic.categoria AS categoria_atual,
  'historico'::text AS fonte
FROM public.insumos_compras_historico h
LEFT JOIN public.insumos_comprados ic ON ic.id = h.insumo_id
WHERE h.destino = 'revisar'
   OR (h.confianca_classificacao IS NOT NULL AND h.confianca_classificacao < 0.7);

GRANT SELECT ON public.vw_revisar_classificacoes TO authenticated;

-- ============================================================
-- 7. Função: aprovar/corrigir classificação de um item
-- ============================================================
CREATE OR REPLACE FUNCTION public.aprovar_classificacao_item(
  p_historico_id uuid,
  p_destino text,
  p_categoria text DEFAULT NULL,
  p_subcategoria text DEFAULT NULL,
  p_criar_regra boolean DEFAULT false,
  p_escopo_regra text DEFAULT 'item'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_h        record;
  v_user     uuid := auth.uid();
  v_chave    text;
  v_regra_id uuid;
BEGIN
  IF p_destino NOT IN ('insumo','embalagem','financeiro','conta_pagar') THEN
    RAISE EXCEPTION 'destino inválido: %', p_destino;
  END IF;

  SELECT * INTO v_h
    FROM public.insumos_compras_historico
   WHERE id = p_historico_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item de histórico não encontrado';
  END IF;

  IF NOT public.pode_editar_negocio(v_user, v_h.unidade_id) THEN
    RAISE EXCEPTION 'Sem permissão para revisar nesta unidade';
  END IF;

  -- atualiza destino do item (preserva histórico)
  UPDATE public.insumos_compras_historico
     SET destino = p_destino,
         confianca_classificacao = 1.0
   WHERE id = p_historico_id;

  -- atualiza categoria do canônico se aplicável
  IF p_destino = 'insumo' AND p_categoria IS NOT NULL AND v_h.insumo_id IS NOT NULL THEN
    UPDATE public.insumos_comprados
       SET categoria = p_categoria, updated_at = now()
     WHERE id = v_h.insumo_id;
  END IF;

  -- cria regra
  IF p_criar_regra THEN
    IF p_escopo_regra = 'fornecedor' THEN
      v_chave := lower(trim(coalesce(v_h.fornecedor,'')));
    ELSIF p_escopo_regra = 'fornecedor_item' THEN
      v_chave := lower(trim(coalesce(v_h.fornecedor,''))) || '||' ||
                 public.normalizar_nome_insumo(coalesce(v_h.nome_original,''));
    ELSE
      v_chave := public.normalizar_nome_insumo(coalesce(v_h.nome_original,''));
    END IF;

    INSERT INTO public.regras_classificacao (
      unidade_id, user_id, escopo, chave_normalizada,
      fornecedor_original, item_original,
      destino, categoria, subcategoria,
      confianca, criado_por, aprovada
    ) VALUES (
      v_h.unidade_id, v_user, p_escopo_regra, v_chave,
      v_h.fornecedor, v_h.nome_original,
      p_destino, p_categoria, p_subcategoria,
      1.0, 'usuario', true
    )
    ON CONFLICT (unidade_id, escopo, chave_normalizada)
    DO UPDATE SET destino = EXCLUDED.destino,
                  categoria = EXCLUDED.categoria,
                  subcategoria = EXCLUDED.subcategoria,
                  aprovada = true,
                  confianca = 1.0,
                  updated_at = now()
    RETURNING id INTO v_regra_id;
  END IF;

  RETURN json_build_object(
    'sucesso', true,
    'historico_id', p_historico_id,
    'destino', p_destino,
    'regra_id', v_regra_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.aprovar_classificacao_item(uuid, text, text, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aprovar_classificacao_item(uuid, text, text, text, boolean, text) TO authenticated;
