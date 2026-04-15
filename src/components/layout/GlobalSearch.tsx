import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";

interface SearchResult {
  label: string;
  breadcrumb: string;
  path: string;
}

const MENU_ITEMS: SearchResult[] = [
  { label: "Dashboard", breadcrumb: "Dashboard", path: "/" },
  { label: "Insumos Comprados", breadcrumb: "Dashboard > Insumos > Comprados", path: "/insumos/comprados" },
  { label: "Insumos Produzidos", breadcrumb: "Dashboard > Insumos > Produzidos", path: "/insumos/produzidos" },
  { label: "Fichas Técnicas — Pizzas", breadcrumb: "Dashboard > Fichas Técnicas > Pizzas", path: "/fichas/pizzas" },
  { label: "Fichas Técnicas — Sanduíches", breadcrumb: "Dashboard > Fichas Técnicas > Sanduíches", path: "/fichas/sanduiches" },
  { label: "Fichas Técnicas — Pratos", breadcrumb: "Dashboard > Fichas Técnicas > Pratos", path: "/fichas/pratos" },
  { label: "Fichas Técnicas — Sobremesas", breadcrumb: "Dashboard > Fichas Técnicas > Sobremesas", path: "/fichas/sobremesas" },
  { label: "Fichas Técnicas — Bebidas", breadcrumb: "Dashboard > Fichas Técnicas > Bebidas", path: "/fichas/bebidas" },
  { label: "Precificação — Pizzas", breadcrumb: "Dashboard > Precificação > Pizzas", path: "/precificacao/pizzas" },
  { label: "Precificação — Produtos", breadcrumb: "Dashboard > Precificação > Produtos", path: "/precificacao/produtos" },
  { label: "Precificação — Bebidas", breadcrumb: "Dashboard > Precificação > Bebidas", path: "/precificacao/bebidas" },
  { label: "Promoções Ativas", breadcrumb: "Dashboard > Promoções > Ativas", path: "/promocoes/ativas" },
  { label: "Combos Fixos", breadcrumb: "Dashboard > Promoções > Combos Fixos", path: "/promocoes/combos" },
  { label: "Caixa Diário", breadcrumb: "Dashboard > Financeiro > Caixa", path: "/financeiro/caixa-diario" },
  { label: "Contas a Pagar", breadcrumb: "Dashboard > Financeiro > Contas a Pagar", path: "/financeiro/contas-a-pagar" },
  { label: "Resumo do Mês", breadcrumb: "Dashboard > Financeiro > Resumo do Mês", path: "/financeiro/dre" },
  { label: "Configurações", breadcrumb: "Dashboard > Configurações", path: "/configuracoes" },
];

interface ProductResult {
  nome: string;
  breadcrumb: string;
  path: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<ProductResult[]>([]);
  const navigate = useNavigate();

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Fetch products when opened
  useEffect(() => {
    if (!open) return;
    async function fetchProducts() {
      const results: ProductResult[] = [];

      const { data: pizzas } = await supabase
        .from("fichas_tecnicas_pizza")
        .select("nome")
        .order("nome");
      pizzas?.forEach((p) =>
        results.push({
          nome: p.nome,
          breadcrumb: "Dashboard > Fichas Técnicas > Pizzas",
          path: "/fichas/pizzas",
        })
      );

      const { data: produtos } = await supabase
        .from("fichas_tecnicas_produtos")
        .select("nome, categoria")
        .order("nome");
      const catMap: Record<string, { breadcrumb: string; path: string }> = {
        sanduiche: { breadcrumb: "Dashboard > Fichas Técnicas > Sanduíches", path: "/fichas/sanduiches" },
        prato: { breadcrumb: "Dashboard > Fichas Técnicas > Pratos", path: "/fichas/pratos" },
        sobremesa: { breadcrumb: "Dashboard > Fichas Técnicas > Sobremesas", path: "/fichas/sobremesas" },
        bebida: { breadcrumb: "Dashboard > Fichas Técnicas > Bebidas", path: "/fichas/bebidas" },
      };
      produtos?.forEach((p) => {
        const info = catMap[p.categoria] || { breadcrumb: "Dashboard > Fichas Técnicas", path: "/fichas/pizzas" };
        results.push({ nome: p.nome, ...info });
      });

      const { data: insumos } = await supabase
        .from("insumos_comprados")
        .select("nome")
        .order("nome");
      insumos?.forEach((i) =>
        results.push({
          nome: i.nome,
          breadcrumb: "Dashboard > Insumos > Comprados",
          path: "/insumos/comprados",
        })
      );

      setProducts(results);
    }
    fetchProducts();
  }, [open]);

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors w-64 max-w-[280px]"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left truncate">Pesquisar...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Pesquisar menus, produtos, insumos..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

          <CommandGroup heading="Menus">
            {MENU_ITEMS.map((item) => (
              <CommandItem
                key={item.path}
                value={item.label}
                onSelect={() => handleSelect(item.path)}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.breadcrumb}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>

          {products.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Produtos e Insumos">
                {products.map((p, i) => (
                  <CommandItem
                    key={`${p.path}-${i}`}
                    value={p.nome}
                    onSelect={() => handleSelect(p.path)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{p.nome}</span>
                      <span className="text-xs text-muted-foreground">{p.breadcrumb}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
