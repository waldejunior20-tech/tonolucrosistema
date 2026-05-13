ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retry_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedor_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_only" ON public.rate_limit_log;
DROP POLICY IF EXISTS "service_only" ON public.retry_queue;
DROP POLICY IF EXISTS "service_only" ON public.processing_logs;
DROP POLICY IF EXISTS "service_only" ON public.fornecedor_cache;

CREATE POLICY "service_only" ON public.rate_limit_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_only" ON public.retry_queue FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_only" ON public.processing_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_only" ON public.fornecedor_cache FOR ALL TO service_role USING (true) WITH CHECK (true);