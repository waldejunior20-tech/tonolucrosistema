// Edge function: ingest-nota-fiscal
// Recebe payload (do n8n ou direto do app) e grava nota fiscal no banco.
// - Resolve user_id/unidade_id via whatsapp_users se necessario
// - Insere itens em insumos_comprados
// - Insere despesa total em lancamentos_financeiros
// - Registra workflow_runs com idempotencia opcional
// - Autenticacao via header x-api-key (secret N8N_INGEST_SECRET)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INGEST_SECRETS = [
  Deno.env.get("N8N_INGEST_SECRET") ?? "",
  Deno.env.get("N8N_INGEST_SECRET_NEW") ?? "",
].filter((s) => s.length > 0);

const CATEGORIAS_INSUMO = new Set([
  "Proteínas", "Laticínios", "Hortifruti", "Secos", "Bebidas",
  "Molhos e Condimentos", "Embalagens", "Congelados", "Confeitaria",
]);
const UNIDADES_VALIDAS = new Set(["kg", "g", "L", "ml", "unidade", "caixa", "pacote"]);

// Palavras-chave que indicam serviço/despesa, não insumo
const PALAVRAS_NAO_INSUMO = [
  "spot", "comercial", "publicid", "anunc", "marketing",
  "servic", "consultor", "mensalidade", "assinatura",
  "aluguel", "internet", "telefon", "energia",
  "contador", "honorar", "taxa", "tarifa", "juros",
];

function ehDespesaServico(nome: string, categoria?: string): boolean {
  const cat = (categoria ?? "").toLowerCase();
  if (cat && !CATEGORIAS_INSUMO.has(categoria!)) return true;
  const n = nome.toLowerCase();
  return PALAVRAS_NAO_INSUMO.some((p) => n.includes(p));
}

function normalizarUnidade(u?: string): string {
  const v = (u ?? "").trim();
  if (!v) return "unidade";
  const map: Record<string, string> = {
    UN: "unidade", Un: "unidade", un: "unidade",
    KG: "kg", Kg: "kg", G: "g", L: "L", l: "L", ML: "ml", Ml: "ml",
  };
  return map[v] ?? (UNIDADES_VALIDAS.has(v) ? v : "unidade");
}

interface ItemPayload {
  nome?: string;
  categoria?: string;
  quantidade?: number | string;
  unidade?: string;
  preco_pago?: number | string;
}

interface Payload {
  whatsapp_number?: string;
  user_id?: string;
  unidade_id?: string;
  fornecedor?: string;
  data_compra?: string;
  itens?: ItemPayload[];
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeWhatsapp(raw: string): string {
  return raw.replace(/\D/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Auth
  const apiKey = req.headers.get("x-api-key") ?? "";
  if (INGEST_SECRETS.length === 0 || !INGEST_SECRETS.includes(apiKey)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const idempotencyKey = req.headers.get("x-idempotency-key") ?? null;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const itens = Array.isArray(payload.itens) ? payload.itens : [];
  if (itens.length === 0) {
    return jsonResponse({ error: "itens vazio ou ausente" }, 400);
  }

  // Resolve user_id / unidade_id
  let user_id = payload.user_id ?? null;
  let unidade_id = payload.unidade_id ?? null;

  if ((!user_id || !unidade_id) && payload.whatsapp_number) {
    const numero = normalizeWhatsapp(payload.whatsapp_number);
    const { data: wu, error: wuErr } = await supabase
      .from("whatsapp_users")
      .select("user_id, unidade_id_padrao, ativo")
      .eq("numero_whatsapp", numero)
      .maybeSingle();

    if (wuErr) {
      return jsonResponse({ error: "Erro ao buscar whatsapp_users", detail: wuErr.message }, 500);
    }
    if (!wu) {
      return jsonResponse({ error: `Numero ${numero} nao cadastrado em whatsapp_users` }, 404);
    }
    if (wu.ativo === false) {
      return jsonResponse({ error: `Numero ${numero} esta inativo` }, 403);
    }
    user_id = wu.user_id;
    unidade_id = wu.unidade_id_padrao;
  }

  if (!user_id || !unidade_id) {
    return jsonResponse({
      error: "Sem user_id/unidade_id. Envie whatsapp_number cadastrado ou ambos os IDs.",
    }, 400);
  }

  // Idempotencia
  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from("workflow_runs")
      .select("id, status, metadata")
      .eq("trigger_record_id", idempotencyKey)
      .eq("workflow_name", "ingest-nota-fiscal")
      .maybeSingle();
    if (existing) {
      return jsonResponse({
        success: existing.status === "success",
        run_id: existing.id,
        idempotent: true,
        ...(existing.metadata as Record<string, unknown>),
      });
    }
  }

  // Cria workflow_run
  const { data: run, error: runErr } = await supabase
    .from("workflow_runs")
    .insert({
      workflow_name: "ingest-nota-fiscal",
      trigger_source: "n8n",
      trigger_record_id: idempotencyKey,
      status: "running",
      unidade_id,
      metadata: { fornecedor: payload.fornecedor, itens_count: itens.length },
    })
    .select("id")
    .single();
  if (runErr) {
    return jsonResponse({ error: "Erro ao criar workflow_run", detail: runErr.message }, 500);
  }
  const runId = run.id;
  const startedAt = Date.now();

  const dataCompra = payload.data_compra ?? new Date().toISOString().slice(0, 10);
  const fornecedor = (payload.fornecedor ?? "").trim() || null;

  // Separa itens em insumos vs despesas/serviços
  const insumosRows: any[] = [];
  const despesasItens: { nome: string; valor: number; categoria: string }[] = [];

  for (const it of itens) {
    const nome = (it.nome ?? "Item sem nome").toString().trim();
    const categoriaRaw = it.categoria ?? "";

    if (ehDespesaServico(nome, categoriaRaw)) {
      const catFinal = categoriaRaw && !CATEGORIAS_INSUMO.has(categoriaRaw)
        ? categoriaRaw
        : "Outros";
      despesasItens.push({
        nome,
        valor: toNumber(it.preco_pago),
        categoria: catFinal,
      });
    } else {
      const categoria = CATEGORIAS_INSUMO.has(categoriaRaw) ? categoriaRaw : "Secos";
      insumosRows.push({
        user_id, unidade_id,
        nome, categoria,
        quantidade: toNumber(it.quantidade),
        unidade: normalizarUnidade(it.unidade),
        preco_pago: toNumber(it.preco_pago),
        fornecedor, data_compra: dataCompra,
      });
    }
  }

  const totalInsumos = insumosRows.reduce((s, r) => s + r.preco_pago, 0);
  const totalDespesasServico = despesasItens.reduce((s, r) => s + r.valor, 0);
  const totalDespesa = totalInsumos + totalDespesasServico;

  let inseridos: { id: string }[] | null = [];
  if (insumosRows.length > 0) {
    const { data, error: insErr } = await supabase
      .from("insumos_comprados")
      .insert(insumosRows)
      .select("id");
    if (insErr) {
      await supabase.from("workflow_runs").update({
        status: "error",
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
        metadata: { error: insErr.message, step: "insumos_comprados" },
      }).eq("id", runId);
      return jsonResponse({ error: "Erro ao inserir insumos", detail: insErr.message, run_id: runId }, 500);
    }
    inseridos = data;
  }

  // Lança despesas/serviços individualmente em lancamentos_financeiros
  for (const d of despesasItens) {
    await supabase.from("lancamentos_financeiros").insert({
      user_id, unidade_id,
      tipo: "despesa",
      categoria: d.categoria,
      descricao: `${d.nome}${fornecedor ? ` - ${fornecedor}` : ""}`,
      valor: d.valor,
      data_lancamento: dataCompra,
      pago: true,
    });
  }

  let lancamento_id: string | null = null;
  if (totalInsumos > 0) {
    const { data: lanc, error: lancErr } = await supabase
      .from("lancamentos_financeiros")
      .insert({
        user_id, unidade_id,
        tipo: "despesa",
        categoria: "Insumos",
        descricao: `Nota fiscal${fornecedor ? ` - ${fornecedor}` : ""} (${insumosRows.length} itens)`,
        valor: totalInsumos,
        data_lancamento: dataCompra,
        pago: true,
      })
      .select("id")
      .single();
    if (lancErr) {
      await supabase.from("workflow_runs").update({
        status: "partial",
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
        metadata: {
          error: lancErr.message, step: "lancamentos_financeiros",
          itens_inseridos: inseridos?.length ?? 0,
        },
      }).eq("id", runId);
      return jsonResponse({
        success: false,
        warning: "Insumos gravados mas despesa falhou",
        detail: lancErr.message,
        run_id: runId,
        itens_inseridos: inseridos?.length ?? 0,
      }, 207);
    }
    lancamento_id = lanc.id;
  }

  await supabase.from("workflow_runs").update({
    status: "success",
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    metadata: {
      fornecedor, itens_inseridos: inseridos?.length ?? 0,
      total_despesa: totalDespesa, lancamento_id,
    },
  }).eq("id", runId);

  return jsonResponse({
    success: true,
    run_id: runId,
    itens_inseridos: inseridos?.length ?? 0,
    total_despesa: totalDespesa,
    lancamento_id,
  });
});
