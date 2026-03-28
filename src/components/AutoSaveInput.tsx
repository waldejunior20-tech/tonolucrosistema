import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, formatQty, parseFormattedNumber } from "@/components/MoneyInput";

type FormatType = "money" | "qty" | "none";

interface AutoSaveInputProps {
  value: string | number;
  onSave: (value: string) => void | Promise<void>;
  format?: FormatType;
  type?: string;
  step?: string;
  min?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function AutoSaveInput({
  value,
  onSave,
  format = "none",
  type = "number",
  step = "0.01",
  min,
  placeholder,
  className,
  disabled,
}: AutoSaveInputProps) {
  const [focused, setFocused] = useState(false);
  const [localValue, setLocalValue] = useState<string | null>(null);
  const [showCheck, setShowCheck] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(String(value));

  const formatDisplay = (v: string | number): string => {
    const num = typeof v === "number" ? v : parseFloat(String(v));
    if (isNaN(num) || num === 0) return "";
    if (format === "money") return formatMoney(num);
    if (format === "qty") return formatQty(num);
    return String(v);
  };

  const getDisplayValue = () => {
    if (focused) {
      return localValue !== null ? localValue : (value ?? "");
    }
    // Not focused: show formatted
    if (format !== "none" && value) {
      return formatDisplay(value);
    }
    return localValue !== null ? localValue : (value ?? "");
  };

  const handleFocus = useCallback(() => {
    setFocused(true);
    // Show raw number when focused
    setLocalValue(String(value ?? ""));
  }, [value]);

  const handleBlur = useCallback(async () => {
    setFocused(false);
    const currentValue = localValue ?? String(value);
    if (currentValue === lastSavedRef.current) {
      setLocalValue(null);
      return;
    }

    try {
      await onSave(currentValue);
      lastSavedRef.current = currentValue;
      setLocalValue(null);

      setShowCheck(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setShowCheck(false), 2000);
    } catch {
      // error handled by caller
    }
  }, [localValue, value, onSave]);

  const inputType = focused ? type : (format !== "none" ? "text" : type);

  return (
    <div className="relative flex items-center">
      <Input
        type={inputType}
        step={focused ? step : undefined}
        min={focused ? min : undefined}
        placeholder={placeholder}
        className={cn(className)}
        value={getDisplayValue()}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
      />
      {showCheck && (
        <Check className="absolute right-1 h-3.5 w-3.5 text-green-500 animate-in fade-in duration-200" />
      )}
    </div>
  );
}
