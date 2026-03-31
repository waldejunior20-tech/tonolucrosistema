
ALTER TABLE public.configuracoes_precificacao
  ADD COLUMN IF NOT EXISTS app_ifood_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS app_rappi_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS app_aiqfome_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS taxa_rappi_pct numeric NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS taxa_aiqfome_pct numeric NOT NULL DEFAULT 12;
