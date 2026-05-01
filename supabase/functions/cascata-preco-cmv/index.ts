// Edge function: cascata-preco-cmv
// Disparada por trigger AFTER INSERT em insumos_comprados (via pg_net).
// Tambem pode ser chamada manualmente passando { insumo_id } ou
// { unidade_id, nome, preco_unitario_novo }.
//
// Fluxo:
//  1. Recebe insumo recem-inserido.
//  2. Calcula preco unitario novo (preco_pago / quantidade, normalizado kg/L).
//  3. Busca compra anterior do MESMO nome+unidade na mesma unidade_id.
//  4. Se variacao >= 5% (THRESHOLD), grava historico_precos_insumos.
//  5. Recalcula CMV de todas fichas (pizza/produto) que usam esse insumo
//     e cria alertas_cmv com preco sugerido para atingir cmv_meta.
//  6. Registra workflow_runs.
//
// Auth: header x-api-key === N8N_INGEST_SECRET (mesmo secret ja usado).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Aceita qualquer um dos dois secrets (compat com migracao de chave)
const INGEST_SECRETS = [
  Deno.env.get("N8N_INGEST_SECRET") ?? "",
  Deno.env.get("N8N_INGEST_SECRET_NEW") ?? "",
].filter((s) => s.length > 0);

const THRESHOLD_PCT = 5; // MVP: hardcoded. Configuravel depois via configuracoes_precificacao.

interface Payload {
  insumo_id?: string;
  // alternativa direta:
  unidade_id?: string;
  nome?: string;
  preco_unitario_novo?: number;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Normaliza preco unitario para R$/kg ou R$/L quando aplicavel.
function precoUnitario(preco: number, qtd: number, unidade: string): number {
  if (!qtd || qtd <= 0) return 0;
  const fator = unidade === "g" || unidade === "ml" ? qtd / 1000 : qtd;
  return fator > 0 ? preco / fator : 0;
}

// Para cada ficha que usa o insumo, calcula custo total e CMV vs preco atual,
// e devolve preco sugerido para atingir cmv_meta_pct.
async function processarFichasAfetadas(
  supabase: ReturnType<typeof createClient>,
  unidade_id: string,
  user_id: string,
  insumo_id: string,
  nome_insumo: string,
  variacao_pct: number,
) {
  let alertas_criados = 0;

  // cmv_meta da unidade
  const { data: cfg } = await supabase
    .from("configuracoes_precificacao")
    .select("cmv_meta_pct")
    .eq("unidade_id", unidade_id)
    .maybeSingle();
  const cmvMeta = Number(cfg?.cmv_meta_pct ?? 32);
  if (cmvMeta <= 0) return { alertas_criados, fichas_processadas: 0 };

  // ─── PIZZAS ────────────────────────────────────────────────
  const { data: pizzaIngs } = await supabase
    .from("fichas_tecnicas_pizza_ingredientes")
    .select("ficha_id")
    .eq("insumo_comprado_id", insumo_id)
    .eq("unidade_id", unidade_id);

  const pizzaIds = [...new Set((pizzaIngs ?? []).map((r) => r.ficha_id).filter(Boolean))];
  let processadas = 0;

  for (const fichaId of pizzaIds) {
    const { data: ficha } = await supabase
      .from("fichas_tecnicas_pizza")
      .select("id, nome, preco_venda_p, preco_venda_m, preco_venda_g")
      .eq("id", fichaId)
      .maybeSingle();
    if (!ficha) continue;
    processadas++;

    // Calcula custo P/M/G somando ingredientes
    const { data: ings } = await supabase
      .from("fichas_tecnicas_pizza_ingredientes")
      .select("qtd_p, qtd_m, qtd_g, unidade, insumo_comprado_id, insumo_proprio_id")
      .eq("ficha_id", fichaId);

    let custoP = 0, custoM = 0, custoG = 0;
    for (const ing of ings ?? []) {
      // Busca preco unitario do insumo
      let pu = 0;
      if (ing.insumo_comprado_id) {
        const { data: ic } = await supabase
          .from("insumos_comprados")
          .select("preco_pago, quantidade, unidade")
          .eq("id", ing.insumo_comprado_id)
          .order("data_compra", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();
        if (ic) pu = precoUnitario(Number(ic.preco_pago), Number(ic.quantidade), ic.unidade);
      }
      // (insumo_proprio fica de fora do MVP — entra na proxima iteracao)
      const fator = ing.unidade === "g" || ing.unidade === "ml" ? 1000 : 1;
      custoP += (Number(ing.qtd_p ?? 0) / fator) * pu;
      custoM += (Number(ing.qtd_m ?? 0) / fator) * pu;
      custoG += (Number(ing.qtd_g ?? 0) / fator) * pu;
    }

    // Preco sugerido = custo / (cmv_meta/100). Round 2.
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const sugP = custoP > 0 ? round2(custoP / (cmvMeta / 100)) : null;
    const sugM = custoM > 0 ? round2(custoM / (cmvMeta / 100)) : null;
    const sugG = custoG > 0 ? round2(custoG / (cmvMeta / 100)) : null;

    // CMV atual (usa tamanho M como referencia, fallback G ou P)
    const precoRef = Number(ficha.preco_venda_m ?? ficha.preco_venda_g ?? ficha.preco_venda_p ?? 0);
    const custoRef = custoM > 0 ? custoM : custoG > 0 ? custoG : custoP;
    if (precoRef <= 0 || custoRef <= 0) continue;

    const cmvAtual = round2((custoRef / precoRef) * 100);
    const cmvAnterior = variacao_pct < 0
      ? round2(cmvAtual - variacao_pct) // se preco caiu, CMV anterior era maior
      : round2(cmvAtual - variacao_pct);

    // Status pelo gap vs meta
    const gap = cmvAtual - cmvMeta;
    const status = gap >= 8 ? "urgente" : gap >= 3 ? "atencao" : "informativo";

    const { error: alertErr } = await supabase.from("alertas_cmv").insert({
      user_id,
      unidade_id,
      ficha_tecnica_id: fichaId,
      tipo_ficha: "pizza",
      nome_produto: ficha.nome,
      cmv_anterior: cmvAnterior,
      cmv_atual: cmvAtual,
      preco_sugerido: sugM ?? sugG ?? sugP ?? 0,
      preco_sugerido_p: sugP,
      preco_sugerido_m: sugM,
      preco_sugerido_g: sugG,
      status,
      created_by: "automacao",
      metadata: { insumo_id, nome_insumo, variacao_pct, cmv_meta: cmvMeta },
    });
    if (!alertErr) alertas_criados++;
  }

  // ─── PRODUTOS ──────────────────────────────────────────────
  const { data: prodIngs } = await supabase
    .from("fichas_tecnicas_produtos_ingredientes")
    .select("ficha_id")
    .eq("insumo_comprado_id", insumo_id)
    .eq("unidade_id", unidade_id);

  const prodIds = [...new Set((prodIngs ?? []).map((r) => r.ficha_id).filter(Boolean))];

  for (const fichaId of prodIds) {
    const { data: ficha } = await supabase
      .from("fichas_tecnicas_produtos")
      .select("id, nome, preco_venda")
      .eq("id", fichaId)
      .maybeSingle();
    if (!ficha) continue;
    processadas++;

    const { data: ings } = await supabase
      .from("fichas_tecnicas_produtos_ingredientes")
      .select("quantidade, unidade, insumo_comprado_id")
      .eq("ficha_id", fichaId);

    let custo = 0;
    for (const ing of ings ?? []) {
      if (!ing.insumo_comprado_id) continue;
      const { data: ic } = await supabase
        .from("insumos_comprados")
        .select("preco_pago, quantidade, unidade")
        .eq("id", ing.insumo_comprado_id)
        .order("data_compra", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (!ic) continue;
      const pu = precoUnitario(Number(ic.preco_pago), Number(ic.quantidade), ic.unidade);
      const fator = ing.unidade === "g" || ing.unidade === "ml" ? 1000 : 1;
      custo += (Number(ing.quantidade ?? 0) / fator) * pu;
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const sug = custo > 0 ? round2(custo / (cmvMeta / 100)) : 0;
    const precoAtual = Number(ficha.preco_venda ?? 0);
    if (precoAtual <= 0 || custo <= 0) continue;

    const cmvAtual = round2((custo / precoAtual) * 100);
    const cmvAnterior = round2(cmvAtual - variacao_pct);
    const gap = cmvAtual - cmvMeta;
    const status = gap >= 8 ? "urgente" : gap >= 3 ? "atencao" : "informativo";

    const { error: alertErr } = await supabase.from("alertas_cmv").insert({
      user_id,
      unidade_id,
      ficha_tecnica_id: fichaId,
      tipo_ficha: "produto",
      nome_produto: ficha.nome,
      cmv_anterior: cmvAnterior,
      cmv_atual: cmvAtual,
      preco_sugerido: sug,
      status,
      created_by: "automacao",
      metadata: { insumo_id, nome_insumo, variacao_pct, cmv_meta: cmvMeta },
    });
    if (!alertErr) alertas_criados++;
  }

  return { alertas_criados, fichas_processadas: processadas };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  // Auth
  const apiKey = req.headers.get("x-api-key") ?? "";
  if (INGEST_SECRETS.length === 0 || !INGEST_SECRETS.includes(apiKey)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const startedAt = Date.now();

  // Carrega insumo recem-inserido
  if (!payload.insumo_id) {
    return jsonResponse({ error: "insumo_id obrigatorio no MVP" }, 400);
  }

  const { data: novo, error: novoErr } = await supabase
    .from("insumos_comprados")
    .select("id, user_id, unidade_id, nome, preco_pago, quantidade, unidade, data_compra")
    .eq("id", payload.insumo_id)
    .maybeSingle();

  if (novoErr || !novo) {
    return jsonResponse({ error: "Insumo nao encontrado", detail: novoErr?.message }, 404);
  }

  // Cria workflow_run
  const { data: run } = await supabase
    .from("workflow_runs")
    .insert({
      workflow_name: "cascata-preco-cmv",
      trigger_source: "trigger_sql",
      trigger_record_id: novo.id,
      status: "running",
      unidade_id: novo.unidade_id,
      metadata: { insumo: novo.nome },
    })
    .select("id")
    .single();
  const runId = run?.id;

  const puNovo = precoUnitario(Number(novo.preco_pago), Number(novo.quantidade), novo.unidade);

  // Busca compra anterior do mesmo nome+unidade (case-insensitive),
  // EXCLUINDO o proprio registro recem-inserido.
  const { data: anterior } = await supabase
    .from("insumos_comprados")
    .select("id, preco_pago, quantidade, unidade, data_compra")
    .eq("unidade_id", novo.unidade_id)
    .ilike("nome", novo.nome)
    .neq("id", novo.id)
    .order("data_compra", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!anterior) {
    // Primeira compra desse insumo: nao ha base de comparacao
    await supabase.from("workflow_runs").update({
      status: "success",
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      metadata: { motivo: "primeira_compra", insumo: novo.nome, preco_unitario: puNovo },
    }).eq("id", runId);
    return jsonResponse({ success: true, run_id: runId, motivo: "primeira_compra" });
  }

  const puAnterior = precoUnitario(
    Number(anterior.preco_pago), Number(anterior.quantidade), anterior.unidade,
  );

  if (puAnterior <= 0) {
    await supabase.from("workflow_runs").update({
      status: "success",
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      metadata: { motivo: "anterior_invalido", insumo: novo.nome },
    }).eq("id", runId);
    return jsonResponse({ success: true, run_id: runId, motivo: "anterior_invalido" });
  }

  const variacaoPct = Math.round(((puNovo - puAnterior) / puAnterior) * 10000) / 100;

  if (Math.abs(variacaoPct) < THRESHOLD_PCT) {
    await supabase.from("workflow_runs").update({
      status: "success",
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      metadata: {
        motivo: "abaixo_threshold", variacao_pct: variacaoPct,
        threshold: THRESHOLD_PCT, insumo: novo.nome,
      },
    }).eq("id", runId);
    return jsonResponse({
      success: true, run_id: runId, motivo: "abaixo_threshold",
      variacao_pct: variacaoPct,
    });
  }

  // Grava historico
  const { error: histErr } = await supabase.from("historico_precos_insumos").insert({
    insumo_id: novo.id,
    nome_insumo: novo.nome,
    preco_anterior: Math.round(puAnterior * 100) / 100,
    preco_novo: Math.round(puNovo * 100) / 100,
    variacao_percentual: variacaoPct,
    source: "automacao",
    created_by: "automacao",
    user_id: novo.user_id,
    unidade_id: novo.unidade_id,
  });

  // Recalcula fichas afetadas
  const { alertas_criados, fichas_processadas } = await processarFichasAfetadas(
    supabase, novo.unidade_id, novo.user_id, novo.id, novo.nome, variacaoPct,
  );

  await supabase.from("workflow_runs").update({
    status: histErr ? "partial" : "success",
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    fichas_processadas,
    alertas_criados,
    metadata: {
      insumo: novo.nome, variacao_pct: variacaoPct,
      preco_anterior: puAnterior, preco_novo: puNovo,
      ...(histErr && { historico_error: histErr.message }),
    },
  }).eq("id", runId);

  return jsonResponse({
    success: true,
    run_id: runId,
    variacao_pct: variacaoPct,
    fichas_processadas,
    alertas_criados,
  });
});
