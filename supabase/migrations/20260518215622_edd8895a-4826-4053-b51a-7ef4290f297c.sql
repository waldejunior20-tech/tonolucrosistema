
-- 1. Tabela de discriminadores (tokens que DIFERENCIAM produtos)
CREATE TABLE IF NOT EXISTS public.insumo_discriminadores (
  token text PRIMARY KEY,
  grupo text NOT NULL,
  descricao text
);

ALTER TABLE public.insumo_discriminadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_all_discriminadores"
ON public.insumo_discriminadores
FOR SELECT TO public
USING (true);

CREATE POLICY "write_service_discriminadores"
ON public.insumo_discriminadores
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Seed inicial — tokens que mudam o uso do insumo
INSERT INTO public.insumo_discriminadores(token, grupo, descricao) VALUES
  ('nanica','banana','tipo de banana'),
  ('prata','banana','tipo de banana'),
  ('maca','banana','tipo de banana'),
  ('ouro','banana','tipo de banana'),
  ('terra','banana','tipo de banana'),
  ('condensado','leite','derivado de leite'),
  ('creme','leite','derivado de leite'),
  ('po','leite','derivado de leite'),
  ('desnatado','leite','tipo de leite'),
  ('semidesnatado','leite','tipo de leite'),
  ('coco','leite','leite vegetal'),
  ('soja','leite','leite vegetal'),
  ('frito','preparo','estado/preparo'),
  ('assado','preparo','estado/preparo'),
  ('cozido','preparo','estado/preparo'),
  ('cru','preparo','estado/preparo'),
  ('defumado','preparo','estado/preparo'),
  ('moido','preparo','estado/preparo'),
  ('ralado','preparo','estado/preparo'),
  ('picado','preparo','estado/preparo'),
  ('fatiado','preparo','estado/preparo'),
  ('seco','preparo','estado/preparo'),
  ('desidratado','preparo','estado/preparo'),
  ('refinado','acucar','tipo de açúcar'),
  ('cristal','acucar','tipo de açúcar'),
  ('demerara','acucar','tipo de açúcar'),
  ('mascavo','acucar','tipo de açúcar'),
  ('confeiteiro','acucar','tipo de açúcar'),
  ('branco','cor','distintivo de cor'),
  ('vermelho','cor','distintivo de cor'),
  ('verde','cor','distintivo de cor'),
  ('amarelo','cor','distintivo de cor'),
  ('preto','cor','distintivo de cor'),
  ('roxo','cor','distintivo de cor'),
  ('rosa','cor','distintivo de cor'),
  ('p','tamanho','tamanho P'),
  ('m','tamanho','tamanho M'),
  ('g','tamanho','tamanho G'),
  ('gg','tamanho','tamanho GG'),
  ('pequena','tamanho','tamanho'),
  ('media','tamanho','tamanho'),
  ('grande','tamanho','tamanho'),
  ('pastel','produto','tipo de produto'),
  ('pizza','produto','tipo de produto'),
  ('batata','produto','tipo de produto'),
  ('hamburguer','produto','tipo de produto'),
  ('lasanha','produto','tipo de produto'),
  ('mussarela','queijo','tipo de queijo'),
  ('parmesao','queijo','tipo de queijo'),
  ('prato','queijo','tipo de queijo'),
  ('provolone','queijo','tipo de queijo'),
  ('catupiry','queijo','tipo de queijo'),
  ('requeijao','queijo','tipo de queijo'),
  ('ricota','queijo','tipo de queijo'),
  ('cheddar','queijo','tipo de queijo'),
  ('gorgonzola','queijo','tipo de queijo'),
  ('calabresa','carne','tipo de carne'),
  ('toscana','carne','tipo de carne'),
  ('frango','carne','tipo de carne'),
  ('peru','carne','tipo de carne'),
  ('bovina','carne','tipo de carne'),
  ('suina','carne','tipo de carne'),
  ('bacon','carne','tipo de carne'),
  ('presunto','carne','tipo de carne'),
  ('linguica','carne','tipo de carne'),
  ('mortadela','carne','tipo de carne'),
  ('salame','carne','tipo de carne'),
  ('peito','corte','corte específico'),
  ('coxa','corte','corte específico'),
  ('sobrecoxa','corte','corte específico'),
  ('asa','corte','corte específico'),
  ('file','corte','corte específico'),
  ('alcatra','corte','corte específico'),
  ('coxao','corte','corte específico'),
  ('patinho','corte','corte específico'),
  ('molho','tipo','molho/condimento'),
  ('vinagre','tipo','condimento'),
  ('azeite','tipo','condimento'),
  ('oleo','tipo','condimento'),
  ('manteiga','tipo','gordura'),
  ('margarina','tipo','gordura'),
  ('integral','tipo','farinha/grão integral'),
  ('especial','tipo','farinha especial')
ON CONFLICT (token) DO NOTHING;

-- 2. Tabela de sugestões pendentes (confiança média)
CREATE TABLE IF NOT EXISTS public.insumo_match_sugestoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  insumo_novo_id uuid NOT NULL,
  insumo_candidato_id uuid NOT NULL,
  nome_original text NOT NULL,
  score numeric NOT NULL,
  motivo text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);

ALTER TABLE public.insumo_match_sugestoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ims_select" ON public.insumo_match_sugestoes
FOR SELECT TO public USING (is_member_of_unidade(auth.uid(), unidade_id));

CREATE POLICY "ims_insert" ON public.insumo_match_sugestoes
FOR INSERT TO public WITH CHECK (is_member_of_unidade(auth.uid(), unidade_id));

CREATE POLICY "ims_update" ON public.insumo_match_sugestoes
FOR UPDATE TO public USING (pode_editar_negocio(auth.uid(), unidade_id));

CREATE POLICY "ims_delete" ON public.insumo_match_sugestoes
FOR DELETE TO public USING (pode_editar_negocio(auth.uid(), unidade_id));

CREATE INDEX IF NOT EXISTS idx_ims_unidade_status
  ON public.insumo_match_sugestoes(unidade_id, status);

-- 3. Função que extrai discriminadores presentes num nome
CREATE OR REPLACE FUNCTION public.discriminadores_presentes(p_nome text)
RETURNS text[]
LANGUAGE plpgsql STABLE
SET search_path = public, extensions
AS $$
DECLARE
  v_norm text;
  v_tokens text[];
BEGIN
  IF p_nome IS NULL THEN RETURN ARRAY[]::text[]; END IF;
  v_norm := lower(unaccent(p_nome));
  -- separa por não-alfanuméricos
  v_tokens := regexp_split_to_array(v_norm, '[^a-z0-9]+');
  RETURN ARRAY(
    SELECT DISTINCT d.token
    FROM public.insumo_discriminadores d
    WHERE d.token = ANY(v_tokens)
  );
END $$;

-- 4. Função de match seguro com nível de confiança
CREATE OR REPLACE FUNCTION public.match_insumo_seguro(
  p_nome text,
  p_unidade_id uuid
)
RETURNS TABLE(
  insumo_id uuid,
  nome_match text,
  score numeric,
  confianca text,
  motivo text
)
LANGUAGE plpgsql STABLE
SET search_path = public, extensions
AS $$
DECLARE
  v_haystack text := upper(unaccent(p_nome));
  v_disc_novo text[];
  v_disc_cand text[];
  v_conflito text[];
  v_falta text[];
  r record;
BEGIN
  -- CAMADA 1: alias manual confirmado pelo usuário -> ALTA confiança
  RETURN QUERY
  SELECT am.insumo_id, ic.nome,
         1.000::numeric AS score,
         'alta'::text AS confianca,
         'alias manual'::text AS motivo
  FROM insumo_aliases_manuais am
  JOIN insumos_comprados ic ON ic.id = am.insumo_id
  WHERE am.unidade_id = p_unidade_id
    AND v_haystack LIKE '%' || upper(unaccent(am.alias_padrao)) || '%'
  LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  v_disc_novo := public.discriminadores_presentes(p_nome);

  -- CAMADA 2: busca candidatos por similaridade
  FOR r IN
    WITH cand AS (
      SELECT ic.id AS xid, ic.nome AS xnome,
             similaridade_insumo(p_nome, ic.nome) AS xsc,
             array_length(tokens_significativos(ic.nome),1) AS xntk
      FROM insumos_comprados ic
      WHERE ic.unidade_id = p_unidade_id
        AND ic.nome % p_nome
    )
    SELECT xid, xnome, xsc, xntk FROM cand
    WHERE xsc >= 0.55
    ORDER BY xsc DESC LIMIT 5
  LOOP
    v_disc_cand := public.discriminadores_presentes(r.xnome);

    -- discriminadores presentes em um e ausentes no outro = produtos diferentes
    SELECT array_agg(t) INTO v_conflito FROM (
      SELECT unnest(v_disc_novo) EXCEPT SELECT unnest(v_disc_cand)
      UNION
      SELECT unnest(v_disc_cand) EXCEPT SELECT unnest(v_disc_novo)
    ) x(t);

    IF v_conflito IS NOT NULL AND array_length(v_conflito,1) > 0 THEN
      -- conflito → não é match seguro, segue para próximo candidato
      CONTINUE;
    END IF;

    -- Sem conflito de discriminadores
    IF r.xsc >= 0.85 THEN
      insumo_id := r.xid; nome_match := r.xnome; score := r.xsc;
      confianca := 'alta'; motivo := 'similaridade alta sem conflito';
      RETURN NEXT; RETURN;
    ELSIF r.xsc >= 0.65 THEN
      insumo_id := r.xid; nome_match := r.xnome; score := r.xsc;
      confianca := 'media'; motivo := 'similaridade média — confirmar vínculo';
      RETURN NEXT; RETURN;
    END IF;
  END LOOP;

  -- Nenhum candidato seguro
  RETURN;
END $$;
