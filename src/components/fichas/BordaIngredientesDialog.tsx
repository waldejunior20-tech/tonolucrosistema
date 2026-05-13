import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { converterQuantidade } from "@/lib/pricing-helpers";
import { requireActiveUnidadeId } from "@/hooks/useActiveUnidade";
import type { Tables } from "@/integrations/supabase/types";

type Borda = Tables<"bordas">;
type Ingrediente = Tables<"bordas_ingredientes">;
type SizeMap = Record<string, number>;

interface Props {
  borda: Borda;
  sizes: string[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

interface Linha {
  id?: string;
  tipo_insumo: "comprado" | "proprio";
  insumo_comprado_id: string | null;
  insumo_proprio_id: string | null;
  unidade: string;
  qtds: SizeMap;
}

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

export function BordaIngredientesDialog({ borda, sizes, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [linhas, setLinhas] = useState<Linha[]>([]);

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
    queryKey: ["bordas_ingredientes", borda.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bordas_ingredientes").select("*").eq("borda_id", borda.id);
      if (error) throw error;
      return (data ?? []) as Ingrediente[];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    if (existentes.length === 0) {
      setLinhas([novaLinha(sizes)]);
    } else {
      setLinhas(existentes.map((i) => ({
        id: i.id,
        tipo_insumo: i.tipo_insumo as "comprado" | "proprio",
        insumo_comprado_id: i.insumo_comprado_id,
        insumo_proprio_id: i.insumo_proprio_id,
        unidade: i.unidade,
        qtds: toMap(i.qtds_por_tamanho, sizes),
      })));
    }
  }, [open, existentes, sizes]);

  // Custo unitário por insumo
  const custoCompradoMap = useMemo(() => {
    const m = new Map<string, number>();
    comprados.forEach((ic) => {
      const q = Number(ic.quantidade);
      m.set(ic.id, q > 0 ? Number(ic.preco_pago) / q : 0);
    });
    return m;
  }, [comprados]);

  const custoProprioMap = useMemo(() => {
    const m = new Map<string, number>();
    proprios.forEach((ip) => {
      const ings = propriosIngs.filter((i) => i.insumo_proprio_id === ip.id);
      const total = ings.reduce((acc, ing) => {
        const cu = custoCompradoMap.get(ing.insumo_comprado_id ?? "") ?? 0;
        return acc + cu * converterQuantidade(Number(ing.quantidade), ing.unidade);
      }, 0);
      m.set(ip.id, Number(ip.rendimento) > 0 ? total / Number(ip.rendimento) : 0);
    });
    return m;
  }, [proprios, propriosIngs, custoCompradoMap]);

  // Custo total da borda por tamanho (auto)
  const custosPorTamanho = useMemo<SizeMap>(() => {
    const out: SizeMap = Object.fromEntries(sizes.map((s) => [s, 0]));
    linhas.forEach((l) => {
      const cu = l.tipo_insumo === "comprado"
        ? custoCompradoMap.get(l.insumo_comprado_id ?? "") ?? 0
        : custoProprioMap.get(l.insumo_proprio_id ?? "") ?? 0;
      sizes.forEach((s) => {
        out[s] += cu * converterQuantidade(Number(l.qtds[s] ?? 0), l.unidade);
      });
    });
    return out;
  }, [linhas, sizes, custoCompradoMap, custoProprioMap]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const unidade_id = requireActiveUnidadeId();

      // valida
      for (const l of linhas) {
        if (l.tipo_insumo === "comprado" && !l.insumo_comprado_id) {
          throw new Error("Selecione o insumo comprado em todas as linhas");
        }
        if (l.tipo_insumo === "proprio" && !l.insumo_proprio_id) {
          throw new Error("Selecione o insumo próprio em todas as linhas");
        }
      }

      // limpa todos e reinsere (mais simples e atômico no nível dessa borda)
      const { error: delErr } = await supabase
        .from("bordas_ingredientes").delete().eq("borda_id", borda.id);
      if (delErr) throw delErr;

      if (linhas.length > 0) {
        const payload = linhas.map((l) => ({
          borda_id: borda.id,
          tipo_insumo: l.tipo_insumo,
          insumo_comprado_id: l.tipo_insumo === "comprado" ? l.insumo_comprado_id : null,
          insumo_proprio_id: l.tipo_insumo === "proprio" ? l.insumo_proprio_id : null,
          unidade: l.unidade,
          qtds_por_tamanho: l.qtds,
          unidade_id,
        }));
        const { error: insErr } = await supabase
          .from("bordas_ingredientes").insert(payload as never);
        if (insErr) throw insErr;
      }

      // atualiza custo agregado da borda
      const { error: upErr } = await supabase
        .from("bordas")
        .update({ custos_por_tamanho: custosPorTamanho })
        .eq("id", borda.id);
      if (upErr) throw upErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bordas"] });
      qc.invalidateQueries({ queryKey: ["bordas_ingredientes", borda.id] });
      qc.invalidateQueries({ queryKey: ["bordas_ingredientes_counts"] });
      toast.success("Ingredientes salvos!");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const updateLinha = (idx: number, patch: Partial<Linha>) => {
    setLinhas((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Ingredientes da borda — {borda.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Tipo</TableHead>
                  <TableHead className="min-w-[220px]">Insumo</TableHead>
                  <TableHead className="w-[90px]">Unid.</TableHead>
                  {sizes.map((s) => (
                    <TableHead key={`h-${s}`} className="w-[90px] text-right">
                      {s}
                    </TableHead>
                  ))}
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l, idx) => (
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
                            const ic = comprados.find((c) => c.id === v);
                            updateLinha(idx, {
                              insumo_comprado_id: v,
                              unidade: ic?.unidade === "kg" ? "g" : ic?.unidade === "L" ? "ml" : (ic?.unidade ?? l.unidade),
                            });
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {comprados.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select
                          value={l.insumo_proprio_id ?? ""}
                          onValueChange={(v) => {
                            const ip = proprios.find((c) => c.id === v);
                            updateLinha(idx, {
                              insumo_proprio_id: v,
                              unidade: ip?.unidade_rendimento === "kg" ? "g" : ip?.unidade_rendimento === "L" ? "ml" : (ip?.unidade_rendimento ?? l.unidade),
                            });
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {proprios.map((c) => (
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
                        onClick={() => setLinhas((prev) => prev.filter((_, i) => i !== idx))}
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
            onClick={() => setLinhas((prev) => [...prev, novaLinha(sizes)])}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Adicionar ingrediente
          </Button>

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
                    R$ {custosPorTamanho[s].toLocaleString("pt-BR", {
                      minimumFractionDigits: 2, maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            Salvar ingredientes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
