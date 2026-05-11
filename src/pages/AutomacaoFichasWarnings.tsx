import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const motivoLabel: Record<string, string> = {
  ficha_incompleta_embalagem_ou_insumo: "Falta embalagem ou ingrediente real",
};

export default function AutomacaoFichasWarnings() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: warnings = [], isLoading } = useQuery({
    queryKey: ["fichas-warnings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fichas_tecnicas_warnings")
        .select("*")
        .eq("resolvido", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const pizzaIds = useMemo(
    () => warnings.filter((w) => w.tipo_ficha === "pizza").map((w) => w.ficha_tecnica_id),
    [warnings],
  );
  const produtoIds = useMemo(
    () => warnings.filter((w) => w.tipo_ficha !== "pizza").map((w) => w.ficha_tecnica_id),
    [warnings],
  );

  const { data: pizzas = [] } = useQuery({
    queryKey: ["fichas-warnings", "pizza-nomes", pizzaIds],
    queryFn: async () => {
      if (pizzaIds.length === 0) return [];
      const { data } = await supabase
        .from("fichas_tecnicas_pizza")
        .select("id, nome")
        .in("id", pizzaIds);
      return data ?? [];
    },
    enabled: pizzaIds.length > 0,
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ["fichas-warnings", "produto-nomes", produtoIds],
    queryFn: async () => {
      if (produtoIds.length === 0) return [];
      const { data } = await supabase
        .from("fichas_tecnicas_produtos")
        .select("id, nome")
        .in("id", produtoIds);
      return data ?? [];
    },
    enabled: produtoIds.length > 0,
  });

  const nomeMap = useMemo(() => {
    const m = new Map<string, string>();
    pizzas.forEach((p) => m.set(p.id, p.nome));
    produtos.forEach((p) => m.set(p.id, p.nome));
    return m;
  }, [pizzas, produtos]);

  const resolverMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fichas_tecnicas_warnings")
        .update({ resolvido: true, resolved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aviso marcado como resolvido");
      qc.invalidateQueries({ queryKey: ["fichas-warnings"] });
    },
  });

  const limparOrfaosMut = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("fichas_tecnicas_warnings")
        .update({ resolvido: true, resolved_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avisos órfãos limpos");
      qc.invalidateQueries({ queryKey: ["fichas-warnings"] });
    },
  });

  const irParaFicha = (w: typeof warnings[number]) => {
    const base = w.tipo_ficha === "pizza" ? "/fichas/pizzas" : "/fichas/sanduiches";
    navigate(`${base}?editar=${w.ficha_tecnica_id}`);
  };

  const orfaos = warnings.filter(
    (w) => (pizzaIds.length === 0 || pizzas.length > 0 || produtos.length > 0) && !nomeMap.get(w.ficha_tecnica_id),
  );
  const carregandoNomes = (pizzaIds.length > 0 && pizzas.length === 0) || (produtoIds.length > 0 && produtos.length === 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fichas Incompletas"
        description="Fichas técnicas que precisam de ajuste para o cálculo de custo funcionar corretamente."
      />

      {!carregandoNomes && orfaos.length > 0 && (
        <Card className="p-4 flex items-center justify-between gap-4 border-warning/40 bg-warning/5">
          <p className="text-sm">
            {orfaos.length} aviso(s) referem-se a fichas que não existem mais.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => limparOrfaosMut.mutate(orfaos.map((o) => o.id))}
            disabled={limparOrfaosMut.isPending}
          >
            Limpar órfãos
          </Button>
        </Card>
      )}

      {isLoading ? (
        <Card className="p-12 text-center text-muted-foreground">Carregando...</Card>
      ) : warnings.length === 0 ? (
        <Card className="p-0 overflow-hidden">
          <EmptyState
            icon={CheckCircle2}
            title="Tudo certo!"
            description="Nenhuma ficha com problema. Todas as fichas têm embalagem e ingredientes completos."
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          {warnings.map((w) => {
            const nome = nomeMap.get(w.ficha_tecnica_id);
            const orfao = !carregandoNomes && !nome;
            return (
              <Card key={w.id} className="p-4 flex items-center gap-4 flex-wrap">
                <div className="w-10 h-10 rounded-lg bg-warning/15 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-text-heading">
                    {nome ?? (orfao ? "Ficha removida" : "Carregando...")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {motivoLabel[w.motivo] ?? w.motivo} ·{" "}
                    {format(new Date(w.created_at), "dd/MM/yy HH:mm", { locale: ptBR })} ·{" "}
                    <Badge variant="outline" className="ml-1">
                      {w.tipo_ficha}
                    </Badge>
                  </p>
                </div>
                {!orfao && (
                  <Button variant="outline" size="sm" onClick={() => irParaFicha(w)}>
                    <ArrowRight size={14} className="mr-1" />
                    Abrir ficha
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => resolverMut.mutate(w.id)}
                  disabled={resolverMut.isPending}
                >
                  Marcar resolvido
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
