
-- Habilita unaccent
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Adiciona coluna palavras_chave ao catálogo se não existir
ALTER TABLE public.insumos_catalog
  ADD COLUMN IF NOT EXISTS palavras_chave text[] DEFAULT '{}'::text[];

-- Função de normalização
CREATE OR REPLACE FUNCTION public.normalizar_nome_insumo(p text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT lower(unaccent(coalesce(regexp_replace(p, '[^a-zA-Z0-9 ]', ' ', 'g'),'')));
$$;

-- Seeds do catálogo (usa nome_canonico como chave)
INSERT INTO public.insumos_catalog (nome_canonico, categoria, palavras_chave, aliases) VALUES
  -- Laticínios
  ('Mussarela', 'Laticínios', ARRAY['mussarela','muçarela','mucarela','muzzarela'], ARRAY['mussarela barra','mussarela fatiada','queijo mussarela']),
  ('Queijo', 'Laticínios', ARRAY['queijo','parmesao','parmesão','provolone','gorgonzola','cheddar','prato','minas','catupiry','requeijao','requeijão','cream cheese','ricota'], ARRAY[]::text[]),
  ('Leite', 'Laticínios', ARRAY['leite','leite condensado','creme de leite','leite italact'], ARRAY[]::text[]),
  ('Manteiga', 'Laticínios', ARRAY['manteiga','margarina'], ARRAY[]::text[]),
  ('Iogurte', 'Laticínios', ARRAY['iogurte','yogurt'], ARRAY[]::text[]),
  -- Proteínas
  ('Frango', 'Proteínas', ARRAY['frango','peito de frango','file de frango','filé de frango','coxa','sobrecoxa'], ARRAY[]::text[]),
  ('Carne Bovina', 'Proteínas', ARRAY['carne','alcatra','patinho','coxao','coxão','acem','acém','musculo','músculo','file mignon','filé mignon','picanha','contra file','contra filé','maminha','fraldinha','hamburguer','hambúrguer','carne moida','carne moída'], ARRAY[]::text[]),
  ('Bacon', 'Proteínas', ARRAY['bacon','panceta'], ARRAY[]::text[]),
  ('Calabresa', 'Proteínas', ARRAY['calabresa','linguica','linguiça','salsicha'], ARRAY[]::text[]),
  ('Presunto', 'Proteínas', ARRAY['presunto','peito de peru','blanquet','apresuntado','mortadela','salame','copa'], ARRAY[]::text[]),
  ('Pepperoni', 'Proteínas', ARRAY['pepperoni','peperoni'], ARRAY[]::text[]),
  ('Atum', 'Proteínas', ARRAY['atum','sardinha'], ARRAY[]::text[]),
  ('Camarão', 'Proteínas', ARRAY['camarao','camarão'], ARRAY[]::text[]),
  ('Salmão', 'Proteínas', ARRAY['salmao','salmão','peixe','tilapia','tilápia','merluza'], ARRAY[]::text[]),
  ('Ovo', 'Proteínas', ARRAY['ovo','ovos'], ARRAY[]::text[]),
  -- Hortifruti
  ('Tomate', 'Hortifruti', ARRAY['tomate'], ARRAY[]::text[]),
  ('Cebola', 'Hortifruti', ARRAY['cebola'], ARRAY[]::text[]),
  ('Alho', 'Hortifruti', ARRAY['alho'], ARRAY[]::text[]),
  ('Pimentão', 'Hortifruti', ARRAY['pimentao','pimentão'], ARRAY[]::text[]),
  ('Manjericão', 'Hortifruti', ARRAY['manjericao','manjericão'], ARRAY[]::text[]),
  ('Rúcula', 'Hortifruti', ARRAY['rucula','rúcula'], ARRAY[]::text[]),
  ('Alface', 'Hortifruti', ARRAY['alface'], ARRAY[]::text[]),
  ('Cenoura', 'Hortifruti', ARRAY['cenoura'], ARRAY[]::text[]),
  ('Batata', 'Hortifruti', ARRAY['batata'], ARRAY[]::text[]),
  ('Limão', 'Hortifruti', ARRAY['limao','limão'], ARRAY[]::text[]),
  ('Cebolinha', 'Hortifruti', ARRAY['cebolinha','salsinha','salsa','coentro','hortela','hortelã'], ARRAY[]::text[]),
  ('Brócolis', 'Hortifruti', ARRAY['brocolis','brócolis','couve','espinafre'], ARRAY[]::text[]),
  ('Abacaxi', 'Hortifruti', ARRAY['abacaxi','banana','maca','maçã','laranja','morango','uva','manga','mamao','mamão'], ARRAY[]::text[]),
  -- Embalagens
  ('Caixa de Pizza', 'Embalagens', ARRAY['caixa pizza','caixa de pizza','embalagem pizza'], ARRAY[]::text[]),
  ('Copo Descartável', 'Embalagens', ARRAY['copo','copo 500','copo 300','copo descartavel','copo descartável'], ARRAY[]::text[]),
  ('Tampa', 'Embalagens', ARRAY['tampa'], ARRAY[]::text[]),
  ('Sacola', 'Embalagens', ARRAY['sacola','saco plastico','saco plástico'], ARRAY[]::text[]),
  ('Papel', 'Embalagens', ARRAY['papel','guardanapo','papel toalha','papel filme','papel aluminio','papel alumínio','filme pvc'], ARRAY[]::text[]),
  ('Canudo', 'Embalagens', ARRAY['canudo'], ARRAY[]::text[]),
  ('Marmita', 'Embalagens', ARRAY['marmita','marmitex','quentinha','isopor','potinho','pote'], ARRAY[]::text[]),
  ('Talher Descartável', 'Embalagens', ARRAY['talher','garfo descartavel','garfo descartável','colher descartavel','colher descartável','faca descartavel','faca descartável'], ARRAY[]::text[]),
  -- Molhos e Condimentos
  ('Molho de Tomate', 'Molhos e Condimentos', ARRAY['molho tomate','molho de tomate','extrato de tomate','polpa de tomate','molho pomarola'], ARRAY[]::text[]),
  ('Azeitona', 'Molhos e Condimentos', ARRAY['azeitona'], ARRAY[]::text[]),
  ('Palmito', 'Molhos e Condimentos', ARRAY['palmito'], ARRAY[]::text[]),
  ('Milho', 'Molhos e Condimentos', ARRAY['milho','ervilha'], ARRAY[]::text[]),
  ('Ketchup', 'Molhos e Condimentos', ARRAY['ketchup','catchup'], ARRAY[]::text[]),
  ('Maionese', 'Molhos e Condimentos', ARRAY['maionese'], ARRAY[]::text[]),
  ('Mostarda', 'Molhos e Condimentos', ARRAY['mostarda'], ARRAY[]::text[]),
  ('Molho Inglês', 'Molhos e Condimentos', ARRAY['molho ingles','molho inglês','shoyu','barbecue','tabasco','pimenta'], ARRAY[]::text[]),
  ('Vinagre', 'Molhos e Condimentos', ARRAY['vinagre','azeite'], ARRAY[]::text[]),
  -- Bebidas
  ('Refrigerante', 'Bebidas', ARRAY['coca','coca-cola','guarana','guaraná','pepsi','fanta','sprite','soda','refrigerante'], ARRAY[]::text[]),
  ('Suco', 'Bebidas', ARRAY['suco','del valle','dell valle'], ARRAY[]::text[]),
  ('Água', 'Bebidas', ARRAY['agua','água','agua mineral','água mineral'], ARRAY[]::text[]),
  ('Cerveja', 'Bebidas', ARRAY['cerveja','heineken','brahma','skol','antarctica','itaipava','amstel','budweiser'], ARRAY[]::text[]),
  ('Energético', 'Bebidas', ARRAY['energetico','energético','red bull','monster'], ARRAY[]::text[]),
  -- Secos / Mercearia
  ('Farinha', 'Secos', ARRAY['farinha','farinha de trigo'], ARRAY[]::text[]),
  ('Açúcar', 'Secos', ARRAY['acucar','açúcar'], ARRAY[]::text[]),
  ('Sal', 'Secos', ARRAY['sal'], ARRAY[]::text[]),
  ('Óleo', 'Secos', ARRAY['oleo','óleo','oleo de soja','óleo de soja'], ARRAY[]::text[]),
  ('Fermento', 'Secos', ARRAY['fermento'], ARRAY[]::text[]),
  ('Orégano', 'Secos', ARRAY['oregano','orégano','tempero','condimento','colorau','colorífico','páprica','paprica','cominho','noz moscada'], ARRAY[]::text[]),
  ('Arroz', 'Secos', ARRAY['arroz'], ARRAY[]::text[]),
  ('Feijão', 'Secos', ARRAY['feijao','feijão','lentilha','grao de bico','grão de bico'], ARRAY[]::text[]),
  ('Macarrão', 'Secos', ARRAY['macarrao','macarrão','massa','espaguete','penne','parafuso','talharim'], ARRAY[]::text[]),
  -- Confeitaria
  ('Chocolate', 'Confeitaria', ARRAY['chocolate','cacau','nutella'], ARRAY[]::text[]),
  ('Granulado', 'Confeitaria', ARRAY['granulado','confeito'], ARRAY[]::text[]),
  ('Doce de Leite', 'Confeitaria', ARRAY['doce de leite','brigadeiro'], ARRAY[]::text[]),
  ('Recheio', 'Confeitaria', ARRAY['recheio','cobertura','calda'], ARRAY[]::text[]),
  -- Congelados
  ('Batata Congelada', 'Congelados', ARRAY['batata congelada','batata pre-frita','batata pré-frita','batata palito'], ARRAY[]::text[]),
  ('Nuggets', 'Congelados', ARRAY['nuggets','empanado'], ARRAY[]::text[]),
  ('Sorvete', 'Congelados', ARRAY['sorvete','gelato','picole','picolé'], ARRAY[]::text[])
ON CONFLICT (nome_canonico) DO UPDATE
  SET categoria = EXCLUDED.categoria,
      palavras_chave = EXCLUDED.palavras_chave,
      aliases = EXCLUDED.aliases;

-- Função classificadora — retorna a categoria correta dado o nome do item
CREATE OR REPLACE FUNCTION public.classificar_insumo(p_nome text, p_unidade_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql STABLE
SET search_path = public, extensions
AS $$
DECLARE
  v_norm text;
  v_cat text;
  v_kw text;
BEGIN
  IF p_nome IS NULL OR length(trim(p_nome)) = 0 THEN RETURN NULL; END IF;
  v_norm := public.normalizar_nome_insumo(p_nome);

  -- 1. Match exato em nome_canonico
  SELECT categoria INTO v_cat
  FROM public.insumos_catalog
  WHERE public.normalizar_nome_insumo(nome_canonico) = v_norm
  LIMIT 1;
  IF v_cat IS NOT NULL THEN RETURN v_cat; END IF;

  -- 2. Match em aliases
  SELECT categoria INTO v_cat
  FROM public.insumos_catalog
  WHERE EXISTS (
    SELECT 1 FROM unnest(aliases) a
    WHERE public.normalizar_nome_insumo(a) = v_norm
       OR v_norm LIKE '%' || public.normalizar_nome_insumo(a) || '%'
  )
  LIMIT 1;
  IF v_cat IS NOT NULL THEN RETURN v_cat; END IF;

  -- 3. Match em palavras-chave (maior número de matches ganha)
  SELECT categoria INTO v_cat
  FROM public.insumos_catalog c
  WHERE EXISTS (
    SELECT 1 FROM unnest(c.palavras_chave) kw
    WHERE v_norm ~ ('\m' || public.normalizar_nome_insumo(kw) || '\M')
  )
  ORDER BY (
    SELECT count(*) FROM unnest(c.palavras_chave) kw
    WHERE v_norm ~ ('\m' || public.normalizar_nome_insumo(kw) || '\M')
  ) DESC,
  (SELECT max(length(kw)) FROM unnest(c.palavras_chave) kw
    WHERE v_norm ~ ('\m' || public.normalizar_nome_insumo(kw) || '\M')) DESC
  LIMIT 1;
  IF v_cat IS NOT NULL THEN RETURN v_cat; END IF;

  -- 4. Histórico de compras do usuário/unidade
  IF p_unidade_id IS NOT NULL THEN
    SELECT categoria INTO v_cat
    FROM public.insumos_comprados
    WHERE unidade_id = p_unidade_id
      AND public.normalizar_nome_insumo(nome) = v_norm
      AND categoria IS NOT NULL AND categoria <> ''
    ORDER BY created_at DESC
    LIMIT 1;
    IF v_cat IS NOT NULL THEN RETURN v_cat; END IF;
  END IF;

  RETURN NULL;
END;
$$;

-- Trigger de aprendizado: quando usuário corrige subcategoria de Insumo no DRE,
-- adiciona/atualiza palavra-chave no catálogo
CREATE OR REPLACE FUNCTION public.aprender_categoria_insumo()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_nome text;
  v_norm text;
  v_cat_insumo text;
BEGIN
  -- Só age em UPDATE de lançamento de Insumo cuja subcategoria mudou
  IF NEW.categoria <> 'Insumos' THEN RETURN NEW; END IF;
  IF NEW.subcategoria IS NULL OR NEW.subcategoria = '' OR NEW.subcategoria = 'A Classificar' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.subcategoria IS NOT DISTINCT FROM NEW.subcategoria THEN
    RETURN NEW;
  END IF;

  -- Pega só o nome do item (descricao = "NOME - FORNECEDOR")
  v_nome := regexp_replace(NEW.descricao, '\s-\s.+$', '');
  v_norm := public.normalizar_nome_insumo(v_nome);
  IF length(v_norm) < 3 THEN RETURN NEW; END IF;

  -- Mapa reverso DRE-subcat -> categoria de insumo
  v_cat_insumo := CASE NEW.subcategoria
    WHEN 'Açougue/Proteínas' THEN 'Proteínas'
    WHEN 'Laticínios' THEN 'Laticínios'
    WHEN 'Hortifruti' THEN 'Hortifruti'
    WHEN 'Mercearia' THEN 'Secos'
    WHEN 'Bebidas' THEN 'Bebidas'
    WHEN 'Molhos e Condimentos' THEN 'Molhos e Condimentos'
    WHEN 'Embalagens' THEN 'Embalagens'
    WHEN 'Congelados' THEN 'Congelados'
    WHEN 'Confeitaria' THEN 'Confeitaria'
    ELSE NULL
  END;
  IF v_cat_insumo IS NULL THEN RETURN NEW; END IF;

  -- Atualiza/insere alias no catálogo
  INSERT INTO public.insumos_catalog (nome_canonico, categoria, aliases, palavras_chave)
  VALUES (initcap(v_nome), v_cat_insumo, ARRAY[v_norm], ARRAY[]::text[])
  ON CONFLICT (nome_canonico) DO UPDATE
    SET categoria = EXCLUDED.categoria,
        aliases = (
          SELECT array_agg(DISTINCT x) FROM unnest(insumos_catalog.aliases || EXCLUDED.aliases) x
        );

  -- Propaga correção para insumos_comprados desta unidade
  IF NEW.unidade_id IS NOT NULL THEN
    UPDATE public.insumos_comprados
       SET categoria = v_cat_insumo
     WHERE unidade_id = NEW.unidade_id
       AND public.normalizar_nome_insumo(nome) = v_norm
       AND categoria IS DISTINCT FROM v_cat_insumo;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_aprender_categoria_insumo ON public.lancamentos_financeiros;
CREATE TRIGGER trg_aprender_categoria_insumo
AFTER UPDATE OF subcategoria ON public.lancamentos_financeiros
FOR EACH ROW EXECUTE FUNCTION public.aprender_categoria_insumo();

-- Backfill: reclassifica lançamentos de Insumos já existentes
UPDATE public.lancamentos_financeiros lf
   SET subcategoria = public.map_categoria_insumo_subcategoria(c.cat_certa)
  FROM (
    SELECT id,
           public.classificar_insumo(
             regexp_replace(descricao, '\s-\s.+$', ''),
             unidade_id
           ) AS cat_certa
      FROM public.lancamentos_financeiros
     WHERE categoria = 'Insumos'
  ) c
 WHERE lf.id = c.id
   AND c.cat_certa IS NOT NULL
   AND lf.subcategoria IS DISTINCT FROM public.map_categoria_insumo_subcategoria(c.cat_certa);

-- Backfill em insumos_comprados: corrige categorias erradas
UPDATE public.insumos_comprados ic
   SET categoria = c.cat_certa
  FROM (
    SELECT id, public.classificar_insumo(nome, unidade_id) AS cat_certa
      FROM public.insumos_comprados
  ) c
 WHERE ic.id = c.id
   AND c.cat_certa IS NOT NULL
   AND ic.categoria IS DISTINCT FROM c.cat_certa;
