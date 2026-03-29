-- 1. Add business_name to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_name TEXT;

-- 2. Define a helper function to set up auth for a table
-- This function will add user_id, enable RLS, and set up policies.
-- We'll call it for each table.

DO $$
DECLARE
    table_name_var TEXT;
    tables_list TEXT[] := ARRAY[
        'insumos_comprados', 
        'insumos_proprios', 
        'insumos_proprios_ingredientes', 
        'fichas_tecnicas_pizza', 
        'fichas_tecnicas_pizza_ingredientes', 
        'fichas_tecnicas_produtos', 
        'fichas_tecnicas_produtos_ingredientes', 
        'lancamentos_financeiros', 
        'configuracoes_negocio', 
        'configuracoes_precificacao', 
        'precificacao_pizzas', 
        'precificacao_bebidas', 
        'metas_financeiras'
    ];
BEGIN
    FOREACH table_name_var IN ARRAY tables_list
    LOOP
        -- Check if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name_var AND table_schema = 'public') THEN
            -- Add user_id column if not exists
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()', table_name_var);
            
            -- Enable RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name_var);
            
            -- Drop existing policies if any to avoid errors
            EXECUTE format('DROP POLICY IF EXISTS "Users can view their own %I" ON public.%I', table_name_var, table_name_var);
            EXECUTE format('DROP POLICY IF EXISTS "Users can create their own %I" ON public.%I', table_name_var, table_name_var);
            EXECUTE format('DROP POLICY IF EXISTS "Users can update their own %I" ON public.%I', table_name_var, table_name_var);
            EXECUTE format('DROP POLICY IF EXISTS "Users can delete their own %I" ON public.%I', table_name_var, table_name_var);
            
            -- Create policies
            EXECUTE format('CREATE POLICY "Users can view their own %I" ON public.%I FOR SELECT USING (auth.uid() = user_id)', table_name_var, table_name_var);
            EXECUTE format('CREATE POLICY "Users can create their own %I" ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id)', table_name_var, table_name_var);
            EXECUTE format('CREATE POLICY "Users can update their own %I" ON public.%I FOR UPDATE USING (auth.uid() = user_id)', table_name_var, table_name_var);
            EXECUTE format('CREATE POLICY "Users can delete their own %I" ON public.%I FOR DELETE USING (auth.uid() = user_id)', table_name_var, table_name_var);
            
            -- Optional: Add an index on user_id
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I_user_id_idx ON public.%I (user_id)', table_name_var, table_name_var);
        END IF;
    END LOOP;
END $$;

-- Update profiles RLS as well
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
