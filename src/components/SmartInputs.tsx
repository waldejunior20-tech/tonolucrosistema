/**
 * Smart Inputs — Lei de Postel
 * "Be liberal in what you accept, conservative in what you send."
 *
 * These inputs accept messy human input and format it automatically.
 * - PercentInput: user types "1235" → shows "12,35%"
 * - IntegerInput: user types "5" → shows "5"
 * - SmartMoneyInput: user types "10000" → shows "R$ 10.000,00"
 */

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Formatters ──────────────────────────────────────────────────────

const moneyFmt = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFmt = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const onlyDigits = (s: string) => s.replace(/\D/g, "");

/**
 * Parse a Brazilian-formatted number string to a float.
 * Handles: "1.500,00" → 1500, "12,35" → 12.35, "10000" → 10000
 */
export const parseBR = (str: string): number => {
  if (!str) return 0;
  let clean = str.replace(/R\$\s?/g, "").replace(/%/g, "").trim();
  if (clean.includes(",")) {
    clean = clean.replace(/\./g, "").replace(",", ".");
  }
  return parseFloat(clean) || 0;
};

// ─── PercentInput ────────────────────────────────────────────────────

interface PercentInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  /** Number of decimal places (default: 2) */
  decimals?: number;
}

/**
 * Smart percentage input.
 * Accepts raw numbers like "1235" and formats as "12,35%".
 * On blur, emits the numeric value (e.g., 12.35).
 */
export function PercentInput({
  value,
  onChange,
  className,
  disabled,
  id,
  placeholder = "0,00",
  decimals = 2,
}: PercentInputProps) {
  const [focused, setFocused] = useState(false);
  const [localValue, setLocalValue] = useState("");

  const handleFocus = useCallback(() => {
    setFocused(true);
    // Show value with comma for editing
    setLocalValue(value ? value.toFixed(decimals).replace(".", ",") : "");
  }, [value, decimals]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    const parsed = parseBR(localValue);
    onChange(parsed);
  }, [localValue, onChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow digits and one comma
    let raw = e.target.value.replace(/[^\d,]/g, "");
    const parts = raw.split(",");
    if (parts.length > 2) {
      raw = parts[0] + "," + parts.slice(1).join("");
    }
    // Limit decimal places
    if (parts.length === 2 && parts[1].length > decimals) {
      raw = parts[0] + "," + parts[1].slice(0, decimals);
    }
    setLocalValue(raw);
  }, [decimals]);

  const displayValue = focused
    ? localValue
    : value
      ? percentFmt.format(value)
      : "";

  return (
    <div className="relative">
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        className={cn("pr-8", className)}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none select-none">
        %
      </span>
    </div>
  );
}

// ─── IntegerInput ────────────────────────────────────────────────────

interface IntegerInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  min?: number;
  max?: number;
}

/**
 * Smart integer input. Strips non-digits, formats with thousand separators.
 * "10000" → "10.000"
 */
export function IntegerInput({
  value,
  onChange,
  className,
  disabled,
  id,
  placeholder = "0",
  min,
  max,
}: IntegerInputProps) {
  const [focused, setFocused] = useState(false);
  const [localValue, setLocalValue] = useState("");

  const intFmt = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  });

  const handleFocus = useCallback(() => {
    setFocused(true);
    setLocalValue(value ? String(value) : "");
  }, [value]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    let parsed = parseInt(onlyDigits(localValue), 10) || 0;
    if (min !== undefined && parsed < min) parsed = min;
    if (max !== undefined && parsed > max) parsed = max;
    onChange(parsed);
  }, [localValue, onChange, min, max]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = onlyDigits(e.target.value);
    setLocalValue(raw);
  }, []);

  const displayValue = focused
    ? localValue
    : value
      ? intFmt.format(value)
      : "";

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      className={cn(className)}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

// ─── SmartMoneyInput ─────────────────────────────────────────────────

interface SmartMoneyInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
}

/**
 * Smart money input. User types freely — on blur, formats as R$ 1.500,00.
 * Accepts: "10000", "10.000", "10000,00", "R$ 10.000,00"
 */
export function SmartMoneyInput({
  value,
  onChange,
  className,
  disabled,
  id,
  placeholder = "0,00",
}: SmartMoneyInputProps) {
  const [focused, setFocused] = useState(false);
  const [displayText, setDisplayText] = useState("");

  const handleFocus = useCallback(() => {
    setFocused(true);
    const cents = Math.round((value || 0) * 100);
    setDisplayText(cents > 0 ? centsToDisplay(cents) : "");
  }, [value]);

  const handleBlur = useCallback(() => {
    setFocused(false);
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
      ? moneyFmt.format(value)
      : "";

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm pointer-events-none select-none">
        R$
      </span>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        className={cn("pl-9", className)}
        value={shownValue.replace(/R\$\s?/, "")}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

function centsToDisplay(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
