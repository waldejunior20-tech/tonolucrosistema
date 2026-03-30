import { cn } from "@/lib/utils";
import type { ModuleKey } from "./IconSidebar";

interface SubMenuItem {
  label: string;
  path: string;
}

const subMenus: Record<ModuleKey, SubMenuItem[]> = {
  dashboard: [],
  insumos: [
    { label: "Insumos Comprados", path: "/insumos/comprados" },
    { label: "Insumos Produzidos", path: "/insumos/produzidos" },
  ],
  fichas: [
    { label: "Pizzas", path: "/fichas/pizzas" },
    { label: "Sanduíches e Lanches", path: "/fichas/sanduiches" },
    { label: "Pratos", path: "/fichas/pratos" },
    { label: "Sobremesas", path: "/fichas/sobremesas" },
    { label: "Bebidas", path: "/fichas/bebidas" },
  ],
  precificacao: [
    { label: "Pizzas", path: "/precificacao/pizzas" },
    { label: "Produtos", path: "/precificacao/produtos" },
    { label: "Bebidas", path: "/precificacao/bebidas" },
    { label: "Configurações", path: "/precificacao/configuracoes" },
  ],
  financeiro: [
    { label: "DRE", path: "/financeiro/dre" },
    { label: "Contas a Pagar", path: "/financeiro/contas-a-pagar" },
    { label: "Ponto de Equilíbrio", path: "/financeiro/ponto-de-equilibrio" },
  ],
  promocoes: [
    { label: "Promoções Ativas", path: "/promocoes/ativas" },
    { label: "Combos Fixos", path: "/promocoes/combos" },
  ],
};

const moduleTitles: Record<ModuleKey, string> = {
  dashboard: "Dashboard",
  insumos: "Insumos",
  fichas: "Fichas Técnicas",
  precificacao: "Precificação",
  financeiro: "Financeiro",
  promocoes: "Promoções",
};

interface SubMenuProps {
  activeModule: ModuleKey;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function SubMenu({ activeModule, currentPath, onNavigate }: SubMenuProps) {
  const items = subMenus[activeModule];
  if (items.length === 0) return null;

  return (
    <div className="w-52 h-full bg-card border-r border-border flex flex-col py-5 px-3">
      <h2 className="px-3 mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {moduleTitles[activeModule]}
      </h2>
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={cn(
                "text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 font-medium",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export { subMenus };
