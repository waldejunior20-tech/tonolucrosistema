INSERT INTO public.bases_ficha_ingredientes
  (base_id, tipo_insumo, insumo_comprado_id, insumo_proprio_id, qtd_p, qtd_m, qtd_g, unidade, ordem, unidade_id, user_id)
SELECT
  'b5767411-5bca-4916-accc-d52eaff6e1f3',
  'proprio',
  NULL,
  '6b77bd2f-3b4f-4c8c-9606-4d4c01407a13',
  200, 300, 380, 'g',
  -1,
  bf.unidade_id,
  bf.user_id
FROM public.bases_ficha bf
WHERE bf.id = 'b5767411-5bca-4916-accc-d52eaff6e1f3';