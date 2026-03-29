import { LayoutDashboard, Package, BookOpen, DollarSign, TrendingUp, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

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
  return (
    <div className="w-16 h-full bg-sidebar flex flex-col items-center py-6 gap-1 border-r border-sidebar-border overflow-y-auto">
      {/* Sidebar Items */}

      {modules.map((mod) => {
        const Icon = mod.icon;
        const isActive = activeModule === mod.key;
        return (
          <button
            key={mod.key}
            onClick={() => onModuleChange(mod.key)}
            title={mod.label}
            className={cn(
              "w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-200 group relative",
              isActive
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon size={20} />
            {/* Tooltip */}
            <span className="absolute left-full ml-2 px-2 py-1 rounded bg-foreground text-background text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              {mod.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
