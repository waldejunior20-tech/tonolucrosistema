// grounding-check.ts — Regex fallback para validar OCR antes de chamar IA
// Verifica se o texto OCR contém dados mínimos de uma nota fiscal

export interface GroundingResult {
  isNotaFiscal: boolean;
  isCupomFiscal: boolean;
  isFichaTecnica: boolean;
  confidence: number;
  extracted: {
    cnpj?: string;
    total?: number;
    data?: string;
    itensCount: number;
  };
}

// Padrões de NF/Cupom
const CNPJ_REGEX = /\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\\/]?\d{4}[\-\s]?\d{2}/;
const VALOR_REGEX = /(?:R\$|BRL)\s*[\d.,]+|(?:total|valor|vlr)[\s:]*[\d.,]+/gi;
const DATA_REGEX =
  /(\d{2}[\\/\-]\d{2}[\\/\-]\d{2,4})|(\d{4}[\-]\d{2}[\-]\d{2})/g;
const ITEM_REGEX = /\d+\s*[xX]\s*[\d.,]+|[\d.,]+\s*(?:kg|g|un|l|ml|cx|pc)/gi;

// Palavras-chave
const NF_KEYWORDS = [
  "nota fiscal",
  "nfe",
  "nf-e",
  "danfe",
  "cupom fiscal",
  "cf-e",
  "sat",
  "icms",
  "cfop",
];
const FICHA_KEYWORDS = [
  "ficha tecnica",
  "ficha técnica",
  "rendimento",
  "modo de preparo",
  "ingredientes",
];

export function groundingCheck(ocrText: string): GroundingResult {
  const text = ocrText.toLowerCase();
  let confidence = 0;

  // Detectar CNPJ
  const cnpjMatch = ocrText.match(CNPJ_REGEX);

  // Detectar valores monetários
  const valores = ocrText.match(VALOR_REGEX) ?? [];

  // Detectar datas
  const datas = ocrText.match(DATA_REGEX) ?? [];

  // Detectar itens (quantidade x preço)
  const itens = ocrText.match(ITEM_REGEX) ?? [];

  // Keywords NF
  const isNF = NF_KEYWORDS.some((k) => text.includes(k));
  const isFicha = FICHA_KEYWORDS.some((k) => text.includes(k));

  // Calcular confiança
  if (isNF) confidence += 0.4;
  if (cnpjMatch) confidence += 0.2;
  if (valores.length > 0) confidence += 0.15;
  if (datas.length > 0) confidence += 0.1;
  if (itens.length >= 2) confidence += 0.15;

  if (isFicha) {
    // Ficha técnica tem padrão diferente
    return {
      isNotaFiscal: false,
      isCupomFiscal: false,
      isFichaTecnica: true,
      confidence: text.includes("ingredientes") ? 0.9 : 0.7,
      extracted: {
        cnpj: cnpjMatch?.[0],
        itensCount: itens.length,
      },
    };
  }

  // Extrair total (maior valor encontrado)
  let total: number | undefined;
  if (valores.length > 0) {
    const nums = valores
      .map((v) => {
        const n = v.replace(/[^\d.,]/g, "").replace(",", ".");
        return parseFloat(n);
      })
      .filter((n) => !isNaN(n));
    total = nums.length > 0 ? Math.max(...nums) : undefined;
  }

  return {
    isNotaFiscal: confidence >= 0.5,
    isCupomFiscal: isNF && text.includes("cupom"),
    isFichaTecnica: false,
    confidence: Math.min(confidence, 1.0),
    extracted: {
      cnpj: cnpjMatch?.[0],
      total,
      data: datas[0],
      itensCount: itens.length,
    },
  };
}
