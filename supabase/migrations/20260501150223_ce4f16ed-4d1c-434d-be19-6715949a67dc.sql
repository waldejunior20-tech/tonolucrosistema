DROP TRIGGER IF EXISTS trg_cascata_preco_cmv ON public.insumos_comprados;
CREATE TRIGGER trg_cascata_preco_cmv
AFTER INSERT OR UPDATE OF preco_pago, quantidade ON public.insumos_comprados
FOR EACH ROW EXECUTE FUNCTION public.disparar_cascata_preco_cmv();