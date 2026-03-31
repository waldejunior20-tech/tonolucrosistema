CREATE TABLE public.combos_fixos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  preco_venda numeric NOT NULL DEFAULT 0,
  custo_total numeric NOT NULL DEFAULT 0,
  preco_separado numeric NOT NULL DEFAULT 0,
  margem numeric NOT NULL DEFAULT 0,
  user_id uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.combos_fixos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access for combos_fixos" ON public.combos_fixos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_combos_fixos_updated_at
  BEFORE UPDATE ON public.combos_fixos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();