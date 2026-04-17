import { cn } from "@/lib/utils";

const CATEGORY_STYLES: Record<string, { bg: string; text: string; ring: string; dot: string }> = {
  "Proteínas":            { bg: "bg-rose-100",    text: "text-rose-700",    ring: "ring-rose-200",    dot: "bg-rose-500" },
  "Laticínios":           { bg: "bg-sky-100",     text: "text-sky-700",     ring: "ring-sky-200",     dot: "bg-sky-500" },
  "Hortifruti":           { bg: "bg-emerald-100", text: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  "Secos":                { bg: "bg-amber-100",   text: "text-amber-700",   ring: "ring-amber-200",   dot: "bg-amber-500" },
  "Bebidas":              { bg: "bg-cyan-100",    text: "text-cyan-700",    ring: "ring-cyan-200",    dot: "bg-cyan-500" },
  "Molhos e Condimentos": { bg: "bg-orange-100",  text: "text-orange-700",  ring: "ring-orange-200",  dot: "bg-orange-500" },
  "Molhos":               { bg: "bg-orange-100",  text: "text-orange-700",  ring: "ring-orange-200",  dot: "bg-orange-500" },
  "Embalagens":           { bg: "bg-stone-100",   text: "text-stone-700",   ring: "ring-stone-200",   dot: "bg-stone-500" },
  "Congelados":           { bg: "bg-indigo-100",  text: "text-indigo-700",  ring: "ring-indigo-200",  dot: "bg-indigo-500" },
  "Confeitaria":          { bg: "bg-pink-100",    text: "text-pink-700",    ring: "ring-pink-200",    dot: "bg-pink-500" },
};

const FALLBACK = { bg: "bg-muted", text: "text-muted-foreground", ring: "ring-border", dot: "bg-muted-foreground" };

export function CategoryBadge({ categoria, className }: { categoria: string; className?: string }) {
  const s = CATEGORY_STYLES[categoria] ?? FALLBACK;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset whitespace-nowrap",
        s.bg, s.text, s.ring,
        className,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
      {categoria}
    </span>
  );
}
