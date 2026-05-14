// Mescla N insumos secundários em um insumo principal.
// Remapea todas as referências (fichas técnicas pizza/produto, bordas, bases, próprios, precificação bebidas,
// histórico de compras) para o insumo principal e remove os secundários.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  principal_id: string;
  secundarios: string[];
  unidade_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing auth" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Valida usuário com seu próprio JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    const body = (await req.json()) as Body;
    const { principal_id, secundarios, unidade_id } = body;
    if (!principal_id || !Array.isArray(secundarios) || secundarios.length === 0 || !unidade_id) {
      return json({ error: "payload inválido" }, 400);
    }
    if (secundarios.includes(principal_id)) {
      return json({ error: "principal não pode estar entre secundários" }, 400);
    }

    // Verifica permissão
    const { data: pode } = await userClient.rpc("pode_editar_negocio", {
      _user_id: userId,
      _unidade_id: unidade_id,
    });
    if (!pode) return json({ error: "sem permissão" }, 403);

    const admin = createClient(supabaseUrl, serviceKey);

    // Confirma que todos os insumos pertencem à mesma unidade
    const { data: insumos, error: insErr } = await admin
      .from("insumos_comprados")
      .select("id, unidade_id")
      .in("id", [principal_id, ...secundarios]);
    if (insErr) throw insErr;
    if (!insumos || insumos.length !== secundarios.length + 1) {
      return json({ error: "insumo não encontrado" }, 404);
    }
    if (insumos.some((i) => i.unidade_id !== unidade_id)) {
      return json({ error: "insumos de unidades diferentes" }, 400);
    }

    const tabelas = [
      "fichas_tecnicas_pizza_ingredientes",
      "fichas_tecnicas_produtos_ingredientes",
      "bordas_ingredientes",
      "bases_ficha_ingredientes",
      "insumos_proprios_ingredientes",
      "precificacao_bebidas",
      "insumos_compras_historico",
    ];

    const remap: Record<string, number> = {};
    for (const t of tabelas) {
      const { count, error } = await admin
        .from(t)
        .update({ insumo_comprado_id: principal_id }, { count: "exact" })
        .in("insumo_comprado_id", secundarios);
      if (error && !/column .*insumo_comprado_id.* does not exist/i.test(error.message)) {
        // historico usa "insumo_id"
        if (t === "insumos_compras_historico") {
          const { count: c2, error: e2 } = await admin
            .from(t)
            .update({ insumo_id: principal_id }, { count: "exact" })
            .in("insumo_id", secundarios);
          if (e2) throw new Error(`${t}: ${e2.message}`);
          remap[t] = c2 ?? 0;
          continue;
        }
        throw new Error(`${t}: ${error.message}`);
      }
      remap[t] = count ?? 0;
    }

    // historico tem coluna diferente — refaz se necessário (tentamos acima e deu erro silencioso)
    const { count: cHist, error: eHist } = await admin
      .from("insumos_compras_historico")
      .update({ insumo_id: principal_id }, { count: "exact" })
      .in("insumo_id", secundarios);
    if (eHist) throw eHist;
    remap["insumos_compras_historico"] = cHist ?? 0;

    // Remove secundários
    const { error: delErr } = await admin
      .from("insumos_comprados")
      .delete()
      .in("id", secundarios);
    if (delErr) throw delErr;

    // Recalcula agregados do principal a partir do histórico (trigger já cuida em INSERT,
    // mas após remap precisamos recalcular manualmente)
    const { data: hist } = await admin
      .from("insumos_compras_historico")
      .select("preco_unitario, data_compra, fornecedor")
      .eq("insumo_id", principal_id)
      .order("data_compra", { ascending: false });

    if (hist && hist.length > 0) {
      const precos = hist.map((h: any) => Number(h.preco_unitario)).filter((n) => n > 0);
      const ult = hist[0];
      const avg = precos.reduce((a, b) => a + b, 0) / precos.length;
      await admin.from("insumos_comprados").update({
        preco_pago: Number(ult.preco_unitario),
        fornecedor: ult.fornecedor,
        data_compra: ult.data_compra,
        preco_medio: avg,
        preco_minimo: Math.min(...precos),
        preco_maximo: Math.max(...precos),
        total_compras: hist.length,
        updated_at: new Date().toISOString(),
      }).eq("id", principal_id);
    }

    return json({ ok: true, remap, removidos: secundarios.length });
  } catch (e) {
    console.error("mesclar-insumos error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
