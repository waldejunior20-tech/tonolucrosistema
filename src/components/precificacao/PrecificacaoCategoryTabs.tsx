import { Pizza, UtensilsCrossed, GlassWater, Sparkles, Layers } from "lucide-react";
import { SectionTabs } from "@/components/layout/SectionTabs";

export function PrecificacaoCategoryTabs() {
  return (
    <SectionTabs
      items={[
        { label: "Pizzas", path: "/precificacao/pizzas", icon: Pizza },
        { label: "Produtos", path: "/precificacao/produtos", icon: UtensilsCrossed },
        { label: "Bebidas", path: "/precificacao/bebidas", icon: GlassWater },
        { label: "Promoções", path: "/promocoes/ativas", icon: Sparkles },
        { label: "Combos", path: "/promocoes/combos", icon: Layers },
      ]}
    />
  );
}
