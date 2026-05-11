
-- 1. Tabela de mapeamento Fornecedor -> Subcategoria
CREATE TABLE IF NOT EXISTS public.fornecedores_subcategoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  unidade_id uuid NOT NULL,
  fornecedor_normalizado text NOT NULL,
  fornecedor_nome_original text NOT NULL,
  categoria text NOT NULL,
  subcategoria text,
  aprendido_automaticamente boolean NOT NULL DEFAULT false,
  vezes_usado integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unidade_id, fornecedor_normalizado)
);

ALTER TABLE public.fornecedores_subcategoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY fs_select ON public.fornecedores_subcategoria FOR SELECT
  USING (public.is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY fs_insert ON public.fornecedores_subcategoria FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY fs_update ON public.fornecedores_subcategoria FOR UPDATE
  USING (public.pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY fs_delete ON public.fornecedores_subcategoria FOR DELETE
  USING (public.pode_editar_negocio(auth.uid(), unidade_id));

CREATE TRIGGER trg_fs_updated BEFORE UPDATE ON public.fornecedores_subcategoria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Função: extrair fornecedor da descrição
CREATE OR REPLACE FUNCTION public.extrair_fornecedor_da_descricao(p_descricao text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v text;
BEGIN
  IF p_descricao IS NULL THEN RETURN NULL; END IF;
  -- Pega o que vem depois do último " - "
  v := regexp_replace(p_descricao, '^.*\s-\s', '');
  v := trim(v);
  IF v = '' OR v = p_descricao THEN
    -- Sem " - ", devolve a descrição inteira (curta)
    v := trim(p_descricao);
  END IF;
  RETURN v;
END;
$$;

-- 3. Função: normalizar nome do fornecedor
CREATE OR REPLACE FUNCTION public.normalizar_nome_fornecedor(p_nome text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE v text;
BEGIN
  IF p_nome IS NULL THEN RETURN NULL; END IF;
  v := lower(trim(p_nome));
  -- Remove sufixos societários comuns
  v := regexp_replace(v, '\s+(ltda|me|epp|s\.?a\.?|eireli|mei|comercio|comercial|industria|distribuidora)\.?(\s|$)', ' ', 'gi');
  v := regexp_replace(v, '\s+e\s+derivados\s*$', '', 'gi');
  v := regexp_replace(v, '[\.\,]', '', 'g');
  v := regexp_replace(v, '\s+', ' ', 'g');
  v := trim(v);
  RETURN v;
END;
$$;

-- 4. Trigger: aplicar mapeamento + aprender
CREATE OR REPLACE FUNCTION public.aplicar_fornecedor_subcategoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_forn text;
  v_norm text;
  v_map record;
  v_cat_invalida boolean;
BEGIN
  IF NEW.tipo <> 'despesa' OR NEW.unidade_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_forn := public.extrair_fornecedor_da_descricao(NEW.descricao);
  v_norm := public.normalizar_nome_fornecedor(v_forn);
  IF v_norm IS NULL OR length(v_norm) < 3 THEN
    RETURN NEW;
  END IF;

  v_cat_invalida := (NEW.categoria IS NULL OR NEW.categoria = ''
                     OR lower(NEW.categoria) IN ('outros','fornecedor','a classificar')
                     OR NEW.subcategoria IS NULL OR NEW.subcategoria = ''
                     OR NEW.subcategoria = 'A Classificar');

  -- Tenta aplicar mapeamento existente
  SELECT * INTO v_map
    FROM public.fornecedores_subcategoria
   WHERE unidade_id = NEW.unidade_id
     AND fornecedor_normalizado = v_norm
   LIMIT 1;

  IF FOUND AND v_cat_invalida THEN
    NEW.categoria := COALESCE(NULLIF(v_map.categoria,''), NEW.categoria);
    NEW.subcategoria := COALESCE(NULLIF(v_map.subcategoria,''), NEW.subcategoria);
    UPDATE public.fornecedores_subcategoria
       SET vezes_usado = vezes_usado + 1, updated_at = now()
     WHERE id = v_map.id;
  ELSIF NOT v_cat_invalida THEN
    -- Aprende: cria/atualiza mapeamento
    INSERT INTO public.fornecedores_subcategoria
      (user_id, unidade_id, fornecedor_normalizado, fornecedor_nome_original,
       categoria, subcategoria, aprendido_automaticamente)
    VALUES
      (COALESCE(NEW.user_id, auth.uid()), NEW.unidade_id, v_norm, v_forn,
       NEW.categoria, NEW.subcategoria, true)
    ON CONFLICT (unidade_id, fornecedor_normalizado) DO UPDATE
      SET categoria = EXCLUDED.categoria,
          subcategoria = EXCLUDED.subcategoria,
          vezes_usado = public.fornecedores_subcategoria.vezes_usado + 1,
          updated_at = now()
      WHERE public.fornecedores_subcategoria.aprendido_automaticamente = true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_aplicar_fornecedor_sub ON public.lancamentos_financeiros;
CREATE TRIGGER trg_aplicar_fornecedor_sub
  BEFORE INSERT OR UPDATE ON public.lancamentos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_fornecedor_subcategoria();

-- 5. Backfill: aprende a partir dos lançamentos existentes que já têm subcategoria boa
INSERT INTO public.fornecedores_subcategoria
  (user_id, unidade_id, fornecedor_normalizado, fornecedor_nome_original,
   categoria, subcategoria, aprendido_automaticamente, vezes_usado)
SELECT DISTINCT ON (lf.unidade_id, public.normalizar_nome_fornecedor(public.extrair_fornecedor_da_descricao(lf.descricao)))
  lf.user_id,
  lf.unidade_id,
  public.normalizar_nome_fornecedor(public.extrair_fornecedor_da_descricao(lf.descricao)) AS forn_norm,
  public.extrair_fornecedor_da_descricao(lf.descricao) AS forn_orig,
  lf.categoria,
  lf.subcategoria,
  true,
  1
FROM public.lancamentos_financeiros lf
WHERE lf.tipo = 'despesa'
  AND lf.unidade_id IS NOT NULL
  AND lf.user_id IS NOT NULL
  AND lf.subcategoria IS NOT NULL
  AND lf.subcategoria <> 'A Classificar'
  AND lf.categoria IS NOT NULL
  AND lower(lf.categoria) NOT IN ('outros','fornecedor','a classificar')
  AND public.normalizar_nome_fornecedor(public.extrair_fornecedor_da_descricao(lf.descricao)) IS NOT NULL
  AND length(public.normalizar_nome_fornecedor(public.extrair_fornecedor_da_descricao(lf.descricao))) >= 3
ORDER BY lf.unidade_id, forn_norm, lf.created_at DESC
ON CONFLICT (unidade_id, fornecedor_normalizado) DO NOTHING;

-- 6. Backfill nos lançamentos antigos sem subcategoria
UPDATE public.lancamentos_financeiros lf
SET categoria = COALESCE(NULLIF(fs.categoria,''), lf.categoria),
    subcategoria = COALESCE(NULLIF(fs.subcategoria,''), lf.subcategoria),
    updated_at = now()
FROM public.fornecedores_subcategoria fs
WHERE lf.tipo = 'despesa'
  AND lf.unidade_id = fs.unidade_id
  AND public.normalizar_nome_fornecedor(public.extrair_fornecedor_da_descricao(lf.descricao)) = fs.fornecedor_normalizado
  AND (lf.subcategoria IS NULL OR lf.subcategoria = '' OR lf.subcategoria = 'A Classificar'
       OR lower(coalesce(lf.categoria,'')) IN ('outros','fornecedor','a classificar'));
