-- A. Hash de documento (idempotência por NF/cupom)
ALTER TABLE public.notas_fiscais
  ADD COLUMN IF NOT EXISTS documento_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_notas_fiscais_documento_hash
  ON public.notas_fiscais (unidade_id, documento_hash)
  WHERE documento_hash IS NOT NULL;

-- B. Motivo de revisão (separa fila de classificação vs preço suspeito)
ALTER TABLE public.insumos_compras_historico
  ADD COLUMN IF NOT EXISTS motivo_revisao text;

-- C. Auditoria estendida: preços bloqueados por importação
ALTER TABLE public.auditoria_importacao
  ADD COLUMN IF NOT EXISTS precos_bloqueados jsonb NOT NULL DEFAULT '[]'::jsonb;

-- D. Atualiza trigger de preço para marcar motivo
CREATE OR REPLACE FUNCTION public.tr_historico_atualiza_insumo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_preco_unit_atual numeric;
  v_preco_medio numeric;
  v_total_compras int;
  v_fator numeric;
BEGIN
  -- Só age em destinos que afetam o canônico
  IF NEW.destino IS DISTINCT FROM 'insumo' AND NEW.destino IS DISTINCT FROM 'embalagem' THEN
    RETURN NEW;
  END IF;

  IF NEW.insumo_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Estatísticas atuais
  SELECT
    COALESCE(preco_medio, NULLIF(preco_pago / NULLIF(quantidade,0), 0)),
    COALESCE(total_compras, 0)
  INTO v_preco_medio, v_total_compras
  FROM public.insumos_comprados
  WHERE id = NEW.insumo_id;

  -- Trava de preço absurdo: > 3x média (precisa de histórico mínimo)
  IF v_preco_medio IS NOT NULL AND v_preco_medio > 0 AND v_total_compras >= 2 THEN
    v_fator := NEW.preco_unitario / v_preco_medio;
    IF v_fator > 3 THEN
      -- Bloqueia atualização e marca para revisão
      UPDATE public.insumos_compras_historico
        SET destino = 'revisar',
            motivo_revisao = 'preco_suspeito'
       WHERE id = NEW.id;

      INSERT INTO public.auditoria_correcoes_precos
        (insumo_id, unidade_id, motivo, executado_por, detalhes)
      VALUES
        (NEW.insumo_id, NEW.unidade_id, 'preco_suspeito_bloqueado', NEW.user_id,
         jsonb_build_object(
           'preco_tentado', NEW.preco_unitario,
           'preco_medio_atual', v_preco_medio,
           'fator', v_fator,
           'historico_id', NEW.id,
           'fornecedor', NEW.fornecedor,
           'data_compra', NEW.data_compra
         ));
      RETURN NEW;
    END IF;
  END IF;

  -- Atualiza canônico: preco_pago = preco TOTAL desta compra; preco_medio recalculado
  UPDATE public.insumos_comprados ic
     SET preco_pago = NEW.preco_total,
         quantidade = NEW.quantidade,
         fornecedor = COALESCE(NEW.fornecedor, ic.fornecedor),
         data_compra = NEW.data_compra,
         total_compras = COALESCE(ic.total_compras,0) + 1,
         preco_minimo = LEAST(COALESCE(ic.preco_minimo, NEW.preco_unitario), NEW.preco_unitario),
         preco_maximo = GREATEST(COALESCE(ic.preco_maximo, NEW.preco_unitario), NEW.preco_unitario),
         preco_medio  = (
           SELECT AVG(h.preco_unitario)
             FROM public.insumos_compras_historico h
            WHERE h.insumo_id = NEW.insumo_id
              AND h.destino IN ('insumo','embalagem')
              AND COALESCE(h.motivo_revisao,'') <> 'preco_suspeito'
         ),
         updated_at = now()
   WHERE id = NEW.insumo_id;

  RETURN NEW;
END;
$function$;