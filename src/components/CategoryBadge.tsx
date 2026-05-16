import { cn } from "@/lib/utils";

const CATEGORY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  "Proteínas":            { bg: "bg-rose-50",    text: "text-rose-700",    dot: "bg-rose-500" },
  "Laticínios":           { bg: "bg-sky-50",     text: "text-sky-700",     dot: "bg-sky-500" },
  "Hortifruti":           { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "Secos":                { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
  "Bebidas":              { bg: "bg-cyan-50",    text: "text-cyan-700",    dot: "bg-cyan-500" },
  "Molhos e Condimentos": { bg: "bg-orange-50",  text: "text-orange-700",  dot: "bg-orange-500" },
  "Molhos":               { bg: "bg-orange-50",  text: "text-orange-700",  dot: "bg-orange-500" },
  "Embalagens":           { bg: "bg-stone-50",   text: "text-stone-700",   dot: "bg-stone-500" },
  "Congelados":           { bg: "bg-indigo-50",  text: "text-indigo-700",  dot: "bg-indigo-500" },
  "Confeitaria":          { bg: "bg-pink-50",    text: "text-pink-700",    dot: "bg-pink-500" },
};

const FALLBACK = { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-500" };

export function CategoryBadge({ categoria, className }: { categoria: string; className?: string }) {
  const s = CATEGORY_STYLES[categoria] ?? FALLBACK;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-tight whitespace-nowrap",
        s.bg, s.text,
        className,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
      {categoria}
    </span>
  );
}
