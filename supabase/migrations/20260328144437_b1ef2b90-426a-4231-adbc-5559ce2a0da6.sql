
CREATE TABLE public.precificacao_bebidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_comprado_id uuid REFERENCES public.insumos_comprados(id) ON DELETE CASCADE NOT NULL,
  preco_venda numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (insumo_comprado_id)
);

ALTER TABLE public.precificacao_bebidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access for precificacao_bebidas"
  ON public.precificacao_bebidas
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
