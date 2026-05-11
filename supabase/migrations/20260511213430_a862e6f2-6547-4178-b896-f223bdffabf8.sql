
UPDATE public.lancamentos_financeiros lf
SET categoria   = c.categoria,
    subcategoria = COALESCE(NULLIF(lf.subcategoria,''), c.subcategoria)
FROM public.lancamentos_financeiros lf2
CROSS JOIN LATERAL public.classificar_por_palavra_chave(lf2.descricao) c
WHERE lf.id = lf2.id
  AND lf.tipo = 'despesa'
  AND (lf.categoria = 'Outros' OR lf.categoria IS NULL OR lf.categoria = '')
  AND lf.descricao IS NOT NULL;
