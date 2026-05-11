
-- 1) Apagar duplicadas (manter as novas f1c4a*)
DELETE FROM fichas_tecnicas_pizza_ingredientes WHERE ficha_id IN (
  '8029f326-5b10-42ca-af75-a457f00e28c5',
  '3a906136-5172-4fc6-9ba4-921b62a2fb72',
  'd3d19fb2-aa1c-459b-a932-a35aabf9040e'
);
DELETE FROM fichas_tecnicas_pizza WHERE id IN (
  '8029f326-5b10-42ca-af75-a457f00e28c5',
  '3a906136-5172-4fc6-9ba4-921b62a2fb72',
  'd3d19fb2-aa1c-459b-a932-a35aabf9040e'
);

-- 2) Insumo novo: Calabresa Gourmet (sem preço, qtd placeholder 1 para passar NOT NULL)
INSERT INTO insumos_comprados (id, nome, categoria, unidade, quantidade, preco_pago, fornecedor, data_compra, user_id, unidade_id)
VALUES ('aaaaaaaa-1111-4444-aaaa-cccccccccccc','Calabresa Gourmet','Proteínas','kg',1,0,'A definir',CURRENT_DATE,'02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89')
ON CONFLICT (id) DO NOTHING;

-- 3) Fichas técnicas (14 pizzas restantes)
INSERT INTO fichas_tecnicas_pizza (id, nome, tipo, user_id, unidade_id) VALUES
('f1c4a020-0000-4000-8000-000000000000','Portuguesa','tradicional','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a021-0000-4000-8000-000000000000','Mexicana','especial','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a022-0000-4000-8000-000000000000','Quatro Queijos','especial','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a023-0000-4000-8000-000000000000','Cinco Queijos','especial','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a024-0000-4000-8000-000000000000','Lombo Catupiry Barbecue','especial','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a025-0000-4000-8000-000000000000','À Moda da Casa','premium','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a026-0000-4000-8000-000000000000','Carne Seca com Catupiry','premium','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a027-0000-4000-8000-000000000000','Chocolate','doce','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a028-0000-4000-8000-000000000000','Chocolate com Morango','doce','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a029-0000-4000-8000-000000000000','Creme de Avelã','doce','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a02a-0000-4000-8000-000000000000','KitKat','doce','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a02b-0000-4000-8000-000000000000','Doce de Leite','doce','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a02c-0000-4000-8000-000000000000','Banana com Canela','doce','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89');

-- ingredientes
-- Helper UUIDs:
-- molho tomate 0ea11365 / mussarela 04cc1bb7 / oregano d7fc324f / catupiry(req sta maria) 908f9076
-- presunto 87852452 / milho 3dc01ae3 / pimentao 8ac2bf13 / ovo 643b1d91 / cebola ebcb4cba
-- calabresa gourmet aaaaaaaa-1111-4444-aaaa-cccccccccccc
-- parmesao 174bbc8d / cream cheese 6aeeefee / provolone 11111111-aaaa
-- lombo 9792ea27 / molho barbecue d5915236
-- frango (proprio) 47766ae6 / bacon e044faf9 / batata palha b060ffbd / tomate 551ee06d / carne seca ae0186b6
-- creme leite e1f55c94 / chocolate preto 22222222 / cr avelã a211d1d3 / morango 2167473b / kitkat 3a7030f2 / doce leite 262e9e88 / banana df678226 / acucar a65116f6 / canela 03bbc5f6 / leite cond 00cdd8f0
-- massa proprio 6b77bd2f / caixa P b3b0ff68 / caixa M e7aa1321 / caixa G 6a1f68a7
-- ketchup 2f8e4faf / maionese 4b32d08a / mesinha c82061da

INSERT INTO fichas_tecnicas_pizza_ingredientes (ficha_id, tipo_insumo, insumo_comprado_id, insumo_proprio_id, qtd_p, qtd_m, qtd_g, unidade, user_id, unidade_id) VALUES
-- Portuguesa
('f1c4a020-0000-4000-8000-000000000000','proprio',NULL,'6b77bd2f-3b4f-4c8c-9606-4d4c01407a13',200,300,380,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a020-0000-4000-8000-000000000000','comprado','87852452-7f51-48c2-b0d0-eee8ff6bf31e',NULL,120,140,190,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a020-0000-4000-8000-000000000000','comprado','04cc1bb7-caed-49e2-826e-b20ced5d9c7b',NULL,180,240,280,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a020-0000-4000-8000-000000000000','comprado','3dc01ae3-24d9-4ff2-be28-73e4621e75e8',NULL,70,90,120,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a020-0000-4000-8000-000000000000','comprado','8ac2bf13-7a45-4387-8667-12aedcfb78c1',NULL,20,40,70,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a020-0000-4000-8000-000000000000','comprado','643b1d91-fa3f-4e4b-bce9-de1c76278300',NULL,2,3,3,'unidade','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a020-0000-4000-8000-000000000000','comprado','ebcb4cba-8ebe-4311-9784-630556b8b84a',NULL,120,160,200,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a020-0000-4000-8000-000000000000','comprado','d7fc324f-02fb-44f8-9619-caa244a0c8d1',NULL,4,6,8,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
-- Mexicana
('f1c4a021-0000-4000-8000-000000000000','proprio',NULL,'6b77bd2f-3b4f-4c8c-9606-4d4c01407a13',200,300,380,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a021-0000-4000-8000-000000000000','comprado','04cc1bb7-caed-49e2-826e-b20ced5d9c7b',NULL,180,240,280,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a021-0000-4000-8000-000000000000','comprado','aaaaaaaa-1111-4444-aaaa-cccccccccccc',NULL,120,190,270,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a021-0000-4000-8000-000000000000','comprado','8ac2bf13-7a45-4387-8667-12aedcfb78c1',NULL,100,160,210,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a021-0000-4000-8000-000000000000','comprado','ebcb4cba-8ebe-4311-9784-630556b8b84a',NULL,120,180,200,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a021-0000-4000-8000-000000000000','comprado','d7fc324f-02fb-44f8-9619-caa244a0c8d1',NULL,4,6,8,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
-- Quatro Queijos
('f1c4a022-0000-4000-8000-000000000000','proprio',NULL,'6b77bd2f-3b4f-4c8c-9606-4d4c01407a13',200,300,380,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a022-0000-4000-8000-000000000000','comprado','04cc1bb7-caed-49e2-826e-b20ced5d9c7b',NULL,160,180,220,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a022-0000-4000-8000-000000000000','comprado','174bbc8d-8dd1-4bb6-bead-cab8bb6f0cef',NULL,40,60,80,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a022-0000-4000-8000-000000000000','comprado','908f9076-dddd-4d02-9546-f73d537fe4aa',NULL,180,260,280,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a022-0000-4000-8000-000000000000','comprado','6aeeefee-8d67-46a1-aef3-cdc7e9b401b3',NULL,160,180,220,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a022-0000-4000-8000-000000000000','comprado','d7fc324f-02fb-44f8-9619-caa244a0c8d1',NULL,4,6,8,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
-- Cinco Queijos
('f1c4a023-0000-4000-8000-000000000000','proprio',NULL,'6b77bd2f-3b4f-4c8c-9606-4d4c01407a13',200,300,380,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a023-0000-4000-8000-000000000000','comprado','04cc1bb7-caed-49e2-826e-b20ced5d9c7b',NULL,180,180,180,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a023-0000-4000-8000-000000000000','comprado','174bbc8d-8dd1-4bb6-bead-cab8bb6f0cef',NULL,50,75,100,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a023-0000-4000-8000-000000000000','comprado','908f9076-dddd-4d02-9546-f73d537fe4aa',NULL,40,60,80,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a023-0000-4000-8000-000000000000','comprado','6aeeefee-8d67-46a1-aef3-cdc7e9b401b3',NULL,120,160,180,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a023-0000-4000-8000-000000000000','comprado','11111111-aaaa-1111-aaaa-111111111111',NULL,180,240,280,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a023-0000-4000-8000-000000000000','comprado','d7fc324f-02fb-44f8-9619-caa244a0c8d1',NULL,5,7,10,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
-- Lombo Catupiry Barbecue
('f1c4a024-0000-4000-8000-000000000000','proprio',NULL,'6b77bd2f-3b4f-4c8c-9606-4d4c01407a13',200,300,380,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a024-0000-4000-8000-000000000000','comprado','04cc1bb7-caed-49e2-826e-b20ced5d9c7b',NULL,180,240,280,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a024-0000-4000-8000-000000000000','comprado','9792ea27-6f72-4c50-89d1-7e4a4a0e6058',NULL,60,100,130,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a024-0000-4000-8000-000000000000','comprado','908f9076-dddd-4d02-9546-f73d537fe4aa',NULL,135,150,170,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a024-0000-4000-8000-000000000000','comprado','d5915236-6234-4221-bc97-209245605ea0',NULL,50,90,120,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a024-0000-4000-8000-000000000000','comprado','d7fc324f-02fb-44f8-9619-caa244a0c8d1',NULL,4,6,8,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
-- À Moda da Casa
('f1c4a025-0000-4000-8000-000000000000','proprio',NULL,'6b77bd2f-3b4f-4c8c-9606-4d4c01407a13',200,300,380,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a025-0000-4000-8000-000000000000','proprio',NULL,'47766ae6-e341-4d12-9973-52d0759fea36',180,270,360,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a025-0000-4000-8000-000000000000','comprado','551ee06d-5bac-4829-abdf-eab7fcb5d641',NULL,80,100,130,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a025-0000-4000-8000-000000000000','comprado','908f9076-dddd-4d02-9546-f73d537fe4aa',NULL,135,150,170,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a025-0000-4000-8000-000000000000','comprado','04cc1bb7-caed-49e2-826e-b20ced5d9c7b',NULL,180,240,280,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a025-0000-4000-8000-000000000000','comprado','e044faf9-be6d-40e4-b227-5bb52cde89db',NULL,60,90,120,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a025-0000-4000-8000-000000000000','comprado','aaaaaaaa-1111-4444-aaaa-cccccccccccc',NULL,60,80,90,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a025-0000-4000-8000-000000000000','comprado','8ac2bf13-7a45-4387-8667-12aedcfb78c1',NULL,50,70,90,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a025-0000-4000-8000-000000000000','comprado','ebcb4cba-8ebe-4311-9784-630556b8b84a',NULL,120,150,200,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a025-0000-4000-8000-000000000000','comprado','d7fc324f-02fb-44f8-9619-caa244a0c8d1',NULL,4,6,8,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
-- Carne Seca com Catupiry
('f1c4a026-0000-4000-8000-000000000000','proprio',NULL,'6b77bd2f-3b4f-4c8c-9606-4d4c01407a13',200,300,380,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a026-0000-4000-8000-000000000000','comprado','04cc1bb7-caed-49e2-826e-b20ced5d9c7b',NULL,180,240,280,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a026-0000-4000-8000-000000000000','comprado','ae0186b6-1581-46d1-840f-e3abf4978298',NULL,80,120,160,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a026-0000-4000-8000-000000000000','comprado','908f9076-dddd-4d02-9546-f73d537fe4aa',NULL,135,150,170,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a026-0000-4000-8000-000000000000','comprado','d7fc324f-02fb-44f8-9619-caa244a0c8d1',NULL,4,6,8,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
-- DOCES (sem ketchup/maionese/mesinha)
-- Chocolate
('f1c4a027-0000-4000-8000-000000000000','proprio',NULL,'6b77bd2f-3b4f-4c8c-9606-4d4c01407a13',200,300,380,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a027-0000-4000-8000-000000000000','comprado','e1f55c94-d648-4d2c-bf91-114f9319e2c0',NULL,50,75,120,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a027-0000-4000-8000-000000000000','comprado','22222222-bbbb-2222-bbbb-222222222222',NULL,320,400,500,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
-- Chocolate com Morango
('f1c4a028-0000-4000-8000-000000000000','proprio',NULL,'6b77bd2f-3b4f-4c8c-9606-4d4c01407a13',200,300,380,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a028-0000-4000-8000-000000000000','comprado','e1f55c94-d648-4d2c-bf91-114f9319e2c0',NULL,50,75,120,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a028-0000-4000-8000-000000000000','comprado','a211d1d3-a2b8-49a8-8acd-7988083cab79',NULL,320,400,500,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a028-0000-4000-8000-000000000000','comprado','2167473b-2e63-45fb-9f60-044833617e05',NULL,100,150,200,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
-- Creme de Avelã
('f1c4a029-0000-4000-8000-000000000000','proprio',NULL,'6b77bd2f-3b4f-4c8c-9606-4d4c01407a13',200,300,380,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a029-0000-4000-8000-000000000000','comprado','e1f55c94-d648-4d2c-bf91-114f9319e2c0',NULL,50,75,120,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a029-0000-4000-8000-000000000000','comprado','a211d1d3-a2b8-49a8-8acd-7988083cab79',NULL,320,400,500,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
-- KitKat
('f1c4a02a-0000-4000-8000-000000000000','proprio',NULL,'6b77bd2f-3b4f-4c8c-9606-4d4c01407a13',200,300,380,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a02a-0000-4000-8000-000000000000','comprado','e1f55c94-d648-4d2c-bf91-114f9319e2c0',NULL,50,75,120,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a02a-0000-4000-8000-000000000000','comprado','a211d1d3-a2b8-49a8-8acd-7988083cab79',NULL,75,120,150,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a02a-0000-4000-8000-000000000000','comprado','3a7030f2-8748-4eae-bfd4-fa526448217f',NULL,3,4,5,'unidade','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
-- Doce de Leite
('f1c4a02b-0000-4000-8000-000000000000','proprio',NULL,'6b77bd2f-3b4f-4c8c-9606-4d4c01407a13',200,300,380,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a02b-0000-4000-8000-000000000000','comprado','e1f55c94-d648-4d2c-bf91-114f9319e2c0',NULL,50,75,120,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a02b-0000-4000-8000-000000000000','comprado','262e9e88-5986-42b4-9048-3cf4e5a99359',NULL,320,400,500,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
-- Banana com Canela
('f1c4a02c-0000-4000-8000-000000000000','proprio',NULL,'6b77bd2f-3b4f-4c8c-9606-4d4c01407a13',200,300,380,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a02c-0000-4000-8000-000000000000','comprado','04cc1bb7-caed-49e2-826e-b20ced5d9c7b',NULL,150,240,280,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a02c-0000-4000-8000-000000000000','comprado','df678226-2ad9-49b6-aa3d-cb751c63c657',NULL,200,280,320,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a02c-0000-4000-8000-000000000000','comprado','a65116f6-6459-49e1-96a0-aa1901d4c24f',NULL,10,20,30,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a02c-0000-4000-8000-000000000000','comprado','03bbc5f6-8937-4fe0-867c-8127824b3d70',NULL,10,20,30,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
('f1c4a02c-0000-4000-8000-000000000000','comprado','00cdd8f0-e24d-4ffa-b495-e8e03352f398',NULL,15,20,30,'g','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89');

-- 4) Embalagens (1 caixa do tamanho correspondente — todas as 13 fichas)
INSERT INTO fichas_tecnicas_pizza_ingredientes (ficha_id, tipo_insumo, insumo_comprado_id, qtd_p, qtd_m, qtd_g, unidade, user_id, unidade_id)
SELECT id,'embalagem_p','b3b0ff68-d3fd-4370-bab4-c38606446cf1',1,0,0,'unidade','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'
FROM fichas_tecnicas_pizza WHERE id::text LIKE 'f1c4a02%' OR id='f1c4a020-0000-4000-8000-000000000000';

INSERT INTO fichas_tecnicas_pizza_ingredientes (ficha_id, tipo_insumo, insumo_comprado_id, qtd_p, qtd_m, qtd_g, unidade, user_id, unidade_id)
SELECT id,'embalagem_m','e7aa1321-630d-437c-8ee6-8c165348b2c1',0,1,0,'unidade','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'
FROM fichas_tecnicas_pizza WHERE id::text LIKE 'f1c4a02%' OR id='f1c4a020-0000-4000-8000-000000000000';

INSERT INTO fichas_tecnicas_pizza_ingredientes (ficha_id, tipo_insumo, insumo_comprado_id, qtd_p, qtd_m, qtd_g, unidade, user_id, unidade_id)
SELECT id,'embalagem_g','6a1f68a7-f9a5-4e41-a716-c3eb0c693fce',0,0,1,'unidade','02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'
FROM fichas_tecnicas_pizza WHERE id::text LIKE 'f1c4a02%' OR id='f1c4a020-0000-4000-8000-000000000000';

-- 5) Adicionais (5 ketchup, 5 maionese, 1 mesinha) — só para salgadas (não doces)
INSERT INTO fichas_tecnicas_pizza_ingredientes (ficha_id, tipo_insumo, insumo_comprado_id, qtd_p, qtd_m, qtd_g, unidade, user_id, unidade_id)
SELECT fid, 'comprado', insid, q, q, q, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767','c3ccdb1b-3376-4892-9f2f-9815fde2ba89'
FROM (VALUES
  ('f1c4a020-0000-4000-8000-000000000000'::uuid),
  ('f1c4a021-0000-4000-8000-000000000000'::uuid),
  ('f1c4a022-0000-4000-8000-000000000000'::uuid),
  ('f1c4a023-0000-4000-8000-000000000000'::uuid),
  ('f1c4a024-0000-4000-8000-000000000000'::uuid),
  ('f1c4a025-0000-4000-8000-000000000000'::uuid),
  ('f1c4a026-0000-4000-8000-000000000000'::uuid)
) AS f(fid)
CROSS JOIN (VALUES
  ('2f8e4faf-07a2-43e5-9467-bc8093967480'::uuid, 5),
  ('4b32d08a-c8db-4089-ab1e-ecaf31c831f5'::uuid, 5),
  ('c82061da-5e7d-45e2-96d4-94fff09ce4c2'::uuid, 1)
) AS i(insid, q);
