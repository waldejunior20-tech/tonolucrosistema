-- 1) Remove o registro duplicado de teste (sem vínculos)
DELETE FROM public.insumos_comprados WHERE id = 'ab65f209-5b22-4f7b-a771-007cc687f40c';

-- 2) Ativa o trigger de deduplicação que já existe como função
DROP TRIGGER IF EXISTS trg_deduplicar_insumo_comprado ON public.insumos_comprados;
CREATE TRIGGER trg_deduplicar_insumo_comprado
AFTER INSERT ON public.insumos_comprados
FOR EACH ROW
EXECUTE FUNCTION public.deduplicar_insumo_comprado();