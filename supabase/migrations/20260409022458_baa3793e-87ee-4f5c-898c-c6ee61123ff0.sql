
-- Create promocoes table
CREATE TABLE public.promocoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT auth.uid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'preco_fixo',
    'desconto_percentual',
    'desconto_valor_fixo',
    'leve_mais_por_menos',
    'brinde',
    'adicional_gratis',
    'por_categoria'
  )),
  produto_ids UUID[] DEFAULT '{}',
  categoria_alvo TEXT,
  regra_descricao TEXT,
  valor_original NUMERIC(10,2),
  desconto_aplicado NUMERIC(10,2),
  preco_final_promocional NUMERIC(10,2),
  lucro_real_rs NUMERIC(10,2),
  lucro_real_pct NUMERIC(5,2),
  margem_minima_aceitavel NUMERIC(5,2) DEFAULT 30,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  dias_semana TEXT[] DEFAULT ARRAY['seg','ter','qua','qui','sex','sab','dom'],
  horario_inicio TIME,
  horario_fim TIME,
  status TEXT DEFAULT 'agendada' CHECK (status IN (
    'ativa','inativa','agendada','encerrada'
  )),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS with public access (matching project pattern)
ALTER TABLE public.promocoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access for promocoes" ON public.promocoes
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_promocoes_updated_at
  BEFORE UPDATE ON public.promocoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-status function: updates status based on dates (skips 'inativa')
CREATE OR REPLACE FUNCTION public.promocoes_auto_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'inativa' THEN
    RETURN NEW;
  END IF;
  IF NEW.data_inicio > CURRENT_DATE THEN
    NEW.status := 'agendada';
  ELSIF NEW.data_fim IS NULL OR NEW.data_fim >= CURRENT_DATE THEN
    NEW.status := 'ativa';
  ELSE
    NEW.status := 'encerrada';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER promocoes_auto_status_trigger
  BEFORE INSERT OR UPDATE ON public.promocoes
  FOR EACH ROW
  EXECUTE FUNCTION public.promocoes_auto_status();
