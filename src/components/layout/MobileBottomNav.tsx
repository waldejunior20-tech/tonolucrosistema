import { NavLink } from "react-router-dom";
import { LayoutDashboard, Package, BookOpen, DollarSign, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onMenuClick: () => void;
}

const items = [
  { to: "/", label: "Início", icon: LayoutDashboard, end: true },
  { to: "/insumos/comprados", label: "Insumos", icon: Package },
  { to: "/fichas/pizzas", label: "Fichas", icon: BookOpen },
  { to: "/financeiro/caixa-diario", label: "Caixa", icon: DollarSign },
];

export function MobileBottomNav({ onMenuClick }: MobileBottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border h-16 grid grid-cols-5 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center gap-1 min-h-[48px] text-[11px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )
          }
        >
          <Icon size={22} strokeWidth={2} />
          <span>{label}</span>
        </NavLink>
      ))}
      <button
        onClick={onMenuClick}
        className="flex flex-col items-center justify-center gap-1 min-h-[48px] text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Menu size={22} strokeWidth={2} />
        <span>Mais</span>
      </button>
    </nav>
  );
}
