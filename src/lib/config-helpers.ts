import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { ConfigPrecificacao } from "@/lib/pricing-helpers";

type ConfigNegocioRow = Tables<"configuracoes_negocio">;

export const DEFAULT_CONFIG_NEGOCIO: Omit<ConfigNegocioRow, "id" | "created_at" | "updated_at" | "user_id"> = {
  nome_estabelecimento: "",
  faturamento_medio: 0,
  num_funcionarios: 0,
  aluguel: 0,
  energia: 0,
  salarios: 0,
  internet: 0,
  contador: 0,
  outros_fixos: 0,
  pct_dinheiro_pix: 0,
  pct_debito: 0,
  pct_credito: 0,
  pct_ifood: 0,
  onboarding_completo: false,
  cidade: "",
  estado: "",
  tamanhos_pizza: ["P", "M", "G"],
  custos_fixos_detalhados: [],
  lucro_desejado_pct: 15,
  agua: 0,
};

export const DEFAULT_CONFIG_PRECIFICACAO: Omit<ConfigPrecificacao, "id"> = {
  custos_fixos_pct: 22,
  cmv_meta_pct: 32,
  taxa_ifood_pct: 12,
  taxa_debito_pct: 1.35,
  taxa_credito_pct: 3.15,
  taxa_pix_pct: 0,
  app_ifood_ativo: false,
  app_rappi_ativo: false,
  app_aiqfome_ativo: false,
  taxa_rappi_pct: 12,
  taxa_aiqfome_pct: 12,
  app_outro_ativo: false,
  app_outro_nome: "",
  taxa_outro_pct: 12,
  ifood_plano: "entrega_parceira",
};

export async function getOrCreateConfiguracoesNegocio() {
  const { data: existing, error } = await supabase
    .from("configuracoes_negocio")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (existing) return existing;

  const { data, error: insertError } = await supabase
    .from("configuracoes_negocio")
    .insert(DEFAULT_CONFIG_NEGOCIO as never)
    .select("*")
    .single();

  if (insertError) throw insertError;
  return data;
}

export async function getOrCreateConfiguracoesPrecificacao() {
  const { data: existing, error } = await supabase
    .from("configuracoes_precificacao")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (existing) return existing as ConfigPrecificacao;

  const { data, error: insertError } = await supabase
    .from("configuracoes_precificacao")
    .insert(DEFAULT_CONFIG_PRECIFICACAO as never)
    .select("*")
    .single();

  if (insertError) throw insertError;
  return data as ConfigPrecificacao;
}
