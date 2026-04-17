import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { appError } from "@/lib/error-codes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/components/MoneyInput";
import { Pizza, Package, Coffee, Plus, Minus, Trash2, Search, ShoppingCart, Wallet, CreditCard, Smartphone, ShoppingBag } from "lucide-react";
import { useCardapio, type CardapioItem } from "@/hooks/useCardapio";
import { requireActiveUnidadeId } from "@/hooks/useActiveUnidade";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  dataStr: string;
  defaultForma?: FormaPagamento;
};

type FormaPagamento = "dinheiro_pix" | "debito" | "credito" | "ifood" | "outros_apps";

type CarrinhoItem = {
  key: string; // composição única
  item: CardapioItem;
  tamanho?: "P" | "M" | "G";
  quantidade: number;
  preco_unitario: number;
};

const FORMAS: { value: FormaPagamento; label: string; icon: any; color: string }[] = [
  { value: "dinheiro_pix", label: "Dinheiro / PIX", icon: Wallet, color: "text-success" },
  { value: "debito", label: "Débito", icon: CreditCard, color: "text-info" },
  { value: "credito", label: "Crédito", icon: CreditCard, color: "text-primary" },
  { value: "ifood", label: "iFood", icon: ShoppingBag, color: "text-destructive" },
  { value: "outros_apps", label: "Outros Apps", icon: Smartphone, color: "text-orange" },
];

export function NovaVendaProdutoModal({ open, onOpenChange, dataStr, defaultForma = "dinheiro_pix" }: Props) {
  const [search, setSearch] = useState("");
  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([]);
  const [forma, setForma] = useState<FormaPagamento>(defaultForma);
  const [observacao, setObservacao] = useState("");
  const queryClient = useQueryClient();

  const { data: cardapio = [] } = useCardapio();

  const filtrados = useMemo(() => {
    if (!search) return cardapio;
    const s = search.toLowerCase();
    return cardapio.filter((c) => c.nome.toLowerCase().includes(s) || c.categoria.toLowerCase().includes(s));
  }, [cardapio, search]);

  const total = useMemo(
    () => carrinho.reduce((s, c) => s + c.preco_unitario * c.quantidade, 0),
    [carrinho]
  );

  const adicionarItem = (item: CardapioItem, tamanho?: "P" | "M" | "G") => {
    const preco = item.tipo === "pizza"
      ? (tamanho === "P" ? item.preco_p : tamanho === "M" ? item.preco_m : item.preco_g) ?? 0
      : item.preco ?? 0;
    if (preco <= 0) {
      toast.error("Este item não tem preço definido");
      return;
    }
    const key = `${item.tipo}-${item.ficha_pizza_id ?? item.ficha_produto_id ?? item.insumo_bebida_id}-${tamanho ?? ""}`;
    setCarrinho((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) {
        return prev.map((c) => c.key === key ? { ...c, quantidade: c.quantidade + 1 } : c);
      }
      return [...prev, { key, item, tamanho, quantidade: 1, preco_unitario: preco }];
    });
  };

  const alterarQtd = (key: string, delta: number) => {
    setCarrinho((prev) => prev.flatMap((c) => {
      if (c.key !== key) return [c];
      const novaQtd = c.quantidade + delta;
      return novaQtd <= 0 ? [] : [{ ...c, quantidade: novaQtd }];
    }));
  };

  const removerItem = (key: string) => {
    setCarrinho((prev) => prev.filter((c) => c.key !== key));
  };

  const formaLabel = FORMAS.find((f) => f.value === forma)?.label ?? "";
  const categoriaLancamento = `Vendas - ${formaLabel}`;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (carrinho.length === 0) throw new Error("Adicione pelo menos um produto");
      const unidade_id = requireActiveUnidadeId();

      // 1) cria lançamento financeiro (mantém receita visível no Caixa Diário tradicional)
      const { data: lanc, error: lancErr } = await supabase
        .from("lancamentos_financeiros")
        .insert({
          tipo: "receita",
          categoria: categoriaLancamento,
          descricao: observacao || `Venda: ${carrinho.map((c) => `${c.quantidade}x ${c.item.nome}${c.tamanho ? ` (${c.tamanho})` : ""}`).join(", ").slice(0, 200)}`,
          valor: total,
          data_lancamento: dataStr,
          pago: true,
          unidade_id,
        })
        .select("id")
        .single();
      if (lancErr) throw lancErr;

      // 2) cria venda
      const { data: venda, error: vendaErr } = await (supabase as any)
        .from("vendas")
        .insert({
          data_venda: dataStr,
          forma_pagamento: forma,
          valor_total: total,
          observacao: observacao || null,
          lancamento_id: lanc.id,
          unidade_id,
        })
        .select("id")
        .single();
      if (vendaErr) throw vendaErr;

      // 3) cria itens (triggers fazem baixa de estoque)
      const itens = carrinho.map((c) => ({
        venda_id: venda.id,
        tipo_produto: c.item.tipo,
        ficha_pizza_id: c.item.ficha_pizza_id ?? null,
        ficha_produto_id: c.item.ficha_produto_id ?? null,
        insumo_bebida_id: c.item.insumo_bebida_id ?? null,
        tamanho_pizza: c.tamanho ?? null,
        nome_produto: c.item.nome + (c.tamanho ? ` (${c.tamanho})` : ""),
        quantidade: c.quantidade,
        preco_unitario: c.preco_unitario,
        subtotal: c.preco_unitario * c.quantidade,
        unidade_id,
      }));

      const { error: itensErr } = await (supabase as any).from("vendas_itens").insert(itens);
      if (itensErr) throw itensErr;
    },
    onSuccess: () => {
      toast.success(`Venda de ${formatMoney(total)} registrada! Estoque atualizado.`);
      setCarrinho([]);
      setObservacao("");
      setSearch("");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["caixa-diario"] });
      queryClient.invalidateQueries({ queryKey: ["caixa-historico"] });
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
      queryClient.invalidateQueries({ queryKey: ["estoque-alertas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["ranking-vendas-itens"] });
    },
    onError: (e: any) => appError("ERR-FIN-001", e),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart size={18} /> Nova venda
          </DialogTitle>
          <DialogDescription>
            Selecione os produtos vendidos. O estoque será baixado automaticamente conforme as fichas técnicas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-5 flex-1 overflow-hidden">
          {/* CARDÁPIO */}
          <div className="md:col-span-3 border-r overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {filtrados.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  {cardapio.length === 0
                    ? "Nenhum produto com preço cadastrado. Defina preços em Precificação primeiro."
                    : "Nenhum item encontrado."}
                </div>
              ) : (
                filtrados.map((item) => (
                  <CardapioRow key={`${item.tipo}-${item.ficha_pizza_id ?? item.ficha_produto_id ?? item.insumo_bebida_id}`} item={item} onAdd={adicionarItem} />
                ))
              )}
            </div>
          </div>

          {/* CARRINHO */}
          <div className="md:col-span-2 flex flex-col bg-muted/20">
            <div className="p-4 border-b">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Carrinho ({carrinho.length})
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {carrinho.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-12">
                  Adicione produtos do cardápio
                </p>
              ) : (
                carrinho.map((c) => (
                  <div key={c.key} className="flex items-start gap-2 p-2.5 rounded-lg bg-background border">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground truncate">
                        {c.item.nome}{c.tamanho && ` (${c.tamanho})`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatMoney(c.preco_unitario)} × {c.quantidade}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => alterarQtd(c.key, -1)}>
                        <Minus size={11} />
                      </Button>
                      <span className="text-[12px] font-semibold w-5 text-center tabular-nums">{c.quantidade}</span>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => alterarQtd(c.key, 1)}>
                        <Plus size={11} />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10" onClick={() => removerItem(c.key)}>
                        <Trash2 size={11} />
                      </Button>
                    </div>
                    <span className="text-[12px] font-bold text-money tabular-nums shrink-0 ml-1">
                      {formatMoney(c.preco_unitario * c.quantidade)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Footer carrinho */}
            <div className="p-4 border-t bg-background space-y-3">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Forma de pagamento
                </label>
                <Select value={forma} onValueChange={(v) => setForma(v as FormaPagamento)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAS.map((f) => {
                      const Icon = f.icon;
                      return (
                        <SelectItem key={f.value} value={f.value}>
                          <div className="flex items-center gap-2">
                            <Icon size={13} className={f.color} /> {f.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <Input
                placeholder="Observação (opcional)"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                className="h-9"
              />

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Total</span>
                <span className="text-2xl font-extrabold text-money tabular-nums">{formatMoney(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={carrinho.length === 0 || saveMutation.isPending}
            className="btn-action-add"
          >
            {saveMutation.isPending ? "Salvando..." : `Registrar venda · ${formatMoney(total)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CardapioRow({ item, onAdd }: { item: CardapioItem; onAdd: (item: CardapioItem, tamanho?: "P" | "M" | "G") => void }) {
  const Icon = item.tipo === "pizza" ? Pizza : item.tipo === "bebida" ? Coffee : Package;
  const colorClass = item.tipo === "pizza" ? "text-orange" : item.tipo === "bebida" ? "text-info" : "text-primary";
  const bgClass = item.tipo === "pizza" ? "bg-orange/10" : item.tipo === "bebida" ? "bg-info/10" : "bg-primary/10";

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border hover:border-primary/40 hover:bg-muted/30 transition-all group">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", bgClass, colorClass)}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-foreground truncate">{item.nome}</p>
        <p className="text-[10px] text-muted-foreground capitalize">{item.categoria}</p>
      </div>

      {item.tipo === "pizza" ? (
        <div className="flex gap-1">
          {(["P", "M", "G"] as const).map((t) => {
            const preco = t === "P" ? item.preco_p : t === "M" ? item.preco_m : item.preco_g;
            if (!preco || preco <= 0) return null;
            return (
              <button
                key={t}
                onClick={() => onAdd(item, t)}
                className="px-2 py-1 rounded-md text-[10px] font-bold bg-muted hover:bg-primary hover:text-primary-foreground transition-colors flex flex-col items-center"
              >
                <span>{t}</span>
                <span className="tabular-nums">{formatMoney(preco)}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <button
          onClick={() => onAdd(item)}
          className="px-3 py-1.5 rounded-md text-[11px] font-bold bg-muted hover:bg-primary hover:text-primary-foreground transition-colors tabular-nums"
        >
          {formatMoney(item.preco ?? 0)}
        </button>
      )}
    </div>
  );
}
