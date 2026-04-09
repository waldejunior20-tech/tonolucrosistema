
-- Policies already exist on these tables but let's ensure the named ones exist too
-- (RLS is already enabled on all these tables)

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'configuracoes_negocio' AND policyname = 'user owns config negocio') THEN
    CREATE POLICY "user owns config negocio" ON configuracoes_negocio FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'configuracoes_precificacao' AND policyname = 'user owns config precificacao') THEN
    CREATE POLICY "user owns config precificacao" ON configuracoes_precificacao FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'promocoes' AND policyname = 'user owns promocoes') THEN
    CREATE POLICY "user owns promocoes" ON promocoes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
