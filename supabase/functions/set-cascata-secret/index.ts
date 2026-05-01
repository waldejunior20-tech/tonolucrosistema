// Edge function utilitaria: copia N8N_INGEST_SECRET para public.app_config.cascata_secret.
// Uso: chamar UMA vez apos deploy. Idempotente.
//
// Auth: header x-api-key === N8N_INGEST_SECRET, OU usuario autenticado (qualquer JWT valido).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const INGEST_SECRET = Deno.env.get("N8N_INGEST_SECRET") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = req.headers.get("x-api-key") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";

  let authorized = false;
  if (INGEST_SECRET && apiKey === INGEST_SECRET) {
    authorized = true;
  } else if (authHeader.startsWith("Bearer ")) {
    const sb = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await sb.auth.getClaims(token);
    if (!error && data?.claims?.sub) authorized = true;
  }

  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!INGEST_SECRET) {
    return new Response(JSON.stringify({ error: "N8N_INGEST_SECRET nao configurado no projeto" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { error } = await supabase.from("app_config").upsert(
    { key: "cascata_secret", value: INGEST_SECRET, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({
    success: true, key: "cascata_secret", length: INGEST_SECRET.length,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
