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
      onNavigate?.();
    } else if (item.subItems) {
      toggleExpand(item.key);
    }
  };

  return (
    <aside 
      className={cn(
        "h-screen bg-sidebar transition-all duration-300 flex flex-col border-r border-sidebar-border relative z-50",
        collapsed ? "w-16" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 shrink-0 overflow-hidden relative border-b border-sidebar-border/30">
        <div className={cn("flex items-center gap-2.5 transition-opacity duration-200", collapsed ? "opacity-0 w-0" : "opacity-100")}>
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Pizza size={15} className="text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sidebar-accent-foreground font-sans font-bold text-[15px] leading-none whitespace-nowrap tracking-tight">TôNoLucro</span>
            <span className="text-[9px] text-sidebar-foreground/60 font-medium tracking-widest uppercase">Gestão Food</span>
          </div>
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
                    "group relative w-full h-9 flex items-center rounded-lg transition-all duration-200 overflow-hidden",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-primary" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  {/* Left Active Bar */}
                  {isActive && !collapsed && (
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-sidebar-primary rounded-r" />
                  )}
                  
                  <div className={cn("flex items-center w-full px-3 gap-2.5 transition-transform duration-200", collapsed ? "justify-center" : "group-hover:translate-x-0.5")}>
                    <div className="shrink-0">
                      <Icon size={16} strokeWidth={isActive ? 2.5 : 1.8} />
                    </div>
                    
                    {!collapsed && (
                      <div className="flex-1 flex items-center justify-between min-w-0">
                        <span className={cn("text-[13px] truncate", isActive ? "font-semibold" : "font-normal")}>{item.label}</span>
                        {hasSubItems && (
                          <div className={cn("transition-transform duration-200", isExpanded ? "rotate-180" : "")}>
                            <ChevronDown size={14} className="text-sidebar-foreground/60" />
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
                              if (sub.path) { navigate(sub.path); onNavigate?.(); }
                              if (hasNestedItems) toggleSubExpand(sub.label);
                            }}
                            className={cn(
                            "h-8 pl-11 pr-4 flex items-center justify-between text-sm transition-all duration-200 rounded-sm group",
                              isSubActive ? "text-sidebar-primary font-semibold" : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:translate-x-0.5 hover:bg-sidebar-accent/40 font-medium"
                            )}
                          >
                            <span className="truncate">{sub.label}</span>
                            {hasNestedItems && (
                              <ChevronDown size={12} className={cn("transition-transform duration-200", isNestedExpanded ? "rotate-180" : "")} />
                            )}
                          </button>

                          {hasNestedItems && isNestedExpanded && (
                            <div className="flex flex-col gap-0.5 ml-4 border-l border-sidebar-border/30 pl-2">
                              {sub.subItems?.map((nested, nIdx) => {
                                const isNestedActive = currentPath.includes(nested.path);
                                return (
                                  <button
                                    key={`${nested.path}-${nIdx}`}
                                    onClick={() => { navigate(nested.path); onNavigate?.(); }}
                                    className={cn(
                                      "h-7 px-3 flex items-center text-xs transition-all duration-200 rounded-sm",
                                      isNestedActive ? "text-sidebar-primary font-semibold" : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:translate-x-0.5 hover:bg-sidebar-accent/40 font-medium"
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
