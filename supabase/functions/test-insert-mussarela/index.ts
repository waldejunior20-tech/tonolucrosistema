// Edge function: test-insert-mussarela
// Insere uma compra nova de Mussarela R$48/kg pra testar a cascata end-to-end.
// Usa o user_id e unidade_id da ultima Mussarela real ja cadastrada.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Busca ultima Mussarela com user+unidade preenchidos
  const { data: ref } = await supabase
    .from("insumos_comprados")
    .select("nome, unidade, user_id, unidade_id, preco_pago")
    .ilike("nome", "Mussarela")
    .not("user_id", "is", null)
    .not("unidade_id", "is", null)
    .order("data_compra", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ref) {
    return new Response(JSON.stringify({ error: "Nenhuma Mussarela referencia encontrada" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const novoPreco = 48.0; // antes era 36 → +33%
  const { data: novo, error } = await supabase
    .from("insumos_comprados")
    .insert({
      user_id: ref.user_id,
      unidade_id: ref.unidade_id,
      nome: "Mussarela",
      categoria: "Laticínios",
      quantidade: 1,
      unidade: "kg",
      preco_pago: novoPreco,
      fornecedor: "Teste cascata E2E",
      data_compra: new Date().toISOString().slice(0, 10),
    })
    .select("id, nome, preco_pago")
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Espera 5s pra trigger + cascata processarem (sao assincronos via pg_net)
  await new Promise((r) => setTimeout(r, 5000));

  const [{ count: cHist }, { count: cAlert }, { count: cRuns }, ultimoRun] = await Promise.all([
    supabase.from("historico_precos_insumos").select("*", { count: "exact", head: true }),
    supabase.from("alertas_cmv").select("*", { count: "exact", head: true }),
    supabase.from("workflow_runs").select("*", { count: "exact", head: true })
      .eq("workflow_name", "cascata-preco-cmv"),
    supabase.from("workflow_runs").select("*")
      .eq("workflow_name", "cascata-preco-cmv")
      .order("started_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  return new Response(JSON.stringify({
    success: true,
    inseriu: novo,
    referencia: { preco_anterior: ref.preco_pago, preco_novo: novoPreco },
    aguardou_ms: 5000,
    counts: {
      historico_precos_insumos: cHist,
      alertas_cmv: cAlert,
      workflow_runs_cascata: cRuns,
    },
    ultimo_run: ultimoRun.data,
  }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
