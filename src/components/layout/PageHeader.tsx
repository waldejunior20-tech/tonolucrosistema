import { useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/insumos/comprados": "Insumos Comprados",
  "/insumos/produzidos": "Insumos Produzidos",
  "/fichas/pizzas": "Fichas de Pizzas",
  "/fichas/sanduiches": "Fichas de Sanduíches",
  "/fichas/pratos": "Fichas de Pratos",
  "/fichas/sobremesas": "Fichas de Sobremesas",
  "/fichas/bebidas": "Fichas de Bebidas",
  "/precificacao/pizzas": "Precificação Pizzas",
  "/precificacao/produtos": "Precificação Produtos",
  "/precificacao/bebidas": "Precificação Bebidas",
  "/financeiro/dre": "DRE Financeiro",
  "/financeiro/contas-a-pagar": "Contas a Pagar",
  "/financeiro/ponto-de-equilibrio": "Ponto de Equilíbrio",
  "/promocoes/ativas": "Promoções Ativas",
  "/promocoes/combos": "Combos Fixos",
  "/configuracoes": "Configurações",
};

const SECTION_LABELS: Record<string, string> = {
  insumos: "Insumos",
  fichas: "Fichas Técnicas",
  precificacao: "Precificação",
  financeiro: "Financeiro",
  promocoes: "Promoções",
};

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  const breadcrumbs: { label: string }[] = [];
  if (segments.length > 0) {
    const section = SECTION_LABELS[segments[0]];
    if (section) breadcrumbs.push({ label: section });
  }

  return (
    <div className={cn("mb-6", className)}>
      {/* Breadcrumb */}
      {breadcrumbs.length > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2 font-medium">
          <span>Dashboard</span>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <ChevronRight size={12} />
              <span>{crumb.label}</span>
            </span>
          ))}
          <ChevronRight size={12} />
          <span className="text-foreground font-medium">{title}</span>
        </div>
      )}

      {/* Title row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-text-heading">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1 font-medium">{description}</p>
          )}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
