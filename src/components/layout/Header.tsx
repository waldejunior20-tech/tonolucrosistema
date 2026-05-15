import { useEffect, useState } from "react";
import { Bell, Menu, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GlobalSearch } from "./GlobalSearch";
import { UnidadeSelector } from "./UnidadeSelector";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  sidebarWidth?: string;
}

const MOBILE_QUICK = [
  { label: "Caixa diário", path: "/financeiro/caixa-diario" },
  { label: "Insumos comprados", path: "/insumos/comprados" },
  { label: "Fichas de pizza", path: "/fichas/pizzas" },
  { label: "Precificação", path: "/precificacao/pizzas" },
  { label: "Promoções", path: "/promocoes" },
  { label: "Alertas", path: "/automacao/alertas" },
  { label: "Configurações", path: "/configuracoes" },
];

export function Header({ onMenuClick, showMenuButton, sidebarWidth = "0px" }: HeaderProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("business_name").eq("id", user.id).single()
        .then(({ data }) => { if (data?.business_name) setBusinessName(data.business_name); });
    });
  }, [isMobile]);

  if (isMobile) {
    return (
      <>
        <header
          style={{ left: sidebarWidth, background: "linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%)" }}
          className="h-16 flex items-center justify-between px-3 fixed top-0 right-0 z-30 text-white"
        >
          <button
            onClick={onMenuClick}
            aria-label="Abrir menu"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-white active:bg-white/15 transition-colors"
          >
            <Menu size={22} />
          </button>

          <div className="flex-1 min-w-0 px-1">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-white/70 leading-none">
              TôNoLucro
            </p>
            <p className="text-[14px] font-bold text-white truncate leading-tight mt-0.5">
              {businessName || "Seu negócio"}
            </p>
          </div>

          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Buscar"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-white active:bg-white/15 transition-colors"
          >
            <Search size={20} />
          </button>
        </header>

        <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
          <CommandInput placeholder="Buscar menus, produtos, insumos..." />
          <CommandList>
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
            <CommandGroup heading="Atalhos">
              {MOBILE_QUICK.map((item) => (
                <CommandItem
                  key={item.path}
                  value={item.label}
                  onSelect={() => { setSearchOpen(false); navigate(item.path); }}
                >
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </>
    );
  }

  return (
    <header
      style={{ left: sidebarWidth }}
      className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 fixed top-0 right-0 z-30 transition-all duration-300"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors lg:hidden"
          >
            <Menu size={20} />
          </button>
        )}
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <UnidadeSelector />
      </div>
    </header>
  );
}
