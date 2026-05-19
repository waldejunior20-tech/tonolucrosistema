import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { SectionTabs } from "@/components/layout/SectionTabs";
import { cn } from "@/lib/utils";

export type PeriodoValue = "7" | "30" | "este_mes" | "custom";

interface Props {
  periodo: PeriodoValue;
  customRange?: DateRange;
  onChange: (p: PeriodoValue, range?: DateRange) => void;
  onDark?: boolean;
}

export function ComprasPeriodoChips({ periodo, customRange, onChange, onDark = true }: Props) {
  const [open, setOpen] = useState(false);

  const customLabel =
    periodo === "custom" && customRange?.from
      ? `${format(customRange.from, "dd/MM", { locale: ptBR })} – ${format(
          customRange.to ?? customRange.from,
          "dd/MM",
          { locale: ptBR }
        )}`
      : "Personalizado";

  return (
    <div className="inline-flex items-center gap-2">
      <SectionTabs
        size="sm"
        onDark={onDark}
        value={periodo}
        onChange={(v) => onChange(v as PeriodoValue)}
        items={[
          { label: "7 dias", value: "7" },
          { label: "30 dias", value: "30" },
          { label: "Este mês", value: "este_mes" },
        ]}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border text-[13px] font-semibold transition-all",
              periodo === "custom"
                ? onDark
                  ? "bg-white text-blue-700 border-white shadow-sm"
                  : "bg-white text-blue-600 border-blue-200 shadow-sm"
                : onDark
                ? "bg-white/10 text-white/85 border-white/25 hover:bg-white/15"
                : "bg-white text-slate-600 border-slate-200 hover:text-slate-900"
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {customLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="range"
            selected={customRange}
            onSelect={(r) => {
              onChange("custom", r);
              if (r?.from && r?.to) setOpen(false);
            }}
            numberOfMonths={1}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
