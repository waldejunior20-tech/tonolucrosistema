// Edge function: backfill-cascata
// Itera todos insumos_comprados em ordem cronologica e chama cascata-preco-cmv
// pra cada um, populando historico_precos_insumos e alertas_cmv com o estado atual.
//
// Uso (uma vez): POST /backfill-cascata { unidade_id?: string }
//   - sem unidade_id: processa todas as unidades do usuario
//   - com unidade_id: processa so aquela
//
// Auth: usuario autenticado (qualquer JWT valido).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Auth: precisa estar logado
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const sbAuth = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: authErr } = await sbAuth.auth.getClaims(token);
  if (authErr || !claims?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claims.claims.sub;

  // Le secret + url da cascata
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: cfgRows } = await supabase
    .from("app_config")
    .select("key, value")
    .in("key", ["cascata_url", "cascata_secret"]);
  const cfg = Object.fromEntries((cfgRows ?? []).map((r) => [r.key, r.value]));
  if (!cfg.cascata_url || !cfg.cascata_secret) {
    return new Response(JSON.stringify({
      error: "app_config incompleto. Configure cascata_url e cascata_secret antes de rodar o backfill.",
      configurado: cfg,
    }), { status: 412, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let body: { unidade_id?: string } = {};
  try { body = await req.json(); } catch { /* ok, body vazio */ }

  // Lista unidades do user
  let unidadesQuery = supabase
    .from("unidade_membros")
    .select("unidade_id")
    .eq("user_id", userId);
  const { data: membros } = await unidadesQuery;
  let unidadeIds = (membros ?? []).map((m) => m.unidade_id);
  if (body.unidade_id) unidadeIds = unidadeIds.filter((u) => u === body.unidade_id);

  if (unidadeIds.length === 0) {
    return new Response(JSON.stringify({ error: "Usuario nao tem unidades acessiveis" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Lista TODOS insumos das unidades, ordem cronologica (asc) — assim o "anterior"
  // sempre existe quando processamos o "novo".
  const { data: insumos, error: insErr } = await supabase
    .from("insumos_comprados")
    .select("id, nome, data_compra, created_at, unidade_id")
    .in("unidade_id", unidadeIds)
    .order("data_compra", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  if (insErr) {
    return new Response(JSON.stringify({ error: insErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const total = insumos?.length ?? 0;
  let chamadas = 0;
  let falhas = 0;
  const inicio = Date.now();

  for (const ins of insumos ?? []) {
    try {
      const r = await fetch(cfg.cascata_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": cfg.cascata_secret,
        },
        body: JSON.stringify({ insumo_id: ins.id }),
      });
      if (r.ok) chamadas++;
      else falhas++;
      // Body precisa ser consumido em Deno
      await r.text();
    } catch {
      falhas++;
    }
  }

  return new Response(JSON.stringify({
    success: true,
    total_insumos: total,
    chamadas_ok: chamadas,
    falhas,
    duration_ms: Date.now() - inicio,
    unidades: unidadeIds,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
