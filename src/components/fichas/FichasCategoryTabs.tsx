import { Pizza, Sandwich, UtensilsCrossed, IceCream, GlassWater } from "lucide-react";
import { SectionTabs } from "@/components/layout/SectionTabs";

export function FichasCategoryTabs() {
  return (
    <SectionTabs
      items={[
        { label: "Pizzas", path: "/fichas/pizzas", icon: Pizza },
        { label: "Sanduíches", path: "/fichas/sanduiches", icon: Sandwich },
        { label: "Pratos", path: "/fichas/pratos", icon: UtensilsCrossed },
        { label: "Sobremesas", path: "/fichas/sobremesas", icon: IceCream },
        { label: "Bebidas", path: "/fichas/bebidas", icon: GlassWater },
      ]}
    />
  );
}
