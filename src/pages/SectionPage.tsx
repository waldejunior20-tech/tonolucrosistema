import { useLocation } from "react-router-dom";

const pathLabels: Record<string, string> = {
  "/": "Dashboard",
  "/insumos/comprados": "Insumos Comprados",
  "/insumos/produzidos": "Insumos Produzidos",
  "/fichas/tradicionais": "Fichas Técnicas — Tradicionais",
  "/fichas/especiais": "Fichas Técnicas — Especiais",
  "/fichas/premium": "Fichas Técnicas — Premium",
  "/fichas/doces": "Fichas Técnicas — Doces",
  "/fichas/sanduiches": "Fichas Técnicas — Sanduíches",
  "/fichas/pratos": "Fichas Técnicas — Pratos",
  "/fichas/sobremesas": "Fichas Técnicas — Sobremesas",
  "/fichas/bebidas": "Fichas Técnicas — Bebidas",
  "/precificacao/pizzas": "Precificação — Pizzas",
  "/precificacao/produtos": "Precificação — Produtos",
  "/precificacao/bebidas": "Precificação — Bebidas",
  "/financeiro/dre": "Financeiro — DRE",
  "/financeiro/contas-a-pagar": "Financeiro — Contas a Pagar",
  "/financeiro/ponto-de-equilibrio": "Financeiro — Ponto de Equilíbrio",
  "/promocoes/ativas": "Promoções Ativas",
  "/promocoes/combos": "Combos Fixos",
};

export default function SectionPage() {
  const location = useLocation();
  const title = pathLabels[location.pathname] || "Página";

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground text-lg">
          Conteúdo de <span className="font-semibold text-foreground">{title}</span> será exibido aqui.
        </p>
      </div>
    </div>
  );
}
