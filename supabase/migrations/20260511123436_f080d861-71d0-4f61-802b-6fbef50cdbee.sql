
-- ============================================================
-- 1. Tabela de taxonomia (categorias + subcategorias + keywords)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categorias_despesa (
  id SERIAL PRIMARY KEY,
  categoria VARCHAR(50) NOT NULL,
  subcategoria VARCHAR(80) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('despesa','receita')),
  palavras_chave TEXT[] NOT NULL DEFAULT '{}',
  emoji VARCHAR(10),
  cor_hex VARCHAR(7) DEFAULT '#6366f1',
  ordem INT DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(categoria, subcategoria)
);

CREATE INDEX IF NOT EXISTS idx_categorias_palavras ON public.categorias_despesa USING GIN (palavras_chave);
CREATE INDEX IF NOT EXISTS idx_categorias_tipo ON public.categorias_despesa(tipo, ativo);

ALTER TABLE public.categorias_despesa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cd_select_authenticated" ON public.categorias_despesa;
CREATE POLICY "cd_select_authenticated"
  ON public.categorias_despesa FOR SELECT
  TO authenticated USING (true);
-- escrita só via migration (sem policy)

-- ============================================================
-- 2. Seed das categorias
-- ============================================================
INSERT INTO public.categorias_despesa (categoria, subcategoria, tipo, palavras_chave, emoji, cor_hex, ordem) VALUES
('Insumos','Proteínas','despesa',ARRAY['carne','frango','peixe','linguiça','linguica','bacon','presunto','salame','calabresa','peru','suíno','suino','bovino','frios','peito','coxa','sobrecoxa','filé','file'],'🥩','#dc2626',1),
('Insumos','Laticínios','despesa',ARRAY['queijo','leite','manteiga','requeijão','requeijao','iogurte','creme de leite','nata','muçarela','mussarela','catupiry','parmesão','parmesao','cheddar','provolone'],'🧀','#fbbf24',2),
('Insumos','Hortifruti','despesa',ARRAY['tomate','cebola','alface','batata','fruta','verdura','legume','alho','pimenta','manjericão','manjericao','rúcula','rucula','cenoura','pimentão','pimentao','azeitona','milho','ervilha'],'🥬','#16a34a',3),
('Insumos','Secos & Mercearia','despesa',ARRAY['farinha','óleo','oleo','açúcar','acucar','sal','arroz','feijão','feijao','macarrão','macarrao','massa','fermento','tempero','molho de tomate','extrato'],'🌾','#a16207',4),
('Insumos','Bebidas','despesa',ARRAY['refrigerante','suco','água','agua','cerveja','vinho','coca','pepsi','guaraná','guarana','energético','energetico','heineken','brahma'],'🥤','#0891b2',5),
('Insumos','Embalagens','despesa',ARRAY['caixa','sacola','saco','papel','embalagem','copo descartável','descartavel','marmita','isopor','filme plástico','plastico','guardanapo'],'📦','#a855f7',6),
('Insumos','Congelados','despesa',ARRAY['congelado','sorvete','polpa','açaí','acai','batata frita congelada'],'🧊','#0ea5e9',7),
('Operacional','Energia Elétrica','despesa',ARRAY['luz','energia','enel','cpfl','elektro','light','eletropaulo','coelba','celpe','cemig','copel','rge','conta de luz'],'⚡','#eab308',10),
('Operacional','Água & Esgoto','despesa',ARRAY['água','agua','sabesp','sanepar','copasa','cedae','caesb','embasa','conta de agua'],'💧','#0284c7',11),
('Operacional','Gás','despesa',ARRAY['gás','gas','botijão','botijao','ultragaz','liquigás','liquigas','copagaz','glp','p13','p45','nacional gás'],'🔥','#f97316',12),
('Operacional','Internet & Telefone','despesa',ARRAY['internet','telefone','vivo','claro','tim','oi','net','sky','plano','wifi','fibra','celular','recarga'],'📡','#6366f1',13),
('Operacional','Aluguel','despesa',ARRAY['aluguel','locação','locacao','condomínio','condominio','iptu'],'🏠','#78716c',14),
('Operacional','Limpeza','despesa',ARRAY['detergente','sabão','sabao','desinfetante','álcool','alcool','água sanitária','sanitaria','luva','vassoura','rodo','produto de limpeza'],'🧽','#84cc16',15),
('Logística','Combustível','despesa',ARRAY['gasolina','etanol','diesel','álcool','alcool','posto','shell','ipiranga','br','petrobras','ale','combustível','combustivel','abastec'],'⛽','#ea580c',20),
('Logística','Manutenção Veicular','despesa',ARRAY['óleo','oleo','pneu','revisão','revisao','mecânico','mecanico','oficina','filtro','bateria','freio','alinhamento'],'🔧','#475569',21),
('Logística','Frete & Entrega','despesa',ARRAY['frete','entrega','motoboy','correios','sedex','transportadora','rappi entregador','loggi'],'🛵','#059669',22),
('Logística','Pedágios & Estacionamento','despesa',ARRAY['pedágio','pedagio','sem parar','conectcar','zona azul','estacionamento','rotativo'],'🚧','#facc15',23),
('Pessoal','Salários','despesa',ARRAY['salário','salario','pagamento funcionário','funcionario','folha','pró-labore','pro-labore','prolabore'],'💰','#16a34a',30),
('Pessoal','Vale-Transporte','despesa',ARRAY['vt','vale transporte','passe','cartão ônibus','onibus','bilhete único','unico'],'🚌','#0d9488',31),
('Pessoal','Vale-Refeição','despesa',ARRAY['vr','va','vale refeição','refeicao','vale alimentação','alimentacao','sodexo','alelo','ticket'],'🍽️','#ea580c',32),
('Pessoal','Encargos & Impostos','despesa',ARRAY['inss','fgts','irrf','impostos folha','encargos'],'📋','#64748b',33),
('Marketing','Publicidade Digital','despesa',ARRAY['meta ads','facebook ads','instagram ads','google ads','tiktok ads','impulsionamento','anúncio','anuncio'],'📱','#3b82f6',40),
('Marketing','Material Gráfico','despesa',ARRAY['panfleto','cartão visita','cartao visita','banner','adesivo','impressão','impressao','flyer'],'🎨','#ec4899',41),
('Marketing','Comissões iFood/Apps','despesa',ARRAY['ifood','rappi','99food','uber eats','aiqfome','goomer','comissão','comissao app','taxa app'],'📲','#dc2626',42),
('Administrativo','Software & Apps','despesa',ARRAY['software','assinatura','app','sistema','pdv','n8n','contabilidade online','saas','licença','licenca'],'💻','#7c3aed',50),
('Administrativo','Serviços Profissionais','despesa',ARRAY['contador','contabilidade','advogado','consultoria','contadora'],'👔','#0f172a',51),
('Administrativo','Tarifas Bancárias','despesa',ARRAY['tarifa','manutenção conta','manutencao conta','banco','taxa bancária','bancaria','anuidade'],'🏦','#1e293b',52),
('Administrativo','Cartão de Crédito','despesa',ARRAY['cartão de crédito','cartao de credito','fatura','nubank','itaú','itau','bradesco fatura'],'💳','#9333ea',53),
('Administrativo','Impostos','despesa',ARRAY['simples nacional','iss','icms','das','pis','cofins','imposto','daseu'],'📊','#525252',54),
('Manutenção','Equipamentos','despesa',ARRAY['forno','geladeira','freezer','fogão','fogao','liquidificador','batedeira','equipamento','conserto'],'🔌','#475569',60),
('Manutenção','Imóvel','despesa',ARRAY['pintura','reforma','obra','pedreiro','encanador','eletricista'],'🔨','#92400e',61),
('Manutenção','Utensílios','despesa',ARRAY['panela','faca','colher','tábua','tabua','prato','copo','utensílio','utensilio'],'🍳','#a8a29e',62),
('Receitas','Vendas Balcão','receita',ARRAY['vendi','recebi','venda','caixa do dia','faturei','faturamento','dinheiro','recebimento','débito','debito','crédito','credito','outros apps'],'💵','#22c55e',100),
('Receitas','Vendas Delivery','receita',ARRAY['ifood recebi','delivery','tele entrega','venda app','recebimento ifood','ifood'],'🛵','#10b981',101),
('Receitas','PIX Recebido','receita',ARRAY['pix recebido','pix entrou','recebi pix','transferência recebida','transferencia recebida','dinheiro/pix','pix'],'⚡','#14b8a6',102),
('Receitas','Outras Receitas','receita',ARRAY['aluguel recebido','juros','rendimento','outros recebimentos'],'💰','#059669',103),
('Outros','A Classificar','despesa',ARRAY[]::TEXT[],'❓','#6b7280',999)
ON CONFLICT (categoria, subcategoria) DO NOTHING;

-- ============================================================
-- 3. Colunas novas em lancamentos_financeiros
--    (mantemos a coluna 'tipo' existente — NÃO criamos tipo_movimento)
-- ============================================================
ALTER TABLE public.lancamentos_financeiros
  ADD COLUMN IF NOT EXISTS subcategoria VARCHAR(80),
  ADD COLUMN IF NOT EXISTS classificacao_origem VARCHAR(30) DEFAULT 'manual'
    CHECK (classificacao_origem IN ('manual','keyword','gemini','aprendizado','fallback','backfill')),
  ADD COLUMN IF NOT EXISTS confianca_classificacao NUMERIC(3,2) DEFAULT 1.0;

CREATE INDEX IF NOT EXISTS idx_lancamentos_categoria
  ON public.lancamentos_financeiros(categoria, subcategoria);
CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo_data
  ON public.lancamentos_financeiros(tipo, data_lancamento);

-- ============================================================
-- 4. Backfill: mapear lançamentos antigos pra nova taxonomia
--    "Vendas - Dinheiro/PIX"  -> Receitas / PIX Recebido
--    "Vendas - iFood"         -> Receitas / Vendas Delivery
--    "Vendas - Débito|Crédito|Outros Apps" -> Receitas / Vendas Balcão
--    Mantemos a categoria original na descricao? Não — fica em classificacao_origem='backfill'
-- ============================================================
UPDATE public.lancamentos_financeiros
SET subcategoria = 'PIX Recebido',
    categoria = 'Receitas',
    classificacao_origem = 'backfill'
WHERE tipo = 'receita'
  AND subcategoria IS NULL
  AND categoria ILIKE '%dinheiro%pix%';

UPDATE public.lancamentos_financeiros
SET subcategoria = 'Vendas Delivery',
    categoria = 'Receitas',
    classificacao_origem = 'backfill'
WHERE tipo = 'receita'
  AND subcategoria IS NULL
  AND categoria ILIKE '%ifood%';

UPDATE public.lancamentos_financeiros
SET subcategoria = 'Vendas Balcão',
    categoria = 'Receitas',
    classificacao_origem = 'backfill'
WHERE tipo = 'receita'
  AND subcategoria IS NULL
  AND (categoria ILIKE 'vendas%' OR categoria ILIKE '%débito%' OR categoria ILIKE '%debito%'
       OR categoria ILIKE '%crédito%' OR categoria ILIKE '%credito%' OR categoria ILIKE '%outros apps%');

-- Despesas antigas sem mapeamento → "Outros / A Classificar"
UPDATE public.lancamentos_financeiros
SET subcategoria = 'A Classificar',
    classificacao_origem = 'backfill'
WHERE subcategoria IS NULL AND tipo = 'despesa';

-- ============================================================
-- 5. Tabela de aprendizado (memória por usuário+unidade)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.aprendizado_categorizacao (
  id SERIAL PRIMARY KEY,
  fornecedor VARCHAR(200),
  cnpj VARCHAR(14),
  palavra_chave VARCHAR(100),
  categoria_aprendida VARCHAR(50) NOT NULL,
  subcategoria_aprendida VARCHAR(80) NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'despesa' CHECK (tipo IN ('despesa','receita')),
  ocorrencias INT DEFAULT 1,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  unidade_id UUID NOT NULL,
  ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fornecedor, user_id, unidade_id),
  UNIQUE(palavra_chave, user_id, unidade_id)
);

CREATE INDEX IF NOT EXISTS idx_aprendizado_unidade ON public.aprendizado_categorizacao(unidade_id);

ALTER TABLE public.aprendizado_categorizacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ac_select ON public.aprendizado_categorizacao;
CREATE POLICY ac_select ON public.aprendizado_categorizacao FOR SELECT
  USING (public.is_member_of_unidade(auth.uid(), unidade_id));

DROP POLICY IF EXISTS ac_insert ON public.aprendizado_categorizacao;
CREATE POLICY ac_insert ON public.aprendizado_categorizacao FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.pode_editar_negocio(auth.uid(), unidade_id));

DROP POLICY IF EXISTS ac_update ON public.aprendizado_categorizacao;
CREATE POLICY ac_update ON public.aprendizado_categorizacao FOR UPDATE
  USING (public.pode_editar_negocio(auth.uid(), unidade_id));

DROP POLICY IF EXISTS ac_delete ON public.aprendizado_categorizacao;
CREATE POLICY ac_delete ON public.aprendizado_categorizacao FOR DELETE
  USING (public.pode_editar_negocio(auth.uid(), unidade_id));

-- ============================================================
-- 6. RPC de classificação por palavra-chave
-- ============================================================
CREATE OR REPLACE FUNCTION public.classificar_por_palavra_chave(texto_input TEXT)
RETURNS TABLE (
  categoria VARCHAR,
  subcategoria VARCHAR,
  tipo VARCHAR,
  emoji VARCHAR,
  match_score INT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.categoria,
    c.subcategoria,
    c.tipo,
    c.emoji,
    (SELECT COUNT(*)::INT FROM unnest(c.palavras_chave) AS kw
     WHERE LOWER(texto_input) LIKE '%' || LOWER(kw) || '%') AS match_score
  FROM public.categorias_despesa c
  WHERE c.ativo = true
    AND EXISTS (
      SELECT 1 FROM unnest(c.palavras_chave) AS kw
      WHERE LOWER(texto_input) LIKE '%' || LOWER(kw) || '%'
    )
  ORDER BY match_score DESC, c.ordem ASC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.classificar_por_palavra_chave(TEXT) TO authenticated;

-- ============================================================
-- 7. View de resumo (security_invoker para respeitar RLS)
-- ============================================================
DROP VIEW IF EXISTS public.v_resumo_financeiro;
CREATE VIEW public.v_resumo_financeiro
WITH (security_invoker = true) AS
SELECT
  user_id,
  unidade_id,
  DATE_TRUNC('month', data_lancamento) AS mes,
  tipo,
  categoria,
  subcategoria,
  COUNT(*) AS transacoes,
  SUM(valor) AS total
FROM public.lancamentos_financeiros
GROUP BY user_id, unidade_id, mes, tipo, categoria, subcategoria;

GRANT SELECT ON public.v_resumo_financeiro TO authenticated;
