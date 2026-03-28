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
    setLocalValue(value ? String(value) : "");
  }, [value]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    const parsed = parseFormattedNumber(localValue);
    onChange(parsed);
  }, [localValue, onChange]);

  return (
    <Input
      ref={inputRef}
      id={id}
      type={focused ? "number" : "text"}
      step={focused ? "0.01" : undefined}
      min={focused ? "0" : undefined}
      className={cn(className)}
      value={displayValue}
      onChange={(e) => setLocalValue(e.target.value)}
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
  step = "0.001",
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
    setLocalValue(value ? String(value) : "");
  }, [value]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    const parsed = parseFormattedNumber(localValue);
    onChange(parsed);
  }, [localValue, onChange]);

  return (
    <Input
      id={id}
      type={focused ? "number" : "text"}
      step={focused ? step : undefined}
      min={focused ? "0" : undefined}
      className={cn(className)}
      value={displayValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
    />
  );
}
