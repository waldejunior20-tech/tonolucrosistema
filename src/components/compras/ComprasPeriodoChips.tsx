import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

export type PeriodoValue = "7" | "30" | "este_mes" | "custom";

const CHIPS: { value: PeriodoValue; label: string }[] = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "este_mes", label: "Este mês" },
];

interface Props {
  periodo: PeriodoValue;
  customRange?: DateRange;
  onChange: (p: PeriodoValue, range?: DateRange) => void;
}

export function ComprasPeriodoChips({ periodo, customRange, onChange }: Props) {
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
    <div className="inline-flex items-center gap-0.5 p-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
      {CHIPS.map((c) => {
        const active = periodo === c.value;
        return (
          <button
            key={c.value}
            onClick={() => onChange(c.value)}
            className={cn(
              "shrink-0 h-8 px-3.5 rounded-lg text-[12.5px] font-semibold transition-all",
              active
                ? "bg-white text-blue-700 shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
                : "text-white/80 hover:text-white hover:bg-white/10"
            )}
          >
            {c.label}
          </button>
        );
      })}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "shrink-0 h-8 px-3.5 rounded-lg text-[12.5px] font-semibold transition-all inline-flex items-center gap-1.5",
              periodo === "custom"
                ? "bg-white text-blue-700 shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
                : "text-white/80 hover:text-white hover:bg-white/10"
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
