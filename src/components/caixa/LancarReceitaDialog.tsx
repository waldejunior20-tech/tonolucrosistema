import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Wallet, CreditCard, ShoppingBag, Smartphone, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { appError } from "@/lib/error-codes";
import { requireActiveUnidadeId } from "@/hooks/useActiveUnidade";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MoneyInput, formatMoney } from "@/components/MoneyInput";
import type { LucideIcon } from "lucide-react";
import type { FormaPagamento } from "@/hooks/useCaixaDiario";
import { Money } from "@/components/Money";

type FormaConfig = {
  forma: FormaPagamento;
  label: string;
  icon: LucideIcon;
  accent: string;
};

const FORMAS: FormaConfig[] = [
  { forma: "Dinheiro/PIX", label: "Dinheiro / PIX", icon: Wallet, accent: "from-emerald-500 to-teal-500" },
  { forma: "Débito",       label: "Débito",         icon: CreditCard, accent: "from-sky-500 to-blue-500" },
  { forma: "Crédito",      label: "Crédito",        icon: CreditCard, accent: "from-indigo-500 to-violet-500" },
  { forma: "iFood",        label: "iFood",          icon: ShoppingBag, accent: "from-rose-500 to-red-500" },
  { forma: "Outros Apps",  label: "Outros Apps",    icon: Smartphone, accent: "from-amber-500 to-orange-500" },
];

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  taxas: Record<FormaPagamento, number>;
};

export function LancarReceitaDialog({ open, onOpenChange, taxas }: Props) {
  const [date, setDate] = useState<Date>(new Date());
  const [calOpen, setCalOpen] = useState(false);
  const [valores, setValores] = useState<Record<FormaPagamento, number>>({
    "Dinheiro/PIX": 0, "Débito": 0, "Crédito": 0, "iFood": 0, "Outros Apps": 0,
  });
  const queryClient = useQueryClient();

  const { totalBruto, totalLiquido, totalTaxas } = useMemo(() => {
    let bruto = 0, liquido = 0;
    FORMAS.forEach((f) => {
      const v = valores[f.forma];
      bruto += v;
      liquido += v * (1 - (taxas[f.forma] ?? 0) / 100);
    });
    return { totalBruto: bruto, totalLiquido: liquido, totalTaxas: bruto - liquido };
  }, [valores, taxas]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (totalBruto <= 0) throw new Error("Informe ao menos um valor de venda");
      const dataLanc = format(date, "yyyy-MM-dd");
      const unidade_id = requireActiveUnidadeId();
      const subcatPorForma: Record<FormaPagamento, string> = {
        "Dinheiro/PIX": "PIX Recebido",
        "Débito": "Vendas Balcão",
        "Crédito": "Vendas Balcão",
        "iFood": "Vendas Delivery",
        "Outros Apps": "Vendas Delivery",
      };
      const rows = FORMAS.filter((f) => valores[f.forma] > 0).map((f) => ({
        tipo: "receita",
        categoria: "Receitas",
        subcategoria: subcatPorForma[f.forma],
        classificacao_origem: "manual",
        descricao: `Fechamento ${f.forma}`,
        valor: valores[f.forma],
        data_lancamento: dataLanc,
        pago: true,
        unidade_id,
      }));
      const { error } = await supabase.from("lancamentos_financeiros").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} venda${count > 1 ? "s" : ""} registrada${count > 1 ? "s" : ""}`);
      setValores({ "Dinheiro/PIX": 0, "Débito": 0, "Crédito": 0, "iFood": 0, "Outros Apps": 0 });
      queryClient.invalidateQueries({ queryKey: ["caixa-diario"] });
      queryClient.invalidateQueries({ queryKey: ["caixa-historico"] });
      queryClient.invalidateQueries({ queryKey: ["caixa-periodo"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dre"] });
      onOpenChange(false);
    },
    onError: (e: any) => appError("ERR-FIN-001", e),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base font-semibold flex items-center justify-between gap-3">
            <span>Lançar receita</span>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs font-medium">
                  <CalendarIcon size={13} />
                  {format(date, "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="end">
                <Calendar mode="single" selected={date} onSelect={(d) => { if (d) { setDate(d); setCalOpen(false); } }} locale={ptBR} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-4 space-y-2 max-h-[55vh] overflow-y-auto">
          {FORMAS.map((f) => {
            const Icon = f.icon;
            const v = valores[f.forma];
            const taxa = taxas[f.forma] ?? 0;
            const liq = v * (1 - taxa / 100);
            return (
              <div
                key={f.forma}
                className="group relative flex items-center gap-3 rounded-xl border border-border/50 bg-card hover:border-primary/40 transition-all p-2.5 pl-3"
              >
                <div className={cn("w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shrink-0", f.accent)}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">{f.label}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {taxa > 0 ? `${taxa}%` : "0%"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <MoneyInput
                      value={v}
                      onChange={(nv) => setValores((s) => ({ ...s, [f.forma]: nv }))}
                      className="h-8 text-sm"
                    />
                    {taxa > 0 && v > 0 && (
                      <span className="text-[10px] text-success font-semibold tabular-nums whitespace-nowrap">
                        líq {<Money value={liq} />}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals + action */}
        <div className="px-5 py-4 border-t border-border/50 bg-muted/30 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Bruto</p>
              <p className="text-sm font-bold tabular-nums">{<Money value={totalBruto} />}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-warning font-semibold">Taxas</p>
              <p className="text-sm font-bold tabular-nums text-warning">- {<Money value={totalTaxas} />}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-success font-semibold">Líquido</p>
              <p className="text-sm font-bold tabular-nums text-success">{<Money value={totalLiquido} />}</p>
            </div>
          </div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={totalBruto <= 0 || mutation.isPending}
            className="w-full gap-2"
          >
            {mutation.isPending ? "Salvando..." : <>Registrar receita <ArrowRight size={14} /></>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
