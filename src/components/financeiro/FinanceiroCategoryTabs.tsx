import { Wallet, Receipt, FileBarChart, Target } from "lucide-react";
import { SectionTabs } from "@/components/layout/SectionTabs";

export function FinanceiroCategoryTabs() {
  return (
    <SectionTabs
      items={[
        { label: "Caixa Diário", path: "/financeiro/caixa-diario", icon: Wallet },
        { label: "Contas a Pagar", path: "/financeiro/contas-a-pagar", icon: Receipt },
        { label: "DRE Simples", path: "/financeiro/dre", icon: FileBarChart },
        { label: "Ponto de Equilíbrio", path: "/financeiro/ponto-de-equilibrio", icon: Target },
      ]}
    />
  );
}
