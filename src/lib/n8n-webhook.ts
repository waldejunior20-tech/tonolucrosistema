/**
 * Helpers para envio de notas fiscais.
 *
 * Dois caminhos:
 * 1. enviarNotaFiscalN8n  — envia imagem para o n8n processar com GPT Vision.
 * 2. enviarNotaFiscalDireto — envia itens já estruturados direto pra edge function
 *    `ingest-nota-fiscal` (usa autenticação JWT do usuário logado).
 */

import { supabase } from "@/integrations/supabase/client";

const N8N_WEBHOOK_URL =
  "https://tonolucro-n8n-n8n.hke8r8.easypanel.host/webhook/Ttd6M0adQ1ZMmXGt";

export interface N8nNotaFiscalPayload {
  image_url: string;
  user_id: string;
  unidade_id: string;
  supplier_name?: string;
  purchase_date?: string;
}

export interface N8nResponse {
  success: boolean;
  itens_inseridos?: number;
  message?: string;
  [key: string]: unknown;
}

export async function enviarNotaFiscalN8n(
  payload: N8nNotaFiscalPayload,
): Promise<N8nResponse> {
  const response = await fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `n8n webhook falhou (${response.status}): ${text || response.statusText}`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as N8nResponse;
  }
  return { success: true };
}

// ── Edge function direta ────────────────────────────────────────────────

export interface ItemNotaFiscal {
  nome: string;
  categoria?: string;
  quantidade: number;
  unidade?: string;
  preco_pago: number;
}

export interface IngestNotaFiscalPayload {
  user_id: string;
  unidade_id: string;
  fornecedor?: string;
  data_compra?: string;
  itens: ItemNotaFiscal[];
}

export interface IngestNotaFiscalResponse {
  success: boolean;
  run_id?: string;
  itens_inseridos?: number;
  total_despesa?: number;
  lancamento_id?: string | null;
  error?: string;
}

/**
 * Envia itens já extraídos (manual ou via OCR client-side) direto pra edge function.
 * Requer N8N_INGEST_SECRET no header x-api-key — só use deste lado quando o app
 * tiver o secret carregado de forma segura. Para chamadas autenticadas pelo
 * usuário, prefira `supabase.functions.invoke` em uma versão que use JWT.
 */
export async function enviarNotaFiscalDireto(
  payload: IngestNotaFiscalPayload,
  apiKey: string,
): Promise<IngestNotaFiscalResponse> {
  const { data, error } = await supabase.functions.invoke<IngestNotaFiscalResponse>(
    "ingest-nota-fiscal",
    {
      body: payload,
      headers: { "x-api-key": apiKey },
    },
  );
  if (error) {
    throw new Error(`Edge function falhou: ${error.message}`);
  }
  return data ?? { success: false, error: "Resposta vazia" };
}
