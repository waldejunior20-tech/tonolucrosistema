import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  /** Slot for category chips / SectionTabs */
  filters?: React.ReactNode;
  /** Slot for sort / extra dropdowns */
  trailing?: React.ReactNode;
  className?: string;
}

/**
 * Standard filter row: search + category chips + sort/extras.
 * Use at the top of any list/table page.
 */
export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  filters,
  trailing,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center gap-3 p-3 rounded-2xl",
        "bg-white/72 border border-white/70 backdrop-blur-md",
        "shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_8px_24px_-16px_rgba(15,23,42,0.10)]",
        className
      )}
    >
      {onSearchChange !== undefined && (
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={searchPlaceholder}
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-10 rounded-lg bg-white/80 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:border-blue-400"
          />
        </div>
      )}
      {filters && <div className="flex items-center gap-2 flex-wrap">{filters}</div>}
      {trailing && <div className="flex items-center gap-2 md:ml-auto">{trailing}</div>}
    </div>
  );
}
