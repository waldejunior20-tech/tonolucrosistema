import { NavLink } from "react-router-dom";
import { Pizza, Sandwich, UtensilsCrossed, IceCream, GlassWater } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = [
  { label: "Pizzas", path: "/fichas/pizzas", icon: Pizza },
  { label: "Sanduíches", path: "/fichas/sanduiches", icon: Sandwich },
  { label: "Pratos", path: "/fichas/pratos", icon: UtensilsCrossed },
  { label: "Sobremesas", path: "/fichas/sobremesas", icon: IceCream },
  { label: "Bebidas", path: "/fichas/bebidas", icon: GlassWater },
];

export function FichasCategoryTabs() {
  return (
    <div className="mb-6 -mx-1 overflow-x-auto">
      <div className="flex items-center gap-2 px-1 min-w-max">
        {categories.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end
            className={({ isActive }) =>
              cn(
                "inline-flex items-center gap-2 h-10 px-4 rounded-lg border text-sm font-semibold transition-all whitespace-nowrap",
                isActive
                  ? "bg-primary/10 border-primary text-primary shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <Icon size={16} strokeWidth={2.2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
