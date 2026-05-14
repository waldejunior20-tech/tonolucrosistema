import { Package, History, GitMerge } from "lucide-react";
import { SectionTabs } from "@/components/layout/SectionTabs";

export function InsumosSubTabs() {
  return (
    <SectionTabs
      items={[
        { label: "Insumos Comprados", path: "/insumos/comprados", icon: Package },
        { label: "Histórico de Compras", path: "/insumos/comprados/historico", icon: History },
        { label: "Revisar Duplicados", path: "/insumos/comprados/duplicados", icon: GitMerge },
      ]}
    />
  );
}
