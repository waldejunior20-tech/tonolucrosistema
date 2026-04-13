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
 * Format a number as Brazilian currency: R$ 1.500,00
 */
export const formatMoney = (value: number): string => {
  if (value == null) return "";
  return currencyFormatter.format(value);
};

/**
 * Format a quantity with 3 decimal places: 200,000
 */
export const formatQty = (value: number): string => {
  if (value == null) return "";
  return qtyFormatter.format(value);
};

/**
 * Parse a formatted string back to a number.
 * Handles "R$ 1.500,00" → 1500, "200,000" → 200, plain numbers, etc.
 */
export const parseFormattedNumber = (str: string): number => {
  if (!str) return 0;
  let clean = str.replace(/R\$\s?/g, "").trim();
  if (clean.includes(",")) {
    clean = clean.replace(/\./g, "").replace(",", ".");
  }
  return parseFloat(clean) || 0;
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
        className={cn("pricing-input pl-9 text-[#1F2937]", className)}
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

  const handleFocus = useCallback(() => {
    setFocused(true);
    // Show raw number with comma as decimal for editing
    setLocalValue(value ? String(value).replace(".", ",") : "");
  }, [value]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    const parsed = parseFormattedNumber(localValue);
    onChange(parsed);
  }, [localValue, onChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow digits and one comma
    let raw = e.target.value.replace(/[^\d,]/g, "");
    // Only one comma allowed
    const parts = raw.split(",");
    if (parts.length > 2) {
      raw = parts[0] + "," + parts.slice(1).join("");
    }
    setLocalValue(raw);
  }, []);

  const displayValue = focused
    ? localValue
    : value
      ? formatQty(value)
      : "";

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
