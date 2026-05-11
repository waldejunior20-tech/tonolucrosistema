-- Insumos faltantes (sem preço; nota fiscal completará depois)
INSERT INTO insumos_comprados (id, nome, categoria, unidade, quantidade, preco_pago, user_id, unidade_id)
VALUES 
  ('11111111-aaaa-1111-aaaa-111111111111', 'Provolone', 'Laticínios', 'kg', 1, 0, '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('22222222-bbbb-2222-bbbb-222222222222', 'Chocolate Preto', 'Confeitaria', 'kg', 1, 0, '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89')
ON CONFLICT (id) DO NOTHING;

INSERT INTO fichas_tecnicas_pizza (id, nome, tipo, user_id, unidade_id) VALUES ('f1c4a000-0000-4000-8000-000000000000', 'Americana', 'tradicional', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89');
INSERT INTO fichas_tecnicas_pizza_ingredientes (ficha_id, tipo_insumo, insumo_comprado_id, insumo_proprio_id, qtd_p, qtd_m, qtd_g, unidade, user_id, unidade_id) VALUES
  ('f1c4a000-0000-4000-8000-000000000000', 'proprio', NULL, '6b77bd2f-3b4f-4c8c-9606-4d4c01407a13', 200, 300, 380, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a000-0000-4000-8000-000000000000', 'comprado', '0ea11365-2853-41f0-b27a-121fd986b307', NULL, 50, 75, 120, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a000-0000-4000-8000-000000000000', 'comprado', '87852452-7f51-48c2-b0d0-eee8ff6bf31e', NULL, 190, 200, 250, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a000-0000-4000-8000-000000000000', 'comprado', '04cc1bb7-caed-49e2-826e-b20ced5d9c7b', NULL, 180, 240, 280, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a000-0000-4000-8000-000000000000', 'comprado', 'd7fc324f-02fb-44f8-9619-caa244a0c8d1', NULL, 4, 6, 8, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a000-0000-4000-8000-000000000000', 'embalagem_p', 'b3b0ff68-d3fd-4370-bab4-c38606446cf1', NULL, 1, 0, 0, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a000-0000-4000-8000-000000000000', 'embalagem_m', 'e7aa1321-630d-437c-8ee6-8c165348b2c1', NULL, 0, 1, 0, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a000-0000-4000-8000-000000000000', 'embalagem_g', '6a1f68a7-f9a5-4e41-a716-c3eb0c693fce', NULL, 0, 0, 1, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a000-0000-4000-8000-000000000000', 'comprado', 'c82061da-5e7d-45e2-96d4-94fff09ce4c2', NULL, 1, 1, 1, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a000-0000-4000-8000-000000000000', 'comprado', '2f8e4faf-07a2-43e5-9467-bc8093967480', NULL, 5, 5, 5, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a000-0000-4000-8000-000000000000', 'comprado', '4b32d08a-c8db-4089-ab1e-ecaf31c831f5', NULL, 5, 5, 5, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89');
INSERT INTO fichas_tecnicas_pizza (id, nome, tipo, user_id, unidade_id) VALUES ('f1c4a001-0000-4000-8000-000000000000', 'Mineira', 'tradicional', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89');
INSERT INTO fichas_tecnicas_pizza_ingredientes (ficha_id, tipo_insumo, insumo_comprado_id, insumo_proprio_id, qtd_p, qtd_m, qtd_g, unidade, user_id, unidade_id) VALUES
  ('f1c4a001-0000-4000-8000-000000000000', 'proprio', NULL, '6b77bd2f-3b4f-4c8c-9606-4d4c01407a13', 200, 300, 380, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a001-0000-4000-8000-000000000000', 'comprado', '0ea11365-2853-41f0-b27a-121fd986b307', NULL, 50, 75, 120, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a001-0000-4000-8000-000000000000', 'comprado', '04cc1bb7-caed-49e2-826e-b20ced5d9c7b', NULL, 280, 240, 280, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a001-0000-4000-8000-000000000000', 'comprado', '551ee06d-5bac-4829-abdf-eab7fcb5d641', NULL, 80, 100, 130, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a001-0000-4000-8000-000000000000', 'comprado', '3dc01ae3-24d9-4ff2-be28-73e4621e75e8', NULL, 90, 110, 130, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a001-0000-4000-8000-000000000000', 'comprado', 'd7fc324f-02fb-44f8-9619-caa244a0c8d1', NULL, 4, 6, 8, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a001-0000-4000-8000-000000000000', 'embalagem_p', 'b3b0ff68-d3fd-4370-bab4-c38606446cf1', NULL, 1, 0, 0, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a001-0000-4000-8000-000000000000', 'embalagem_m', 'e7aa1321-630d-437c-8ee6-8c165348b2c1', NULL, 0, 1, 0, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a001-0000-4000-8000-000000000000', 'embalagem_g', '6a1f68a7-f9a5-4e41-a716-c3eb0c693fce', NULL, 0, 0, 1, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a001-0000-4000-8000-000000000000', 'comprado', 'c82061da-5e7d-45e2-96d4-94fff09ce4c2', NULL, 1, 1, 1, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a001-0000-4000-8000-000000000000', 'comprado', '2f8e4faf-07a2-43e5-9467-bc8093967480', NULL, 5, 5, 5, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a001-0000-4000-8000-000000000000', 'comprado', '4b32d08a-c8db-4089-ab1e-ecaf31c831f5', NULL, 5, 5, 5, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89');
INSERT INTO fichas_tecnicas_pizza (id, nome, tipo, user_id, unidade_id) VALUES ('f1c4a002-0000-4000-8000-000000000000', 'Milho', 'tradicional', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89');
INSERT INTO fichas_tecnicas_pizza_ingredientes (ficha_id, tipo_insumo, insumo_comprado_id, insumo_proprio_id, qtd_p, qtd_m, qtd_g, unidade, user_id, unidade_id) VALUES
  ('f1c4a002-0000-4000-8000-000000000000', 'proprio', NULL, '6b77bd2f-3b4f-4c8c-9606-4d4c01407a13', 200, 300, 380, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a002-0000-4000-8000-000000000000', 'comprado', '0ea11365-2853-41f0-b27a-121fd986b307', NULL, 50, 75, 120, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a002-0000-4000-8000-000000000000', 'comprado', '04cc1bb7-caed-49e2-826e-b20ced5d9c7b', NULL, 180, 240, 280, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a002-0000-4000-8000-000000000000', 'comprado', '3dc01ae3-24d9-4ff2-be28-73e4621e75e8', NULL, 90, 110, 130, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a002-0000-4000-8000-000000000000', 'comprado', 'd7fc324f-02fb-44f8-9619-caa244a0c8d1', NULL, 4, 6, 8, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a002-0000-4000-8000-000000000000', 'embalagem_p', 'b3b0ff68-d3fd-4370-bab4-c38606446cf1', NULL, 1, 0, 0, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a002-0000-4000-8000-000000000000', 'embalagem_m', 'e7aa1321-630d-437c-8ee6-8c165348b2c1', NULL, 0, 1, 0, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a002-0000-4000-8000-000000000000', 'embalagem_g', '6a1f68a7-f9a5-4e41-a716-c3eb0c693fce', NULL, 0, 0, 1, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a002-0000-4000-8000-000000000000', 'comprado', 'c82061da-5e7d-45e2-96d4-94fff09ce4c2', NULL, 1, 1, 1, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a002-0000-4000-8000-000000000000', 'comprado', '2f8e4faf-07a2-43e5-9467-bc8093967480', NULL, 5, 5, 5, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a002-0000-4000-8000-000000000000', 'comprado', '4b32d08a-c8db-4089-ab1e-ecaf31c831f5', NULL, 5, 5, 5, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89');
INSERT INTO fichas_tecnicas_pizza (id, nome, tipo, user_id, unidade_id) VALUES ('f1c4a003-0000-4000-8000-000000000000', 'Milho Cremoso', 'tradicional', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89');
INSERT INTO fichas_tecnicas_pizza_ingredientes (ficha_id, tipo_insumo, insumo_comprado_id, insumo_proprio_id, qtd_p, qtd_m, qtd_g, unidade, user_id, unidade_id) VALUES
  ('f1c4a003-0000-4000-8000-000000000000', 'proprio', NULL, '6b77bd2f-3b4f-4c8c-9606-4d4c01407a13', 200, 300, 380, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a003-0000-4000-8000-000000000000', 'comprado', '0ea11365-2853-41f0-b27a-121fd986b307', NULL, 50, 75, 120, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a003-0000-4000-8000-000000000000', 'comprado', '04cc1bb7-caed-49e2-826e-b20ced5d9c7b', NULL, 180, 240, 280, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a003-0000-4000-8000-000000000000', 'comprado', '3dc01ae3-24d9-4ff2-be28-73e4621e75e8', NULL, 90, 110, 130, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a003-0000-4000-8000-000000000000', 'comprado', '908f9076-dddd-4d02-9546-f73d537fe4aa', NULL, 135, 150, 170, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a003-0000-4000-8000-000000000000', 'comprado', 'd7fc324f-02fb-44f8-9619-caa244a0c8d1', NULL, 4, 6, 8, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a003-0000-4000-8000-000000000000', 'embalagem_p', 'b3b0ff68-d3fd-4370-bab4-c38606446cf1', NULL, 1, 0, 0, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a003-0000-4000-8000-000000000000', 'embalagem_m', 'e7aa1321-630d-437c-8ee6-8c165348b2c1', NULL, 0, 1, 0, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a003-0000-4000-8000-000000000000', 'embalagem_g', '6a1f68a7-f9a5-4e41-a716-c3eb0c693fce', NULL, 0, 0, 1, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a003-0000-4000-8000-000000000000', 'comprado', 'c82061da-5e7d-45e2-96d4-94fff09ce4c2', NULL, 1, 1, 1, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a003-0000-4000-8000-000000000000', 'comprado', '2f8e4faf-07a2-43e5-9467-bc8093967480', NULL, 5, 5, 5, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a003-0000-4000-8000-000000000000', 'comprado', '4b32d08a-c8db-4089-ab1e-ecaf31c831f5', NULL, 5, 5, 5, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89');
INSERT INTO fichas_tecnicas_pizza (id, nome, tipo, user_id, unidade_id) VALUES ('f1c4a004-0000-4000-8000-000000000000', 'Palmito', 'tradicional', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89');
INSERT INTO fichas_tecnicas_pizza_ingredientes (ficha_id, tipo_insumo, insumo_comprado_id, insumo_proprio_id, qtd_p, qtd_m, qtd_g, unidade, user_id, unidade_id) VALUES
  ('f1c4a004-0000-4000-8000-000000000000', 'proprio', NULL, '6b77bd2f-3b4f-4c8c-9606-4d4c01407a13', 200, 300, 380, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a004-0000-4000-8000-000000000000', 'comprado', '0ea11365-2853-41f0-b27a-121fd986b307', NULL, 50, 75, 120, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a004-0000-4000-8000-000000000000', 'comprado', '4e21f42c-a76d-43f2-b329-93b7537d51b6', NULL, 150, 180, 230, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a004-0000-4000-8000-000000000000', 'comprado', 'd7fc324f-02fb-44f8-9619-caa244a0c8d1', NULL, 4, 6, 8, 'g', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a004-0000-4000-8000-000000000000', 'embalagem_p', 'b3b0ff68-d3fd-4370-bab4-c38606446cf1', NULL, 1, 0, 0, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a004-0000-4000-8000-000000000000', 'embalagem_m', 'e7aa1321-630d-437c-8ee6-8c165348b2c1', NULL, 0, 1, 0, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a004-0000-4000-8000-000000000000', 'embalagem_g', '6a1f68a7-f9a5-4e41-a716-c3eb0c693fce', NULL, 0, 0, 1, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a004-0000-4000-8000-000000000000', 'comprado', 'c82061da-5e7d-45e2-96d4-94fff09ce4c2', NULL, 1, 1, 1, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a004-0000-4000-8000-000000000000', 'comprado', '2f8e4faf-07a2-43e5-9467-bc8093967480', NULL, 5, 5, 5, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89'),
  ('f1c4a004-0000-4000-8000-000000000000', 'comprado', '4b32d08a-c8db-4089-ab1e-ecaf31c831f5', NULL, 5, 5, 5, 'unidade', '02d4f95c-7e32-41af-a442-3d2c93b7f767', 'c3ccdb1b-3376-4892-9f2f-9815fde2ba89');
