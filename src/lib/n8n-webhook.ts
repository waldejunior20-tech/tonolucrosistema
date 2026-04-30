/**
 * Helper para envio de notas fiscais ao webhook do n8n.
 * O n8n processa a imagem com GPT Vision, extrai os itens e grava
 * automaticamente em `insumos_comprados`.
 */

const N8N_WEBHOOK_URL =
  "https://tonolucro-n8n-n8n.hke8r8.easypanel.host/webhook/Ttd6M0adQ1ZMmXGt";

export interface N8nNotaFiscalPayload {
  /** URL pública da imagem da nota fiscal (ou base64 data URL). */
  image_url: string;
  /** UUID do usuário dono dos insumos. */
  user_id: string;
  /** UUID da unidade ativa onde os insumos serão lançados. */
  unidade_id: string;
  /** Nome do fornecedor (opcional — GPT tenta extrair se vazio). */
  supplier_name?: string;
  /** Data da compra no formato YYYY-MM-DD (opcional). */
  purchase_date?: string;
}

export interface N8nResponse {
  success: boolean;
  itens_inseridos?: number;
  message?: string;
  [key: string]: unknown;
}

/**
 * Envia uma nota fiscal para o webhook do n8n processar.
 *
 * @example
 * await enviarNotaFiscalN8n({
 *   image_url: "https://...nota.jpg",
 *   user_id: user.id,
 *   unidade_id: activeUnidadeId,
 *   supplier_name: "Atacadão",
 *   purchase_date: "2026-04-30",
 * });
 */
export async function enviarNotaFiscalN8n(
  payload: N8nNotaFiscalPayload,
): Promise<N8nResponse> {
  const response = await fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `n8n webhook falhou (${response.status}): ${text || response.statusText}`,
    );
  }

  // n8n pode responder JSON ou texto vazio dependendo do nó final
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as N8nResponse;
  }
  return { success: true };
}
