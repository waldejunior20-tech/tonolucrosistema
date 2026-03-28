CREATE TABLE IF NOT EXISTS public.configuracoes_precificacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custos_fixos_pct numeric NOT NULL DEFAULT 22,
  cmv_meta_pct numeric NOT NULL DEFAULT 32,
  taxa_ifood_pct numeric NOT NULL DEFAULT 12,
  taxa_debito_pct numeric NOT NULL DEFAULT 1.35,
  taxa_credito_pct numeric NOT NULL DEFAULT 3.15,
  taxa_pix_pct numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes_precificacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access for configuracoes_precificacao"
ON public.configuracoes_precificacao FOR ALL
TO anon, authenticated
USING (true) WITH CHECK (true);

-- Insert default row
INSERT INTO public.configuracoes_precificacao (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_configuracoes_precificacao_updated_at
  BEFORE UPDATE ON public.configuracoes_precificacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();