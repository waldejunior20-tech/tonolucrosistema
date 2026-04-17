-- ============================================================
-- FASE 2: unidade_id em tabelas de negócio + backfill + RLS
-- ============================================================

-- Função auxiliar: pega a "primeira" unidade do usuário (usada no backfill e como default)
CREATE OR REPLACE FUNCTION public.primeira_unidade_do_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT unidade_id FROM public.unidade_membros
  WHERE user_id = _user_id
  ORDER BY created_at ASC
  LIMIT 1;
$$;

-- Função auxiliar: pode editar dados de negócio (admin OU gerente)
CREATE OR REPLACE FUNCTION public.pode_editar_negocio(_user_id uuid, _unidade_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, _unidade_id, 'admin'::public.app_role)
      OR public.has_role(_user_id, _unidade_id, 'gerente'::public.app_role);
$$;

-- ============================================================
-- 1) ADICIONAR COLUNA unidade_id (nullable inicialmente)
-- ============================================================
ALTER TABLE public.insumos_comprados ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE;
ALTER TABLE public.insumos_proprios ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE;
ALTER TABLE public.insumos_proprios_ingredientes ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE;
ALTER TABLE public.fichas_tecnicas_pizza ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE;
ALTER TABLE public.fichas_tecnicas_pizza_ingredientes ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE;
ALTER TABLE public.fichas_tecnicas_produtos ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE;
ALTER TABLE public.fichas_tecnicas_produtos_ingredientes ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE;
ALTER TABLE public.precificacao_bebidas ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE;
ALTER TABLE public.precificacao_produtos ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE;
ALTER TABLE public.lancamentos_financeiros ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE;
ALTER TABLE public.metas_financeiras ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE;
ALTER TABLE public.combos_fixos ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE;
ALTER TABLE public.promocoes ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE;
ALTER TABLE public.vendas_itens ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE;
ALTER TABLE public.estoque_movimentos ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE;
ALTER TABLE public.configuracoes_negocio ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE;
ALTER TABLE public.configuracoes_precificacao ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE;

-- ============================================================
-- 2) BACKFILL: vincular registros existentes à 1ª unidade do user
-- ============================================================
UPDATE public.insumos_comprados SET unidade_id = public.primeira_unidade_do_user(user_id) WHERE unidade_id IS NULL AND user_id IS NOT NULL;
UPDATE public.insumos_proprios SET unidade_id = public.primeira_unidade_do_user(user_id) WHERE unidade_id IS NULL AND user_id IS NOT NULL;
UPDATE public.insumos_proprios_ingredientes SET unidade_id = public.primeira_unidade_do_user(user_id) WHERE unidade_id IS NULL AND user_id IS NOT NULL;
UPDATE public.fichas_tecnicas_pizza SET unidade_id = public.primeira_unidade_do_user(user_id) WHERE unidade_id IS NULL AND user_id IS NOT NULL;
UPDATE public.fichas_tecnicas_pizza_ingredientes SET unidade_id = public.primeira_unidade_do_user(user_id) WHERE unidade_id IS NULL AND user_id IS NOT NULL;
UPDATE public.fichas_tecnicas_produtos SET unidade_id = public.primeira_unidade_do_user(user_id) WHERE unidade_id IS NULL AND user_id IS NOT NULL;
UPDATE public.fichas_tecnicas_produtos_ingredientes SET unidade_id = public.primeira_unidade_do_user(user_id) WHERE unidade_id IS NULL AND user_id IS NOT NULL;
UPDATE public.precificacao_bebidas SET unidade_id = public.primeira_unidade_do_user(user_id) WHERE unidade_id IS NULL AND user_id IS NOT NULL;
UPDATE public.precificacao_produtos SET unidade_id = public.primeira_unidade_do_user(user_id) WHERE unidade_id IS NULL AND user_id IS NOT NULL;
UPDATE public.lancamentos_financeiros SET unidade_id = public.primeira_unidade_do_user(user_id) WHERE unidade_id IS NULL AND user_id IS NOT NULL;
UPDATE public.metas_financeiras SET unidade_id = public.primeira_unidade_do_user(user_id) WHERE unidade_id IS NULL AND user_id IS NOT NULL;
UPDATE public.combos_fixos SET unidade_id = public.primeira_unidade_do_user(user_id) WHERE unidade_id IS NULL AND user_id IS NOT NULL;
UPDATE public.promocoes SET unidade_id = public.primeira_unidade_do_user(user_id) WHERE unidade_id IS NULL AND user_id IS NOT NULL;
UPDATE public.vendas SET unidade_id = public.primeira_unidade_do_user(user_id) WHERE unidade_id IS NULL AND user_id IS NOT NULL;
UPDATE public.vendas_itens SET unidade_id = public.primeira_unidade_do_user(user_id) WHERE unidade_id IS NULL AND user_id IS NOT NULL;
UPDATE public.estoque_movimentos SET unidade_id = public.primeira_unidade_do_user(user_id) WHERE unidade_id IS NULL AND user_id IS NOT NULL;
UPDATE public.configuracoes_negocio SET unidade_id = public.primeira_unidade_do_user(user_id) WHERE unidade_id IS NULL AND user_id IS NOT NULL;
UPDATE public.configuracoes_precificacao SET unidade_id = public.primeira_unidade_do_user(user_id) WHERE unidade_id IS NULL AND user_id IS NOT NULL;

-- ============================================================
-- 3) ÍNDICES para performance de filtro por unidade
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_insumos_comprados_unidade ON public.insumos_comprados(unidade_id);
CREATE INDEX IF NOT EXISTS idx_insumos_proprios_unidade ON public.insumos_proprios(unidade_id);
CREATE INDEX IF NOT EXISTS idx_fichas_pizza_unidade ON public.fichas_tecnicas_pizza(unidade_id);
CREATE INDEX IF NOT EXISTS idx_fichas_produtos_unidade ON public.fichas_tecnicas_produtos(unidade_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_unidade ON public.lancamentos_financeiros(unidade_id);
CREATE INDEX IF NOT EXISTS idx_vendas_unidade ON public.vendas(unidade_id);
CREATE INDEX IF NOT EXISTS idx_vendas_itens_unidade ON public.vendas_itens(unidade_id);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_unidade ON public.estoque_movimentos(unidade_id);

-- ============================================================
-- 4) ATUALIZAR TRIGGERS para propagar unidade_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.compra_insumo_gera_entrada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.quantidade > 0 THEN
    INSERT INTO public.estoque_movimentos (user_id, unidade_id, insumo_id, tipo, quantidade, unidade, motivo, data_movimento)
    VALUES (
      NEW.user_id, NEW.unidade_id, NEW.id, 'entrada', NEW.quantidade, NEW.unidade,
      'Compra: ' || COALESCE(NEW.fornecedor, 'fornecedor não informado'),
      COALESCE(NEW.data_compra::timestamptz, now())
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.baixar_estoque_venda_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  ing RECORD;
  qtd_total numeric;
  insumo_destino_id uuid;
  qtd_insumo numeric;
  unidade_insumo text;
BEGIN
  IF NEW.tipo_produto = 'bebida' AND NEW.insumo_bebida_id IS NOT NULL THEN
    INSERT INTO public.estoque_movimentos (user_id, unidade_id, insumo_id, tipo, quantidade, unidade, motivo, venda_item_id)
    SELECT NEW.user_id, NEW.unidade_id, NEW.insumo_bebida_id, 'saida', NEW.quantidade, unidade,
           'Venda: ' || NEW.nome_produto, NEW.id
    FROM public.insumos_comprados WHERE id = NEW.insumo_bebida_id;
    RETURN NEW;
  END IF;

  IF NEW.tipo_produto = 'pizza' AND NEW.ficha_pizza_id IS NOT NULL THEN
    FOR ing IN
      SELECT tipo_insumo, insumo_comprado_id, insumo_proprio_id, unidade,
             CASE NEW.tamanho_pizza WHEN 'P' THEN qtd_p WHEN 'M' THEN qtd_m WHEN 'G' THEN qtd_g END AS qtd
      FROM public.fichas_tecnicas_pizza_ingredientes
      WHERE ficha_id = NEW.ficha_pizza_id
    LOOP
      IF ing.qtd IS NULL OR ing.qtd <= 0 THEN CONTINUE; END IF;
      qtd_total := ing.qtd * NEW.quantidade;

      IF ing.tipo_insumo = 'comprado' AND ing.insumo_comprado_id IS NOT NULL THEN
        INSERT INTO public.estoque_movimentos (user_id, unidade_id, insumo_id, tipo, quantidade, unidade, motivo, venda_item_id)
        VALUES (NEW.user_id, NEW.unidade_id, ing.insumo_comprado_id, 'saida', qtd_total, ing.unidade,
                'Venda: ' || NEW.nome_produto || ' (' || NEW.tamanho_pizza || ')', NEW.id);
      END IF;

      IF ing.tipo_insumo = 'proprio' AND ing.insumo_proprio_id IS NOT NULL THEN
        FOR insumo_destino_id, qtd_insumo, unidade_insumo IN
          SELECT ipi.insumo_comprado_id, ipi.quantidade * (qtd_total /
                   NULLIF((SELECT rendimento FROM public.insumos_proprios WHERE id = ing.insumo_proprio_id),0)),
                 ipi.unidade
          FROM public.insumos_proprios_ingredientes ipi
          WHERE ipi.insumo_proprio_id = ing.insumo_proprio_id
            AND ipi.insumo_comprado_id IS NOT NULL
        LOOP
          IF qtd_insumo > 0 THEN
            INSERT INTO public.estoque_movimentos (user_id, unidade_id, insumo_id, tipo, quantidade, unidade, motivo, venda_item_id)
            VALUES (NEW.user_id, NEW.unidade_id, insumo_destino_id, 'saida', qtd_insumo, unidade_insumo,
                    'Venda: ' || NEW.nome_produto || ' (via insumo próprio)', NEW.id);
          END IF;
        END LOOP;
      END IF;
    END LOOP;
    RETURN NEW;
  END IF;

  IF NEW.tipo_produto = 'produto' AND NEW.ficha_produto_id IS NOT NULL THEN
    FOR ing IN
      SELECT tipo_insumo, insumo_comprado_id, insumo_proprio_id, unidade, quantidade AS qtd
      FROM public.fichas_tecnicas_produtos_ingredientes
      WHERE ficha_id = NEW.ficha_produto_id
    LOOP
      IF ing.qtd IS NULL OR ing.qtd <= 0 THEN CONTINUE; END IF;
      qtd_total := ing.qtd * NEW.quantidade;

      IF ing.tipo_insumo = 'comprado' AND ing.insumo_comprado_id IS NOT NULL THEN
        INSERT INTO public.estoque_movimentos (user_id, unidade_id, insumo_id, tipo, quantidade, unidade, motivo, venda_item_id)
        VALUES (NEW.user_id, NEW.unidade_id, ing.insumo_comprado_id, 'saida', qtd_total, ing.unidade,
                'Venda: ' || NEW.nome_produto, NEW.id);
      END IF;

      IF ing.tipo_insumo = 'proprio' AND ing.insumo_proprio_id IS NOT NULL THEN
        FOR insumo_destino_id, qtd_insumo, unidade_insumo IN
          SELECT ipi.insumo_comprado_id, ipi.quantidade * (qtd_total /
                   NULLIF((SELECT rendimento FROM public.insumos_proprios WHERE id = ing.insumo_proprio_id),0)),
                 ipi.unidade
          FROM public.insumos_proprios_ingredientes ipi
          WHERE ipi.insumo_proprio_id = ing.insumo_proprio_id
            AND ipi.insumo_comprado_id IS NOT NULL
        LOOP
          IF qtd_insumo > 0 THEN
            INSERT INTO public.estoque_movimentos (user_id, unidade_id, insumo_id, tipo, quantidade, unidade, motivo, venda_item_id)
            VALUES (NEW.user_id, NEW.unidade_id, insumo_destino_id, 'saida', qtd_insumo, unidade_insumo,
                    'Venda: ' || NEW.nome_produto || ' (via insumo próprio)', NEW.id);
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.estornar_estoque_venda_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  mov RECORD;
BEGIN
  FOR mov IN
    SELECT id, insumo_id, quantidade, unidade, unidade_id FROM public.estoque_movimentos
    WHERE venda_item_id = OLD.id AND tipo = 'saida'
  LOOP
    INSERT INTO public.estoque_movimentos (user_id, unidade_id, insumo_id, tipo, quantidade, unidade, motivo)
    VALUES (OLD.user_id, mov.unidade_id, mov.insumo_id, 'entrada', mov.quantidade, mov.unidade,
            'Estorno de venda removida');
    DELETE FROM public.estoque_movimentos WHERE id = mov.id;
  END LOOP;
  RETURN OLD;
END;
$function$;

-- ============================================================
-- 5) DROP de policies antigas (baseadas só em user_id)
-- ============================================================
DO $$
DECLARE
  pol RECORD;
  tbls text[] := ARRAY[
    'insumos_comprados','insumos_proprios','insumos_proprios_ingredientes',
    'fichas_tecnicas_pizza','fichas_tecnicas_pizza_ingredientes',
    'fichas_tecnicas_produtos','fichas_tecnicas_produtos_ingredientes',
    'precificacao_bebidas','precificacao_produtos',
    'lancamentos_financeiros','metas_financeiras','combos_fixos','promocoes',
    'vendas','vendas_itens','estoque_movimentos',
    'configuracoes_negocio','configuracoes_precificacao'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- 6) NOVAS POLICIES — baseadas em is_member_of_unidade
-- Padrão: SELECT = todos os membros | INSERT/UPDATE/DELETE = admin OU gerente
-- Exceção: vendas e vendas_itens permitem caixa também
-- ============================================================

-- ---- INSUMOS COMPRADOS ----
CREATE POLICY ic_select ON public.insumos_comprados FOR SELECT USING (is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY ic_insert ON public.insumos_comprados FOR INSERT WITH CHECK (auth.uid() = user_id AND pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY ic_update ON public.insumos_comprados FOR UPDATE USING (pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY ic_delete ON public.insumos_comprados FOR DELETE USING (pode_editar_negocio(auth.uid(), unidade_id));

-- ---- INSUMOS PRÓPRIOS ----
CREATE POLICY ip_select ON public.insumos_proprios FOR SELECT USING (is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY ip_insert ON public.insumos_proprios FOR INSERT WITH CHECK (auth.uid() = user_id AND pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY ip_update ON public.insumos_proprios FOR UPDATE USING (pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY ip_delete ON public.insumos_proprios FOR DELETE USING (pode_editar_negocio(auth.uid(), unidade_id));

CREATE POLICY ipi_select ON public.insumos_proprios_ingredientes FOR SELECT USING (is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY ipi_insert ON public.insumos_proprios_ingredientes FOR INSERT WITH CHECK (auth.uid() = user_id AND pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY ipi_update ON public.insumos_proprios_ingredientes FOR UPDATE USING (pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY ipi_delete ON public.insumos_proprios_ingredientes FOR DELETE USING (pode_editar_negocio(auth.uid(), unidade_id));

-- ---- FICHAS PIZZA ----
CREATE POLICY ftp_select ON public.fichas_tecnicas_pizza FOR SELECT USING (is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY ftp_insert ON public.fichas_tecnicas_pizza FOR INSERT WITH CHECK (auth.uid() = user_id AND pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY ftp_update ON public.fichas_tecnicas_pizza FOR UPDATE USING (pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY ftp_delete ON public.fichas_tecnicas_pizza FOR DELETE USING (pode_editar_negocio(auth.uid(), unidade_id));

CREATE POLICY ftpi_select ON public.fichas_tecnicas_pizza_ingredientes FOR SELECT USING (is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY ftpi_insert ON public.fichas_tecnicas_pizza_ingredientes FOR INSERT WITH CHECK (auth.uid() = user_id AND pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY ftpi_update ON public.fichas_tecnicas_pizza_ingredientes FOR UPDATE USING (pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY ftpi_delete ON public.fichas_tecnicas_pizza_ingredientes FOR DELETE USING (pode_editar_negocio(auth.uid(), unidade_id));

-- ---- FICHAS PRODUTOS ----
CREATE POLICY ftpr_select ON public.fichas_tecnicas_produtos FOR SELECT USING (is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY ftpr_insert ON public.fichas_tecnicas_produtos FOR INSERT WITH CHECK (auth.uid() = user_id AND pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY ftpr_update ON public.fichas_tecnicas_produtos FOR UPDATE USING (pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY ftpr_delete ON public.fichas_tecnicas_produtos FOR DELETE USING (pode_editar_negocio(auth.uid(), unidade_id));

CREATE POLICY ftpri_select ON public.fichas_tecnicas_produtos_ingredientes FOR SELECT USING (is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY ftpri_insert ON public.fichas_tecnicas_produtos_ingredientes FOR INSERT WITH CHECK (auth.uid() = user_id AND pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY ftpri_update ON public.fichas_tecnicas_produtos_ingredientes FOR UPDATE USING (pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY ftpri_delete ON public.fichas_tecnicas_produtos_ingredientes FOR DELETE USING (pode_editar_negocio(auth.uid(), unidade_id));

-- ---- PRECIFICAÇÃO ----
CREATE POLICY pb_select ON public.precificacao_bebidas FOR SELECT USING (is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY pb_insert ON public.precificacao_bebidas FOR INSERT WITH CHECK (auth.uid() = user_id AND pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY pb_update ON public.precificacao_bebidas FOR UPDATE USING (pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY pb_delete ON public.precificacao_bebidas FOR DELETE USING (pode_editar_negocio(auth.uid(), unidade_id));

CREATE POLICY pp_select ON public.precificacao_produtos FOR SELECT USING (is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY pp_insert ON public.precificacao_produtos FOR INSERT WITH CHECK (auth.uid() = user_id AND pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY pp_update ON public.precificacao_produtos FOR UPDATE USING (pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY pp_delete ON public.precificacao_produtos FOR DELETE USING (pode_editar_negocio(auth.uid(), unidade_id));

-- ---- FINANCEIRO ----
CREATE POLICY lf_select ON public.lancamentos_financeiros FOR SELECT USING (is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY lf_insert ON public.lancamentos_financeiros FOR INSERT WITH CHECK (auth.uid() = user_id AND pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY lf_update ON public.lancamentos_financeiros FOR UPDATE USING (pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY lf_delete ON public.lancamentos_financeiros FOR DELETE USING (pode_editar_negocio(auth.uid(), unidade_id));

CREATE POLICY mf_select ON public.metas_financeiras FOR SELECT USING (is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY mf_insert ON public.metas_financeiras FOR INSERT WITH CHECK (auth.uid() = user_id AND pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY mf_update ON public.metas_financeiras FOR UPDATE USING (pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY mf_delete ON public.metas_financeiras FOR DELETE USING (pode_editar_negocio(auth.uid(), unidade_id));

CREATE POLICY cf_select ON public.combos_fixos FOR SELECT USING (is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY cf_insert ON public.combos_fixos FOR INSERT WITH CHECK (auth.uid() = user_id AND pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY cf_update ON public.combos_fixos FOR UPDATE USING (pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY cf_delete ON public.combos_fixos FOR DELETE USING (pode_editar_negocio(auth.uid(), unidade_id));

CREATE POLICY pr_select ON public.promocoes FOR SELECT USING (is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY pr_insert ON public.promocoes FOR INSERT WITH CHECK (auth.uid() = user_id AND pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY pr_update ON public.promocoes FOR UPDATE USING (pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY pr_delete ON public.promocoes FOR DELETE USING (pode_editar_negocio(auth.uid(), unidade_id));

-- ---- VENDAS (caixa pode inserir; admin/gerente também) ----
CREATE POLICY v_select ON public.vendas FOR SELECT USING (is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY v_insert ON public.vendas FOR INSERT WITH CHECK (auth.uid() = user_id AND is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY v_update ON public.vendas FOR UPDATE USING (pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY v_delete ON public.vendas FOR DELETE USING (pode_editar_negocio(auth.uid(), unidade_id));

CREATE POLICY vi_select ON public.vendas_itens FOR SELECT USING (is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY vi_insert ON public.vendas_itens FOR INSERT WITH CHECK (auth.uid() = user_id AND is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY vi_update ON public.vendas_itens FOR UPDATE USING (pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY vi_delete ON public.vendas_itens FOR DELETE USING (pode_editar_negocio(auth.uid(), unidade_id));

-- ---- ESTOQUE MOVIMENTOS ----
-- Inserts manuais só admin/gerente. Triggers SECURITY DEFINER passam por cima.
CREATE POLICY em_select ON public.estoque_movimentos FOR SELECT USING (is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY em_insert ON public.estoque_movimentos FOR INSERT WITH CHECK (auth.uid() = user_id AND pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY em_update ON public.estoque_movimentos FOR UPDATE USING (pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY em_delete ON public.estoque_movimentos FOR DELETE USING (pode_editar_negocio(auth.uid(), unidade_id));

-- ---- CONFIGURAÇÕES (só admin edita; todos veem) ----
CREATE POLICY cn_select ON public.configuracoes_negocio FOR SELECT USING (is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY cn_insert ON public.configuracoes_negocio FOR INSERT WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), unidade_id, 'admin'::app_role));
CREATE POLICY cn_update ON public.configuracoes_negocio FOR UPDATE USING (has_role(auth.uid(), unidade_id, 'admin'::app_role));
CREATE POLICY cn_delete ON public.configuracoes_negocio FOR DELETE USING (has_role(auth.uid(), unidade_id, 'admin'::app_role));

CREATE POLICY cp_select ON public.configuracoes_precificacao FOR SELECT USING (is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY cp_insert ON public.configuracoes_precificacao FOR INSERT WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), unidade_id, 'admin'::app_role));
CREATE POLICY cp_update ON public.configuracoes_precificacao FOR UPDATE USING (has_role(auth.uid(), unidade_id, 'admin'::app_role));
CREATE POLICY cp_delete ON public.configuracoes_precificacao FOR DELETE USING (has_role(auth.uid(), unidade_id, 'admin'::app_role));
