-- 1) Coluna subcategoria nas fichas de produtos
ALTER TABLE public.fichas_tecnicas_produtos
  ADD COLUMN IF NOT EXISTS subcategoria TEXT;

CREATE INDEX IF NOT EXISTS idx_ftpr_categoria_subcategoria
  ON public.fichas_tecnicas_produtos (categoria, subcategoria);

-- 2) Seeds de fichas-exemplo (idempotente por numero_ficha = 'EXEMPLO-...')

-- Pizzas: 1 por tipo
WITH contas AS (
  SELECT DISTINCT user_id, unidade_id
  FROM public.configuracoes_negocio
  WHERE user_id IS NOT NULL AND unidade_id IS NOT NULL
), tipos AS (
  SELECT * FROM (VALUES
    ('tradicional', 'Mussarela (Exemplo)'),
    ('especial',    'Calabresa Especial (Exemplo)'),
    ('premium',     'Parma com Rúcula (Exemplo)'),
    ('doce',        'Chocolate com Morango (Exemplo)')
  ) AS t(tipo, nome)
)
INSERT INTO public.fichas_tecnicas_pizza (user_id, unidade_id, nome, tipo, numero_ficha)
SELECT c.user_id, c.unidade_id, t.nome, t.tipo, 'EXEMPLO-PIZZA-' || upper(t.tipo)
FROM contas c CROSS JOIN tipos t
WHERE NOT EXISTS (
  SELECT 1 FROM public.fichas_tecnicas_pizza f
  WHERE f.user_id = c.user_id AND f.unidade_id = c.unidade_id
    AND f.numero_ficha = 'EXEMPLO-PIZZA-' || upper(t.tipo)
);

-- Produtos: 1 por (categoria, subcategoria)
WITH contas AS (
  SELECT DISTINCT user_id, unidade_id
  FROM public.configuracoes_negocio
  WHERE user_id IS NOT NULL AND unidade_id IS NOT NULL
), produtos AS (
  SELECT * FROM (VALUES
    ('sanduiche', 'tradicional', 'X-Burger (Exemplo)'),
    ('sanduiche', 'especial',    'X-Bacon Especial (Exemplo)'),
    ('sanduiche', 'premium',     'Smash Premium (Exemplo)'),
    ('sanduiche', 'vegano',      'Burger Vegano (Exemplo)'),
    ('prato',     'executivo',   'Filé com Fritas (Exemplo)'),
    ('prato',     'a_la_carte',  'Picanha na Chapa (Exemplo)'),
    ('prato',     'massa',       'Spaghetti à Bolonhesa (Exemplo)'),
    ('prato',     'salada',      'Salada Caesar (Exemplo)'),
    ('sobremesa', 'gelada',      'Mousse de Maracujá (Exemplo)'),
    ('sobremesa', 'quente',      'Petit Gâteau (Exemplo)'),
    ('sobremesa', 'especial',    'Cheesecake (Exemplo)'),
    ('bebida',    'suco',        'Suco de Laranja (Exemplo)'),
    ('bebida',    'refrigerante','Refrigerante Lata (Exemplo)'),
    ('bebida',    'drink',       'Caipirinha (Exemplo)'),
    ('bebida',    'cerveja',     'Chopp Pilsen (Exemplo)')
  ) AS p(categoria, subcategoria, nome)
)
INSERT INTO public.fichas_tecnicas_produtos (user_id, unidade_id, categoria, subcategoria, nome, numero_ficha)
SELECT c.user_id, c.unidade_id, p.categoria, p.subcategoria, p.nome,
       'EXEMPLO-' || upper(p.categoria) || '-' || upper(p.subcategoria)
FROM contas c CROSS JOIN produtos p
WHERE NOT EXISTS (
  SELECT 1 FROM public.fichas_tecnicas_produtos f
  WHERE f.user_id = c.user_id AND f.unidade_id = c.unidade_id
    AND f.numero_ficha = 'EXEMPLO-' || upper(p.categoria) || '-' || upper(p.subcategoria)
);