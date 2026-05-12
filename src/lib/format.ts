/**
 * Helpers de formatação padronizados em pt-BR.
 * Use sempre estas funções em vez de Intl.NumberFormat inline nas páginas.
 */

export function formatCurrency(value: number | null | undefined): string {
  const v = typeof value === "number" && isFinite(value) ? value : 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  const v = typeof value === "number" && isFinite(value) ? value : 0;
  return `${v.toFixed(decimals)}%`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  const v = typeof value === "number" && isFinite(value) ? value : 0;
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Converte centavos (inteiro) em string formatada R$ */
export function formatCents(cents: number | null | undefined): string {
  return formatCurrency((cents ?? 0) / 100);
}
