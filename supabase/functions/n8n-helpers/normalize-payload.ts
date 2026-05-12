// normalize-payload.ts — Normaliza dados de NF/cupom antes de processar
// Normaliza datas, valores monetários, CNPJ, nomes de fornecedor

export interface NormalizedPayload {
  fornecedor: string | null;
  cnpj: string | null;
  dataCompra: string; // YYYY-MM-DD
  itens: NormalizedItem[];
}

export interface NormalizedItem {
  nome: string;
  quantidade: number;
  unidade: string;
  preco_unitario: number;
  preco_total: number;
}

const UNIDADE_MAP: Record<string, string> = {
  UN: "unidade", un: "unidade", Un: "unidade", UND: "unidade",
  KG: "kg", Kg: "kg", G: "g", GR: "g",
  L: "L", l: "L", LT: "L", lt: "L",
  ML: "ml", Ml: "ml",
  CX: "caixa", cx: "caixa",
  PCT: "pacote", pct: "pacote", PC: "pacote",
  DZ: "dúzia", dz: "dúzia",
};

export function normalizeUnidade(u?: string): string {
  const v = (u ?? "").trim();
  if (!v) return "unidade";
  return UNIDADE_MAP[v] ?? v.toLowerCase();
}

export function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    // Suporta "1.234,56" (BR) e "1,234.56" (US)
    let s = v.trim();
    if (s.includes(",") && s.includes(".")) {
      // Detecta formato brasileiro (ponto como milhar, vírgula como decimal)
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
        s = s.replace(/\./g, "").replace(",", ".");
      } else {
        s = s.replace(/,/g, "");
      }
    } else if (s.includes(",")) {
      s = s.replace(",", ".");
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function normalizeCNPJ(raw?: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 14) return null;
  // Formata XX.XXX.XXX/XXXX-XX
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function normalizeDate(raw?: string): string {
  if (!raw) return new Date().toISOString().slice(0, 10);

  // Tenta DD/MM/YYYY (formato BR)
  const brMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2].padStart(2, "0")}-${brMatch[1].padStart(2, "0")}`;
  }

  // Tenta ISO
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];

  return new Date().toISOString().slice(0, 10);
}

export function normalizePayload(raw: any): NormalizedPayload {
  const itens = (Array.isArray(raw.itens) ? raw.itens : []).map(
    (it: any) => {
      const qty = toNumber(it.quantidade) || 1;
      const preco = toNumber(it.preco_pago ?? it.preco_unitario ?? 0);
      return {
        nome: (it.nome ?? "Item sem nome").toString().trim(),
        quantidade: qty,
        unidade: normalizeUnidade(it.unidade ?? it.unidade_medida),
        preco_unitario: preco,
        preco_total: toNumber(it.preco_total) || preco * qty,
      };
    },
  );

  return {
    fornecedor: (raw.fornecedor ?? "").trim() || null,
    cnpj: normalizeCNPJ(raw.cnpj),
    dataCompra: normalizeDate(raw.data_compra),
    itens,
  };
}
