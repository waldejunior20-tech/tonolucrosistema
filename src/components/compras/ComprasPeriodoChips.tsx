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
    <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 py-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {CHIPS.map((c) => {
        const active = periodo === c.value;
        return (
          <button
            key={c.value}
            onClick={() => onChange(c.value)}
            className={cn(
              "shrink-0 h-9 px-4 rounded-full text-sm font-semibold transition-all border",
              active
                ? "bg-foreground text-background border-foreground shadow-sm"
                : "bg-card text-muted-foreground border-border/60 hover:border-border"
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
              "shrink-0 h-9 px-4 rounded-full text-sm font-semibold transition-all border inline-flex items-center gap-1.5",
              periodo === "custom"
                ? "bg-foreground text-background border-foreground shadow-sm"
                : "bg-card text-muted-foreground border-border/60"
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
