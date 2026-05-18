// Edge function: ingest-nota-fiscal
// Idempotente, auditável e segura. Fluxo:
//  1. Calcula documento_hash → checa duplicidade em notas_fiscais
//  2. Cria notas_fiscais (ou retorna "duplicada")
//  3. Para cada item: classifica (insumo vs despesa)
//  4. Para insumos: localiza/cria canônico, insere em insumos_compras_historico
//     (trigger tr_historico_atualiza_insumo aplica trava de preço suspeito)
//  5. Captura fichas impactadas e preços bloqueados
//  6. Grava auditoria_importacao + lancamentos_financeiros
//  7. Retorna JSON com status final
//
// NÃO altera UI, dashboard, fichas, n8n. NÃO apaga histórico nem duplicados.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { crypto as stdCrypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await stdCrypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

const PALAVRAS_NAO_INSUMO = [
  "spot", "comercial", "publicid", "anunc", "marketing",
  "servic", "consultor", "mensalidade", "assinatura",
  "aluguel", "internet", "telefon", "energia",
  "contador", "honorar", "taxa", "tarifa", "juros",
];

const PRECO_SUSPEITO_FATOR = 3; // mantém alinhado ao trigger

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
  preco_unitario?: number | string;
  preco_total?: number | string;
}

interface Payload {
  whatsapp_number?: string;
  user_id?: string;
  unidade_id?: string;
  fornecedor?: string;
  cnpj_fornecedor?: string;
  data_compra?: string;
  valor_total?: number | string;
  documento_hash?: string;
  origem?: string;
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

async function calcularDocumentoHash(p: {
  user_id: string;
  unidade_id: string;
  fornecedor: string | null;
  data: string;
  valor_total: number;
  itens: Array<{ nome: string; quantidade: number; unidade: string; preco_total: number }>;
}): Promise<string> {
  const itensNorm = [...p.itens]
    .map((i) => `${i.nome.toLowerCase().trim()}|${i.quantidade}|${i.unidade.toLowerCase()}|${i.preco_total.toFixed(2)}`)
    .sort()
    .join(";");
  const base = [
    p.user_id, p.unidade_id,
    (p.fornecedor ?? "").toLowerCase().trim(),
    p.data,
    p.valor_total.toFixed(2),
    itensNorm,
  ].join("::");
  return await sha256Hex(base);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const apiKey = req.headers.get("x-api-key") ?? "";
  if (INGEST_SECRETS.length === 0 || !INGEST_SECRETS.includes(apiKey)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const idempotencyKey = req.headers.get("x-idempotency-key") ?? null;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  let payload: Payload;
  try { payload = await req.json(); }
  catch { return jsonResponse({ error: "Invalid JSON" }, 400); }

  const itens = Array.isArray(payload.itens) ? payload.itens : [];
  if (itens.length === 0) return jsonResponse({ error: "itens vazio ou ausente" }, 400);

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
    if (wuErr) return jsonResponse({ error: "Erro whatsapp_users", detail: wuErr.message }, 500);
    if (!wu) return jsonResponse({ error: `Numero ${numero} nao cadastrado` }, 404);
    if (wu.ativo === false) return jsonResponse({ error: `Numero ${numero} inativo` }, 403);
    user_id = wu.user_id;
    unidade_id = wu.unidade_id_padrao;
  }

  if (!user_id || !unidade_id) {
    return jsonResponse({
      error: "Sem user_id/unidade_id. Envie whatsapp_number cadastrado ou ambos os IDs.",
    }, 400);
  }

  // Idempotência por workflow_run (legado)
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
        run_id: existing.id, idempotent: true,
        ...(existing.metadata as Record<string, unknown>),
      });
    }
  }

  const dataCompra = payload.data_compra ?? new Date().toISOString().slice(0, 10);
  const fornecedor = (payload.fornecedor ?? "").trim() || null;
  const origem = payload.origem ?? "manual";

  // Normaliza itens (precisa antes do hash)
  // Detecta se dados estão COMPLETOS para atualizar custo unitário do insumo.
  // Regra: precisa de nome + quantidade>0 informada + unidade informada + preço total>0.
  // Se incompleto: registra apenas saída de caixa + auditoria, NÃO toca o banco mestre.
  const itensNorm = itens.map((it) => {
    const nome = (it.nome ?? "Item sem nome").toString().trim();
    const qtdRaw = toNumber(it.quantidade);
    const unidRaw = (it.unidade ?? "").toString().trim();
    const preco_total = toNumber(it.preco_total ?? it.preco_pago);
    const quantidade = qtdRaw || 1;
    const unidade = normalizarUnidade(it.unidade);
    const preco_unitario = toNumber(it.preco_unitario) || (preco_total / quantidade);
    const dadosCompletos =
      nome.length > 0 && qtdRaw > 0 && unidRaw.length > 0 && preco_total > 0;
    return {
      nome, categoriaRaw: it.categoria ?? "",
      quantidade, unidade, preco_total, preco_unitario, dadosCompletos,
    };
  });

  const valor_total = toNumber(payload.valor_total) ||
    itensNorm.reduce((s, i) => s + i.preco_total, 0);

  // 1. documento_hash
  const documento_hash = payload.documento_hash ?? await calcularDocumentoHash({
    user_id, unidade_id, fornecedor, data: dataCompra, valor_total,
    itens: itensNorm.map((i) => ({
      nome: i.nome, quantidade: i.quantidade, unidade: i.unidade, preco_total: i.preco_total,
    })),
  });

  // 1b. Checa duplicidade
  const { data: notaExistente } = await supabase
    .from("notas_fiscais")
    .select("id")
    .eq("user_id", user_id)
    .eq("unidade_id", unidade_id)
    .eq("documento_hash", documento_hash)
    .maybeSingle();

  if (notaExistente) {
    await supabase.from("auditoria_importacao").insert({
      user_id, unidade_id, nota_fiscal_id: notaExistente.id, origem,
      itens_lidos: itensNorm.length,
      enviados_insumos: 0, enviados_financeiro: 0, pendentes_revisao: 0,
      detalhes: {
        status: "duplicada", documento_hash, fornecedor, valor_total,
        mensagem: "Nota já processada (mesmo documento_hash).",
      },
    });
    return jsonResponse({
      status: "duplicada",
      nota_fiscal_id: notaExistente.id,
      documento_hash,
      mensagem_usuario: "Esta nota já foi processada anteriormente.",
    });
  }

  // 2. notas_fiscais
  const { data: nota, error: notaErr } = await supabase
    .from("notas_fiscais")
    .insert({
      user_id, unidade_id,
      fornecedor: fornecedor ?? "Não informado",
      cnpj_fornecedor: payload.cnpj_fornecedor ?? null,
      data_emissao: dataCompra,
      data_recebimento: dataCompra,
      valor_total,
      origem,
      documento_hash,
      total_parcelas: 1,
    })
    .select("id")
    .single();
  if (notaErr) {
    return jsonResponse({ status: "erro", error: "Falha ao criar nota_fiscal", detail: notaErr.message }, 500);
  }
  const nota_fiscal_id = nota.id;

  // workflow_run para trilha
  const { data: run } = await supabase.from("workflow_runs").insert({
    workflow_name: "ingest-nota-fiscal",
    trigger_source: origem,
    trigger_record_id: idempotencyKey,
    status: "running",
    unidade_id,
    metadata: { documento_hash, fornecedor, itens_count: itensNorm.length, nota_fiscal_id },
  }).select("id").single();
  const runId = run?.id;
  const startedAt = Date.now();

  // 3. Separa insumos vs despesas-serviço vs compras incompletas
  // - Insumos completos: atualizam canônico via histórico
  // - Despesas/serviço: vão direto para lancamentos_financeiros
  // - Compras incompletas (sem qtd/unidade): só saída de caixa + auditoria
  const insumosRows: typeof itensNorm = [];
  const despesasRows: { nome: string; valor: number; categoria: string }[] = [];
  const comprasIncompletas: { nome: string; valor: number; categoria: string }[] = [];
  for (const it of itensNorm) {
    if (ehDespesaServico(it.nome, it.categoriaRaw)) {
      const cat = it.categoriaRaw && !CATEGORIAS_INSUMO.has(it.categoriaRaw) ? it.categoriaRaw : "Outros";
      despesasRows.push({ nome: it.nome, valor: it.preco_total, categoria: cat });
    } else if (!it.dadosCompletos) {
      const cat = CATEGORIAS_INSUMO.has(it.categoriaRaw) ? it.categoriaRaw : "Outros Insumos";
      comprasIncompletas.push({ nome: it.nome, valor: it.preco_total, categoria: cat });
    } else {
      insumosRows.push(it);
    }
  }

  // 4. Para cada insumo: classifica + localiza/cria canônico + insere histórico
  const precos_bloqueados: any[] = [];
  const fichas_impactadas: any[] = [];
  const insumos_ids_aceitos: string[] = [];
  let itens_salvos = 0;
  let itens_revisao = 0;
  const erros: string[] = [];

  for (const it of insumosRows) {
    // Classifica categoria
    let categoria = "Secos";
    try {
      const { data: catCerta } = await supabase.rpc("classificar_insumo", {
        p_nome: it.nome, p_unidade_id: unidade_id,
      });
      if (catCerta && CATEGORIAS_INSUMO.has(catCerta)) categoria = catCerta;
      else if (CATEGORIAS_INSUMO.has(it.categoriaRaw)) categoria = it.categoriaRaw;
    } catch {
      if (CATEGORIAS_INSUMO.has(it.categoriaRaw)) categoria = it.categoriaRaw;
    }

    // Localiza canônico existente (case-insensitive por nome + unidade_id)
    const { data: canonExist } = await supabase
      .from("insumos_comprados")
      .select("id, preco_pago, preco_medio, quantidade, total_compras")
      .eq("unidade_id", unidade_id)
      .ilike("nome", it.nome)
      .limit(1)
      .maybeSingle();

    let insumo_id: string | null = canonExist?.id ?? null;

    // Avalia preço suspeito ANTES de inserir histórico (para auditoria)
    let bloqueado = false;
    if (canonExist && (canonExist.total_compras ?? 0) >= 2) {
      const precoMedio = canonExist.preco_medio ??
        (canonExist.preco_pago && canonExist.quantidade
          ? Number(canonExist.preco_pago) / Number(canonExist.quantidade)
          : null);
      if (precoMedio && precoMedio > 0) {
        const fator = it.preco_unitario / Number(precoMedio);
        if (fator > PRECO_SUSPEITO_FATOR) {
          bloqueado = true;
          precos_bloqueados.push({
            insumo_id, nome: it.nome,
            preco_tentado: it.preco_unitario,
            preco_medio_atual: Number(precoMedio),
            fator: Number(fator.toFixed(2)),
          });
        }
      }
    }

    // Cria canônico se não existe (sempre com o preço da compra; trigger não bloqueia 1ª compra)
    if (!insumo_id) {
      const { data: novo, error: novoErr } = await supabase
        .from("insumos_comprados")
        .insert({
          user_id, unidade_id,
          nome: it.nome, categoria,
          quantidade: it.quantidade, unidade: it.unidade,
          preco_pago: it.preco_total,
          fornecedor, data_compra: dataCompra,
        })
        .select("id")
        .single();
      if (novoErr) { erros.push(`canon ${it.nome}: ${novoErr.message}`); continue; }
      insumo_id = novo.id;
    }

    // Insere histórico (trigger faz idempotência + atualiza canônico OU bloqueia)
    const { error: histErr } = await supabase
      .from("insumos_compras_historico")
      .insert({
        insumo_id, user_id, unidade_id,
        nome_original: it.nome,
        quantidade: it.quantidade,
        unidade_medida: it.unidade,
        preco_unitario: it.preco_unitario,
        preco_total: it.preco_total,
        fornecedor, nota_fiscal_id,
        data_compra: dataCompra,
        destino: bloqueado ? "revisar" : "insumo",
        motivo_revisao: bloqueado ? "preco_suspeito" : null,
        origem,
      });
    if (histErr) {
      // idempotência (NULL retornado pelo trigger) não é erro pra cliente
      if (!histErr.message.includes("duplicate")) erros.push(`hist ${it.nome}: ${histErr.message}`);
      continue;
    }

    itens_salvos += 1;
    if (bloqueado) {
      itens_revisao += 1;
    } else {
      insumos_ids_aceitos.push(insumo_id);
    }
  }

  // 5. Fichas impactadas (apenas para preços aceitos)
  if (insumos_ids_aceitos.length > 0) {
    const [{ data: pizza }, { data: prod }, { data: bord }, { data: base }] = await Promise.all([
      supabase.from("fichas_tecnicas_pizza_ingredientes")
        .select("ficha_id").in("insumo_comprado_id", insumos_ids_aceitos),
      supabase.from("fichas_tecnicas_produtos_ingredientes")
        .select("ficha_id").in("insumo_comprado_id", insumos_ids_aceitos),
      supabase.from("bordas_ingredientes")
        .select("borda_id").in("insumo_comprado_id", insumos_ids_aceitos),
      supabase.from("bases_ficha_ingredientes")
        .select("base_id").in("insumo_comprado_id", insumos_ids_aceitos),
    ]);
    const push = (arr: any[] | null, tipo: string, key: string) => {
      (arr ?? []).forEach((r) => fichas_impactadas.push({ tipo, ficha_id: r[key] }));
    };
    push(pizza, "pizza", "ficha_id");
    push(prod, "produto", "ficha_id");
    push(bord, "borda", "borda_id");
    push(base, "base", "base_id");
  }

  // Lança despesas/serviços
  const totalDespesasServico = despesasRows.reduce((s, r) => s + r.valor, 0);
  for (const d of despesasRows) {
    await supabase.from("lancamentos_financeiros").insert({
      user_id, unidade_id,
      tipo: "despesa", categoria: d.categoria,
      descricao: `${d.nome}${fornecedor ? ` - ${fornecedor}` : ""}`,
      valor: d.valor, data_lancamento: dataCompra, pago: true,
      nota_fiscal_id,
    });
  }

  // Lança despesa por item de insumo (DRE)
  const CAT_TO_SUB: Record<string, string> = {
    "Proteínas": "Açougue/Proteínas", "Laticínios": "Laticínios",
    "Hortifruti": "Hortifruti", "Secos": "Mercearia", "Bebidas": "Bebidas",
    "Molhos e Condimentos": "Molhos e Condimentos", "Embalagens": "Embalagens",
    "Congelados": "Congelados", "Confeitaria": "Confeitaria",
  };
  if (insumosRows.length > 0) {
    const lancs = insumosRows.map((r) => ({
      user_id, unidade_id,
      tipo: "despesa", categoria: "Insumos",
      subcategoria: CAT_TO_SUB[r.categoriaRaw as string] ?? "Outros Insumos",
      descricao: `${r.nome}${fornecedor ? ` - ${fornecedor}` : ""}`,
      valor: r.preco_total, data_lancamento: dataCompra, pago: true,
      classificacao_origem: "keyword", nota_fiscal_id,
    }));
    await supabase.from("lancamentos_financeiros").insert(lancs);
  }

  // 6. auditoria_importacao
  const totalDespesa = insumosRows.reduce((s, r) => s + r.preco_total, 0) + totalDespesasServico;
  const status: string = erros.length > 0 ? "parcial" : "processado";

  await supabase.from("auditoria_importacao").insert({
    user_id, unidade_id, nota_fiscal_id, origem,
    itens_lidos: itensNorm.length,
    enviados_insumos: itens_salvos - itens_revisao,
    enviados_financeiro: despesasRows.length,
    pendentes_revisao: itens_revisao,
    precos_bloqueados,
    fichas_impactadas,
    detalhes: {
      status, documento_hash, fornecedor, valor_total,
      total_despesa: totalDespesa,
      erros: erros.length > 0 ? erros : undefined,
    },
  });

  if (runId) {
    await supabase.from("workflow_runs").update({
      status: status === "processado" ? "success" : "partial",
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      metadata: {
        documento_hash, nota_fiscal_id,
        itens_salvos, itens_revisao,
        precos_bloqueados: precos_bloqueados.length,
        fichas_impactadas: fichas_impactadas.length,
        erros: erros.length > 0 ? erros : undefined,
      },
    }).eq("id", runId);
  }

  // 7. retorno
  return jsonResponse({
    status,
    nota_fiscal_id,
    documento_hash,
    total_itens: itensNorm.length,
    itens_salvos,
    itens_bloqueados: precos_bloqueados.length,
    fichas_impactadas: fichas_impactadas.length,
    mensagem_usuario: precos_bloqueados.length > 0
      ? `${itens_salvos} itens salvos, ${precos_bloqueados.length} com preço suspeito enviados para revisão.`
      : `${itens_salvos} itens importados com sucesso.`,
    ...(erros.length > 0 ? { erros } : {}),
  });
});
