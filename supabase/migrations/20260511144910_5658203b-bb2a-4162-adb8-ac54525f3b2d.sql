
-- Add dynamic per-size price/cost JSONB columns to bordas
ALTER TABLE public.bordas
  ADD COLUMN IF NOT EXISTS precos_por_tamanho JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS custos_por_tamanho JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Migrate existing P/M/G fixed columns into the JSONB maps
UPDATE public.bordas
SET
  precos_por_tamanho = jsonb_build_object(
    'P', COALESCE(preco_p, 0),
    'M', COALESCE(preco_m, 0),
    'G', COALESCE(preco_g, 0)
  ),
  custos_por_tamanho = jsonb_build_object(
    'P', COALESCE(custo_p, 0),
    'M', COALESCE(custo_m, 0),
    'G', COALESCE(custo_g, 0)
  )
WHERE precos_por_tamanho = '{}'::jsonb;
