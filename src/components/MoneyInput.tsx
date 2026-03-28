import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Format a number as Brazilian currency display: R$ 1.500,00
 */
export const formatMoney = (value: number): string => {
  if (!value && value !== 0) return "";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

/**
 * Format a quantity with 3 decimal places: 200,000
 */
export const formatQty = (value: number): string => {
  if (!value && value !== 0) return "";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
};

/**
 * Parse a formatted string back to a number.
 * Handles "R$ 1.500,00" → 1500, "200,000" → 200, plain numbers, etc.
 */
export const parseFormattedNumber = (str: string): number => {
  if (!str) return 0;
  // Remove currency symbol, spaces
  let clean = str.replace(/R\$\s?/g, "").trim();
  // If uses comma as decimal (Brazilian format): remove dots (thousands), replace comma with dot
  if (clean.includes(",")) {
    clean = clean.replace(/\./g, "").replace(",", ".");
  }
  return parseFloat(clean) || 0;
};

/**
 * Format a raw numeric string with thousand separators while typing.
 * Input: "2000" → "2.000"
 * Input: "1500.5" → "1.500,5"
 */
const formatWhileTyping = (raw: string, isMoney: boolean): string => {
  if (!raw) return "";
  // Remove anything that's not digit, dot, minus, comma
  let clean = raw.replace(/[^\d.,-]/g, "");
  if (!clean) return "";

  // Determine decimal part
  // Accept both . and , as decimal separator input
  let parts: string[];
  if (clean.includes(",")) {
    parts = clean.split(",");
  } else if (clean.includes(".")) {
    parts = clean.split(".");
  } else {
    parts = [clean];
  }

  // Integer part — add thousand separators
  let intPart = parts[0].replace(/\D/g, "");
  if (!intPart) intPart = "0";
  const intFormatted = parseInt(intPart, 10).toLocaleString("pt-BR");

  let result = intFormatted;
  if (parts.length > 1) {
    // Keep decimal part as-is (user is still typing)
    result += "," + parts[1].replace(/\D/g, "");
  }

  if (isMoney) {
    result = "R$ " + result;
  }

  return result;
};

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
  const [localValue, setLocalValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = focused
    ? localValue
    : value
    ? formatMoney(value)
    : "";

  const handleFocus = useCallback(() => {
    setFocused(true);
    setLocalValue(value ? formatWhileTyping(String(value), true) : "");
  }, [value]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    const parsed = parseFormattedNumber(localValue);
    onChange(parsed);
  }, [localValue, onChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Strip formatting to get raw digits, then reformat
    const stripped = raw.replace(/R\$\s?/g, "").replace(/\./g, "").replace(",", ".");
    // If user is typing, keep the raw feel but format with separators
    setLocalValue(formatWhileTyping(raw.replace(/R\$\s?/g, ""), true));
  }, []);

  return (
    <Input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="decimal"
      className={cn(className)}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
    />
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
}

export function QuantityInput({
  value,
  onChange,
  className,
  placeholder = "0,000",
  disabled,
  id,
  required,
}: QuantityInputProps) {
  const [focused, setFocused] = useState(false);
  const [localValue, setLocalValue] = useState("");

  const displayValue = focused
    ? localValue
    : value
    ? formatQty(value)
    : "";

  const handleFocus = useCallback(() => {
    setFocused(true);
    setLocalValue(value ? formatWhileTyping(String(value), false) : "");
  }, [value]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    const parsed = parseFormattedNumber(localValue);
    onChange(parsed);
  }, [localValue, onChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(formatWhileTyping(e.target.value, false));
  }, []);

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      className={cn(className)}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
    />
  );
}
