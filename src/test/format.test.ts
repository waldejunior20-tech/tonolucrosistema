import { describe, it, expect } from "vitest";
import { formatCurrency, formatPercent, formatNumber, formatCents, formatDate } from "@/lib/format";

describe("format helpers", () => {
  it("formatCurrency formata valores em BRL", () => {
    expect(formatCurrency(1234.5)).toMatch(/R\$/);
    expect(formatCurrency(1234.5)).toContain("1.234,50");
  });

  it("formatCurrency lida com null/undefined/NaN", () => {
    expect(formatCurrency(null)).toContain("0,00");
    expect(formatCurrency(undefined)).toContain("0,00");
    expect(formatCurrency(NaN)).toContain("0,00");
  });

  it("formatPercent respeita decimais", () => {
    expect(formatPercent(12.345)).toBe("12.3%");
    expect(formatPercent(50, 0)).toBe("50%");
  });

  it("formatNumber formata em pt-BR", () => {
    expect(formatNumber(1234.5)).toBe("1.234,50");
    expect(formatNumber(0.1, 1)).toBe("0,1");
  });

  it("formatCents converte centavos em moeda", () => {
    expect(formatCents(12345)).toContain("123,45");
    expect(formatCents(null)).toContain("0,00");
  });

  it("formatDate retorna string vazia para datas inválidas", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate("invalid")).toBe("");
  });
});
