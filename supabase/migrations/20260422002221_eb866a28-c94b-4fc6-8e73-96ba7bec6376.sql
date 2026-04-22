CREATE OR REPLACE FUNCTION public.auditar_rendimentos_suspeitos()
RETURNS TABLE(
  id uuid,
  nome text,
  rendimento numeric,
  unidade_rendimento text,
  unidade_id uuid,
  created_at timestamp without time zone
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT ip.id, ip.nome, ip.rendimento, ip.unidade_rendimento, ip.unidade_id, ip.created_at
  FROM public.insumos_proprios ip
  WHERE ip.rendimento > 100
    AND ip.unidade_rendimento IN ('kg', 'L')
  ORDER BY ip.rendimento DESC;
$$;