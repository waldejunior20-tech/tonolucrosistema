import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { appError } from "@/lib/error-codes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatMoney } from "@/components/MoneyInput";
import {
  CalendarIcon, Wallet, CreditCard, Smartphone, ShoppingBag, Trash2, Lock, Unlock, CheckCircle2, ChevronRight, ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { VendaRapidaButton } from "@/components/caixa/VendaRapidaButton";
import { NovaVendaProdutoModal } from "@/components/caixa/NovaVendaProdutoModal";
import { useCaixaDiario, CATEGORIA_FECHAMENTO } from "@/hooks/useCaixaDiario";
import { useHistoricoCaixa } from "@/hooks/useHistoricoCaixa";
import { EmptyState } from "@/components/EmptyState";

const FORMAS = [
  { forma: "Dinheiro/PIX" as const, icon: Wallet, colorClass: "text-success", bgClass: "bg-success/10", ringClass: "border-success/30 hover:border-success/60" },
  { forma: "Débito" as const, icon: CreditCard, colorClass: "text-info", bgClass: "bg-info/10", ringClass: "border-info/30 hover:border-info/60" },
  { forma: "Crédito" as const, icon: CreditCard, colorClass: "text-primary", bgClass: "bg-primary/10", ringClass: "border-primary/30 hover:border-primary/60" },
  { forma: "iFood" as const, icon: ShoppingBag, colorClass: "text-destructive", bgClass: "bg-destructive/10", ringClass: "border-destructive/30 hover:border-destructive/60" },
  { forma: "Outros Apps" as const, icon: Smartphone, colorClass: "text-orange", bgClass: "bg-orange/10", ringClass: "border-orange/30 hover:border-orange/60" },
];

export default function CaixaDiario() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [confirmFechar, setConfirmFechar] = useState(false);
  const [confirmReabrir, setConfirmReabrir] = useState(false);
  const [novaVendaOpen, setNovaVendaOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    lancamentos, breakdown, totalBruto, totalLiquido, totalTaxas, totalVendas,
    isClosed, taxas, dataStr,
  } = useCaixaDiario(selectedDate);

  const { data: historico = [] } = useHistoricoCaixa(30);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lancamentos_financeiros").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Venda removida");
      queryClient.invalidateQueries({ queryKey: ["caixa-diario"] });
      queryClient.invalidateQueries({ queryKey: ["caixa-historico"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const fecharMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lancamentos_financeiros").insert({
        tipo: "receita",
        categoria: CATEGORIA_FECHAMENTO,
        descricao: `Fechamento — ${totalVendas} vendas — ${formatMoney(totalBruto)}`,
        valor: 0,
        data_lancamento: dataStr,
        pago: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Caixa fechado!");
      setConfirmFechar(false);
      queryClient.invalidateQueries({ queryKey: ["caixa-diario"] });
      queryClient.invalidateQueries({ queryKey: ["caixa-historico"] });
    },
    onError: (e: any) => appError("ERR-FIN-001", e),
  });

  const reabrirMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("lancamentos_financeiros")
        .delete()
        .eq("data_lancamento", dataStr)
        .eq("categoria", CATEGORIA_FECHAMENTO);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Caixa reaberto");
      setConfirmReabrir(false);
      queryClient.invalidateQueries({ queryKey: ["caixa-diario"] });
      queryClient.invalidateQueries({ queryKey: ["caixa-historico"] });
    },
  });

  const dateLabel = isToday(selectedDate) ? "Hoje" : format(selectedDate, "dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        title="Caixa Diário"
        description="Lance vendas em tempo real e feche o dia ao final do expediente."
      />

      {/* Date selector + status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-lg">
                <CalendarIcon size={14} />
                {dateLabel} — {format(selectedDate, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => { if (d) { setSelectedDate(d); setCalendarOpen(false); } }}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          {isClosed && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-semibold border border-success/30">
              <Lock size={12} /> Caixa fechado
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {!isClosed && (
            <Button onClick={() => setNovaVendaOpen(true)} className="gap-2">
              <ShoppingCart size={14} /> Nova venda (com produtos)
            </Button>
          )}
          {isClosed ? (
            <Button variant="outline" size="sm" onClick={() => setConfirmReabrir(true)} className="gap-2">
              <Unlock size={14} /> Reabrir caixa
            </Button>
          ) : (
            totalVendas > 0 && (
              <Button onClick={() => setConfirmFechar(true)} variant="outline" className="gap-2 border-success/40 text-success hover:bg-success/10">
                <CheckCircle2 size={14} /> Fechar caixa do dia
              </Button>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT: Quick entry */}
        <Card className="xl:col-span-2 rounded-2xl border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Lançamento rápido (só valor)</CardTitle>
            <p className="text-xs text-muted-foreground">
              {isClosed
                ? "Reabra o caixa para registrar novas vendas"
                : "Para baixar estoque automaticamente, use 'Nova venda (com produtos)' acima."}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {FORMAS.map((f) => (
                <VendaRapidaButton
                  key={f.forma}
                  forma={f.forma}
                  icon={f.icon}
                  colorClass={f.colorClass}
                  bgClass={f.bgClass}
                  ringClass={f.ringClass}
                  dataStr={dataStr}
                  taxaPct={taxas[f.forma]}
                  disabled={isClosed}
                />
              ))}
            </div>

            {/* Breakdown */}
            {totalVendas > 0 && (
              <div className="mt-6 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Resumo por forma de pagamento
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {breakdown.filter((b) => b.count > 0).map((b) => (
                    <div key={b.forma} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/40">
                      <div>
                        <p className="text-[13px] font-semibold text-foreground">{b.forma}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {b.count} venda{b.count > 1 ? "s" : ""} · taxa {b.taxaPct}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[14px] font-bold text-money tabular-nums">{formatMoney(b.bruto)}</p>
                        {b.taxaPct > 0 && (
                          <p className="text-[10px] text-success tabular-nums">líq {formatMoney(b.liquido)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="grid grid-cols-3 gap-3 mt-4 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-success/5 border border-border/40">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Bruto</p>
                    <p className="text-xl font-extrabold text-money tabular-nums">{formatMoney(totalBruto)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Taxas</p>
                    <p className="text-base font-bold text-destructive tabular-nums">- {formatMoney(totalTaxas)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Líquido</p>
                    <p className="text-xl font-extrabold text-success tabular-nums">{formatMoney(totalLiquido)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Lançamentos individuais */}
            {lancamentos.length > 0 && (
              <div className="mt-6">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Vendas individuais ({lancamentos.length})
                </p>
                <div className="max-h-[280px] overflow-y-auto space-y-1 pr-1">
                  {lancamentos.map((l) => (
                    <div key={l.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors group">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {format(new Date(l.created_at), "HH:mm")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-medium text-foreground truncate">
                            {l.categoria.replace("Vendas - ", "")}
                          </p>
                          {l.descricao && l.descricao !== `Venda ${l.categoria.replace("Vendas - ", "")}` && (
                            <p className="text-[10px] text-muted-foreground truncate">{l.descricao}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[13px] font-bold text-money tabular-nums">{formatMoney(l.valor)}</span>
                        {!isClosed && (
                          <button
                            onClick={() => deleteMutation.mutate(l.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalVendas === 0 && (
              <div className="mt-6">
                <EmptyState
                  title="Nenhuma venda registrada hoje"
                  description="Clique em uma forma de pagamento acima para lançar a primeira venda do dia."
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT: Histórico */}
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Histórico (30 dias)</CardTitle>
            <p className="text-xs text-muted-foreground">Clique em um dia para visualizar</p>
          </CardHeader>
          <CardContent>
            {historico.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum dia com vendas ainda</p>
            ) : (
              <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
                {historico.map((d) => {
                  const isSelected = d.data === dataStr;
                  const date = new Date(d.data + "T00:00:00");
                  return (
                    <button
                      key={d.data}
                      onClick={() => setSelectedDate(date)}
                      className={cn(
                        "w-full flex items-center justify-between py-2.5 px-3 rounded-lg transition-all text-left",
                        isSelected
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-muted/40 border border-transparent",
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          d.fechado ? "bg-success" : "bg-warning",
                        )} />
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-foreground">
                            {format(date, "dd/MM", { locale: ptBR })} · {format(date, "EEE", { locale: ptBR })}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {d.qtdVendas} venda{d.qtdVendas !== 1 ? "s" : ""} · {d.fechado ? "fechado" : "aberto"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[12px] font-bold text-money tabular-nums">
                          {formatMoney(d.totalBruto)}
                        </span>
                        <ChevronRight size={12} className="text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirm fechar */}
      <AlertDialog open={confirmFechar} onOpenChange={setConfirmFechar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock size={18} className="text-success" /> Fechar caixa do dia?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Você está fechando o caixa de <strong>{format(selectedDate, "dd/MM/yyyy")}</strong> com:
                </p>
                <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-foreground">
                  <p className="text-sm">📊 <strong>{totalVendas}</strong> vendas registradas</p>
                  <p className="text-sm">💰 Total bruto: <strong className="text-money">{formatMoney(totalBruto)}</strong></p>
                  <p className="text-sm">✅ Total líquido: <strong className="text-success">{formatMoney(totalLiquido)}</strong></p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Após fechar, novas vendas só poderão ser lançadas se o caixa for reaberto.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => fecharMutation.mutate()}
              className="bg-success hover:bg-success/90 text-foreground"
            >
              Fechar caixa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm reabrir */}
      <AlertDialog open={confirmReabrir} onOpenChange={setConfirmReabrir}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Unlock size={18} /> Reabrir caixa?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Isso permitirá registrar novas vendas neste dia. As vendas já registradas serão mantidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => reabrirMutation.mutate()}>Reabrir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
