
UPDATE public.insumos_comprados SET unidade = 'unidade' WHERE unidade IN ('UN','Un','un');
UPDATE public.insumos_comprados SET unidade = 'kg'      WHERE unidade IN ('KG','Kg');
UPDATE public.insumos_comprados SET unidade = 'g'       WHERE unidade IN ('G');
UPDATE public.insumos_comprados SET unidade = 'L'       WHERE unidade IN ('l');
UPDATE public.insumos_comprados SET unidade = 'ml'      WHERE unidade IN ('ML','Ml');

UPDATE public.insumos_comprados
SET categoria = 'Embalagens'
WHERE categoria = 'Outros' AND nome ILIKE '%copo%';

INSERT INTO public.lancamentos_financeiros
  (descricao, valor, tipo, categoria, data_lancamento, pago, user_id, unidade_id, classificacao_origem)
SELECT
  COALESCE(nome,'Item NF') || COALESCE(' - '||fornecedor,''),
  preco_pago,
  'despesa',
  CASE WHEN categoria IN ('Marketing','Publicidade') THEN 'Marketing' ELSE 'Outros' END,
  COALESCE(data_compra, CURRENT_DATE),
  true, user_id, unidade_id, 'manual'
FROM public.insumos_comprados
WHERE categoria NOT IN (
  'Proteínas','Laticínios','Hortifruti','Secos','Bebidas',
  'Molhos e Condimentos','Embalagens','Congelados','Confeitaria'
);

DELETE FROM public.insumos_comprados
WHERE categoria NOT IN (
  'Proteínas','Laticínios','Hortifruti','Secos','Bebidas',
  'Molhos e Condimentos','Embalagens','Congelados','Confeitaria'
);

CREATE OR REPLACE FUNCTION public.deduplicar_insumo_comprado()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_preco_unit_novo NUMERIC;
  v_dup RECORD;
  v_dup_ids UUID[] := ARRAY[]::UUID[];
  v_max_preco_unit NUMERIC := 0;
  v_nome_dup TEXT;
  v_unid_existente TEXT;
BEGIN
  IF NEW.quantidade IS NULL OR NEW.quantidade = 0 THEN
    RETURN NEW;
  END IF;
  v_preco_unit_novo := NEW.preco_pago / NEW.quantidade;

  SELECT unidade INTO v_unid_existente
  FROM public.insumos_comprados
  WHERE LOWER(TRIM(nome)) = LOWER(TRIM(NEW.nome))
    AND unidade_id IS NOT DISTINCT FROM NEW.unidade_id
    AND id <> NEW.id
    AND LOWER(unidade) <> LOWER(NEW.unidade)
  LIMIT 1;

  IF v_unid_existente IS NOT NULL THEN
    RAISE EXCEPTION
      'Já existe um insumo "%" cadastrado na unidade "%". Use a mesma unidade ou renomeie este item.',
      NEW.nome, v_unid_existente
      USING ERRCODE = 'check_violation';
  END IF;

  FOR v_dup IN
    SELECT id, nome, preco_pago, quantidade,
           CASE WHEN quantidade > 0 THEN preco_pago / quantidade ELSE 0 END AS preco_unit
    FROM public.insumos_comprados
    WHERE LOWER(TRIM(nome)) = LOWER(TRIM(NEW.nome))
      AND unidade_id IS NOT DISTINCT FROM NEW.unidade_id
      AND LOWER(unidade) = LOWER(NEW.unidade)
      AND id <> NEW.id
  LOOP
    v_dup_ids := array_append(v_dup_ids, v_dup.id);
    IF v_dup.preco_unit > v_max_preco_unit THEN
      v_max_preco_unit := v_dup.preco_unit;
      v_nome_dup := v_dup.nome;
    END IF;
  END LOOP;

  IF array_length(v_dup_ids, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_preco_unit_novo <= v_max_preco_unit THEN
    RAISE EXCEPTION
      'Já existe um insumo "%" cadastrado com preço unitário maior (R$ %/un). Para substituir, cadastre com preço unitário maior que R$ %.',
      v_nome_dup,
      ROUND(v_max_preco_unit::numeric, 4),
      ROUND(v_max_preco_unit::numeric, 4)
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.fichas_tecnicas_pizza_ingredientes SET insumo_comprado_id = NEW.id WHERE insumo_comprado_id = ANY(v_dup_ids);
  UPDATE public.fichas_tecnicas_produtos_ingredientes SET insumo_comprado_id = NEW.id WHERE insumo_comprado_id = ANY(v_dup_ids);
  UPDATE public.insumos_proprios_ingredientes SET insumo_comprado_id = NEW.id WHERE insumo_comprado_id = ANY(v_dup_ids);
  UPDATE public.bases_ficha_ingredientes SET insumo_comprado_id = NEW.id WHERE insumo_comprado_id = ANY(v_dup_ids);
  UPDATE public.precificacao_bebidas SET insumo_comprado_id = NEW.id WHERE insumo_comprado_id = ANY(v_dup_ids);
  UPDATE public.bordas_ingredientes SET insumo_comprado_id = NEW.id WHERE insumo_comprado_id = ANY(v_dup_ids);

  DELETE FROM public.insumos_comprados WHERE id = ANY(v_dup_ids);

  RETURN NEW;
END;
$function$;
