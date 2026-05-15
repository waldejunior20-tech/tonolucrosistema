import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitMerge, Check, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/components/MoneyInput";
import { PageHeader } from "@/components/layout/PageHeader";
import { InsumosCategoryTabs } from "@/components/insumos/InsumosCategoryTabs";

import { EmptyState } from "@/components/EmptyState";
import { SkeletonTable } from "@/components/SkeletonCard";
import { useActiveUnidade } from "@/hooks/useActiveUnidade";
import { cn } from "@/lib/utils";

type Canon = {
  id: string;
  nome: string;
  categoria: string | null;
  unidade: string;
  preco_atual: number;
  ultimo_fornecedor: string | null;
  ultima_compra: string | null;
  usado_em_fichas: number;
  unidade_id: string;
};

// Normaliza nome para detectar duplicados:
// - lower, sem acento, sem prefixos comuns (FLV, V), sem unidade no fim
function normalizar(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/^(flv|v|frl)\s+/i, "")
    .replace(/\s+(kg|g|ml|l|un|cx|pct|dz)\s*$/i, "")
    .replace(/\s+(salada|natural|tipo\s*\d+)$/i, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function InsumosDuplicados() {
  const { activeUnidadeId: unidadeId } = useActiveUnidade();
  const qc = useQueryClient();
  const [selecaoPrincipal, setSelecaoPrincipal] = useState<Record<string, string>>({});

  const { data: insumos = [], isLoading } = useQuery({
    queryKey: ["insumos_canonicos_dup", unidadeId],
    enabled: !!unidadeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_insumos_canonicos" as any)
        .select("*")
        .eq("unidade_id", unidadeId!);
      if (error) throw error;
      return (data ?? []) as unknown as Canon[];
    },
  });

  const { data: ignorados = [] } = useQuery({
    queryKey: ["duplicados_ignorados", unidadeId],
    enabled: !!unidadeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("duplicados_ignorados" as any)
        .select("insumo_a_id, insumo_b_id")
        .eq("unidade_id", unidadeId!);
      if (error) throw error;
      return (data ?? []) as unknown as { insumo_a_id: string; insumo_b_id: string }[];
    },
  });

  const grupos = useMemo(() => {
    const ignoradosKeys = new Set(
      ignorados.flatMap((i) => [`${i.insumo_a_id}|${i.insumo_b_id}`, `${i.insumo_b_id}|${i.insumo_a_id}`])
    );
    const map = new Map<string, Canon[]>();
    for (const ins of insumos) {
      const k = normalizar(ins.nome);
      if (!k) continue;
      const arr = map.get(k) ?? [];
      arr.push(ins);
      map.set(k, arr);
    }
    return Array.from(map.entries())
      .filter(([, arr]) => arr.length > 1)
      .map(([key, arr]) => {
        // remove grupos onde TODOS os pares estão ignorados
        const naoIgnorado = arr.some((a, i) =>
          arr.some((b, j) => i !== j && !ignoradosKeys.has(`${a.id}|${b.id}`))
        );
        return naoIgnorado ? { key, itens: arr.sort((a, b) => b.usado_em_fichas - a.usado_em_fichas) } : null;
      })
      .filter(Boolean) as { key: string; itens: Canon[] }[];
  }, [insumos, ignorados]);

  const mesclarMut = useMutation({
    mutationFn: async ({ principal, secundarios }: { principal: string; secundarios: string[] }) => {
      const { data, error } = await supabase.functions.invoke("mesclar-insumos", {
        body: { principal_id: principal, secundarios, unidade_id: unidadeId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      toast.success("Insumos mesclados com sucesso!");
      qc.invalidateQueries({ queryKey: ["insumos_canonicos_dup"] });
      qc.invalidateQueries({ queryKey: ["insumos_comprados"] });
      qc.invalidateQueries({ queryKey: ["insumos_historico"] });
    },
    onError: (e: Error) => toast.error(`Falha ao mesclar: ${e.message}`),
  });

  const ignorarMut = useMutation({
    mutationFn: async (ids: string[]) => {
      // gera todos os pares (a, b) com a < b
      const sorted = [...ids].sort();
      const rows: any[] = [];
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          rows.push({ unidade_id: unidadeId, insumo_a_id: sorted[i], insumo_b_id: sorted[j] });
        }
      }
      const { error } = await supabase.from("duplicados_ignorados" as any).insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Grupo marcado como não-duplicado.");
      qc.invalidateQueries({ queryKey: ["duplicados_ignorados"] });
    },
    onError: (e: Error) => toast.error(`Falha: ${e.message}`),
  });

  return (
    <div className="space-y-6 page-enter">
      <InsumosCategoryTabs />
      <PageHeader
        title="Revisar Duplicados"
        description="Insumos com nomes parecidos. Escolha o principal e mescle — fichas técnicas continuam funcionando."
      />

      {isLoading ? (
        <SkeletonTable rows={4} />
      ) : grupos.length === 0 ? (
        <EmptyState
          icon={GitMerge}
          title="Nenhum duplicado encontrado"
          description="Seus insumos estão organizados! Quando o sistema detectar nomes parecidos, eles aparecem aqui."
        />
      ) : (
        <div className="space-y-4 fade-up fade-up-d1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>{grupos.length} grupo{grupos.length === 1 ? "" : "s"} de possíveis duplicados</span>
          </div>

          {grupos.map(({ key, itens }) => {
            const principalId = selecaoPrincipal[key] ?? itens[0].id;
            const secundarios = itens.filter((i) => i.id !== principalId).map((i) => i.id);
            const algumComFichas = itens.some((i) => i.usado_em_fichas > 0);
            return (
              <Card key={key} className="p-5 border-border/60">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Possível duplicado: <span className="text-primary">"{key}"</span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Selecione qual insumo manter. Os outros serão mesclados nele.
                      {algumComFichas && " Fichas técnicas serão remapeadas automaticamente."}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => ignorarMut.mutate(itens.map((i) => i.id))}
                      disabled={ignorarMut.isPending}
                    >
                      <X className="h-4 w-4 mr-1" /> Não são duplicados
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => mesclarMut.mutate({ principal: principalId, secundarios })}
                      disabled={mesclarMut.isPending || secundarios.length === 0}
                    >
                      <Check className="h-4 w-4 mr-1" /> Mesclar em "{itens.find((i) => i.id === principalId)?.nome}"
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {itens.map((i) => {
                    const ehPrincipal = i.id === principalId;
                    return (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => setSelecaoPrincipal((s) => ({ ...s, [key]: i.id }))}
                        className={cn(
                          "text-left p-4 rounded-xl border-2 transition-all",
                          ehPrincipal
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border/60 bg-card hover:border-border"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="font-bold text-foreground text-sm leading-tight">{i.nome}</div>
                          {ehPrincipal && <Badge className="shrink-0">Principal</Badge>}
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Preço atual</span>
                            <span className="tabular-nums font-bold text-foreground">
                              {formatMoney(Number(i.preco_atual ?? 0))}/{i.unidade}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Último fornecedor</span>
                            <span className="text-foreground truncate ml-2 max-w-[60%]">{i.ultimo_fornecedor ?? "—"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Usado em fichas</span>
                            <span className={cn("tabular-nums font-bold", i.usado_em_fichas > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                              {i.usado_em_fichas}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
