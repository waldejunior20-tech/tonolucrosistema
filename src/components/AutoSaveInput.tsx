import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutoSaveInputProps {
  value: string | number;
  onSave: (value: string) => void | Promise<void>;
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
  type = "number",
  step = "0.01",
  min,
  placeholder,
  className,
  disabled,
}: AutoSaveInputProps) {
  const [localValue, setLocalValue] = useState<string | null>(null);
  const [showCheck, setShowCheck] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(String(value));

  const displayValue = localValue !== null ? localValue : (value ?? "");

  const handleBlur = useCallback(async () => {
    const currentValue = localValue ?? String(value);
    if (currentValue === lastSavedRef.current) {
      setLocalValue(null);
      return;
    }

    try {
      await onSave(currentValue);
      lastSavedRef.current = currentValue;
      setLocalValue(null);

      // Show check icon for 2 seconds
      setShowCheck(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setShowCheck(false), 2000);
    } catch {
      // error handled by caller
    }
  }, [localValue, value, onSave]);

  return (
    <div className="relative flex items-center">
      <Input
        type={type}
        step={step}
        min={min}
        placeholder={placeholder}
        className={cn(className)}
        value={displayValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        disabled={disabled}
      />
      {showCheck && (
        <Check className="absolute right-1 h-3.5 w-3.5 text-green-500 animate-in fade-in duration-200" />
      )}
    </div>
  );
}
