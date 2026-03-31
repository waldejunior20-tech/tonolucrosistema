
-- Add new columns to configuracoes_negocio
ALTER TABLE public.configuracoes_negocio
  ADD COLUMN IF NOT EXISTS cidade text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tamanhos_pizza jsonb NOT NULL DEFAULT '["P","M","G"]'::jsonb,
  ADD COLUMN IF NOT EXISTS custos_fixos_detalhados jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lucro_desejado_pct numeric NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS agua numeric NOT NULL DEFAULT 0;

-- Add new columns to configuracoes_precificacao
ALTER TABLE public.configuracoes_precificacao
  ADD COLUMN IF NOT EXISTS app_outro_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS app_outro_nome text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS taxa_outro_pct numeric NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS ifood_plano text NOT NULL DEFAULT 'entrega_parceira';
