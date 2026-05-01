-- Habilita pg_net
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Tabela interna de config (so service_role acessa)
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
-- Sem policies = ninguem acessa via API (apenas service_role bypass).

-- Insere URL da edge function (idempotente)
INSERT INTO public.app_config (key, value)
VALUES ('cascata_url', 'https://lokqongxioqbesejavdm.supabase.co/functions/v1/cascata-preco-cmv')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Funcao trigger: chama edge function de forma assincrona via pg_net
CREATE OR REPLACE FUNCTION public.disparar_cascata_preco_cmv()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url TEXT;
  v_secret TEXT;
BEGIN
  SELECT value INTO v_url FROM public.app_config WHERE key = 'cascata_url';
  SELECT value INTO v_secret FROM public.app_config WHERE key = 'cascata_secret';

  IF v_url IS NULL OR v_url = '' OR v_secret IS NULL OR v_secret = '' THEN
    -- Config nao setada ainda. Sai sem quebrar o INSERT.
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-api-key', v_secret
      ),
      body := jsonb_build_object('insumo_id', NEW.id),
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Cascata preco/CMV falhou para insumo %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_cascata_preco_cmv ON public.insumos_comprados;

CREATE TRIGGER tr_cascata_preco_cmv
AFTER INSERT ON public.insumos_comprados
FOR EACH ROW
EXECUTE FUNCTION public.disparar_cascata_preco_cmv();