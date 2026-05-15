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
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-[#E6EAF0] grid grid-cols-5 lg:hidden shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.10)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)", height: "68px" }}
    >
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center gap-1 min-h-[48px] text-[10.5px] font-semibold transition-all relative",
              isActive ? "text-[#2563EB]" : "text-[#64748B] active:text-[#0F172A]"
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span
                  aria-hidden
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-10 rounded-b-full bg-[#2563EB]"
                />
              )}
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                  isActive && "bg-[#EFF6FF]"
                )}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="leading-none">{label}</span>
            </>
          )}
        </NavLink>
      ))}
      <button
        onClick={onMenuClick}
        className="flex flex-col items-center justify-center gap-1 min-h-[48px] text-[10.5px] font-semibold text-[#64748B] active:text-[#0F172A] transition-colors"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center">
          <Menu size={20} strokeWidth={2} />
        </div>
        <span className="leading-none">Mais</span>
      </button>
    </nav>
  );
}
