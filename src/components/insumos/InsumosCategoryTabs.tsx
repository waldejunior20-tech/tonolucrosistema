import { ShoppingCart, Beaker } from "lucide-react";
import { SectionTabs } from "@/components/layout/SectionTabs";

export function InsumosCategoryTabs() {
  return (
    <SectionTabs
      items={[
        { label: "Comprados", path: "/insumos/comprados", icon: ShoppingCart },
        { label: "Produzidos", path: "/insumos/produzidos", icon: Beaker },
      ]}
    />
  );
}
