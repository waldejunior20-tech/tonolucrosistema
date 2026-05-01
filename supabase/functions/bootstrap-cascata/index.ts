// Edge function: bootstrap-cascata
// Faz tudo de uma vez (chamada UMA vez sem auth, idempotente):
//  1. Le N8N_INGEST_SECRET_NEW do env
//  2. Popula app_config.cascata_secret
//  3. Itera todos insumos_comprados e chama cascata-preco-cmv pra cada um (backfill)
//
// Auth: nenhuma — se proteje com check do env. Apos rodar com sucesso,
// pode ser deletada se quiser.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NEW_SECRET = Deno.env.get("N8N_INGEST_SECRET_NEW") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!NEW_SECRET) {
    return new Response(JSON.stringify({
      error: "N8N_INGEST_SECRET_NEW nao configurado no env. Adicione o secret antes de chamar.",
    }), { status: 412, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // 1. Atualiza app_config.cascata_secret com o valor novo
  const { error: cfgErr } = await supabase.from("app_config").upsert(
    { key: "cascata_secret", value: NEW_SECRET, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
  if (cfgErr) {
    return new Response(JSON.stringify({ step: "set_secret", error: cfgErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Le URL da cascata
  const { data: urlRow } = await supabase
    .from("app_config").select("value").eq("key", "cascata_url").maybeSingle();
  const cascataUrl = urlRow?.value;
  if (!cascataUrl) {
    return new Response(JSON.stringify({ step: "get_url", error: "cascata_url nao configurada" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 3. Lista TODOS insumos em ordem cronologica
  const { data: insumos, error: insErr } = await supabase
    .from("insumos_comprados")
    .select("id, nome, data_compra, created_at, unidade_id")
    .order("data_compra", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  if (insErr) {
    return new Response(JSON.stringify({ step: "list_insumos", error: insErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const total = insumos?.length ?? 0;
  let chamadasOk = 0;
  let falhas = 0;
  const errosSample: string[] = [];
  const inicio = Date.now();

  for (const ins of insumos ?? []) {
    try {
      const r = await fetch(cascataUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": NEW_SECRET },
        body: JSON.stringify({ insumo_id: ins.id }),
      });
      const txt = await r.text();
      if (r.ok) chamadasOk++;
      else {
        falhas++;
        if (errosSample.length < 3) errosSample.push(`${r.status}: ${txt.slice(0, 200)}`);
      }
    } catch (e) {
      falhas++;
      if (errosSample.length < 3) errosSample.push(String(e).slice(0, 200));
    }
  }

  // 4. Le COUNTs finais
  const [{ count: cHist }, { count: cAlert }, { count: cRuns }] = await Promise.all([
    supabase.from("historico_precos_insumos").select("*", { count: "exact", head: true }),
    supabase.from("alertas_cmv").select("*", { count: "exact", head: true }),
    supabase.from("workflow_runs").select("*", { count: "exact", head: true })
      .eq("workflow_name", "cascata-preco-cmv"),
  ]);

  return new Response(JSON.stringify({
    success: true,
    secret_setado: true,
    backfill: {
      total_insumos: total,
      chamadas_ok: chamadasOk,
      falhas,
      duration_ms: Date.now() - inicio,
      erros_sample: errosSample,
    },
    counts_finais: {
      historico_precos_insumos: cHist,
      alertas_cmv: cAlert,
      workflow_runs_cascata: cRuns,
    },
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
