import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const qtyFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

/**
 * Casas decimais padrão por unidade de medida.
 * Unidades contínuas (kg, L) usam 3 casas; discretas (g, ml, un) usam 0.
 */
export const unidadeDecimals = (unidade?: string | null): number => {
  if (!unidade) return 3;
  const u = unidade.toLowerCase().trim();
  if (u === "kg" || u === "l") return 3;
  if (u === "g" || u === "ml" || u === "mg") return 0;
  // unidade, caixa, pacote, fardo, dúzia, etc → inteiro
  return 0;
};

/**
 * Formata uma quantidade já com a unidade no padrão brasileiro:
 *   1.5 + "kg"  → "1,5 kg"
 *   500 + "g"   → "500 g"
 *   1   + "L"   → "1 L"
 *   10  + "un"  → "10 un"
 */
export const formatQuantidade = (value: number, unidade?: string | null): string => {
  if (value == null || isNaN(value)) return "";
  const decimals = unidadeDecimals(unidade);
  const fmt = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
  const num = fmt.format(value);
  return unidade ? `${num} ${unidade}` : num;
};

/**
 * Format a number as Brazilian currency: R$ 1.500,00
 */
export const formatMoney = (value: number): string => {
  if (value == null) return "";
  return currencyFormatter.format(value);
};

/**
 * Format a quantity with 3 decimal places: 200,000
 * @deprecated prefira formatQuantidade(value, unidade)
 */
export const formatQty = (value: number): string => {
  if (value == null) return "";
  return qtyFormatter.format(value);
};

/**
 * Parser robusto pt-BR.
 * Regras:
 *   - Vírgula é SEMPRE separador decimal.
 *   - Ponto é SEMPRE separador de milhar (descartado).
 *   - "8,5"      → 8.5
 *   - "8.500"    → 8500   (ponto = milhar)
 *   - "8.500,75" → 8500.75
 *   - "1500"     → 1500
 *   - "R$ 1.500,00" → 1500
 * Para entradas que vêm de <input type="number"> nativo (com ".") use parseFloat direto.
 */
export const parseFormattedNumber = (str: string): number => {
  if (!str) return 0;
  let clean = str.replace(/R\$\s?/g, "").trim();
  if (!clean) return 0;
  // Se tem vírgula, é o decimal: remove todos os pontos (milhar) e troca vírgula por ponto.
  if (clean.includes(",")) {
    clean = clean.replace(/\./g, "").replace(",", ".");
  } else {
    // Sem vírgula: pontos são separadores de milhar — remove todos.
    clean = clean.replace(/\./g, "");
  }
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
};

/**
 * Convert cents integer to formatted currency string
 */
const centsToDisplay = (cents: number): string => {
  return currencyFormatter.format(cents / 100);
};

/**
 * Extract only digits from a string
 */
const onlyDigits = (str: string): string => str.replace(/\D/g, "");

interface MoneyInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  required?: boolean;
}

export function MoneyInput({
  value,
  onChange,
  className,
  placeholder = "R$ 0,00",
  disabled,
  id,
  required,
}: MoneyInputProps) {
  const [focused, setFocused] = useState(false);
  const [displayText, setDisplayText] = useState("");

  const handleFocus = useCallback(() => {
    setFocused(true);
    // Convert current value to cents and show formatted
    const cents = Math.round((value || 0) * 100);
    setDisplayText(cents > 0 ? centsToDisplay(cents) : "");
  }, [value]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    // Parse cents from display and emit number
    const digits = onlyDigits(displayText);
    const cents = parseInt(digits, 10) || 0;
    onChange(cents / 100);
  }, [displayText, onChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = onlyDigits(raw);

    if (!digits) {
      setDisplayText("");
      return;
    }

    const cents = parseInt(digits, 10) || 0;
    setDisplayText(centsToDisplay(cents));
  }, []);

  const shownValue = focused
    ? displayText
    : value
      ? formatMoney(value)
      : "";

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] font-medium text-sm pointer-events-none select-none">R$</span>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        className={cn("pricing-input pl-9 text-[#1F2937] font-mono tabular-nums", className)}
        value={shownValue.replace(/R\$\s?/, "")}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="0,00"
        disabled={disabled}
        required={required}
      />
    </div>
  );
}

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  required?: boolean;
  step?: string;
  /** Casas decimais para formatação. Se omitido, usa 3 (legado). */
  decimals?: number;
  /** Unidade de medida; se passada, infere decimais via unidadeDecimals. */
  unidade?: string | null;
}

export function QuantityInput({
  value,
  onChange,
  className,
  placeholder,
  disabled,
  id,
  required,
  decimals,
  unidade,
}: QuantityInputProps) {
  const [focused, setFocused] = useState(false);
  const [localValue, setLocalValue] = useState("");

  const effectiveDecimals = decimals ?? (unidade ? unidadeDecimals(unidade) : 3);
  const allowDecimals = effectiveDecimals > 0;
  const effectivePlaceholder = placeholder ?? (allowDecimals ? "0,000" : "0");

  const handleFocus = useCallback(() => {
    setFocused(true);
    // Show raw number with comma as decimal for editing
    setLocalValue(value ? String(value).replace(".", ",") : "");
  }, [value]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    const parsed = parseFormattedNumber(localValue);
    // Se a unidade não aceita decimais, arredonda
    const final = allowDecimals ? parsed : Math.round(parsed);
    onChange(final);
  }, [localValue, onChange, allowDecimals]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    if (allowDecimals) {
      raw = raw.replace(/[^\d,]/g, "");
      const parts = raw.split(",");
      if (parts.length > 2) {
        raw = parts[0] + "," + parts.slice(1).join("");
      }
    } else {
      raw = raw.replace(/\D/g, "");
    }
    setLocalValue(raw);
  }, [allowDecimals]);

  const formatter = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: effectiveDecimals,
  });

  const displayValue = focused
    ? localValue
    : value
      ? formatter.format(value)
      : "";

  return (
    <Input
      id={id}
      type="text"
      inputMode={allowDecimals ? "decimal" : "numeric"}
      className={cn(className)}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={effectivePlaceholder}
      disabled={disabled}
      required={required}
    />
  );
}
