
-- 1) Tabela whatsapp_users: mapeia número WhatsApp → user_id + unidade padrão
CREATE TABLE public.whatsapp_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_whatsapp TEXT NOT NULL UNIQUE, -- formato E.164 sem '+', ex: '5562999998888'
  user_id UUID NOT NULL,
  unidade_id_padrao UUID NOT NULL,
  nome_amigavel TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_users_user ON public.whatsapp_users(user_id);
CREATE INDEX idx_whatsapp_users_numero ON public.whatsapp_users(numero_whatsapp);

ALTER TABLE public.whatsapp_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wu_select_own"
ON public.whatsapp_users FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "wu_insert_own"
ON public.whatsapp_users FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.is_member_of_unidade(auth.uid(), unidade_id_padrao)
);

CREATE POLICY "wu_update_own"
ON public.whatsapp_users FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "wu_delete_own"
ON public.whatsapp_users FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER trg_whatsapp_users_updated_at
BEFORE UPDATE ON public.whatsapp_users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Permitir INSERT em workflow_runs (hoje só tinha SELECT).
-- Como o n8n usa o user 'postgres' (bypass RLS), a policy abaixo serve para
-- inserts feitos via supabase-js futuramente. n8n grava direto bypass.
CREATE POLICY "wr_insert_member"
ON public.workflow_runs FOR INSERT
WITH CHECK (
  unidade_id IS NULL OR public.is_member_of_unidade(auth.uid(), unidade_id)
);

-- 3) Tornar created_by da unidades nullable para o n8n não precisar simular auth.uid()
-- (o INSERT do n8n será com user 'postgres' que ignora defaults baseados em auth)
-- → não precisa alterar; n8n envia user_id explicitamente em todos os INSERTs.
