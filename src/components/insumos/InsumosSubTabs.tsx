import { Package, History, GitMerge, AlertCircle } from "lucide-react";
import { SectionTabs } from "@/components/layout/SectionTabs";

export function InsumosSubTabs() {
  return (
    <SectionTabs
      items={[
        { label: "Insumos Comprados", path: "/insumos/comprados", icon: Package },
        { label: "Histórico de Compras", path: "/insumos/comprados/historico", icon: History },
        { label: "Revisar Classificações", path: "/insumos/comprados/revisar", icon: AlertCircle },
        { label: "Revisar Duplicados", path: "/insumos/comprados/duplicados", icon: GitMerge },
      ]}
    />
  );
}
