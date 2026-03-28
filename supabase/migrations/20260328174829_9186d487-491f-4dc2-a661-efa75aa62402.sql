CREATE TABLE public.precificacao_produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ficha_id UUID NOT NULL REFERENCES public.fichas_tecnicas_produtos(id) ON DELETE CASCADE,
  preco_venda NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ficha_id)
);

ALTER TABLE public.precificacao_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access for precificacao_produtos"
  ON public.precificacao_produtos
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_precificacao_produtos_updated_at
  BEFORE UPDATE ON public.precificacao_produtos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();