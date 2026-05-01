CREATE OR REPLACE FUNCTION public.deduplicar_insumo_comprado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preco_unit_novo NUMERIC;
  v_dup RECORD;
  v_dup_ids UUID[] := ARRAY[]::UUID[];
  v_max_preco_unit NUMERIC := 0;
  v_nome_dup TEXT;
BEGIN
  -- Preço unitário normalizado do novo registro
  IF NEW.quantidade IS NULL OR NEW.quantidade = 0 THEN
    RETURN NEW;
  END IF;
  v_preco_unit_novo := NEW.preco_pago / NEW.quantidade;

  -- Procura duplicatas: mesmo nome (case-insensitive, trim) na mesma unidade_id, exceto a própria linha
  FOR v_dup IN
    SELECT id, nome, preco_pago, quantidade,
           CASE WHEN quantidade > 0 THEN preco_pago / quantidade ELSE 0 END AS preco_unit
    FROM public.insumos_comprados
    WHERE LOWER(TRIM(nome)) = LOWER(TRIM(NEW.nome))
      AND unidade_id IS NOT DISTINCT FROM NEW.unidade_id
      AND id <> NEW.id
  LOOP
    v_dup_ids := array_append(v_dup_ids, v_dup.id);
    IF v_dup.preco_unit > v_max_preco_unit THEN
      v_max_preco_unit := v_dup.preco_unit;
      v_nome_dup := v_dup.nome;
    END IF;
  END LOOP;

  -- Sem duplicatas: segue
  IF array_length(v_dup_ids, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Bloqueia se o novo NÃO for estritamente maior
  IF v_preco_unit_novo <= v_max_preco_unit THEN
    RAISE EXCEPTION
      'Já existe um insumo "%" cadastrado com preço unitário maior (R$ %/un). Para substituir, cadastre com preço unitário maior que R$ %.',
      v_nome_dup,
      ROUND(v_max_preco_unit::numeric, 4),
      ROUND(v_max_preco_unit::numeric, 4)
      USING ERRCODE = 'check_violation';
  END IF;

  -- Reaponta fichas técnicas para o novo insumo (NEW.id)
  UPDATE public.fichas_tecnicas_pizza_ingredientes
     SET insumo_comprado_id = NEW.id
   WHERE insumo_comprado_id = ANY(v_dup_ids);

  UPDATE public.fichas_tecnicas_produtos_ingredientes
     SET insumo_comprado_id = NEW.id
   WHERE insumo_comprado_id = ANY(v_dup_ids);

  UPDATE public.insumos_proprios_ingredientes
     SET insumo_comprado_id = NEW.id
   WHERE insumo_comprado_id = ANY(v_dup_ids);

  UPDATE public.bases_ficha_ingredientes
     SET insumo_comprado_id = NEW.id
   WHERE insumo_comprado_id = ANY(v_dup_ids);

  UPDATE public.precificacao_bebidas
     SET insumo_comprado_id = NEW.id
   WHERE insumo_comprado_id = ANY(v_dup_ids);

  -- Apaga os duplicados antigos
  DELETE FROM public.insumos_comprados WHERE id = ANY(v_dup_ids);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deduplicar_insumo ON public.insumos_comprados;
CREATE TRIGGER trg_deduplicar_insumo
BEFORE INSERT OR UPDATE OF nome, preco_pago, quantidade, unidade_id
ON public.insumos_comprados
FOR EACH ROW EXECUTE FUNCTION public.deduplicar_insumo_comprado();