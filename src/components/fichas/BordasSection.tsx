import { useState, useMemo, useEffect } from "react";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Sparkles, ListTree } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { MoneyInput } from "@/components/MoneyInput";
import { requireActiveUnidadeId } from "@/hooks/useActiveUnidade";
import { getOrCreateConfiguracoesNegocio } from "@/lib/config-helpers";
import { converterQuantidade } from "@/lib/pricing-helpers";
import { BordaIngredientesDialog } from "@/components/fichas/BordaIngredientesDialog";
import type { Tables } from "@/integrations/supabase/types";

type Borda = Tables<"bordas">;
type SizeMap = Record<string, number>;

interface Linha {
  id?: string;
  tipo_insumo: "comprado" | "proprio";
  insumo_comprado_id: string | null;
  insumo_proprio_id: string | null;
  unidade: string;
  qtds: SizeMap;
}

interface FormState {
  nome: string;
  precos: SizeMap;
  linhas: Linha[];
}

const fmt = (v: number) =>
  Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toMap = (raw: unknown, sizes: string[]): SizeMap => {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: SizeMap = {};
  for (const s of sizes) out[s] = Number(obj[s] ?? 0) || 0;
  return out;
};

const novaLinha = (sizes: string[]): Linha => ({
  tipo_insumo: "comprado",
  insumo_comprado_id: null,
  insumo_proprio_id: null,
  unidade: "g",
  qtds: Object.fromEntries(sizes.map((s) => [s, 0])),
});

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
      linhas: [novaLinha(sizes)],
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

  const { data: comprados = [] } = useQuery({
    queryKey: ["insumos_comprados"],
    queryFn: async () => {
      const { data } = await supabase.from("insumos_comprados").select("*").order("nome");
      return data ?? [];
    },
  });

  const { data: proprios = [] } = useQuery({
    queryKey: ["insumos_proprios"],
    queryFn: async () => {
      const { data } = await supabase.from("insumos_proprios").select("*").order("nome");
      return data ?? [];
    },
  });

  const { data: propriosIngs = [] } = useQuery({
    queryKey: ["insumos_proprios_ingredientes"],
    queryFn: async () => {
      const { data } = await supabase.from("insumos_proprios_ingredientes").select("*");
      return data ?? [];
    },
  });

  const { data: existentes = [] } = useQuery({
    queryKey: ["bordas_ingredientes", editingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bordas_ingredientes")
        .select("*")
        .eq("borda_id", editingId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!editingId && open,
  });

  useEffect(() => {
    if (!open || !editingId) return;
    if (existentes.length === 0) {
      setForm((prev) => ({ ...prev, linhas: [novaLinha(sizes)] }));
    } else {
      setForm((prev) => ({
        ...prev,
        linhas: existentes.map((i: any) => ({
          id: i.id,
          tipo_insumo: i.tipo_insumo as "comprado" | "proprio",
          insumo_comprado_id: i.insumo_comprado_id,
          insumo_proprio_id: i.insumo_proprio_id,
          unidade: i.unidade,
          qtds: toMap(i.qtds_por_tamanho, sizes),
        })),
      }));
    }
  }, [open, editingId, existentes, sizes]);

  const custoCompradoMap = useMemo(() => {
    const m = new Map<string, number>();
    comprados.forEach((ic: any) => {
      const q = Number(ic.quantidade);
      m.set(ic.id, q > 0 ? Number(ic.preco_pago) / q : 0);
    });
    return m;
  }, [comprados]);

  const custoProprioMap = useMemo(() => {
    const m = new Map<string, number>();
    proprios.forEach((ip: any) => {
      const ings = propriosIngs.filter((i: any) => i.insumo_proprio_id === ip.id);
      const total = ings.reduce((acc: number, ing: any) => {
        const cu = custoCompradoMap.get(ing.insumo_comprado_id ?? "") ?? 0;
        return acc + cu * converterQuantidade(Number(ing.quantidade), ing.unidade);
      }, 0);
      m.set(ip.id, Number(ip.rendimento) > 0 ? total / Number(ip.rendimento) : 0);
    });
    return m;
  }, [proprios, propriosIngs, custoCompradoMap]);

  const custosCalculados = useMemo<SizeMap>(() => {
    const out: SizeMap = Object.fromEntries(sizes.map((s) => [s, 0]));
    form.linhas.forEach((l) => {
      const cu = l.tipo_insumo === "comprado"
        ? custoCompradoMap.get(l.insumo_comprado_id ?? "") ?? 0
        : custoProprioMap.get(l.insumo_proprio_id ?? "") ?? 0;
      sizes.forEach((s) => {
        out[s] += cu * converterQuantidade(Number(l.qtds[s] ?? 0), l.unidade);
      });
    });
    return out;
  }, [form.linhas, sizes, custoCompradoMap, custoProprioMap]);

  const reset = () => {
    setForm(emptyForm);
    setEditingId(null);
    setOpen(false);
  };

  const upsertMut = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Informe o nome da borda");

      for (const l of form.linhas) {
        if (l.tipo_insumo === "comprado" && !l.insumo_comprado_id) {
          throw new Error("Selecione o insumo comprado em todas as linhas de ingredientes");
        }
        if (l.tipo_insumo === "proprio" && !l.insumo_proprio_id) {
          throw new Error("Selecione o insumo próprio em todas as linhas de ingredientes");
        }
      }

      const payload = {
        nome: form.nome.trim(),
        precos_por_tamanho: form.precos,
        custos_por_tamanho: custosCalculados,
      };

      let bordaId = editingId;

      if (editingId) {
        const { error } = await supabase.from("bordas").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const unidade_id = requireActiveUnidadeId();
        const { data, error } = await supabase
          .from("bordas")
          .insert({ ...payload, unidade_id } as never)
          .select()
          .single();
        if (error) throw error;
        bordaId = data.id;
      }

      if (!bordaId) throw new Error("Erro ao identificar borda");

      const { error: delErr } = await supabase
        .from("bordas_ingredientes")
        .delete()
        .eq("borda_id", bordaId);
      if (delErr) throw delErr;

      if (form.linhas.length > 0) {
        const unidade_id = requireActiveUnidadeId();
        const payloadIng = form.linhas.map((l) => ({
          borda_id: bordaId,
          tipo_insumo: l.tipo_insumo,
          insumo_comprado_id: l.tipo_insumo === "comprado" ? l.insumo_comprado_id : null,
          insumo_proprio_id: l.tipo_insumo === "proprio" ? l.insumo_proprio_id : null,
          unidade: l.unidade,
          qtds_por_tamanho: l.qtds,
          unidade_id,
        }));
        const { error: insErr } = await supabase
          .from("bordas_ingredientes")
          .insert(payloadIng as never);
        if (insErr) throw insErr;
      }

      return bordaId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bordas"] });
      qc.invalidateQueries({ queryKey: ["bordas_ingredientes_counts"] });
      toast.success(editingId ? "Borda e ingredientes atualizados!" : "Borda e ingredientes cadastrados!");
      reset();
    },
    onError: (e: Error) => toast.error(e.message ?? "Erro ao salvar"),
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
      linhas: [novaLinha(sizes)],
    });
    setEditingId(b.id);
    setOpen(true);
  };

  const updateLinha = (idx: number, patch: Partial<Linha>) => {
    setForm((prev) => ({
      ...prev,
      linhas: prev.linhas.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    }));
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
          <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {editingId ? "Editar borda e ingredientes" : "Nova borda + ingredientes"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Nome */}
              <div>
                <Label htmlFor="borda-nome">Nome da borda</Label>
                <Input
                  id="borda-nome"
                  placeholder="Ex.: Catupiry, Cheddar, Chocolate"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>

              {/* Preços */}
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

              {/* Ingredientes */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Ingredientes da borda</Label>
                <p className="text-xs text-muted-foreground">
                  Selecione os insumos (comprados ou produzidos) e a quantidade por tamanho.
                </p>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Tipo</TableHead>
                        <TableHead className="min-w-[220px]">Insumo</TableHead>
                        <TableHead className="w-[90px]">Unid.</TableHead>
                        {sizes.map((s) => (
                          <TableHead key={`h-${s}`} className="w-[90px] text-right">{s}</TableHead>
                        ))}
                        <TableHead className="w-[60px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.linhas.map((l, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Select
                              value={l.tipo_insumo}
                              onValueChange={(v) =>
                                updateLinha(idx, {
                                  tipo_insumo: v as "comprado" | "proprio",
                                  insumo_comprado_id: null,
                                  insumo_proprio_id: null,
                                })
                              }
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="comprado">Comprado</SelectItem>
                                <SelectItem value="proprio">Próprio</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {l.tipo_insumo === "comprado" ? (
                              <Select
                                value={l.insumo_comprado_id ?? ""}
                                onValueChange={(v) => {
                                  const ic = comprados.find((c: any) => c.id === v);
                                  updateLinha(idx, {
                                    insumo_comprado_id: v,
                                    unidade: ic?.unidade === "kg" ? "g" : ic?.unidade === "L" ? "ml" : (ic?.unidade ?? l.unidade),
                                  });
                                }}
                              >
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                  {comprados.map((c: any) => (
                                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Select
                                value={l.insumo_proprio_id ?? ""}
                                onValueChange={(v) => {
                                  const ip = proprios.find((c: any) => c.id === v);
                                  updateLinha(idx, {
                                    insumo_proprio_id: v,
                                    unidade: ip?.unidade_rendimento === "kg" ? "g" : ip?.unidade_rendimento === "L" ? "ml" : (ip?.unidade_rendimento ?? l.unidade),
                                  });
                                }}
                              >
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                  {proprios.map((c: any) => (
                                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={l.unidade}
                              onValueChange={(v) => updateLinha(idx, { unidade: v })}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="g">g</SelectItem>
                                <SelectItem value="ml">ml</SelectItem>
                                <SelectItem value="un">un</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          {sizes.map((s) => (
                            <TableCell key={`q-${idx}-${s}`}>
                              <Input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                value={l.qtds[s] ?? 0}
                                onChange={(e) =>
                                  updateLinha(idx, {
                                    qtds: { ...l.qtds, [s]: Number(e.target.value) || 0 },
                                  })
                                }
                                className="text-right"
                              />
                            </TableCell>
                          ))}
                          <TableCell>
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => setForm((prev) => ({
                                ...prev,
                                linhas: prev.linhas.filter((_, i) => i !== idx),
                              }))}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((prev) => ({
                    ...prev,
                    linhas: [...prev.linhas, novaLinha(sizes)],
                  }))}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" /> Adicionar ingrediente
                </Button>

                {/* Custo calculado */}
                <div className="rounded-md border bg-muted/40 p-3">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Custo calculado da borda
                  </Label>
                  <div
                    className="mt-2 grid gap-2"
                    style={{ gridTemplateColumns: `repeat(${sizes.length}, minmax(0, 1fr))` }}
                  >
                    {sizes.map((s) => (
                      <div key={`c-${s}`} className="rounded bg-background p-2 text-center">
                        <div className="text-[10px] uppercase text-muted-foreground">{s}</div>
                        <div className="font-mono text-sm">
                          R$ {custosCalculados[s].toLocaleString("pt-BR", {
                            minimumFractionDigits: 2, maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={reset}>Cancelar</Button>
              <Button onClick={() => upsertMut.mutate()} disabled={upsertMut.isPending}>
                {editingId ? "Salvar alterações" : "Cadastrar borda + ingredientes"}
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
                const semIngredientes = !ingredientesCount[b.id];
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{b.nome}</span>
                        {semIngredientes && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            Sem ingredientes
                          </span>
                        )}
                      </div>
                    </TableCell>
                    {sizes.map((s) => (
                      <TableCell key={`p-${b.id}-${s}`} className="text-right">
                        R$ {fmt(precos[s])}
                      </TableCell>
                    ))}
                    {sizes.map((s) => (
                      <TableCell key={`c-${b.id}-${s}`} className="text-right text-muted-foreground">
                        {semIngredientes ? "—" : `R$ ${fmt(custos[s])}`}
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant={semIngredientes ? "default" : "ghost"}
                          size="icon"
                          onClick={() => setIngDialog(b)}
                          title="Ingredientes"
                          className={semIngredientes ? "" : "text-muted-foreground hover:text-foreground hover:bg-muted"}
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
