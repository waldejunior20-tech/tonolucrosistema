
CREATE TABLE public.configuracoes_negocio (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_estabelecimento text NOT NULL DEFAULT '',
  faturamento_medio numeric NOT NULL DEFAULT 0,
  num_funcionarios integer NOT NULL DEFAULT 0,
  aluguel numeric NOT NULL DEFAULT 0,
  energia numeric NOT NULL DEFAULT 0,
  salarios numeric NOT NULL DEFAULT 0,
  internet numeric NOT NULL DEFAULT 0,
  contador numeric NOT NULL DEFAULT 0,
  outros_fixos numeric NOT NULL DEFAULT 0,
  pct_dinheiro_pix numeric NOT NULL DEFAULT 0,
  pct_debito numeric NOT NULL DEFAULT 0,
  pct_credito numeric NOT NULL DEFAULT 0,
  pct_ifood numeric NOT NULL DEFAULT 0,
  onboarding_completo boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes_negocio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access for configuracoes_negocio"
  ON public.configuracoes_negocio
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
