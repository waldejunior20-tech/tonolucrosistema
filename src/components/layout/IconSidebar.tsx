import { LayoutDashboard, Package, BookOpen, DollarSign, TrendingUp, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

const accentColors = [
  { name: "Vermelho", value: "#C0392B" },
  { name: "Azul Marinho", value: "#1A5276" },
  { name: "Verde", value: "#1E8449" },
  { name: "Roxo", value: "#6C3483" },
  { name: "Marrom", value: "#784212" },
];

export type ModuleKey = "dashboard" | "insumos" | "fichas" | "precificacao" | "financeiro" | "promocoes";

interface IconSidebarProps {
  activeModule: ModuleKey;
  onModuleChange: (module: ModuleKey) => void;
}

const modules: { key: ModuleKey; icon: React.ElementType; label: string }[] = [
  { key: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { key: "insumos", icon: Package, label: "Insumos" },
  { key: "fichas", icon: BookOpen, label: "Fichas Técnicas" },
  { key: "precificacao", icon: DollarSign, label: "Precificação" },
  { key: "financeiro", icon: TrendingUp, label: "Financeiro" },
  { key: "promocoes", icon: Tag, label: "Promoções" },
];

export function IconSidebar({ activeModule, onModuleChange }: IconSidebarProps) {
  const { accentColor, setAccentColor } = useTheme();

  return (
    <div className="w-16 h-full bg-sidebar flex flex-col items-center py-6 border-r border-sidebar-border overflow-y-auto">
      <div className="flex-1 flex flex-col items-center gap-1 w-full">
        {modules.map((mod) => {
          const Icon = mod.icon;
          const isActive = activeModule === mod.key;
          return (
            <div key={mod.key} className="relative w-full flex justify-center py-1">
              {isActive && (
                <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary rounded-r" />
              )}
              <button
                onClick={() => onModuleChange(mod.key)}
                title={mod.label}
                className={cn(
                  "w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-200 group relative",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon size={20} />
                <span className="absolute left-full ml-2 px-2 py-1 rounded bg-foreground text-background text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {mod.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-6 flex flex-col items-center gap-3">
        {accentColors.map((color) => (
          <button
            key={color.value}
            onClick={() => setAccentColor(color.value)}
            className={cn(
              "w-4 h-4 rounded-full transition-all duration-200 hover:scale-125",
              accentColor === color.value ? "ring-2 ring-offset-2 ring-primary" : "opacity-80"
            )}
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}
      </div>
    </div>
  );
}
