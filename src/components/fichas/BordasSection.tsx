import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Sparkles, ListTree } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { MoneyInput } from "@/components/MoneyInput";
import { requireActiveUnidadeId } from "@/hooks/useActiveUnidade";
import { getOrCreateConfiguracoesNegocio } from "@/lib/config-helpers";
import { BordaIngredientesDialog } from "@/components/fichas/BordaIngredientesDialog";
import type { Tables } from "@/integrations/supabase/types";

type Borda = Tables<"bordas">;
type SizeMap = Record<string, number>;

interface FormState {
  nome: string;
  precos: SizeMap;
}

const fmt = (v: number) =>
  Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toMap = (raw: unknown, sizes: string[]): SizeMap => {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: SizeMap = {};
  for (const s of sizes) out[s] = Number(obj[s] ?? 0) || 0;
  return out;
};

export function BordasSection() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [ingDialog, setIngDialog] = useState<Borda | null>(null);

  const { data: config } = useQuery({
    queryKey: ["configuracoes_negocio"],
    queryFn: getOrCreateConfiguracoesNegocio,
  });

  const sizes = useMemo<string[]>(() => {
    const t = (config?.tamanhos_pizza as string[] | null) ?? ["P", "M", "G"];
    return Array.isArray(t) && t.length ? t : ["P", "M", "G"];
  }, [config]);

  const emptyForm = useMemo<FormState>(
    () => ({
      nome: "",
      precos: Object.fromEntries(sizes.map((s) => [s, 0])),
    }),
    [sizes],
  );

  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: bordas = [], isLoading } = useQuery({
    queryKey: ["bordas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bordas").select("*").order("nome");
      if (error) throw error;
      return data as Borda[];
    },
  });

  const { data: ingredientesCount = {} } = useQuery({
    queryKey: ["bordas_ingredientes_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bordas_ingredientes")
        .select("borda_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: { borda_id: string }) => {
        map[r.borda_id] = (map[r.borda_id] ?? 0) + 1;
      });
      return map;
    },
  });

  const reset = () => {
    setForm(emptyForm);
    setEditingId(null);
    setOpen(false);
  };

  const upsertMut = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Informe o nome da borda");
      const payload = {
        nome: form.nome.trim(),
        precos_por_tamanho: form.precos,
      };
      if (editingId) {
        const { error } = await supabase.from("bordas").update(payload).eq("id", editingId);
        if (error) throw error;
        return null;
      } else {
        const unidade_id = requireActiveUnidadeId();
        const { data, error } = await supabase
          .from("bordas")
          .insert({ ...payload, unidade_id } as never)
          .select()
          .single();
        if (error) throw error;
        return data as Borda;
      }
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["bordas"] });
      const wasNew = !editingId;
      toast.success(wasNew ? "Borda cadastrada! Adicione os ingredientes." : "Borda atualizada!");
      reset();
      if (wasNew && created) setIngDialog(created);
    },
    onError: (e: Error) => toast.error(e.message ?? "Erro ao salvar borda"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bordas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bordas"] });
      toast.success("Borda excluída!");
    },
    onError: (e: Error) => toast.error(e.message ?? "Erro ao excluir"),
  });

  const handleEdit = (b: Borda) => {
    setForm({
      nome: b.nome,
      precos: toMap(b.precos_por_tamanho, sizes),
    });
    setEditingId(b.id);
    setOpen(true);
  };

  const sizesLabel = sizes.join(" · ");

  return (
    <div className="space-y-4 fade-up fade-up-d2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Bordas Recheadas</h2>
          <p className="text-sm text-muted-foreground">
            Preço extra cobrado por tamanho ({sizesLabel}).
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); setOpen(o); }}>
          <DialogTrigger asChild>
            <Button className="btn-action-add gap-2">
              <Plus className="h-4 w-4" /> Nova Borda
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {editingId ? "Editar borda" : "Nova borda"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="borda-nome">Nome</Label>
                <Input
                  id="borda-nome"
                  placeholder="Ex.: Catupiry, Cheddar, Chocolate"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-sm font-semibold">Preço de venda (R$)</Label>
                <div
                  className="grid gap-3 mt-1.5"
                  style={{ gridTemplateColumns: `repeat(${sizes.length}, minmax(0, 1fr))` }}
                >
                  {sizes.map((s) => (
                    <div key={`preco-${s}`}>
                      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {s}
                      </Label>
                      <MoneyInput
                        value={form.precos[s] ?? 0}
                        onChange={(v) => setForm({ ...form, precos: { ...form.precos, [s]: v } })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                O <strong>custo</strong> é calculado automaticamente a partir dos ingredientes da borda
                (insumos comprados + insumos próprios) e da quantidade em gramas/ml por tamanho.
                {!editingId && " Após cadastrar, você poderá adicionar os ingredientes."}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={reset}>Cancelar</Button>
              <Button onClick={() => upsertMut.mutate()} disabled={upsertMut.isPending}>
                {editingId ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando bordas...</p>
      ) : bordas.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nenhuma borda cadastrada"
          description={`Cadastre bordas recheadas com preço por tamanho (${sizesLabel}).`}
          actionLabel="Nova Borda"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="table-premium">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                {sizes.map((s) => (
                  <TableHead key={`h-preco-${s}`} className="text-right">Preço {s}</TableHead>
                ))}
                {sizes.map((s) => (
                  <TableHead key={`h-custo-${s}`} className="text-right">Custo {s}</TableHead>
                ))}
                <TableHead className="w-[140px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bordas.map((b) => {
                const precos = toMap(b.precos_por_tamanho, sizes);
                const custos = toMap(b.custos_por_tamanho, sizes);
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.nome}</TableCell>
                    {sizes.map((s) => (
                      <TableCell key={`p-${b.id}-${s}`} className="text-right">
                        R$ {fmt(precos[s])}
                      </TableCell>
                    ))}
                    {sizes.map((s) => (
                      <TableCell key={`c-${b.id}-${s}`} className="text-right text-muted-foreground">
                        R$ {fmt(custos[s])}
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => setIngDialog(b)}
                          title="Ingredientes"
                          className="text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                          <ListTree className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => handleEdit(b)}
                          className="text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => {
                            if (confirm(`Excluir a borda "${b.nome}"?`)) deleteMut.mutate(b.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {ingDialog && (
        <BordaIngredientesDialog
          borda={ingDialog}
          sizes={sizes}
          open={!!ingDialog}
          onOpenChange={(o) => { if (!o) setIngDialog(null); }}
        />
      )}
    </div>
  );
}
