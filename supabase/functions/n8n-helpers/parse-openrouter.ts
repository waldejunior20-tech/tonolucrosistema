// parse-openrouter.ts — Parseia e valida resposta do Gemini via OpenRouter
// Extrai JSON da resposta (mesmo se envolto em markdown fence)

export interface ParsedAIResponse {
  success: boolean;
  data: Record<string, any> | null;
  error?: string;
  raw?: string;
}

export function parseOpenRouterResponse(response: any): ParsedAIResponse {
  try {
    // Extrair conteúdo da resposta OpenRouter/OpenAI format
    const content = response?.choices?.[0]?.message?.content
      ?? response?.content
      ?? response?.text
      ?? (typeof response === "string" ? response : null);

    if (!content) {
      return { success: false, data: null, error: "Resposta vazia da IA" };
    }

    // Remover markdown fence se presente
    let jsonStr = content
      .replace(/```json?\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    // Tentar extrair JSON de texto misto (a IA às vezes escreve texto antes/depois)
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr);

    if (typeof parsed !== "object" || parsed === null) {
      return {
        success: false,
        data: null,
        error: "Resposta da IA não é um objeto JSON",
        raw: content,
      };
    }

    return { success: true, data: parsed };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: `Erro ao parsear resposta da IA: ${err}`,
      raw: typeof response === "string" ? response : JSON.stringify(response),
    };
  }
}

// Valida campos obrigatórios no objeto parseado
export function validateAIFields(
  data: Record<string, any>,
  requiredFields: string[],
): { valid: boolean; missing: string[] } {
  const missing = requiredFields.filter(
    (f) => data[f] === undefined || data[f] === null || data[f] === "",
  );
  return { valid: missing.length === 0, missing };
}
