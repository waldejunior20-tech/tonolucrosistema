import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { appError } from "@/lib/error-codes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Package, Search, AlertTriangle, Plus, Minus, Wrench, History, ArrowDown, ArrowUp, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CategoryBadge } from "@/components/CategoryBadge";
import { EmptyState } from "@/components/EmptyState";
import { useEstoque, useMovimentos, type EstoqueItem } from "@/hooks/useEstoque";
import { cn } from "@/lib/utils";

type Filtro = "todos" | "baixo" | "zerado" | "ok";
type AjusteTipo = "entrada" | "saida" | "ajuste" | "minimo";

export default function Estoque() {
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [selected, setSelected] = useState<EstoqueItem | null>(null);
  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [ajusteTipo, setAjusteTipo] = useState<AjusteTipo>("entrada");
  const [qtd, setQtd] = useState("");
  const [motivo, setMotivo] = useState("");
  const queryClient = useQueryClient();

  const { data: itens = [], isLoading } = useEstoque();

  const filtrados = useMemo(() => {
    return itens.filter((i) => {
      if (search && !i.nome.toLowerCase().includes(search.toLowerCase())) return false;
      if (filtro === "todos") return true;
      return i.status === filtro;
    });
  }, [itens, search, filtro]);

  const counts = useMemo(() => ({
    todos: itens.length,
    baixo: itens.filter((i) => i.status === "baixo").length,
    zerado: itens.filter((i) => i.status === "zerado").length,
    ok: itens.filter((i) => i.status === "ok").length,
  }), [itens]);

  const ajusteMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Insumo não selecionado");
      const quantidade = parseFloat(qtd.replace(",", "."));
      if (isNaN(quantidade) || quantidade < 0) throw new Error("Quantidade inválida");

      if (ajusteTipo === "minimo") {
        const { error } = await supabase
          .from("insumos_comprados")
          .update({ estoque_minimo: quantidade })
          .eq("id", selected.id);
        if (error) throw error;
        return;
      }

      const { error } = await (supabase as any).from("estoque_movimentos").insert({
        insumo_id: selected.id,
        tipo: ajusteTipo,
        quantidade,
        unidade: selected.unidade,
        motivo: motivo || (ajusteTipo === "entrada" ? "Entrada manual" : ajusteTipo === "saida" ? "Saída manual" : "Ajuste de inventário"),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Movimento registrado");
      setAjusteOpen(false);
      setQtd("");
      setMotivo("");
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
      queryClient.invalidateQueries({ queryKey: ["estoque-movimentos"] });
      queryClient.invalidateQueries({ queryKey: ["estoque-alertas"] });
    },
    onError: (e: any) => appError("ERR-EST-001", e),
  });

  const openAjuste = (item: EstoqueItem, tipo: AjusteTipo) => {
    setSelected(item);
    setAjusteTipo(tipo);
    setQtd(tipo === "ajuste" ? String(item.estoque_atual) : tipo === "minimo" ? String(item.estoque_minimo) : "");
    setMotivo("");
    setAjusteOpen(true);
  };

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        title="Estoque"
        description="Controle saldos, mínimos e histórico de entradas e saídas dos seus insumos."
      />

      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
          <TabsList>
            <TabsTrigger value="todos">Todos <span className="ml-1.5 text-xs opacity-60">{counts.todos}</span></TabsTrigger>
            <TabsTrigger value="zerado" className="data-[state=active]:text-destructive">
              Zerados <span className="ml-1.5 text-xs opacity-60">{counts.zerado}</span>
            </TabsTrigger>
            <TabsTrigger value="baixo" className="data-[state=active]:text-warning">
              Abaixo do mínimo <span className="ml-1.5 text-xs opacity-60">{counts.baixo}</span>
            </TabsTrigger>
            <TabsTrigger value="ok" className="data-[state=active]:text-success">
              Em ordem <span className="ml-1.5 text-xs opacity-60">{counts.ok}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar insumo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Alertas */}
      {counts.zerado + counts.baixo > 0 && filtro === "todos" && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <p className="text-sm text-foreground">
            <strong>{counts.zerado + counts.baixo}</strong> insumo(s) precisam de atenção
            ({counts.zerado} zerado{counts.zerado !== 1 ? "s" : ""}, {counts.baixo} abaixo do mínimo).
            Reabasteça o quanto antes para evitar interrupções.
          </p>
        </div>
      )}

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 text-center text-muted-foreground">Carregando...</div>
          ) : filtrados.length === 0 ? (
            <div className="py-12">
              <EmptyState
                title="Nenhum insumo encontrado"
                description={search ? "Tente outro termo de busca." : "Cadastre insumos comprados para começar a controlar o estoque."}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="uppercase text-[11px] tracking-wider">Nome</TableHead>
                  <TableHead className="uppercase text-[11px] tracking-wider">Categoria</TableHead>
                  <TableHead className="uppercase text-[11px] tracking-wider text-right">Saldo Atual</TableHead>
                  <TableHead className="uppercase text-[11px] tracking-wider text-right">Mínimo</TableHead>
                  <TableHead className="uppercase text-[11px] tracking-wider text-center">Status</TableHead>
                  <TableHead className="uppercase text-[11px] tracking-wider text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((item, idx) => (
                  <TableRow
                    key={item.id}
                    className={cn(
                      "transition-colors",
                      idx % 2 === 0 ? "bg-card" : "bg-muted/20",
                      "hover:bg-primary/5",
                    )}
                  >
                    <TableCell className="font-bold text-foreground">
                      <div className="flex items-center gap-2">
                        <Package size={14} className="text-muted-foreground" />
                        {item.nome}
                      </div>
                    </TableCell>
                    <TableCell><CategoryBadge categoria={item.categoria} /></TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {item.estoque_atual.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {item.unidade}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {item.estoque_minimo > 0
                        ? `${item.estoque_minimo.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${item.unidade}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-8 px-2 hover:bg-success/10 hover:text-success" onClick={() => openAjuste(item, "entrada")} title="Entrada">
                          <Plus size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2 hover:bg-destructive/10 hover:text-destructive" onClick={() => openAjuste(item, "saida")} title="Saída">
                          <Minus size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2 hover:bg-info/10 hover:text-info" onClick={() => openAjuste(item, "ajuste")} title="Ajustar saldo">
                          <Wrench size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2 hover:bg-warning/10 hover:text-warning" onClick={() => openAjuste(item, "minimo")} title="Definir mínimo">
                          <AlertTriangle size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setSelected(item); }} title="Histórico">
                          <History size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Histórico inline */}
      {selected && !ajusteOpen && (
        <HistoricoCard insumo={selected} onClose={() => setSelected(null)} />
      )}

      {/* Dialog de ajuste */}
      <Dialog open={ajusteOpen} onOpenChange={setAjusteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {ajusteTipo === "entrada" && "Registrar entrada"}
              {ajusteTipo === "saida" && "Registrar saída"}
              {ajusteTipo === "ajuste" && "Ajustar saldo"}
              {ajusteTipo === "minimo" && "Definir estoque mínimo"}
            </DialogTitle>
            <DialogDescription>
              {selected?.nome} · saldo atual: {selected?.estoque_atual.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {selected?.unidade}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">
                {ajusteTipo === "ajuste" ? "Saldo correto" : ajusteTipo === "minimo" ? "Estoque mínimo" : "Quantidade"} ({selected?.unidade})
              </Label>
              <Input
                type="number"
                step="0.001"
                min="0"
                value={qtd}
                onChange={(e) => setQtd(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>
            {ajusteTipo !== "minimo" && (
              <div className="space-y-2">
                <Label className="text-sm">Motivo (opcional)</Label>
                <Input
                  placeholder={ajusteTipo === "entrada" ? "Ex: Compra extra" : ajusteTipo === "saida" ? "Ex: Quebra/perda" : "Ex: Inventário mensal"}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAjusteOpen(false)}>Cancelar</Button>
            <Button onClick={() => ajusteMutation.mutate()} disabled={ajusteMutation.isPending}>
              {ajusteMutation.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: EstoqueItem["status"] }) {
  if (status === "zerado") {
    return <Badge variant="destructive" className="font-semibold">Zerado</Badge>;
  }
  if (status === "baixo") {
    return <Badge className="bg-warning text-warning-foreground hover:bg-warning/80 font-semibold">Baixo</Badge>;
  }
  return <Badge className="bg-success/15 text-success hover:bg-success/20 border border-success/30 font-semibold">OK</Badge>;
}

function HistoricoCard({ insumo, onClose }: { insumo: EstoqueItem; onClose: () => void }) {
  const { data: movs = [], isLoading } = useMovimentos(insumo.id);

  return (
    <Card className="border-primary/30">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold">Histórico — {insumo.nome}</h3>
            <p className="text-xs text-muted-foreground">Últimos 50 movimentos</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
        ) : movs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sem movimentos ainda</p>
        ) : (
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {movs.map((m) => {
              const Icon = m.tipo === "entrada" ? ArrowUp : m.tipo === "saida" ? ArrowDown : RotateCcw;
              const colorClass = m.tipo === "entrada" ? "text-success" : m.tipo === "saida" ? "text-destructive" : "text-info";
              const bgClass = m.tipo === "entrada" ? "bg-success/10" : m.tipo === "saida" ? "bg-destructive/10" : "bg-info/10";
              const sinal = m.tipo === "entrada" ? "+" : m.tipo === "saida" ? "−" : "=";
              return (
                <div key={m.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/40">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", bgClass, colorClass)}>
                    <Icon size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-foreground truncate">
                      {m.motivo ?? `${m.tipo === "entrada" ? "Entrada" : m.tipo === "saida" ? "Saída" : "Ajuste"}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(m.data_movimento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <span className={cn("text-[13px] font-bold tabular-nums", colorClass)}>
                    {sinal} {Number(m.quantidade).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {m.unidade}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
