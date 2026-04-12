import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Package, BookOpen, DollarSign, 
  TrendingUp, Tag, ChevronDown, 
  PanelLeftClose, PanelLeft, Pizza, Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ModuleKey = "dashboard" | "insumos" | "fichas" | "precificacao" | "financeiro" | "promocoes" | "configuracoes";

interface SubItem {
  label: string;
  path?: string;
  subItems?: { label: string; path: string; }[];
}

interface SidebarItem {
  key: ModuleKey;
  label: string;
  icon: React.ElementType;
  path?: string;
  subItems?: SubItem[];
}

const sidebarItems: SidebarItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
  {
    key: "insumos", label: "Insumos", icon: Package,
    subItems: [
      { label: "Comprados", path: "/insumos/comprados" },
      { label: "Produzidos", path: "/insumos/produzidos" },
    ],
  },
  {
    key: "fichas", label: "Fichas Técnicas", icon: BookOpen,
    subItems: [
      { label: "Pizzas", subItems: [
          { label: "Tradicionais", path: "/fichas/pizzas?tipo=tradicional" },
          { label: "Especiais", path: "/fichas/pizzas?tipo=especial" },
          { label: "Premium", path: "/fichas/pizzas?tipo=premium" },
          { label: "Doces", path: "/fichas/pizzas?tipo=doce" },
        ]
      },
      { label: "Sanduíches", path: "/fichas/sanduiches" },
      { label: "Pratos", path: "/fichas/pratos" },
      { label: "Sobremesas", path: "/fichas/sobremesas" },
      { label: "Bebidas", path: "/fichas/bebidas" },
    ],
  },
  {
    key: "precificacao", label: "Precificação", icon: DollarSign,
    subItems: [
      { label: "Pizzas", path: "/precificacao/pizzas" },
      { label: "Produtos", path: "/precificacao/produtos" },
      { label: "Bebidas", path: "/precificacao/bebidas" },
    ],
  },
  {
    key: "financeiro", label: "Financeiro", icon: TrendingUp,
    subItems: [
      { label: "DRE", path: "/financeiro/dre" },
      { label: "Contas a Pagar", path: "/financeiro/contas-a-pagar" },
      { label: "Ponto de Equilíbrio", path: "/financeiro/ponto-de-equilibrio" },
    ],
  },
  {
    key: "promocoes", label: "Promoções", icon: Tag,
    subItems: [
      { label: "Promoções Ativas", path: "/promocoes/ativas" },
      { label: "Combos Fixos", path: "/promocoes/combos" },
    ],
  },
  { key: "configuracoes", label: "Configurações", icon: Settings2, path: "/configuracoes" },
];

interface UnifiedSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}

export function UnifiedSidebar({ collapsed, onToggle, onNavigate }: UnifiedSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [expandedSubItems, setExpandedSubItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    sidebarItems.forEach(item => {
      const isSubActive = item.subItems?.some(sub => 
        location.pathname === sub.path || 
        sub.subItems?.some(nested => location.pathname + location.search === nested.path)
      );
      if (isSubActive) {
        setExpandedItems(prev => ({ ...prev, [item.key]: true }));
        item.subItems?.forEach(sub => {
          if (sub.subItems?.some(nested => location.pathname + location.search === nested.path)) {
            setExpandedSubItems(prev => ({ ...prev, [sub.label]: true }));
          }
        });
      }
    });
  }, [location.pathname, location.search]);

  const toggleExpand = (key: string) => {
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSubExpand = (label: string) => {
    setExpandedSubItems(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const handleItemClick = (item: SidebarItem) => {
    if (collapsed) {
      onToggle();
      if (item.subItems) {
        setExpandedItems(prev => ({ ...prev, [item.key]: true }));
      }
    }
    if (item.path) {
      navigate(item.path);
    } else if (item.subItems) {
      toggleExpand(item.key);
    }
  };

  return (
    <aside 
      className={cn(
        "h-screen bg-sidebar transition-all duration-300 flex flex-col border-r border-sidebar-border relative z-50 shadow-sidebar",
        collapsed ? "w-16" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 shrink-0 overflow-hidden relative">
        <div className={cn("flex items-center gap-3 transition-opacity duration-200", collapsed ? "opacity-0 w-0" : "opacity-100")}>
          <div className="w-9 h-9 rounded-sm bg-primary flex items-center justify-center shrink-0">
            <Pizza size={18} className="text-primary-foreground" />
          </div>
          <span className="text-foreground font-sans font-extrabold text-lg leading-none whitespace-nowrap">TôNoLucro</span>
        </div>
        
        <button
          onClick={onToggle}
          className={cn(
            "p-1.5 rounded-sm text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors",
            collapsed ? "mx-auto" : "ml-auto"
          )}
        >
          {collapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2">
        <div className="flex flex-col gap-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isExpanded = expandedItems[item.key];
            const hasSubItems = !!item.subItems;
            const isActive = (item.path === location.pathname) || 
                            (item.subItems?.some(sub => 
                              (sub.path && (location.pathname + location.search).includes(sub.path)) || 
                              sub.subItems?.some(nested => (location.pathname + location.search).includes(nested.path))
                            ));

            return (
              <div key={item.key} className="flex flex-col gap-1">
                <button
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "group relative w-full h-10 flex items-center rounded-sm transition-all duration-200 overflow-hidden",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  {/* Left Active Bar — ember orange */}
                  {isActive && !collapsed && (
                    <div className="absolute left-0 top-0 w-[3px] h-full bg-primary rounded-r" />
                  )}
                  
                  <div className={cn("flex items-center w-full px-3 gap-3", collapsed ? "justify-center" : "")}>
                    <div className="shrink-0">
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    
                    {!collapsed && (
                      <div className="flex-1 flex items-center justify-between min-w-0">
                        <span className={cn("text-sm truncate", isActive ? "font-semibold" : "font-medium")}>{item.label}</span>
                        {hasSubItems && (
                          <div className={cn("transition-transform duration-200", isExpanded ? "rotate-180" : "")}>
                            <ChevronDown size={14} className="text-sidebar-foreground" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </button>

                {/* Sub-items */}
                {!collapsed && hasSubItems && isExpanded && (
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    {item.subItems?.map((sub, idx) => {
                      const hasNestedItems = !!sub.subItems;
                      const isNestedExpanded = expandedSubItems[sub.label];
                      const currentPath = location.pathname + location.search;
                      const isSubActive = sub.path ? currentPath.includes(sub.path) : sub.subItems?.some(n => currentPath.includes(n.path));
                      
                      return (
                        <div key={`${sub.label}-${idx}`} className="flex flex-col gap-0.5">
                          <button
                            onClick={() => {
                              if (sub.path) navigate(sub.path);
                              if (hasNestedItems) toggleSubExpand(sub.label);
                            }}
                            className={cn(
                              "h-8 pl-11 pr-4 flex items-center justify-between text-sm transition-colors rounded-sm group",
                              isSubActive ? "text-primary font-semibold" : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent font-medium"
                            )}
                          >
                            <span className="truncate">{sub.label}</span>
                            {hasNestedItems && (
                              <ChevronDown size={12} className={cn("transition-transform duration-200", isNestedExpanded ? "rotate-180" : "")} />
                            )}
                          </button>

                          {hasNestedItems && isNestedExpanded && (
                            <div className="flex flex-col gap-0.5 ml-4 border-l border-sidebar-border pl-2">
                              {sub.subItems?.map((nested, nIdx) => {
                                const isNestedActive = currentPath.includes(nested.path);
                                return (
                                  <button
                                    key={`${nested.path}-${nIdx}`}
                                    onClick={() => navigate(nested.path)}
                                    className={cn(
                                      "h-7 px-3 flex items-center text-xs transition-colors rounded-sm",
                                      isNestedActive ? "text-primary font-semibold" : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent font-medium"
                                    )}
                                  >
                                    <span className="truncate">{nested.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
