import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const insumoId = "04cc1bb7-caed-49e2-826e-b20ced5d9c7b";

  const { data: atual } = await admin
    .from("insumos_comprados").select("*").eq("id", insumoId).single();

  if (!atual) return new Response(JSON.stringify({ error: "nao encontrado" }), { status: 404, headers: corsHeaders });

  const novoPreco = Number(atual.preco_pago) * 1.25;
  const { data: updated, error } = await admin
    .from("insumos_comprados")
    .update({ preco_pago: novoPreco, data_compra: new Date().toISOString().slice(0, 10) })
    .eq("id", insumoId).select().single();

  return new Response(JSON.stringify({
    ok: !error, insumo: atual.nome,
    preco_anterior: atual.preco_pago, preco_novo: novoPreco,
    error: error?.message, updated,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
