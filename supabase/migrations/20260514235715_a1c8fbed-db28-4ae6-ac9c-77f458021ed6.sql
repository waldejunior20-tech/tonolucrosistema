DROP VIEW IF EXISTS public.vw_revisar_classificacoes;
CREATE VIEW public.vw_revisar_classificacoes
WITH (security_invoker = true) AS
SELECT h.id,
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
    h.motivo_revisao,
    ic.categoria AS categoria_atual,
    ic.preco_medio AS preco_medio_canonico,
    'historico'::text AS fonte
   FROM insumos_compras_historico h
     LEFT JOIN insumos_comprados ic ON ic.id = h.insumo_id
  WHERE h.destino = 'revisar'::text
     OR (h.confianca_classificacao IS NOT NULL AND h.confianca_classificacao < 0.7);