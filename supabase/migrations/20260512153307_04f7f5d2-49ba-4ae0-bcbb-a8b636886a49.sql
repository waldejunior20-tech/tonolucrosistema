
CREATE OR REPLACE FUNCTION public.map_categoria_insumo_subcategoria(p_cat text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE lower(coalesce(p_cat,''))
    WHEN 'proteínas' THEN 'Açougue/Proteínas'
    WHEN 'proteinas' THEN 'Açougue/Proteínas'
    WHEN 'laticínios' THEN 'Laticínios'
    WHEN 'laticinios' THEN 'Laticínios'
    WHEN 'hortifruti' THEN 'Hortifruti'
    WHEN 'secos' THEN 'Mercearia'
    WHEN 'bebidas' THEN 'Bebidas'
    WHEN 'molhos e condimentos' THEN 'Molhos e Condimentos'
    WHEN 'embalagens' THEN 'Embalagens'
    WHEN 'congelados' THEN 'Congelados'
    WHEN 'confeitaria' THEN 'Confeitaria'
    ELSE coalesce(nullif(p_cat,''), 'Outros Insumos')
  END;
$$;

CREATE OR REPLACE FUNCTION public.aplicar_fornecedor_subcategoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_forn text;
  v_norm text;
  v_map record;
  v_cat_invalida boolean;
BEGIN
  IF NEW.tipo <> 'despesa' OR NEW.unidade_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.categoria = 'Insumos' AND NEW.subcategoria IS NOT NULL
     AND NEW.subcategoria <> '' AND NEW.subcategoria <> 'A Classificar' THEN
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
  ELSIF NOT v_cat_invalida AND NEW.categoria <> 'Insumos' THEN
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
$function$;

DO $$
DECLARE
  r RECORD;
  v_count INT;
BEGIN
  FOR r IN
    SELECT lf.id, lf.user_id, lf.unidade_id, lf.data_lancamento, lf.descricao, lf.valor, lf.pago
      FROM public.lancamentos_financeiros lf
     WHERE lf.tipo = 'despesa'
       AND lf.categoria IN ('Insumos','Fornecedor')
       AND (lf.descricao ILIKE 'Cupom Fiscal%' OR lf.descricao ILIKE 'Nota fiscal%')
  LOOP
    SELECT COUNT(*) INTO v_count
      FROM public.insumos_comprados ic
     WHERE ic.unidade_id = r.unidade_id
       AND ic.data_compra = r.data_lancamento
       AND public.normalizar_nome_fornecedor(ic.fornecedor)
           = public.normalizar_nome_fornecedor(public.extrair_fornecedor_da_descricao(r.descricao));

    IF v_count > 0 THEN
      INSERT INTO public.lancamentos_financeiros
        (user_id, unidade_id, tipo, categoria, subcategoria, descricao, valor, data_lancamento, pago, classificacao_origem)
      SELECT
        r.user_id, r.unidade_id, 'despesa', 'Insumos',
        public.map_categoria_insumo_subcategoria(ic.categoria),
        ic.nome || ' - ' || COALESCE(ic.fornecedor, 'Sem fornecedor'),
        ic.preco_pago, r.data_lancamento, r.pago, 'backfill'
      FROM public.insumos_comprados ic
     WHERE ic.unidade_id = r.unidade_id
       AND ic.data_compra = r.data_lancamento
       AND public.normalizar_nome_fornecedor(ic.fornecedor)
           = public.normalizar_nome_fornecedor(public.extrair_fornecedor_da_descricao(r.descricao));

      DELETE FROM public.lancamentos_financeiros WHERE id = r.id;
    END IF;
  END LOOP;
END $$;
