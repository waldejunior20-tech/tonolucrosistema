/**
 * Reusable inline form validation helpers.
 * - `fieldErrorClass(hasError)` returns border classes for inputs/selects
 * - `<FieldError show={bool} />` renders the "Campo obrigatório" message
 */

import { cn } from "@/lib/utils";

/** Border class to apply on invalid fields */
export const fieldErrorClass = (hasError: boolean) =>
  hasError ? "border-[#FF4444] focus-visible:border-[#FF4444] focus-visible:ring-[#FF4444]/15" : "";

/** Inline error message below a field */
export function FieldError({ show, message = "Campo obrigatório" }: { show: boolean; message?: string }) {
  if (!show) return null;
  return <p className="text-xs font-medium text-[#FF4444] mt-1">{message}</p>;
}
