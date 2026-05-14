import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";

import { formatCurrency } from "@/lib/format";
import { useProductCosts } from "@/hooks/useProductCosts";
import { FichaWizard, PRODUCT_TYPES, type ProductType } from "@/components/fichas/FichaWizard";

interface Row {
  id: string;
  tipo: ProductType;
  nome: string;
  custo: number;
  precoVenda: number;
}

export default function FichasTecnicas() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const initialTab = (params.get("tab") as ProductType) || "pizza";
  const [tab, setTab] = useState<ProductType>(initialTab);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingFicha, setEditingFicha] = useState<{ id: string; tipo: ProductType } | null>(null);

  const { allProducts } = useProductCosts();

  const { data: fichasProdutos = [] } = useQuery({
    queryKey: ["fichas_tecnicas_produtos", "all-rows"],
    queryFn: async () => {
      const { data } = await supabase.from("fichas_tecnicas_produtos").select("*");
      return data ?? [];
    },
  });

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    if (tab === "pizza") {
      // Use M as reference
      const pizzas = allProducts.filter((p) => p.tipo === "pizza" && p.tamanho === "M");
      pizzas.forEach((p) => out.push({ id: p.id, tipo: "pizza", nome: p.nome, custo: p.custo, precoVenda: p.precoVenda }));
    } else {
      const filtered = (fichasProdutos as any[]).filter((f) => f.categoria === tab);
      filtered.forEach((f) => {
        const match = allProducts.find((p) => p.tipo === "produto" && p.id === f.id);
        out.push({
          id: f.id,
          tipo: tab,
          nome: f.nome,
          custo: match?.custo ?? 0,
          precoVenda: Number(f.preco_venda ?? 0),
        });
      });
    }
    return out;
  }, [tab, allProducts, fichasProdutos]);

  const deleteMutation = useMutation({
    mutationFn: async (row: Row) => {
      if (row.tipo === "pizza") {
        await supabase.from("fichas_tecnicas_pizza_ingredientes").delete().eq("ficha_id", row.id);
        const { error } = await supabase.from("fichas_tecnicas_pizza").delete().eq("id", row.id);
        if (error) throw error;
      } else {
        await supabase.from("fichas_tecnicas_produtos_ingredientes").delete().eq("ficha_id", row.id);
        const { error } = await supabase.from("fichas_tecnicas_produtos").delete().eq("id", row.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Ficha excluída");
      qc.invalidateQueries({ queryKey: ["fichas_tecnicas_pizza"] });
      qc.invalidateQueries({ queryKey: ["fichas_tecnicas_produtos"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const margemBadge = (m: number) => {
    if (m >= 40) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (m >= 15) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  const handleTabChange = (v: string) => {
    setTab(v as ProductType);
    setParams({ tab: v });
  };

  const currentTypeMeta = PRODUCT_TYPES.find((t) => t.key === tab)!;

  return (
    <div className="space-y-6 page-enter">
      <PageHeader title="Fichas Técnicas" description="Cadastre receitas e calcule lucro por produto.">
        <Button onClick={() => { setEditingFicha(null); setWizardOpen(true); }} className="gap-2">
          <Plus size={16} /> Nova Ficha
        </Button>
      </PageHeader>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-5 max-w-3xl">
          {PRODUCT_TYPES.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
              <span>{t.emoji}</span>
              <span className="hidden md:inline">{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {PRODUCT_TYPES.map((t) => (
          <TabsContent key={t.key} value={t.key} className="mt-4">
            <div className="rounded-lg border bg-card overflow-hidden">
              {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="text-5xl mb-3">{t.emoji}</div>
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    Nenhuma ficha de {t.label} cadastrada
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-4">
                    Crie sua primeira ficha técnica de {t.label.toLowerCase()} para calcular lucro e margem.
                  </p>
                  <Button onClick={() => { setEditingFicha(null); setWizardOpen(true); }} className="gap-2">
                    <Plus size={16} /> Criar primeira ficha
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NOME</TableHead>
                      <TableHead>TIPO</TableHead>
                      <TableHead className="text-right">CUSTO</TableHead>
                      <TableHead className="text-right">PREÇO VENDA</TableHead>
                      <TableHead className="text-right">LUCRO</TableHead>
                      <TableHead>MARGEM</TableHead>
                      <TableHead className="text-right">AÇÕES</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => {
                      const lucro = r.precoVenda - r.custo;
                      const margem = r.precoVenda > 0 ? (lucro / r.precoVenda) * 100 : 0;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-semibold">{r.nome}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {currentTypeMeta.emoji} {currentTypeMeta.label}
                            {r.tipo === "pizza" && <span className="text-xs ml-1">(M)</span>}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{formatCurrency(r.custo)}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{formatCurrency(r.precoVenda)}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{formatCurrency(lucro)}</TableCell>
                          <TableCell>
                            <span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-semibold ${margemBadge(margem)}`}>
                              {margem.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingFicha({ id: r.id, tipo: r.tipo });
                                setWizardOpen(true);
                              }}
                              title="Editar ficha"
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`Excluir ficha "${r.nome}"?`)) deleteMutation.mutate(r);
                              }}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <FichaWizard
        open={wizardOpen}
        onOpenChange={(o) => { setWizardOpen(o); if (!o) setEditingFicha(null); }}
        initialType={tab}
        editingFicha={editingFicha}
      />
    </div>
  );
}
