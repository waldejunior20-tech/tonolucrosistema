import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput, formatMoney } from "@/components/MoneyInput";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CalendarIcon, Wallet, CreditCard, Smartphone, ShoppingBag, Plus, Trash2, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface VendaForm {
  dinheiro_pix: number;
  debito: number;
  credito: number;
  ifood: number;
  outros_apps: number;
  observacao: string;
}

const initialForm: VendaForm = {
  dinheiro_pix: 0,
  debito: 0,
  credito: 0,
  ifood: 0,
  outros_apps: 0,
  observacao: "",
};

export default function CaixaRapido() {
  const [form, setForm] = useState<VendaForm>(initialForm);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: undefined,
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  // Tax rates
  const { data: config } = useQuery({
    queryKey: ["config-precificacao-caixa"],
    queryFn: async () => {
      const { data } = await supabase
        .from("configuracoes_precificacao")
        .select("taxa_pix_pct, taxa_debito_pct, taxa_credito_pct, taxa_ifood_pct")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const taxaPix = config?.taxa_pix_pct ?? 0;
  const taxaDebito = config?.taxa_debito_pct ?? 1.35;
  const taxaCredito = config?.taxa_credito_pct ?? 3.15;
  const taxaIfood = config?.taxa_ifood_pct ?? 12;

  const totalForm = form.dinheiro_pix + form.debito + form.credito + form.ifood + form.outros_apps;
  const totalLiquido =
    form.dinheiro_pix * (1 - taxaPix / 100) +
    form.debito * (1 - taxaDebito / 100) +
    form.credito * (1 - taxaCredito / 100) +
    form.ifood * (1 - taxaIfood / 100) +
    form.outros_apps;
  const totalTaxas = totalForm - totalLiquido;

  // Period days
  const periodDays = useMemo(() => {
    if (!dateRange?.from) return 1;
    if (!dateRange.to) return 1;
    return eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).length;
  }, [dateRange]);

  // Period label
  const periodLabel = useMemo(() => {
    if (!dateRange?.from) return "Selecionar data";
    const fromStr = format(dateRange.from, "dd/MM", { locale: ptBR });
    if (!dateRange.to || dateRange.from.getTime() === dateRange.to.getTime()) {
      return fromStr;
    }
    return `${fromStr} → ${format(dateRange.to, "dd/MM", { locale: ptBR })}`;
  }, [dateRange]);

  // Summary of period
  const fromStr = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
  const toStr = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : fromStr;

  const { data: lancamentosPeriodo = [] } = useQuery({
    queryKey: ["lancamentos-caixa-periodo", fromStr, toStr],
    queryFn: async () => {
      const { data } = await supabase
        .from("lancamentos_financeiros")
        .select("*")
        .gte("data_lancamento", fromStr)
        .lte("data_lancamento", toStr)
        .eq("tipo", "receita")
        .order("data_lancamento", { ascending: false });
      return data ?? [];
    },
  });

  const totalPeriodo = useMemo(
    () => lancamentosPeriodo.reduce((s, l) => s + Number(l.valor), 0),
    [lancamentosPeriodo]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!dateRange?.from) throw new Error("Selecione uma data");

      const days = dateRange.to
        ? eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
        : [dateRange.from];

      const entries: any[] = [];

      for (const day of days) {
        const ds = format(day, "yyyy-MM-dd");
        const dailyDivisor = days.length;

        if (form.dinheiro_pix > 0) entries.push({ tipo: "receita", categoria: "Vendas - Dinheiro/PIX", descricao: form.observacao || "Venda Dinheiro/PIX", valor: +(form.dinheiro_pix / dailyDivisor).toFixed(2), data_lancamento: ds, pago: true });
        if (form.debito > 0) entries.push({ tipo: "receita", categoria: "Vendas - Débito", descricao: form.observacao || "Venda Débito", valor: +(form.debito / dailyDivisor).toFixed(2), data_lancamento: ds, pago: true });
        if (form.credito > 0) entries.push({ tipo: "receita", categoria: "Vendas - Crédito", descricao: form.observacao || "Venda Crédito", valor: +(form.credito / dailyDivisor).toFixed(2), data_lancamento: ds, pago: true });
        if (form.ifood > 0) entries.push({ tipo: "receita", categoria: "Vendas - iFood", descricao: form.observacao || "Venda iFood", valor: +(form.ifood / dailyDivisor).toFixed(2), data_lancamento: ds, pago: true });
        if (form.outros_apps > 0) entries.push({ tipo: "receita", categoria: "Vendas - Outros Apps", descricao: form.observacao || "Venda Outros Apps", valor: +(form.outros_apps / dailyDivisor).toFixed(2), data_lancamento: ds, pago: true });
      }

      if (entries.length === 0) throw new Error("Preencha pelo menos um valor");

      const { error } = await supabase.from("lancamentos_financeiros").insert(entries);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Vendas lançadas para ${periodDays} dia(s)!`);
      setForm(initialForm);
      queryClient.invalidateQueries({ queryKey: ["lancamentos-caixa-periodo"] });
      queryClient.invalidateQueries({ queryKey: ["lancamentos-caixa-dia"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => appError("ERR-FIN-002", e),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lancamentos_financeiros").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento removido");
      queryClient.invalidateQueries({ queryKey: ["lancamentos-caixa-periodo"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <div className="rounded-xl border border-border bg-card transition-all duration-200">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wallet size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-foreground">Lançar Vendas</h3>
            <p className="text-[10px] text-muted-foreground">Registre o caixa do dia ou período</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {totalPeriodo > 0 && (
            <span className="text-[12px] font-bold text-foreground">
              {formatMoney(totalPeriodo)} no período
            </span>
          )}
          <ChevronDown size={16} className={cn(
            "text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180"
          )} />
        </div>
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
          {/* Date range picker */}
          <div className="flex flex-wrap items-center gap-3">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 rounded-lg text-[12px]">
                  <CalendarIcon size={13} />
                  {periodLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    if (range?.to) setCalendarOpen(false);
                  }}
                  locale={ptBR}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>

            {periodDays > 1 && (
              <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                {periodDays} dias — valor será dividido por dia
              </span>
            )}
          </div>

          {/* Payment inputs — compact 2-col grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Wallet size={12} className="text-[hsl(var(--success))]" /> Dinheiro / PIX
              </Label>
              <MoneyInput value={form.dinheiro_pix} onChange={(v) => setForm(f => ({ ...f, dinheiro_pix: v }))} />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <CreditCard size={12} className="text-info" /> Débito
              </Label>
              <MoneyInput value={form.debito} onChange={(v) => setForm(f => ({ ...f, debito: v }))} />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <CreditCard size={12} className="text-primary" /> Crédito
              </Label>
              <MoneyInput value={form.credito} onChange={(v) => setForm(f => ({ ...f, credito: v }))} />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <ShoppingBag size={12} className="text-[hsl(var(--destructive))]" /> iFood
              </Label>
              <MoneyInput value={form.ifood} onChange={(v) => setForm(f => ({ ...f, ifood: v }))} />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Smartphone size={12} className="text-orange" /> Outros Apps
              </Label>
              <MoneyInput value={form.outros_apps} onChange={(v) => setForm(f => ({ ...f, outros_apps: v }))} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground">Observação</Label>
              <Input
                placeholder="Ex: Semana forte"
                value={form.observacao}
                onChange={(e) => setForm(f => ({ ...f, observacao: e.target.value }))}
                className="rounded-lg h-9 text-[12px]"
              />
            </div>
          </div>

          {/* Summary + Save */}
          {totalForm > 0 && (
            <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-muted/40 border border-border/30">
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Bruto</p>
                <p className="text-[15px] font-bold text-money">{formatMoney(totalForm)}</p>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Taxas</p>
                <p className="text-[12px] font-semibold text-[hsl(var(--destructive))]">- {formatMoney(totalTaxas)}</p>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Líquido</p>
                <p className="text-[15px] font-bold text-[hsl(var(--primary))]">{formatMoney(totalLiquido)}</p>
              </div>
              {periodDays > 1 && (
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Por dia</p>
                  <p className="text-[12px] font-semibold text-money">{formatMoney(totalForm / periodDays)}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={totalForm === 0 || saveMutation.isPending}
              className="btn-action-add"
            >
              <Plus size={14} />
              {saveMutation.isPending ? "Salvando..." : `Lançar ${periodDays > 1 ? `(${periodDays} dias)` : ""}`}
            </Button>
          </div>

          {/* Period entries */}
          {lancamentosPeriodo.length > 0 && (
            <div className="space-y-1.5 mt-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                Lançamentos do período ({lancamentosPeriodo.length})
              </p>
              <div className="max-h-[180px] overflow-y-auto space-y-1">
                {lancamentosPeriodo.map((l) => (
                  <div key={l.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {format(new Date(l.data_lancamento + "T00:00:00"), "dd/MM")}
                      </span>
                      <span className="text-[11px] text-foreground truncate">
                        {l.categoria.replace("Vendas - ", "")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-money">{formatMoney(l.valor)}</span>
                      <button
                        onClick={() => deleteMutation.mutate(l.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-[hsl(var(--destructive))] transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
