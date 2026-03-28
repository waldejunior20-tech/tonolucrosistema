-- Create table for products technical sheets
CREATE TABLE public.fichas_tecnicas_produtos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL CHECK (categoria IN ('sanduiche', 'prato', 'sobremesa', 'bebida')),
    modo_preparo TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fichas_tecnicas_produtos ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view products technical sheets" ON public.fichas_tecnicas_produtos FOR SELECT USING (true);
CREATE POLICY "Anyone can insert products technical sheets" ON public.fichas_tecnicas_produtos FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update products technical sheets" ON public.fichas_tecnicas_produtos FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete products technical sheets" ON public.fichas_tecnicas_produtos FOR DELETE USING (true);

-- Create table for products ingredients
CREATE TABLE public.fichas_tecnicas_produtos_ingredientes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ficha_id UUID NOT NULL REFERENCES public.fichas_tecnicas_produtos(id) ON DELETE CASCADE,
    tipo_insumo TEXT NOT NULL CHECK (tipo_insumo IN ('comprado', 'produzido')),
    insumo_comprado_id UUID REFERENCES public.insumos_comprados(id),
    insumo_proprio_id UUID REFERENCES public.insumos_proprios(id),
    quantidade NUMERIC NOT NULL,
    unidade TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fichas_tecnicas_produtos_ingredientes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view products ingredients" ON public.fichas_tecnicas_produtos_ingredientes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert products ingredients" ON public.fichas_tecnicas_produtos_ingredientes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update products ingredients" ON public.fichas_tecnicas_produtos_ingredientes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete products ingredients" ON public.fichas_tecnicas_produtos_ingredientes FOR DELETE USING (true);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fichas_tecnicas_produtos_updated_at
BEFORE UPDATE ON public.fichas_tecnicas_produtos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fichas_tecnicas_produtos_ingredientes_updated_at
BEFORE UPDATE ON public.fichas_tecnicas_produtos_ingredientes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
