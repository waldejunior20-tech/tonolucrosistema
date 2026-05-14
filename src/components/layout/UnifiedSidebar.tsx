import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ChefHat, Wallet, ChevronDown,
  PanelLeftClose, PanelLeft, Pizza, Cog, LogOut, ChevronUp, Activity,
  Package, DollarSign, Tag, FileBarChart, Receipt, Heart, Home
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ModuleKey = "dashboard" | "insumos" | "fichas" | "precificacao" | "financeiro" | "configuracoes";

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
  {
    key: "dashboard", label: "Dashboard", icon: LayoutDashboard,
    path: "/",
  },
  {
    key: "insumos", label: "Insumos", icon: Package,
    path: "/insumos/comprados",
  },
  {
    key: "fichas", label: "Fichas Técnicas", icon: ChefHat,
    path: "/fichas/pizzas",
  },
  {
    key: "precificacao", label: "Precificação & Promoções", icon: Tag,
    path: "/precificacao/pizzas",
  },
  {
    key: "financeiro", label: "Financeiro", icon: Wallet,
    path: "/financeiro/caixa-diario",
  },
  {
    key: "configuracoes", label: "Configurações", icon: Cog,
    subItems: [
      { label: "Meu Negócio", path: "/configuracoes" },
      {
        label: "Parâmetros & Automação",
        subItems: [
          { label: "Configurações de Preço", path: "/precificacao/configuracoes" },
          { label: "Saúde do CMV", path: "/automacao/saude" },
          { label: "Alertas de CMV", path: "/automacao/alertas" },
          { label: "Histórico de Preços", path: "/automacao/historico-precos" },
          { label: "Fichas Incompletas", path: "/automacao/fichas-warnings" },
        ],
      },
    ],
  },
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
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data } = await supabase
          .from("profiles")
          .select("display_name, business_name, avatar_url")
          .eq("id", user.id)
          .single();
        if (data) setProfile(data);
      }
    }
    loadUser();
  }, []);

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
    setExpandedItems(prev => {
      const isOpen = !!prev[key];
      // Accordion: close others when opening a new group
      if (isOpen) return { ...prev, [key]: false };
      const next: Record<string, boolean> = {};
      sidebarItems.forEach(it => { next[it.key] = false; });
      next[key] = true;
      return next;
    });
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const initials = (() => {
    const name = profile?.display_name || profile?.business_name || user?.email || "";
    const parts = name.split(/[\s@]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  })();

  const displayName = profile?.display_name || profile?.business_name || "Usuário";
  const displayEmail = user?.email || "";

  return (
    <aside 
      className={cn(
        "h-full bg-sidebar flex flex-col border-r border-sidebar-border relative z-50",
        collapsed ? "w-16" : "w-[288px]"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 shrink-0 overflow-hidden border-b border-sidebar-border/40">
        <div className={cn("flex items-center gap-3 transition-opacity duration-200", collapsed ? "opacity-0 w-0" : "opacity-100")}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/80 flex items-center justify-center shrink-0 shadow-md">
            <Pizza size={17} className="text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sidebar-accent-foreground font-sans font-extrabold text-base leading-tight whitespace-nowrap tracking-tight">TôNoLucro</span>
            <span className="text-[10px] text-sidebar-foreground/50 font-semibold tracking-[0.15em] uppercase">Gestão Food</span>
          </div>
        </div>
        
        <button
          onClick={onToggle}
          className={cn(
            "p-2 rounded-lg text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors",
            collapsed ? "mx-auto" : "ml-auto"
          )}
        >
          {collapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3">
        {!collapsed && (
          <p className="text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-[0.2em] px-3 mb-3">Menu</p>
        )}
        <div className="flex flex-col gap-0.5">
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
              <div key={item.key} className="flex flex-col">
                <button
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "group relative w-full h-10 flex items-center rounded-xl transition-all duration-200 overflow-hidden",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-primary font-bold" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  )}
                >
                  {isActive && !collapsed && (
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-sidebar-primary" />
                  )}
                  
                  <div className={cn(
                    "flex items-center w-full px-3 gap-3 transition-transform duration-200",
                    collapsed ? "justify-center" : ""
                  )}>
                    <div className="shrink-0">
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    
                    {!collapsed && (
                      <div className="flex-1 flex items-center justify-between min-w-0">
                        <span className={cn(
                          "text-sm truncate",
                          isActive ? "font-bold" : "font-medium"
                        )}>
                          {item.label}
                        </span>
                        {hasSubItems && (
                          <ChevronDown 
                            size={15} 
                            className={cn(
                              "text-sidebar-foreground/50 transition-transform duration-200 shrink-0",
                              isExpanded ? "rotate-180" : ""
                            )} 
                          />
                        )}
                      </div>
                    )}
                  </div>
                </button>

                {!collapsed && hasSubItems && isExpanded && (
                  <div className="flex flex-col gap-0.5 mt-1 ml-5 pl-3 border-l-2 border-sidebar-border/30">
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
                              "relative h-8 px-3 flex items-center justify-between text-[13px] transition-all duration-200 rounded-lg",
                              isSubActive 
                                ? "text-primary font-bold bg-primary/10" 
                                : "text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/40 font-medium"
                            )}
                          >
                            {isSubActive && (
                              <span className="absolute -left-[13px] top-1.5 bottom-1.5 w-[2px] rounded-r-full bg-primary" />
                            )}
                            <span className="truncate">{sub.label}</span>
                            {hasNestedItems && (
                              <ChevronDown size={13} className={cn("transition-transform duration-200 shrink-0", isNestedExpanded ? "rotate-180" : "")} />
                            )}
                          </button>

                          {hasNestedItems && isNestedExpanded && (
                            <div className="flex flex-col gap-0.5 ml-3 pl-2.5 border-l-2 border-sidebar-border/20">
                              {sub.subItems?.map((nested, nIdx) => {
                                const isNestedActive = currentPath.includes(nested.path);
                                return (
                                  <button
                                    key={`${nested.path}-${nIdx}`}
                                    onClick={() => { navigate(nested.path); onNavigate?.(); }}
                                    className={cn(
                                      "h-7 px-3 flex items-center text-[12.5px] transition-all duration-200 rounded-lg",
                                      isNestedActive 
                                        ? "text-primary font-bold bg-primary/10" 
                                        : "text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/30 font-medium"
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

      {/* User Menu */}
      <div className="shrink-0 border-t border-sidebar-border/40 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-3 rounded-xl p-2 hover:bg-sidebar-accent transition-colors duration-200",
                collapsed ? "justify-center" : ""
              )}
            >
              <div className="w-9 h-9 rounded-full bg-sidebar-primary/15 border border-sidebar-primary/30 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-sidebar-primary">{initials}</span>
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-sidebar-accent-foreground truncate leading-tight">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-sidebar-foreground/50 truncate leading-tight">
                      {displayEmail}
                    </p>
                  </div>
                  <ChevronUp size={16} className="text-sidebar-foreground/40 shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={collapsed ? "right" : "top"}
            align="start"
            className="w-56 mb-1"
          >
            <div className="px-3 py-2">
              <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { navigate("/configuracoes"); onNavigate?.(); }} className="cursor-pointer gap-2">
              <Cog size={16} />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
              <LogOut size={16} />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
