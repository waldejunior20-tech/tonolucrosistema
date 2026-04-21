import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normaliza string para busca: lowercase, sem acentos, sem espaços extras.
 * Use nos dois lados da comparação (termo digitado e valor da lista).
 *
 * Exemplo:
 *   normalizeSearch("Mussarela").includes(normalizeSearch("muss"))  // true
 *   normalizeSearch("Açaí").includes(normalizeSearch("acai"))       // true
 */
export function normalizeSearch(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .trim();
}

/**
 * Retorna true se `haystack` contém `needle` ignorando caixa, acentos e espaços.
 */
export function matchesSearch(haystack: string | null | undefined, needle: string | null | undefined): boolean {
  const n = normalizeSearch(needle);
  if (!n) return true;
  return normalizeSearch(haystack).includes(n);
}
