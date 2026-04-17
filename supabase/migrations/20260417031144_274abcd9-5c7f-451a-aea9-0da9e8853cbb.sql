-- ============================================================================
-- MÓDULO 2+3: Estoque + Vendas vinculadas + Baixa automática
-- ============================================================================

-- 1) ESTOQUE: campos em insumos_comprados
ALTER TABLE public.insumos_comprados
  ADD COLUMN IF NOT EXISTS estoque_atual numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estoque_minimo numeric NOT NULL DEFAULT 0;

-- 2) Tabela de movimentos de estoque
CREATE TABLE IF NOT EXISTS public.estoque_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  insumo_id uuid NOT NULL REFERENCES public.insumos_comprados(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
  quantidade numeric NOT NULL,
  unidade text NOT NULL,
  motivo text,
  venda_item_id uuid,
  data_movimento timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.estoque_movimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estoque_movimentos_select_own" ON public.estoque_movimentos
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "estoque_movimentos_insert_own" ON public.estoque_movimentos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "estoque_movimentos_update_own" ON public.estoque_movimentos
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "estoque_movimentos_delete_own" ON public.estoque_movimentos
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_estoque_movimentos_insumo ON public.estoque_movimentos(insumo_id, data_movimento DESC);

-- 3) Função: aplica movimento ao estoque do insumo
-- Converte g→kg e ml→L automaticamente para somar no saldo (que está na unidade da compra)
CREATE OR REPLACE FUNCTION public.aplicar_movimento_estoque()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  unidade_insumo text;
  qtd_normalizada numeric;
  delta numeric;
BEGIN
  -- pega unidade do insumo
  SELECT unidade INTO unidade_insumo FROM public.insumos_comprados WHERE id = NEW.insumo_id;

  -- normaliza unidade do movimento para a unidade do insumo
  qtd_normalizada := NEW.quantidade;
  IF lower(NEW.unidade) = 'g' AND lower(unidade_insumo) = 'kg' THEN
    qtd_normalizada := NEW.quantidade / 1000.0;
  ELSIF lower(NEW.unidade) = 'ml' AND lower(unidade_insumo) = 'l' THEN
    qtd_normalizada := NEW.quantidade / 1000.0;
  ELSIF lower(NEW.unidade) = 'kg' AND lower(unidade_insumo) = 'g' THEN
    qtd_normalizada := NEW.quantidade * 1000.0;
  ELSIF lower(NEW.unidade) = 'l' AND lower(unidade_insumo) = 'ml' THEN
    qtd_normalizada := NEW.quantidade * 1000.0;
  END IF;

  IF NEW.tipo = 'entrada' THEN
    delta := qtd_normalizada;
  ELSIF NEW.tipo = 'saida' THEN
    delta := -qtd_normalizada;
  ELSE -- ajuste: define o saldo absoluto
    UPDATE public.insumos_comprados SET estoque_atual = qtd_normalizada WHERE id = NEW.insumo_id;
    RETURN NEW;
  END IF;

  UPDATE public.insumos_comprados
  SET estoque_atual = estoque_atual + delta
  WHERE id = NEW.insumo_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_aplicar_movimento_estoque
  AFTER INSERT ON public.estoque_movimentos
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_movimento_estoque();

-- 4) Trigger: ao inserir compra de insumo → cria entrada automática
CREATE OR REPLACE FUNCTION public.compra_insumo_gera_entrada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.quantidade > 0 THEN
    INSERT INTO public.estoque_movimentos (user_id, insumo_id, tipo, quantidade, unidade, motivo, data_movimento)
    VALUES (
      NEW.user_id,
      NEW.id,
      'entrada',
      NEW.quantidade,
      NEW.unidade,
      'Compra: ' || COALESCE(NEW.fornecedor, 'fornecedor não informado'),
      COALESCE(NEW.data_compra::timestamptz, now())
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compra_insumo_gera_entrada
  AFTER INSERT ON public.insumos_comprados
  FOR EACH ROW EXECUTE FUNCTION public.compra_insumo_gera_entrada();

-- ============================================================================
-- 5) VENDAS VINCULADAS A PRODUTOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  data_venda date NOT NULL DEFAULT CURRENT_DATE,
  forma_pagamento text NOT NULL CHECK (forma_pagamento IN ('dinheiro_pix','debito','credito','ifood','outros_apps')),
  valor_total numeric NOT NULL DEFAULT 0,
  observacao text,
  lancamento_id uuid REFERENCES public.lancamentos_financeiros(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendas_select_own" ON public.vendas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "vendas_insert_own" ON public.vendas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vendas_update_own" ON public.vendas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "vendas_delete_own" ON public.vendas FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_vendas_updated_at
  BEFORE UPDATE ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_vendas_data_user ON public.vendas(user_id, data_venda DESC);

-- 6) Itens da venda
CREATE TABLE IF NOT EXISTS public.vendas_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  venda_id uuid NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  tipo_produto text NOT NULL CHECK (tipo_produto IN ('pizza','produto','bebida')),
  ficha_pizza_id uuid REFERENCES public.fichas_tecnicas_pizza(id) ON DELETE SET NULL,
  ficha_produto_id uuid REFERENCES public.fichas_tecnicas_produtos(id) ON DELETE SET NULL,
  insumo_bebida_id uuid REFERENCES public.insumos_comprados(id) ON DELETE SET NULL,
  tamanho_pizza text CHECK (tamanho_pizza IN ('P','M','G')),
  nome_produto text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 1,
  preco_unitario numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendas_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendas_itens_select_own" ON public.vendas_itens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "vendas_itens_insert_own" ON public.vendas_itens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vendas_itens_update_own" ON public.vendas_itens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "vendas_itens_delete_own" ON public.vendas_itens FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_vendas_itens_venda ON public.vendas_itens(venda_id);

-- 7) Trigger: ao inserir item de venda → baixa estoque dos ingredientes
-- Para pizza/produto: itera sobre ingredientes da ficha
-- Para bebida: baixa 1 unidade do insumo bebida
CREATE OR REPLACE FUNCTION public.baixar_estoque_venda_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ing RECORD;
  qtd_total numeric;
  insumo_destino_id uuid;
  qtd_insumo numeric;
  unidade_insumo text;
BEGIN
  -- BEBIDA: baixa direto do insumo
  IF NEW.tipo_produto = 'bebida' AND NEW.insumo_bebida_id IS NOT NULL THEN
    INSERT INTO public.estoque_movimentos (user_id, insumo_id, tipo, quantidade, unidade, motivo, venda_item_id)
    SELECT NEW.user_id, NEW.insumo_bebida_id, 'saida', NEW.quantidade, unidade,
           'Venda: ' || NEW.nome_produto, NEW.id
    FROM public.insumos_comprados WHERE id = NEW.insumo_bebida_id;
    RETURN NEW;
  END IF;

  -- PIZZA: itera ingredientes da ficha, usa qtd do tamanho
  IF NEW.tipo_produto = 'pizza' AND NEW.ficha_pizza_id IS NOT NULL THEN
    FOR ing IN
      SELECT tipo_insumo, insumo_comprado_id, insumo_proprio_id, unidade,
             CASE NEW.tamanho_pizza
               WHEN 'P' THEN qtd_p
               WHEN 'M' THEN qtd_m
               WHEN 'G' THEN qtd_g
             END AS qtd
      FROM public.fichas_tecnicas_pizza_ingredientes
      WHERE ficha_id = NEW.ficha_pizza_id
    LOOP
      IF ing.qtd IS NULL OR ing.qtd <= 0 THEN CONTINUE; END IF;
      qtd_total := ing.qtd * NEW.quantidade;

      -- insumo direto (comprado)
      IF ing.tipo_insumo = 'comprado' AND ing.insumo_comprado_id IS NOT NULL THEN
        INSERT INTO public.estoque_movimentos (user_id, insumo_id, tipo, quantidade, unidade, motivo, venda_item_id)
        VALUES (NEW.user_id, ing.insumo_comprado_id, 'saida', qtd_total, ing.unidade,
                'Venda: ' || NEW.nome_produto || ' (' || NEW.tamanho_pizza || ')', NEW.id);
      END IF;

      -- insumo próprio: explode em insumos comprados via insumos_proprios_ingredientes
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
            INSERT INTO public.estoque_movimentos (user_id, insumo_id, tipo, quantidade, unidade, motivo, venda_item_id)
            VALUES (NEW.user_id, insumo_destino_id, 'saida', qtd_insumo, unidade_insumo,
                    'Venda: ' || NEW.nome_produto || ' (via insumo próprio)', NEW.id);
          END IF;
        END LOOP;
      END IF;
    END LOOP;
    RETURN NEW;
  END IF;

  -- PRODUTO: itera ingredientes da ficha (quantidade fixa)
  IF NEW.tipo_produto = 'produto' AND NEW.ficha_produto_id IS NOT NULL THEN
    FOR ing IN
      SELECT tipo_insumo, insumo_comprado_id, insumo_proprio_id, unidade, quantidade AS qtd
      FROM public.fichas_tecnicas_produtos_ingredientes
      WHERE ficha_id = NEW.ficha_produto_id
    LOOP
      IF ing.qtd IS NULL OR ing.qtd <= 0 THEN CONTINUE; END IF;
      qtd_total := ing.qtd * NEW.quantidade;

      IF ing.tipo_insumo = 'comprado' AND ing.insumo_comprado_id IS NOT NULL THEN
        INSERT INTO public.estoque_movimentos (user_id, insumo_id, tipo, quantidade, unidade, motivo, venda_item_id)
        VALUES (NEW.user_id, ing.insumo_comprado_id, 'saida', qtd_total, ing.unidade,
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
            INSERT INTO public.estoque_movimentos (user_id, insumo_id, tipo, quantidade, unidade, motivo, venda_item_id)
            VALUES (NEW.user_id, insumo_destino_id, 'saida', qtd_insumo, unidade_insumo,
                    'Venda: ' || NEW.nome_produto || ' (via insumo próprio)', NEW.id);
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_baixar_estoque_venda_item
  AFTER INSERT ON public.vendas_itens
  FOR EACH ROW EXECUTE FUNCTION public.baixar_estoque_venda_item();

-- 8) Trigger: ao deletar item de venda → reverte movimentos (estorna entrada)
CREATE OR REPLACE FUNCTION public.estornar_estoque_venda_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mov RECORD;
BEGIN
  FOR mov IN
    SELECT id, insumo_id, quantidade, unidade FROM public.estoque_movimentos
    WHERE venda_item_id = OLD.id AND tipo = 'saida'
  LOOP
    INSERT INTO public.estoque_movimentos (user_id, insumo_id, tipo, quantidade, unidade, motivo)
    VALUES (OLD.user_id, mov.insumo_id, 'entrada', mov.quantidade, mov.unidade,
            'Estorno de venda removida');
    DELETE FROM public.estoque_movimentos WHERE id = mov.id;
  END LOOP;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_estornar_estoque_venda_item
  BEFORE DELETE ON public.vendas_itens
  FOR EACH ROW EXECUTE FUNCTION public.estornar_estoque_venda_item();