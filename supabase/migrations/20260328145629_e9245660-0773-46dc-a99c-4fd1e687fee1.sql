
-- Tabela de lançamentos financeiros
CREATE TABLE public.lancamentos_financeiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  tipo text NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  categoria text NOT NULL,
  data_lancamento date NOT NULL DEFAULT CURRENT_DATE,
  pago boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access for lancamentos_financeiros"
  ON public.lancamentos_financeiros
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Tabela de metas financeiras
CREATE TABLE public.metas_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes integer NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano integer NOT NULL CHECK (ano >= 2020),
  meta_faturamento numeric NOT NULL DEFAULT 0,
  meta_cmv_pct numeric NOT NULL DEFAULT 32,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (mes, ano)
);

ALTER TABLE public.metas_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access for metas_financeiras"
  ON public.metas_financeiras
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger updated_at for lancamentos
CREATE TRIGGER update_lancamentos_financeiros_updated_at
  BEFORE UPDATE ON public.lancamentos_financeiros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
