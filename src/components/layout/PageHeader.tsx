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
  "/precificacao/configuracoes": "Config. Precificação",
  "/financeiro/dre": "Resumo do Mês",
  "/financeiro/contas-a-pagar": "Contas a Pagar",
  "/financeiro/ponto-de-equilibrio": "Ponto de Equilíbrio",
  "/financeiro/caixa-diario": "Caixa Diário",
  "/promocoes/ativas": "Promoções Ativas",
  "/promocoes/combos": "Combos Fixos",
  "/automacao/alertas": "Alertas de CMV",
  "/automacao/historico-precos": "Histórico de Preços",
  "/automacao/fichas-warnings": "Fichas Incompletas",
  "/automacao/saude": "Saúde do Sistema",
  "/configuracoes": "Configurações",
};

const SECTION_LABELS: Record<string, string> = {
  insumos: "Insumos",
  fichas: "Fichas Técnicas",
  precificacao: "Precificação",
  financeiro: "Financeiro",
  promocoes: "Promoções",
  automacao: "Automação",
};

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  const showBreadcrumb = segments.length > 0;

  return (
    <div className={cn("mb-6", className)}>
      {/* Breadcrumb (flat — sem nível intermediário de seção) */}
      {showBreadcrumb && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2 font-medium">
          <span>Dashboard</span>
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
