import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Package, BookOpen, DollarSign, 
  TrendingUp, Tag, ChevronDown, ChevronRight, 
  PanelLeftClose, PanelLeft 
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ModuleKey = "dashboard" | "insumos" | "fichas" | "precificacao" | "financeiro" | "promocoes";

interface SidebarItem {
  key: ModuleKey;
  label: string;
  icon: React.ElementType;
  path?: string;
  subItems?: { label: string; path: string; }[];
}

const sidebarItems: SidebarItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
  },
  {
    key: "insumos",
    label: "Insumos",
    icon: Package,
    subItems: [
      { label: "Comprados", path: "/insumos/comprados" },
      { label: "Produzidos", path: "/insumos/produzidos" },
    ],
  },
  {
    key: "fichas",
    label: "Fichas Técnicas",
    icon: BookOpen,
    subItems: [
      { label: "Tradicionais", path: "/fichas/pizzas?tipo=tradicional" },
      { label: "Especiais", path: "/fichas/pizzas?tipo=especial" },
      { label: "Premium", path: "/fichas/pizzas?tipo=premium" },
      { label: "Doces", path: "/fichas/pizzas?tipo=doce" },
      { label: "Sanduíches", path: "/fichas/sanduiches" },
      { label: "Pratos", path: "/fichas/pratos" },
      { label: "Sobremesas", path: "/fichas/sobremesas" },
      { label: "Bebidas", path: "/fichas/bebidas" },
    ],
  },
  {
    key: "precificacao",
    label: "Precificação",
    icon: DollarSign,
    subItems: [
      { label: "Pizzas", path: "/precificacao/pizzas" },
      { label: "Produtos", path: "/precificacao/produtos" },
      { label: "Bebidas", path: "/precificacao/bebidas" },
    ],
  },
  {
    key: "financeiro",
    label: "Financeiro",
    icon: TrendingUp,
    subItems: [
      { label: "DRE", path: "/financeiro/dre" },
      { label: "Contas a Pagar", path: "/financeiro/contas-a-pagar" },
      { label: "Ponto de Equilíbrio", path: "/financeiro/ponto-de-equilibrio" },
    ],
  },
  {
    key: "promocoes",
    label: "Promoções",
    icon: Tag,
    subItems: [
      { label: "Promoções Ativas", path: "/promocoes/ativas" },
      { label: "Combos Fixos", path: "/promocoes/combos" },
    ],
  },
];

interface UnifiedSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function UnifiedSidebar({ collapsed, onToggle }: UnifiedSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Auto-expand the module containing the current path
    sidebarItems.forEach(item => {
      if (item.subItems?.some(sub => location.pathname === sub.path.split('?')[0])) {
        setExpandedItems(prev => ({ ...prev, [item.key]: true }));
      }
    });
  }, [location.pathname]);

  const toggleExpand = (key: string) => {
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
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
        "h-screen bg-[#161212] transition-all duration-300 flex flex-col border-r border-white/5",
        collapsed ? "w-16" : "w-[240px]"
      )}
    >
      {/* Sidebar Header */}
      <div className="h-16 flex items-center px-4 shrink-0 relative">
        <div className={cn("flex items-center gap-3 transition-opacity duration-200", collapsed ? "opacity-0 invisible w-0" : "opacity-100 visible")}>
          <div className="w-8 h-8 rounded-full bg-[#C0392B] flex items-center justify-center shrink-0">
            <span className="text-white font-['Syne'] font-extrabold text-sm leading-none">TL</span>
          </div>
          <span className="text-[#F5F0F0] font-['Syne'] font-bold text-lg leading-none">ToLucro</span>
        </div>
        
        <button
          onClick={onToggle}
          className={cn(
            "p-1.5 rounded-lg text-[#A89898] hover:text-[#F5F0F0] hover:bg-white/5 transition-colors",
            collapsed ? "mx-auto" : "ml-auto"
          )}
        >
          {collapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-thin scrollbar-thumb-white/10">
        <div className="flex flex-col gap-1 px-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isExpanded = expandedItems[item.key];
            const hasSubItems = !!item.subItems;
            const isActive = item.path === location.pathname || 
                            (item.subItems?.some(sub => location.pathname === sub.path.split('?')[0]));

            return (
              <div key={item.key} className="flex flex-col gap-1">
                <button
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "group relative w-full h-11 flex items-center rounded-lg transition-all duration-200 overflow-hidden",
                    isActive ? "bg-[#C0392B]/15 text-[#F5F0F0]" : "text-[#A89898] hover:bg-white/5 hover:text-[#F5F0F0]"
                  )}
                >
                  {/* Left Active Bar */}
                  {isActive && !collapsed && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#C0392B] rounded-r" />
                  )}
                  
                  <div className={cn("flex items-center w-full px-3 gap-3", collapsed ? "justify-center" : "")}>
                    <div className={cn("shrink-0 transition-transform duration-200", isActive ? "scale-110" : "group-hover:scale-110")}>
                      <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    
                    {!collapsed && (
                      <div className="flex-1 flex items-center justify-between min-w-0">
                        <span className="text-sm font-medium truncate">{item.label}</span>
                        {hasSubItems && (
                          <div className={cn("transition-transform duration-200", isExpanded ? "rotate-180" : "")}>
                            <ChevronDown size={14} className="text-[#A89898]" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </button>

                {/* Sub-items */}
                {!collapsed && hasSubItems && isExpanded && (
                  <div className="flex flex-col gap-1 mt-1">
                    {item.subItems?.map((sub) => {
                      const isSubActive = location.pathname === sub.path.split('?')[0] && 
                                          (!sub.path.includes('?') || location.search === sub.path.split('?')[1] || location.search === `?${sub.path.split('?')[1]}`);
                      
                      return (
                        <button
                          key={sub.path}
                          onClick={() => navigate(sub.path)}
                          className={cn(
                            "h-9 pl-11 pr-4 flex items-center text-sm font-medium transition-colors rounded-lg",
                            isSubActive ? "text-[#C0392B]" : "text-[#A89898] hover:text-[#F5F0F0] hover:bg-white/5"
                          )}
                        >
                          <span className="truncate">{sub.label}</span>
                        </button>
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
