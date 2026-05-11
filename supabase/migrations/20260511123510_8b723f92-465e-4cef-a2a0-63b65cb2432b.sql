
CREATE OR REPLACE FUNCTION public.classificar_por_palavra_chave(texto_input TEXT)
RETURNS TABLE (
  categoria VARCHAR,
  subcategoria VARCHAR,
  tipo VARCHAR,
  emoji VARCHAR,
  match_score INT
)
LANGUAGE plpgsql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.categoria,
    c.subcategoria,
    c.tipo,
    c.emoji,
    (SELECT COUNT(*)::INT FROM unnest(c.palavras_chave) AS kw
     WHERE LOWER(texto_input) LIKE '%' || LOWER(kw) || '%') AS match_score
  FROM public.categorias_despesa c
  WHERE c.ativo = true
    AND EXISTS (
      SELECT 1 FROM unnest(c.palavras_chave) AS kw
      WHERE LOWER(texto_input) LIKE '%' || LOWER(kw) || '%'
    )
  ORDER BY match_score DESC, c.ordem ASC
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.classificar_por_palavra_chave(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.classificar_por_palavra_chave(TEXT) TO authenticated;
