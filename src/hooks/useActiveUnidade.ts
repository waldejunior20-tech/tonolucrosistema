import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";

export type UnidadeRow = {
  unidade_id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  ativo: boolean;
  role: "admin" | "gerente" | "caixa";
};

const STORAGE_KEY = "active_unidade_id";

/**
 * Hook central para multi-unidade.
 * - Lista as unidades do usuário (via RPC get_user_unidades).
 * - Persiste a unidade ativa em localStorage.
 * - Garante que a ativa pertence à lista; senão escolhe a 1ª.
 */
export function useActiveUnidade() {
  const unidadesQuery = useQuery({
    queryKey: ["user-unidades"],
    queryFn: async (): Promise<UnidadeRow[]> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase.rpc("get_user_unidades", { _user_id: auth.user.id });
      if (error) throw error;
      return (data ?? []) as UnidadeRow[];
    },
    staleTime: 60_000,
  });

  const unidades = unidadesQuery.data ?? [];
  const [activeId, setActiveIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  // Sincroniza: se id salvo não existe na lista, troca para a primeira
  useEffect(() => {
    if (unidades.length === 0) return;
    const stillValid = activeId && unidades.some((u) => u.unidade_id === activeId);
    if (!stillValid) {
      const next = unidades[0].unidade_id;
      setActiveIdState(next);
      localStorage.setItem(STORAGE_KEY, next);
    }
  }, [unidades, activeId]);

  const setActiveUnidade = useCallback((id: string) => {
    setActiveIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
    // Recarrega para invalidar todos os caches dependentes de unidade
    window.location.reload();
  }, []);

  const active = unidades.find((u) => u.unidade_id === activeId) ?? null;

  return {
    unidades,
    activeUnidadeId: activeId,
    activeUnidade: active,
    role: active?.role ?? null,
    isAdmin: active?.role === "admin",
    isGerente: active?.role === "gerente",
    isCaixa: active?.role === "caixa",
    podeEditarNegocio: active?.role === "admin" || active?.role === "gerente",
    setActiveUnidade,
    isLoading: unidadesQuery.isLoading,
  };
}

/**
 * Helper síncrono para uso em mutations: lê a unidade ativa direto do localStorage.
 * Use SEMPRE em inserts até termos um interceptor no client.
 */
export function getActiveUnidadeId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function requireActiveUnidadeId(): string {
  const id = getActiveUnidadeId();
  if (!id) throw new Error("Nenhuma unidade ativa selecionada");
  return id;
}
