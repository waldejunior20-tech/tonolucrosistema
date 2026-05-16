import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { AlertCircle, Check, Pencil, X, Sparkles, Search, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { InsumosCategoryTabs } from "@/components/insumos/InsumosCategoryTabs";

import { EmptyState } from "@/components/EmptyState";
import { SkeletonTable } from "@/components/SkeletonCard";
import { formatMoney, formatQuantidade } from "@/components/MoneyInput";
import { useActiveUnidade } from "@/hooks/useActiveUnidade";
import { cn } from "@/lib/utils";
import { Money } from "@/components/Money";

type Item = {
  id: string;
  data_compra: string;
  fornecedor: string | null;
  nome_original: string;
  insumo_id: string | null;
  quantidade: number;
  unidade_medida: string;
  preco_unitario: number;
  preco_total: number | null;
  destino: string;
  origem: string;
  confianca_classificacao: number | null;
  motivo_revisao: string | null;
  preco_medio_canonico: number | null;
  categoria_atual: string | null;
};

const DESTINOS = [
  { value: "insumo", label: "Insumo (monta ficha técnica)" },
  { value: "embalagem", label: "Embalagem" },
  { value: "financeiro", label: "Despesa financeira" },
  { value: "conta_pagar", label: "Conta a pagar" },
];

const CATEGORIAS_INSUMO = [
  "Proteínas", "Laticínios", "Hortifruti", "Secos", "Bebidas",
  "Molhos e Condimentos", "Embalagens", "Congelados", "Confeitaria",
];

const CATEGORIAS_FINANCEIRO = [
  "Combustível", "Serviços", "Manutenção", "Salários",
  "Aluguel", "Energia", "Água", "Internet", "Marketing", "Outros",
];

function ConfiancaBadge({ valor }: { valor: number | null }) {
  if (valor === null) return <Badge variant="secondary">sem regra</Badge>;
  if (valor >= 0.9) return <Badge className="bg-emerald-600">alta ({Math.round(valor * 100)}%)</Badge>;
  if (valor >= 0.7) return <Badge className="bg-amber-500">média ({Math.round(valor * 100)}%)</Badge>;
  return <Badge variant="destructive">baixa ({Math.round(valor * 100)}%)</Badge>;
}

export default function InsumosRevisar() {
  const queryClient = useQueryClient();
  const { activeUnidadeId: unidadeId } = useActiveUnidade();
  const [busca, setBusca] = useState("");
  const [tab, setTab] = useState<"classificacao" | "preco">("classificacao");
  const [editing, setEditing] = useState<Item | null>(null);
  const [destino, setDestino] = useState<string>("insumo");
  const [categoria, setCategoria] = useState<string>("");
  const [criarRegra, setCriarRegra] = useState(true);
  const [escopoRegra, setEscopoRegra] = useState<"item" | "fornecedor" | "fornecedor_item">("item");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["insumos_revisar", unidadeId],
    enabled: !!unidadeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_revisar_classificacoes" as any)
        .select("*")
        .eq("unidade_id", unidadeId!)
        .order("data_compra", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Item[];
    },
  });

  const counts = useMemo(() => {
    let preco = 0, classif = 0;
    for (const i of items) {
      if (i.motivo_revisao === "preco_suspeito") preco++;
      else classif++;
    }
    return { preco, classif };
  }, [items]);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const byTab = items.filter((i) =>
      tab === "preco"
        ? i.motivo_revisao === "preco_suspeito"
        : i.motivo_revisao !== "preco_suspeito",
    );
    if (!q) return byTab;
    return byTab.filter(
      (i) =>
        i.nome_original?.toLowerCase().includes(q) ||
        i.fornecedor?.toLowerCase().includes(q),
    );
  }, [items, busca, tab]);

  const aprovar = useMutation({
    mutationFn: async (vars: {
      id: string;
      destino: string;
      categoria: string | null;
      criarRegra: boolean;
      escopoRegra: string;
    }) => {
      const { error } = await supabase.rpc("aprovar_classificacao_item" as any, {
        p_historico_id: vars.id,
        p_destino: vars.destino,
        p_categoria: vars.categoria,
        p_subcategoria: null,
        p_criar_regra: vars.criarRegra,
        p_escopo_regra: vars.escopoRegra,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insumos_revisar"] });
      queryClient.invalidateQueries({ queryKey: ["insumos_historico"] });
      queryClient.invalidateQueries({ queryKey: ["insumos_comprados"] });
      toast.success("Classificação aprovada!");
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao aprovar"),
  });

  const ignorar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("insumos_compras_historico")
        .update({ destino: "insumo", confianca_classificacao: 1.0 } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insumos_revisar"] });
      toast.success("Item ignorado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const openCorrigir = (item: Item) => {
    setEditing(item);
    setDestino(item.destino === "revisar" ? "insumo" : item.destino);
    setCategoria(item.categoria_atual ?? "");
    setCriarRegra(true);
    setEscopoRegra("item");
  };

  const confirmar = (item: Item) => {
    aprovar.mutate({
      id: item.id,
      destino: "insumo",
      categoria: item.categoria_atual,
      criarRegra: true,
      escopoRegra: "item",
    });
  };

  const categoriasPorDestino =
    destino === "insumo" ? CATEGORIAS_INSUMO : destino === "embalagem" ? ["Embalagens"] : CATEGORIAS_FINANCEIRO;

  return (
    <div className="space-y-6 page-enter">
      <InsumosCategoryTabs />
      <PageHeader
        title="Revisar Classificações"
        description="Itens importados que precisam confirmação humana antes de virar insumo, despesa ou embalagem."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="classificacao" className="gap-2">
            <AlertCircle className="h-3.5 w-3.5" />
            Classificação
            <Badge variant="secondary" className="ml-1">{counts.classif}</Badge>
          </TabsTrigger>
          <TabsTrigger value="preco" className="gap-2">
            <ShieldAlert className="h-3.5 w-3.5" />
            Preço suspeito
            <Badge variant="secondary" className="ml-1">{counts.preco}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-[420px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por item ou fornecedor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {filtered.length} item{filtered.length === 1 ? "" : "s"} a revisar
        </span>
      </div>

      {isLoading ? (
        <SkeletonTable rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title="Nada para revisar"
          description="Todas as compras estão classificadas com confiança suficiente. Quando uma nova nota chegar com itens incertos, eles aparecerão aqui."
        />
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm fade-up fade-up-d1">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider">Data</TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider">Item (nome na nota)</TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider">Fornecedor</TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider text-right">Qtd</TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider text-right">Total</TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider">Sugestão</TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider">Confiança</TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider w-[260px]">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item, idx) => (
                <TableRow key={item.id} className={cn(idx % 2 === 0 ? "bg-card" : "bg-muted/20")}>
                  <TableCell className="tabular-nums text-muted-foreground text-xs">
                    {new Date(item.data_compra + "T00:00:00").toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="font-bold text-foreground">{item.nome_original}</TableCell>
                  <TableCell className="text-muted-foreground">{item.fornecedor ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-foreground">
                    {formatQuantidade(Number(item.quantidade), item.unidade_medida)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-foreground">
                    {<Money value={Number(item.preco_total ?? item.preco_unitario * item.quantidade)} />}
                  </TableCell>
                  <TableCell>
                    {item.motivo_revisao === "preco_suspeito" ? (
                      <div className="space-y-0.5">
                        <Badge variant="destructive" className="gap-1">
                          <ShieldAlert className="h-3 w-3" /> preço suspeito
                        </Badge>
                        {item.preco_medio_canonico && (
                          <div className="text-[11px] text-muted-foreground tabular-nums">
                            tentou {<Money value={Number(item.preco_unitario)} />} · média {<Money value={Number(item.preco_medio_canonico)} />}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <Badge variant="outline">
                          {item.destino === "revisar" ? "insumo (sugestão)" : item.destino}
                        </Badge>
                        {item.categoria_atual && (
                          <span className="ml-2 text-xs text-muted-foreground">{item.categoria_atual}</span>
                        )}
                      </>
                    )}
                  </TableCell>
                  <TableCell><ConfiancaBadge valor={item.confianca_classificacao} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 px-2 hover:bg-emerald-500/10 hover:text-emerald-600" onClick={() => confirmar(item)} title="Confirmar sugestão">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2 hover:bg-primary/10 hover:text-primary" onClick={() => openCorrigir(item)} title="Corrigir">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2 hover:bg-muted" onClick={() => ignorar.mutate(item.id)} title="Ignorar">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Para onde isso vai?</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                <div className="font-bold text-foreground">{editing.nome_original}</div>
                <div className="text-xs text-muted-foreground">
                  {editing.fornecedor ?? "sem fornecedor"} · {formatQuantidade(Number(editing.quantidade), editing.unidade_medida)} · {<Money value={Number(editing.preco_total ?? editing.preco_unitario * editing.quantidade)} />}
                </div>
              </div>

              <div>
                <Label>Destino</Label>
                <Select value={destino} onValueChange={(v) => { setDestino(v); setCategoria(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DESTINOS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Categoria</Label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categoriasPorDestino.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border border-border/60 p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <Checkbox id="rule" checked={criarRegra} onCheckedChange={(v) => setCriarRegra(!!v)} />
                  <div className="flex-1">
                    <label htmlFor="rule" className="text-sm font-semibold cursor-pointer flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Aprovar e aprender
                    </label>
                    <p className="text-xs text-muted-foreground">Próximas notas com este padrão são classificadas automaticamente.</p>
                  </div>
                </div>
                {criarRegra && (
                  <div>
                    <Label className="text-xs">Aplicar regra a:</Label>
                    <Select value={escopoRegra} onValueChange={(v: any) => setEscopoRegra(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="item">Item — qualquer fornecedor</SelectItem>
                        <SelectItem value="fornecedor">Fornecedor — qualquer item</SelectItem>
                        <SelectItem value="fornecedor_item">Fornecedor + item específico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button
              onClick={() => editing && aprovar.mutate({
                id: editing.id, destino, categoria: categoria || null, criarRegra, escopoRegra,
              })}
              disabled={aprovar.isPending}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
