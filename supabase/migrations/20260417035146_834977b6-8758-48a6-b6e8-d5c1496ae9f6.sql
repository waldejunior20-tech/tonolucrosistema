-- ============================================================
-- FASE 1: Fundação Multi-Unidade + Roles + Activity Logs
-- ============================================================

-- 1) Enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'caixa');

-- 2) Tabela unidades
CREATE TABLE public.unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  endereco text,
  cidade text DEFAULT '',
  estado text DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Tabela unidade_membros (vínculo user ↔ unidade)
CREATE TABLE public.unidade_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unidade_id, user_id)
);

-- 4) Tabela user_roles (role por unidade)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  unidade_id uuid NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, unidade_id, role)
);

-- 5) Tabela activity_logs
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL,
  acao text NOT NULL,             -- 'criou_venda', 'editou_ficha', 'ajustou_estoque', etc.
  entidade text,                  -- 'vendas', 'fichas_tecnicas_pizza', etc.
  entidade_id uuid,
  detalhes jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_logs_unidade_created ON public.activity_logs(unidade_id, created_at DESC);
CREATE INDEX idx_activity_logs_user_created ON public.activity_logs(user_id, created_at DESC);

-- ============================================================
-- FUNÇÕES SECURITY DEFINER (evitam recursão em RLS)
-- ============================================================

-- has_role: usuário tem essa role nessa unidade?
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _unidade_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND unidade_id = _unidade_id AND role = _role
  );
$$;

-- is_member_of_unidade: usuário pertence à unidade?
CREATE OR REPLACE FUNCTION public.is_member_of_unidade(_user_id uuid, _unidade_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.unidade_membros
    WHERE user_id = _user_id AND unidade_id = _unidade_id
  );
$$;

-- get_user_unidades: lista todas unidades do user com role principal
CREATE OR REPLACE FUNCTION public.get_user_unidades(_user_id uuid)
RETURNS TABLE (
  unidade_id uuid,
  nome text,
  cidade text,
  estado text,
  ativo boolean,
  role public.app_role
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.nome, u.cidade, u.estado, u.ativo,
    -- pega a role mais alta (admin > gerente > caixa)
    (SELECT ur.role FROM public.user_roles ur
     WHERE ur.user_id = _user_id AND ur.unidade_id = u.id
     ORDER BY CASE ur.role WHEN 'admin' THEN 1 WHEN 'gerente' THEN 2 ELSE 3 END
     LIMIT 1) AS role
  FROM public.unidades u
  INNER JOIN public.unidade_membros m ON m.unidade_id = u.id
  WHERE m.user_id = _user_id
  ORDER BY u.nome;
$$;

-- has_any_role_in_any_unidade: helper para checar se já é admin de alguma unidade
CREATE OR REPLACE FUNCTION public.is_admin_of_unidade(_user_id uuid, _unidade_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, _unidade_id, 'admin'::public.app_role);
$$;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidade_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- UNIDADES
CREATE POLICY "Membros veem suas unidades"
  ON public.unidades FOR SELECT
  USING (public.is_member_of_unidade(auth.uid(), id));

CREATE POLICY "Qualquer autenticado pode criar unidade (vira admin dela)"
  ON public.unidades FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admin da unidade pode atualizar"
  ON public.unidades FOR UPDATE
  USING (public.has_role(auth.uid(), id, 'admin'::public.app_role));

CREATE POLICY "Admin da unidade pode deletar"
  ON public.unidades FOR DELETE
  USING (public.has_role(auth.uid(), id, 'admin'::public.app_role));

-- UNIDADE_MEMBROS
CREATE POLICY "Membros veem outros membros da mesma unidade"
  ON public.unidade_membros FOR SELECT
  USING (public.is_member_of_unidade(auth.uid(), unidade_id));

CREATE POLICY "Admin pode adicionar membros"
  ON public.unidade_membros FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), unidade_id, 'admin'::public.app_role));

CREATE POLICY "Admin pode remover membros"
  ON public.unidade_membros FOR DELETE
  USING (public.has_role(auth.uid(), unidade_id, 'admin'::public.app_role));

-- USER_ROLES
CREATE POLICY "Membros veem roles da sua unidade"
  ON public.user_roles FOR SELECT
  USING (public.is_member_of_unidade(auth.uid(), unidade_id));

CREATE POLICY "Admin pode atribuir roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), unidade_id, 'admin'::public.app_role));

CREATE POLICY "Admin pode atualizar roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), unidade_id, 'admin'::public.app_role));

CREATE POLICY "Admin pode remover roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), unidade_id, 'admin'::public.app_role));

-- ACTIVITY_LOGS
CREATE POLICY "Admin/gerente veem logs da sua unidade"
  ON public.activity_logs FOR SELECT
  USING (
    public.has_role(auth.uid(), unidade_id, 'admin'::public.app_role) OR
    public.has_role(auth.uid(), unidade_id, 'gerente'::public.app_role)
  );

CREATE POLICY "Membros podem inserir logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    (unidade_id IS NULL OR public.is_member_of_unidade(auth.uid(), unidade_id))
  );

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Quando uma unidade é criada, o criador automaticamente vira admin + membro
CREATE OR REPLACE FUNCTION public.bootstrap_unidade_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.unidade_membros (unidade_id, user_id) VALUES (NEW.id, NEW.created_by);
  INSERT INTO public.user_roles (unidade_id, user_id, role) VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bootstrap_unidade_admin
  AFTER INSERT ON public.unidades
  FOR EACH ROW EXECUTE FUNCTION public.bootstrap_unidade_admin();

-- updated_at em unidades
CREATE TRIGGER trg_unidades_updated_at
  BEFORE UPDATE ON public.unidades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- BACKFILL: cada user existente em configuracoes_negocio ganha
-- uma "Unidade Principal" e vira admin dela
-- ============================================================
DO $$
DECLARE
  cfg RECORD;
  nova_unidade_id uuid;
BEGIN
  FOR cfg IN
    SELECT DISTINCT user_id, nome_estabelecimento, cidade, estado
    FROM public.configuracoes_negocio
    WHERE user_id IS NOT NULL
  LOOP
    -- só cria se ainda não tem nenhuma unidade vinculada
    IF NOT EXISTS (SELECT 1 FROM public.unidade_membros WHERE user_id = cfg.user_id) THEN
      INSERT INTO public.unidades (nome, cidade, estado, created_by)
      VALUES (
        COALESCE(NULLIF(cfg.nome_estabelecimento, ''), 'Unidade Principal'),
        COALESCE(cfg.cidade, ''),
        COALESCE(cfg.estado, ''),
        cfg.user_id
      )
      RETURNING id INTO nova_unidade_id;
      -- o trigger bootstrap_unidade_admin já cria membro+role admin
    END IF;
  END LOOP;
END $$;