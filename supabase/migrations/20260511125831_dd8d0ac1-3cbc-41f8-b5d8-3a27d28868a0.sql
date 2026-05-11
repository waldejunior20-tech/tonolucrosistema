-- ============================================================
-- 1) NOTAS FISCAIS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notas_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_nf VARCHAR(50),
  serie_nf VARCHAR(10),
  chave_acesso VARCHAR(44),
  fornecedor VARCHAR(200) NOT NULL,
  cnpj_fornecedor VARCHAR(14),
  data_emissao DATE NOT NULL,
  data_recebimento DATE NOT NULL DEFAULT CURRENT_DATE,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  categoria VARCHAR(50),
  subcategoria VARCHAR(80),
  observacoes TEXT,
  origem VARCHAR(20) NOT NULL DEFAULT 'manual',
  total_parcelas INT NOT NULL DEFAULT 1,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  unidade_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_nf_numero_cnpj_unidade
  ON public.notas_fiscais (numero_nf, cnpj_fornecedor, unidade_id)
  WHERE numero_nf IS NOT NULL AND cnpj_fornecedor IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nf_unidade_data
  ON public.notas_fiscais(unidade_id, data_emissao DESC);
CREATE INDEX IF NOT EXISTS idx_nf_fornecedor
  ON public.notas_fiscais(cnpj_fornecedor);

ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;

CREATE POLICY nf_select ON public.notas_fiscais
  FOR SELECT USING (public.is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY nf_insert ON public.notas_fiscais
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND public.pode_editar_negocio(auth.uid(), unidade_id)
  );
CREATE POLICY nf_update ON public.notas_fiscais
  FOR UPDATE USING (public.pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY nf_delete ON public.notas_fiscais
  FOR DELETE USING (public.pode_editar_negocio(auth.uid(), unidade_id));

CREATE TRIGGER trg_nf_updated_at
  BEFORE UPDATE ON public.notas_fiscais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2) CONTAS A PAGAR
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contas_a_pagar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_fiscal_id UUID REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,

  numero_parcela INT NOT NULL DEFAULT 1,
  total_parcelas INT NOT NULL DEFAULT 1,
  fornecedor VARCHAR(200) NOT NULL,
  cnpj_fornecedor VARCHAR(14),
  descricao VARCHAR(300),

  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  data_emissao DATE,

  banco VARCHAR(50),
  linha_digitavel VARCHAR(60),
  codigo_barras VARCHAR(48),
  nosso_numero VARCHAR(30),
  forma_pagamento VARCHAR(30),

  categoria VARCHAR(50),
  subcategoria VARCHAR(80),

  status VARCHAR(20) NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),

  user_id UUID NOT NULL DEFAULT auth.uid(),
  unidade_id UUID NOT NULL,
  origem VARCHAR(20) NOT NULL DEFAULT 'manual',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cp_unidade_status
  ON public.contas_a_pagar(unidade_id, status, data_vencimento);
CREATE INDEX IF NOT EXISTS idx_cp_vencimento_pendente
  ON public.contas_a_pagar(data_vencimento) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_cp_nf
  ON public.contas_a_pagar(nota_fiscal_id);

ALTER TABLE public.contas_a_pagar ENABLE ROW LEVEL SECURITY;

CREATE POLICY cp_select ON public.contas_a_pagar
  FOR SELECT USING (public.is_member_of_unidade(auth.uid(), unidade_id));
CREATE POLICY cp_insert ON public.contas_a_pagar
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND public.pode_editar_negocio(auth.uid(), unidade_id)
  );
CREATE POLICY cp_update ON public.contas_a_pagar
  FOR UPDATE USING (public.pode_editar_negocio(auth.uid(), unidade_id));
CREATE POLICY cp_delete ON public.contas_a_pagar
  FOR DELETE USING (public.pode_editar_negocio(auth.uid(), unidade_id));

CREATE TRIGGER trg_cp_updated_at
  BEFORE UPDATE ON public.contas_a_pagar
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3) VINCULOS em lancamentos_financeiros
-- ============================================================
ALTER TABLE public.lancamentos_financeiros
  ADD COLUMN IF NOT EXISTS conta_pagar_id UUID REFERENCES public.contas_a_pagar(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nota_fiscal_id UUID REFERENCES public.notas_fiscais(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lf_conta_pagar
  ON public.lancamentos_financeiros(conta_pagar_id);
CREATE INDEX IF NOT EXISTS idx_lf_nf
  ON public.lancamentos_financeiros(nota_fiscal_id);

-- ============================================================
-- 4) FUNCAO atualizar contas atrasadas
-- ============================================================
CREATE OR REPLACE FUNCTION public.atualizar_contas_atrasadas()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.contas_a_pagar
     SET status = 'atrasado', updated_at = NOW()
   WHERE status = 'pendente' AND data_vencimento < CURRENT_DATE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.atualizar_contas_atrasadas TO authenticated;

-- ============================================================
-- 5) RPC marcar_conta_paga (atomica)
-- ============================================================
CREATE OR REPLACE FUNCTION public.marcar_conta_paga(
  p_conta_id UUID,
  p_data_pagamento DATE DEFAULT CURRENT_DATE,
  p_valor_pago NUMERIC DEFAULT NULL,
  p_forma_pagamento TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conta RECORD;
  v_lancamento_id UUID;
  v_user UUID := auth.uid();
BEGIN
  SELECT * INTO v_conta
    FROM public.contas_a_pagar
   WHERE id = p_conta_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta não encontrada';
  END IF;

  IF NOT public.pode_editar_negocio(v_user, v_conta.unidade_id) THEN
    RAISE EXCEPTION 'Sem permissão para marcar pagamento nesta unidade';
  END IF;

  IF v_conta.status = 'pago' THEN
    RAISE EXCEPTION 'Conta já está paga';
  END IF;

  UPDATE public.contas_a_pagar
     SET status = 'pago',
         data_pagamento = p_data_pagamento,
         forma_pagamento = COALESCE(p_forma_pagamento, forma_pagamento),
         updated_at = NOW()
   WHERE id = p_conta_id;

  INSERT INTO public.lancamentos_financeiros (
    descricao, valor, tipo, categoria, subcategoria,
    data_lancamento, pago, user_id, unidade_id,
    conta_pagar_id, nota_fiscal_id, classificacao_origem
  ) VALUES (
    v_conta.fornecedor || ' - Parcela ' || v_conta.numero_parcela || '/' || v_conta.total_parcelas,
    COALESCE(p_valor_pago, v_conta.valor),
    'despesa',
    COALESCE(v_conta.categoria, 'Outros'),
    v_conta.subcategoria,
    p_data_pagamento,
    true,
    v_user,
    v_conta.unidade_id,
    v_conta.id,
    v_conta.nota_fiscal_id,
    'manual'
  ) RETURNING id INTO v_lancamento_id;

  RETURN json_build_object(
    'sucesso', true,
    'conta_id', p_conta_id,
    'lancamento_id', v_lancamento_id,
    'valor', COALESCE(p_valor_pago, v_conta.valor)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_conta_paga TO authenticated;

-- ============================================================
-- 6) VIEW resumo
-- ============================================================
CREATE OR REPLACE VIEW public.v_resumo_contas_pagar
WITH (security_invoker = true)
AS
SELECT
  unidade_id,
  COUNT(*) FILTER (WHERE status IN ('pendente','atrasado')) AS qtd_em_aberto,
  COUNT(*) FILTER (WHERE status = 'pendente') AS qtd_pendentes,
  COUNT(*) FILTER (WHERE status = 'atrasado') AS qtd_atrasadas,
  COUNT(*) FILTER (WHERE status IN ('pendente','atrasado')
                   AND data_vencimento <= CURRENT_DATE + INTERVAL '7 days') AS qtd_proximas_7d,
  COALESCE(SUM(valor) FILTER (WHERE status IN ('pendente','atrasado')), 0) AS total_a_pagar,
  COALESCE(SUM(valor) FILTER (WHERE status = 'atrasado'), 0) AS total_atrasado,
  COALESCE(SUM(valor) FILTER (WHERE status = 'pago'
                              AND data_pagamento >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS total_pago_mes
FROM public.contas_a_pagar
GROUP BY unidade_id;

GRANT SELECT ON public.v_resumo_contas_pagar TO authenticated;

-- ============================================================
-- 7) BACKFILL: Cupom Fiscal futuros viram contas_a_pagar
-- ============================================================
INSERT INTO public.contas_a_pagar (
  fornecedor, valor, data_vencimento, descricao,
  categoria, subcategoria, status, user_id, unidade_id, origem
)
SELECT
  NULLIF(TRIM(REPLACE(lf.descricao, 'Cupom Fiscal - ', '')), '') AS fornecedor,
  lf.valor,
  lf.data_lancamento,
  lf.descricao,
  lf.categoria,
  lf.subcategoria,
  CASE WHEN lf.data_lancamento < CURRENT_DATE THEN 'atrasado' ELSE 'pendente' END,
  lf.user_id,
  lf.unidade_id,
  'migracao'
FROM public.lancamentos_financeiros lf
WHERE lf.descricao LIKE 'Cupom Fiscal -%'
  AND lf.data_lancamento > CURRENT_DATE
  AND lf.tipo = 'despesa'
  AND lf.unidade_id IS NOT NULL
  AND COALESCE(lf.pago, false) = false
  AND NOT EXISTS (
    SELECT 1 FROM public.contas_a_pagar cp
     WHERE cp.descricao = lf.descricao
       AND cp.valor = lf.valor
       AND cp.unidade_id = lf.unidade_id
  );