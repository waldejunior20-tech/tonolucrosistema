DELETE FROM lancamentos_financeiros
WHERE id = '768390a4-c08d-464c-a356-c1b94ff17def';

INSERT INTO lancamentos_financeiros
  (user_id, unidade_id, tipo, categoria, subcategoria, descricao, valor, data_lancamento, pago, classificacao_origem, confianca_classificacao)
VALUES
  ('02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89',
   'despesa', 'Insumos', 'Hortifruti',
   'FLV PIMENTAO - SUPERMERCADO BRISA', 9.79, '2026-06-14', true, 'backfill', 1.0),
  ('02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89',
   'despesa', 'Insumos', 'Hortifruti',
   'FLV MORANGO CX 4 - SUPERMERCADO BRISA', 59.96, '2026-06-14', true, 'backfill', 1.0),
  ('02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89',
   'despesa', 'Insumos', 'Laticínios',
   'LEITE LONGA VIDA PIRACANJUBA INTEGRAL - SUPERMERCADO BRISA', 17.07, '2026-06-14', true, 'backfill', 1.0),
  ('02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89',
   'despesa', 'Insumos', 'Hortifruti',
   'FLV BANANA PRATA - SUPERMERCADO BRISA', 6.71, '2026-06-14', true, 'backfill', 1.0);

INSERT INTO insumos_compras_historico
  (insumo_id, user_id, unidade_id, nome_original, quantidade, unidade_medida, preco_unitario, preco_total, fornecedor, data_compra)
VALUES
  ('ccf45231-7a6d-4866-bbcc-0293d4952525', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89',
   'FLV PIMENTAO', 0.700, 'KG', 13.99, 9.79, 'SUPERMERCADO BRISA', '2026-06-14'),
  ('d7f743cf-6e1e-45c6-9ea0-f60442f5b0a7', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89',
   'FLV MORANGO CX 4', 4.000, 'UN', 14.99, 59.96, 'SUPERMERCADO BRISA', '2026-06-14'),
  ('938e73f9-350f-4b92-928e-2424a8a52fdb', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89',
   'LEITE LONGA VIDA PIRACANJUBA INTEGRAL', 3.000, 'L', 5.69, 17.07, 'SUPERMERCADO BRISA', '2026-06-14'),
  ('cdcbc848-d259-49d4-8b33-ac2aa25b3ddb', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89',
   'FLV BANANA PRATA', 0.960, 'KG', 6.99, 6.71, 'SUPERMERCADO BRISA', '2026-06-14');