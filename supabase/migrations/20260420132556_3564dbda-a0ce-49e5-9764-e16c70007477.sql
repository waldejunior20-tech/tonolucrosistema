-- ─── Drop sales/PDV and stock-tracking infrastructure ──────────────────────
-- This system is NOT a POS. We keep only financial entries (lancamentos_financeiros)
-- and ingredient costs/recipes/pricing. No automatic stock movements anymore.

-- 1) Drop sales tables (cascade removes triggers attached to them)
DROP TABLE IF EXISTS public.vendas_itens CASCADE;
DROP TABLE IF EXISTS public.vendas CASCADE;

-- 2) Drop stock movements table
DROP TABLE IF EXISTS public.estoque_movimentos CASCADE;

-- 3) Drop trigger functions that no longer have a target table
DROP FUNCTION IF EXISTS public.aplicar_movimento_estoque() CASCADE;
DROP FUNCTION IF EXISTS public.compra_insumo_gera_entrada() CASCADE;
DROP FUNCTION IF EXISTS public.baixar_estoque_venda_item() CASCADE;
DROP FUNCTION IF EXISTS public.estornar_estoque_venda_item() CASCADE;

-- 4) Drop stock columns from insumos_comprados (no more stock control)
ALTER TABLE public.insumos_comprados DROP COLUMN IF EXISTS estoque_atual;
ALTER TABLE public.insumos_comprados DROP COLUMN IF EXISTS estoque_minimo;