
-- 1. Views: recriar com security_invoker
CREATE OR REPLACE VIEW public.processing_errors_24h
WITH (security_invoker=true) AS
SELECT workflow_name, node_name, status, count(*) AS total,
  max(created_at) AS ultimo_erro,
  jsonb_agg(jsonb_build_object('msg_id', msg_id, 'detail', detail, 'at', created_at) ORDER BY created_at DESC)
    FILTER (WHERE created_at > (now() - '24:00:00'::interval)) AS erros_recentes
FROM processing_logs
WHERE status = 'error'::text AND created_at > (now() - '24:00:00'::interval)
GROUP BY workflow_name, node_name, status
ORDER BY (count(*)) DESC;

CREATE OR REPLACE VIEW public.processing_health_24h
WITH (security_invoker=true) AS
SELECT workflow_name,
  count(*) FILTER (WHERE status = 'success'::text) AS success_count,
  count(*) FILTER (WHERE status = 'error'::text) AS error_count,
  count(*) FILTER (WHERE status = 'retry'::text) AS retry_count,
  round(count(*) FILTER (WHERE status = 'success'::text)::numeric / NULLIF(count(*), 0)::numeric * 100::numeric, 1) AS success_rate_pct,
  round(avg(duration_ms) FILTER (WHERE status = 'success'::text), 0) AS avg_duration_ms,
  max(created_at) AS last_activity
FROM processing_logs
WHERE created_at > (now() - '24:00:00'::interval)
GROUP BY workflow_name;

-- 2. RLS sem policy: app_config e processamento_mensagens (apenas service_role)
DROP POLICY IF EXISTS "service_only" ON public.app_config;
CREATE POLICY "service_only" ON public.app_config FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_only" ON public.processamento_mensagens;
CREATE POLICY "service_only" ON public.processamento_mensagens FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Functions: search_path fixo
ALTER FUNCTION public.add_alias_to_catalog(text, text) SET search_path = public;
ALTER FUNCTION public.atualiza_ficha_para_ultimo_preco() SET search_path = public;
ALTER FUNCTION public.avaliar_nf_pendente(jsonb, numeric) SET search_path = public;
ALTER FUNCTION public.check_rate_limit(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.classificar_e_upsert_insumo(text, numeric, text, numeric, numeric, text, uuid, uuid, uuid) SET search_path = public;
ALTER FUNCTION public.cleanup_rate_limit_log() SET search_path = public;
ALTER FUNCTION public.enqueue_retry(text, jsonb, text, text, uuid, uuid, integer) SET search_path = public;
ALTER FUNCTION public.lookup_fornecedor_cache(text, numeric) SET search_path = public;
ALTER FUNCTION public.match_insumo_fuzzy(uuid, uuid, text, double precision) SET search_path = public, extensions;
ALTER FUNCTION public.normalizar_nome_insumo(text) SET search_path = public, extensions;
ALTER FUNCTION public.recalcular_custo_insumo_proprio(uuid) SET search_path = public;
ALTER FUNCTION public.resolve_insumo_ingrediente(uuid, uuid, text) SET search_path = public, extensions;
ALTER FUNCTION public.tr_recalcular_custo_on_link() SET search_path = public;
ALTER FUNCTION public.tr_relink_ficha_ingredientes() SET search_path = public, extensions;

-- 4. Revogar EXECUTE de funções SECURITY DEFINER que só devem rodar via trigger/cron interno
REVOKE EXECUTE ON FUNCTION public.bootstrap_unidade_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduplicar_insumo_comprado() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.aplicar_fornecedor_subcategoria() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.aprender_categoria_insumo() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_reavaliar_ficha_pizza() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.varredura_fichas_incompletas() FROM PUBLIC, anon, authenticated;
