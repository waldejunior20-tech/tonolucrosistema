import { LayoutDashboard, Package, BookOpen, DollarSign, TrendingUp, Tag, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModuleKey = "dashboard" | "insumos" | "fichas" | "precificacao" | "financeiro" | "promocoes";

interface IconSidebarProps {
  activeModule: ModuleKey;
  onModuleChange: (module: ModuleKey) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const modules: { key: ModuleKey; icon: React.ElementType; label: string }[] = [
  { key: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { key: "insumos", icon: Package, label: "Insumos" },
  { key: "fichas", icon: BookOpen, label: "Fichas Técnicas" },
  { key: "precificacao", icon: DollarSign, label: "Precificação" },
  { key: "financeiro", icon: TrendingUp, label: "Financeiro" },
  { key: "promocoes", icon: Tag, label: "Promoções" },
];

export function IconSidebar({ activeModule, onModuleChange, collapsed, onToggle }: IconSidebarProps) {
  return (
    <div className="w-16 h-full bg-card border-r border-border flex flex-col items-center py-4 gap-1">
      {/* Logo */}
      <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm mb-4">
        DC
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col items-center gap-0.5 w-full px-2">
        {modules.map((mod) => {
          const Icon = mod.icon;
          const isActive = activeModule === mod.key;
          return (
            <button
              key={mod.key}
              onClick={() => onModuleChange(mod.key)}
              title={mod.label}
              className={cn(
                "w-full h-10 rounded-lg flex items-center justify-center transition-all duration-150 group relative",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                {mod.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        title={collapsed ? "Expandir" : "Recolher"}
      >
        {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
      </button>
    </div>
  );
}
