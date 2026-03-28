-- Disable RLS on the tables to allow public access without authentication
ALTER TABLE public.insumos_comprados DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumos_proprios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumos_proprios_ingredientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas_tecnicas_pizza DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas_tecnicas_pizza_ingredientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas_tecnicas_produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas_tecnicas_produtos_ingredientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_preco DISABLE ROW LEVEL SECURITY;

-- Also ensure permissions are granted to public/anon just in case
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;