INSERT INTO public.bases_ficha_ingredientes (
  base_id,
  tipo_insumo,
  insumo_comprado_id,
  insumo_proprio_id,
  qtd_p,
  qtd_m,
  qtd_g,
  unidade,
  ordem,
  unidade_id,
  user_id
)
SELECT
  bf.id,
  'proprio',
  NULL,
  ip.id,
  200,
  300,
  380,
  'g',
  -1,
  bf.unidade_id,
  bf.user_id
FROM public.bases_ficha bf
JOIN public.insumos_proprios ip
  ON ip.unidade_id = bf.unidade_id
 AND ip.nome ILIKE '%massa%pizza%'
WHERE bf.id = 'cbf1b4d7-74c2-4295-8c5c-1cd5f35df569'
  AND NOT EXISTS (
    SELECT 1
    FROM public.bases_ficha_ingredientes bfi
    WHERE bfi.base_id = bf.id
      AND bfi.insumo_proprio_id = ip.id
  )
LIMIT 1;