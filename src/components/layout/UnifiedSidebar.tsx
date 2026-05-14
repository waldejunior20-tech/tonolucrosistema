import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Wallet, Pizza, Package, Receipt, BarChart3, Cog,
  PanelLeftClose, PanelLeft, ChevronUp, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UnidadeSelector } from "./UnidadeSelector";

export type ModuleKey =
  | "dashboard" | "caixa" | "fichas" | "insumos"
  | "contas" | "relatorios" | "configuracoes";

interface SidebarItem {
  key: ModuleKey;
  label: string;
  icon: React.ElementType;
  emoji: string;
  path: string;
  match?: string[];
}

// 7 itens flat — sem submenus
const sidebarItems: SidebarItem[] = [
  { key: "dashboard",    label: "Dashboard",         emoji: "📊", icon: LayoutDashboard, path: "/" },
  { key: "caixa",        label: "Caixa Diário",      emoji: "💰", icon: Wallet,          path: "/financeiro/caixa-diario" },
  { key: "fichas",       label: "Fichas Técnicas",   emoji: "🍕", icon: Pizza,           path: "/fichas",                 match: ["/fichas"] },
  { key: "insumos",      label: "Insumos & Estoque", emoji: "🧺", icon: Package,         path: "/insumos/comprados",      match: ["/insumos/"] },
  { key: "contas",       label: "Contas a Pagar",    emoji: "💵", icon: Receipt,         path: "/financeiro/contas-a-pagar" },
  { key: "relatorios",   label: "Relatórios",        emoji: "📈", icon: BarChart3,       path: "/financeiro/dre",         match: ["/financeiro/dre", "/financeiro/ponto-de-equilibrio"] },
  { key: "configuracoes",label: "Configurações",     emoji: "⚙️", icon: Cog,             path: "/configuracoes" },
];

interface UnifiedSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}

export function UnifiedSidebar({ collapsed, onToggle, onNavigate }: UnifiedSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const initials = (() => {
    const name = profile?.display_name || profile?.business_name || user?.email || "U";
    const parts = name.split(/[\s@]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  })();

  const displayName = profile?.display_name || profile?.business_name || "Usuário";
  const displayEmail = user?.email || "";

  function isItemActive(item: SidebarItem) {
    if (item.path === "/" && location.pathname === "/") return true;
    if (item.path !== "/" && location.pathname === item.path) return true;
    if (item.match?.some((m) => location.pathname.startsWith(m))) return true;
    return false;
  }

  return (
    <aside
      className={cn(
        "h-full bg-sidebar flex flex-col border-r border-sidebar-border relative z-50",
        collapsed ? "w-16" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 shrink-0 overflow-hidden border-b border-sidebar-border">
        <div className={cn("flex items-center gap-2.5 transition-opacity", collapsed ? "opacity-0 w-0" : "opacity-100")}>
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Pizza size={18} className="text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display font-bold text-[15px] text-foreground tracking-tight whitespace-nowrap">TôNoLucro</span>
            <span className="text-[10px] text-muted-foreground font-semibold tracking-[0.12em] uppercase">Gestão Food</span>
          </div>
        </div>

        <button
          onClick={onToggle}
          className={cn(
            "p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors",
            collapsed ? "mx-auto" : "ml-auto"
          )}
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Unit selector */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-2 border-b border-sidebar-border">
          <UnidadeSelector />
        </div>
      )}

      {/* Nav (flat) */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <div className="flex flex-col gap-0.5">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);
            return (
              <button
                key={item.key}
                onClick={() => { navigate(item.path); onNavigate?.(); }}
                className={cn(
                  "group relative w-full h-11 flex items-center rounded-lg transition-all px-3",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                )}
              >
                {active && !collapsed && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />
                )}
                <span className={cn("flex items-center gap-3 w-full", collapsed && "justify-center")}>
                  <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                  {!collapsed && <span className="text-sm truncate">{item.label}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* User */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn("w-full flex items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent transition-colors", collapsed && "justify-center")}>
              <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">{initials}</span>
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-foreground truncate leading-tight">{displayName}</p>
                    <p className="text-[11px] text-muted-foreground truncate leading-tight">{displayEmail}</p>
                  </div>
                  <ChevronUp size={14} className="text-muted-foreground shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side={collapsed ? "right" : "top"} align="start" className="w-56 mb-1">
            <div className="px-3 py-2">
              <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { navigate("/configuracoes"); onNavigate?.(); }} className="cursor-pointer gap-2">
              <Cog size={16} /> Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
              <LogOut size={16} /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
