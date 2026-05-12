import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Wallet, CreditCard, ShoppingBag, Smartphone, ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { appError } from "@/lib/error-codes";
import { requireActiveUnidadeId } from "@/hooks/useActiveUnidade";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MoneyInput, formatMoney } from "@/components/MoneyInput";
import type { DateRange } from "react-day-picker";
import type { LucideIcon } from "lucide-react";
import type { FormaPagamento } from "@/hooks/useCaixaDiario";

type FormaConfig = {
  forma: FormaPagamento;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
};

const FORMAS: FormaConfig[] = [
  { forma: "Dinheiro/PIX", icon: Wallet, colorClass: "text-success", bgClass: "bg-success/10" },
  { forma: "Débito", icon: CreditCard, colorClass: "text-info", bgClass: "bg-info/10" },
  { forma: "Crédito", icon: CreditCard, colorClass: "text-primary", bgClass: "bg-primary/10" },
  { forma: "iFood", icon: ShoppingBag, colorClass: "text-destructive", bgClass: "bg-destructive/10" },
  { forma: "Outros Apps", icon: Smartphone, colorClass: "text-orange", bgClass: "bg-orange/10" },
];

type Props = {
  taxas: Record<FormaPagamento, number>;
  onSelectDate?: (d: Date) => void;
};

export function FechamentoDiaForm({ taxas, onSelectDate }: Props) {
  const [range, setRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [valores, setValores] = useState<Record<FormaPagamento, number>>({
    "Dinheiro/PIX": 0,
    "Débito": 0,
    "Crédito": 0,
    "iFood": 0,
    "Outros Apps": 0,
  });
  const queryClient = useQueryClient();

  const { totalBruto, totalLiquido, totalTaxas } = useMemo(() => {
    let bruto = 0;
    let liquido = 0;
    FORMAS.forEach((f) => {
      const v = valores[f.forma];
      bruto += v;
      liquido += v * (1 - (taxas[f.forma] ?? 0) / 100);
    });
    return { totalBruto: bruto, totalLiquido: liquido, totalTaxas: bruto - liquido };
  }, [valores, taxas]);

  const periodoLabel = useMemo(() => {
    if (!range?.from) return "Selecionar período";
    const from = format(range.from, "dd/MM/yyyy", { locale: ptBR });
    if (!range.to || format(range.from, "yyyy-MM-dd") === format(range.to, "yyyy-MM-dd")) {
      return from;
    }
    return `${from} → ${format(range.to, "dd/MM/yyyy", { locale: ptBR })}`;
  }, [range]);

  const isIntervalo = range?.from && range?.to && format(range.from, "yyyy-MM-dd") !== format(range.to, "yyyy-MM-dd");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!range?.from) throw new Error("Selecione uma data");
      if (totalBruto <= 0) throw new Error("Informe ao menos um valor de venda");

      const dataLanc = format(range.to ?? range.from, "yyyy-MM-dd");
      const unidade_id = requireActiveUnidadeId();

      const descSuffix = isIntervalo
        ? ` (acumulado ${format(range.from, "dd/MM")}–${format(range.to!, "dd/MM")})`
        : "";

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
        descricao: `Fechamento ${f.forma}${descSuffix}`,
        valor: valores[f.forma],
        data_lancamento: dataLanc,
        pago: true,
        unidade_id,
      }));

      const { error } = await supabase.from("lancamentos_financeiros").insert(rows);
      if (error) throw error;
      return { dataLanc, count: rows.length };
    },
    onSuccess: ({ dataLanc, count }) => {
      toast.success(`${count} lançamento${count > 1 ? "s" : ""} registrado${count > 1 ? "s" : ""} em ${format(new Date(dataLanc + "T00:00:00"), "dd/MM/yyyy")}`);
      setValores({ "Dinheiro/PIX": 0, "Débito": 0, "Crédito": 0, "iFood": 0, "Outros Apps": 0 });
      onSelectDate?.(new Date(dataLanc + "T00:00:00"));
      queryClient.invalidateQueries({ queryKey: ["caixa-diario"] });
      queryClient.invalidateQueries({ queryKey: ["caixa-historico"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dre"] });
    },
    onError: (e: any) => appError("ERR-FIN-001", e),
  });

  return (
    <Card className="rounded-2xl border-primary/20 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Lançar vendas do dia
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Informe quanto foi vendido por forma de pagamento. Esses valores alimentam DRE e Ponto de Equilíbrio.
            </p>
          </div>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon size={14} />
                {periodoLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 pointer-events-auto" align="end">
              <Calendar
                mode="range"
                selected={range}
                onSelect={setRange}
                locale={ptBR}
                numberOfMonths={2}
                className="p-3 pointer-events-auto"
              />
              <div className="p-3 border-t border-border/40 text-xs text-muted-foreground">
                Selecione um único dia ou um intervalo. Lançamentos serão gravados na data final como "fechamento acumulado".
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {FORMAS.map((f) => {
            const Icon = f.icon;
            const v = valores[f.forma];
            const taxa = taxas[f.forma] ?? 0;
            const liq = v * (1 - taxa / 100);
            return (
              <div key={f.forma} className="space-y-2 p-3 rounded-lg border border-border/40 bg-muted/20 hover:border-border/70 transition-colors">
                <Label className="flex items-center gap-1.5 text-xs font-semibold">
                  <span className={cn("w-6 h-6 rounded-md flex items-center justify-center", f.bgClass, f.colorClass)}>
                    <Icon size={13} />
                  </span>
                  {f.forma}
                </Label>
                <MoneyInput value={v} onChange={(nv) => setValores((s) => ({ ...s, [f.forma]: nv }))} />
                <div className="flex items-center justify-between text-xs tabular-nums min-h-[18px]">
                  <span className="text-muted-foreground">
                    {taxa > 0 ? `Taxa ${taxa}%` : "Sem taxa"}
                  </span>
                  {taxa > 0 && v > 0 && (
                    <span className="text-success font-semibold">{formatMoney(liq)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-success/5 border border-border/40">
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total bruto</p>
              <p className="text-lg font-extrabold text-money tabular-nums">{formatMoney(totalBruto)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Taxas</p>
              <p className="text-base font-bold text-destructive tabular-nums">- {formatMoney(totalTaxas)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                Líquido
                <Link to="/financeiro/dre" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold hover:bg-primary/20 transition-colors">
                  → DRE
                </Link>
              </p>
              <p className="text-lg font-extrabold text-success tabular-nums">{formatMoney(totalLiquido)}</p>
            </div>
          </div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={totalBruto <= 0 || mutation.isPending || !range?.from}
            className="btn-action-add gap-2"
          >
            {mutation.isPending ? "Salvando..." : <>Registrar vendas <ArrowRight size={14} /></>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
