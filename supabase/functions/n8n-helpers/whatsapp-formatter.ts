// whatsapp-formatter.ts — Monta mensagens de resposta para WhatsApp
// Formata resultados de processamento em mensagens legíveis

export interface IngestResult {
  success: boolean;
  fornecedor?: string;
  itens_inseridos: number;
  total_despesa: number;
  itens_pendentes?: number;
  erros?: string[];
}

export function formatIngestSuccess(result: IngestResult): string {
  const parts: string[] = [];

  parts.push("✅ *Nota processada com sucesso!*");
  parts.push("");

  if (result.fornecedor) {
    parts.push(`🏪 *Fornecedor:* ${result.fornecedor}`);
  }

  parts.push(
    `📦 *Itens:* ${result.itens_inseridos} registrado${result.itens_inseridos !== 1 ? "s" : ""}`,
  );
  parts.push(
    `💰 *Total:* R$ ${result.total_despesa.toFixed(2).replace(".", ",")}`,
  );

  if (result.itens_pendentes && result.itens_pendentes > 0) {
    parts.push("");
    parts.push(
      `⚠️ ${result.itens_pendentes} ite${result.itens_pendentes !== 1 ? "ns" : "m"} aguardando revisão (confiança baixa)`,
    );
  }

  return parts.join("\n");
}

export function formatIngestError(error: string): string {
  return `❌ *Erro ao processar nota*\n\n${error}\n\nTente enviar novamente ou entre em contato com o suporte.`;
}

export function formatRateLimit(): string {
  return "⏳ *Muitas mensagens!*\n\nVocê enviou muitas fotos em pouco tempo. Aguarde 1 minuto e tente novamente.";
}

export function formatPendingReview(count: number): string {
  return `🔍 *${count} ite${count !== 1 ? "ns" : "m"} para revisão*\n\nAlguns itens não foram classificados com certeza suficiente. Acesse o app para revisar e aprovar.`;
}

export function formatProcessingStatus(step: string): string {
  const steps: Record<string, string> = {
    download: "📥 Baixando imagem...",
    ocr: "🔍 Lendo nota com OCR...",
    parse: "🧠 Analisando itens com IA...",
    save: "💾 Salvando no sistema...",
    done: "✅ Concluído!",
  };
  return steps[step] ?? `⏳ Processando (${step})...`;
}
