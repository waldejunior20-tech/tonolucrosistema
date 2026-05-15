import { useState } from "react";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatMoney } from "@/components/MoneyInput";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { FinanceiroCategoryTabs } from "@/components/financeiro/FinanceiroCategoryTabs";
import { FechamentoDiaForm } from "@/components/caixa/FechamentoDiaForm";
import { useCaixaDiario } from "@/hooks/useCaixaDiario";
import { useCaixaPeriodo } from "@/hooks/useCaixaPeriodo";

export default function CaixaDiario() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [confirmFechar, setConfirmFechar] = useState(false);
  const [confirmReabrir, setConfirmReabrir] = useState(false);
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
      toast.success("🗑️ Venda removida do caixa.");
      queryClient.invalidateQueries({ queryKey: ["caixa-diario"] });
      queryClient.invalidateQueries({ queryKey: ["caixa-historico"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const fecharMutation = useMutation({
    mutationFn: async () => {
      const unidade_id = requireActiveUnidadeId();
      const { error } = await supabase.from("lancamentos_financeiros").insert({
        tipo: "receita",
        categoria: CATEGORIA_FECHAMENTO,
        descricao: `Fechamento — ${totalVendas} vendas — ${formatMoney(totalBruto)}`,
        valor: 0,
        data_lancamento: dataStr,
        pago: true,
        unidade_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("🌙 Forno apagado. Descanso merecido.");
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
      toast.success("🔥 Forno reaceso. Bora vender mais!");
      setConfirmReabrir(false);
      queryClient.invalidateQueries({ queryKey: ["caixa-diario"] });
      queryClient.invalidateQueries({ queryKey: ["caixa-historico"] });
    },
  });

  const dateLabel = isToday(selectedDate) ? "Hoje" : format(selectedDate, "dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="space-y-6 page-enter">
      <FinanceiroCategoryTabs />
      <PageHeader title="Caixa Diário" />

      {/* Hero azul — totais do dia */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 p-5 shadow-lg">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-primary-foreground/70 font-semibold">
              {dateLabel}
            </p>
            <p className="text-sm text-primary-foreground/90 font-medium">
              {totalVendas} venda{totalVendas !== 1 ? "s" : ""} registrada{totalVendas !== 1 ? "s" : ""}
            </p>
          </div>
          {isClosed && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-primary-foreground text-[11px] font-semibold">
              <Lock size={11} /> Fechado
            </span>
          )}
        </div>
        <div className="relative grid grid-cols-3 gap-3">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-primary-foreground/70 font-semibold mb-1">Bruto</p>
            <p className="num-depth-light text-[22px] sm:text-[26px] tabular-nums leading-none">{formatMoney(totalBruto)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-primary-foreground/70 font-semibold mb-1">Taxas</p>
            <p className="num-depth-light text-[18px] sm:text-[22px] tabular-nums leading-none">- {formatMoney(totalTaxas)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-primary-foreground/70 font-semibold mb-1">Líquido</p>
            <p className="num-depth-light text-[22px] sm:text-[26px] tabular-nums leading-none">{formatMoney(totalLiquido)}</p>
          </div>
        </div>
      </div>

      {/* Formulário consolidado de fechamento */}
      <FechamentoDiaForm taxas={taxas} onSelectDate={setSelectedDate} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT: Resumo do dia */}
        <Card className="xl:col-span-2 rounded-2xl border-border/60 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <CardTitle className="text-base font-semibold">Resumo do dia</CardTitle>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 rounded-lg h-8">
                      <CalendarIcon size={13} />
                      {dateLabel} · {format(selectedDate, "dd/MM/yyyy")}
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
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-semibold border border-success/30">
                    <Lock size={11} /> Fechado
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {isClosed ? (
                  <Button variant="outline" size="sm" onClick={() => setConfirmReabrir(true)} className="gap-2 h-8">
                    <Unlock size={13} /> Reabrir
                  </Button>
                ) : (
                  totalVendas > 0 && (
                    <Button onClick={() => setConfirmFechar(true)} variant="outline" size="sm" className="gap-2 h-8 border-success/40 text-success hover:bg-success/10">
                      <CheckCircle2 size={13} /> Fechar caixa
                    </Button>
                  )
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {totalVendas > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {breakdown.filter((b) => b.count > 0).map((b) => (
                    <div key={b.forma} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/40">
                      <div>
                        <p className="text-[13px] font-semibold text-foreground">{b.forma}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {b.count} lançamento{b.count > 1 ? "s" : ""} · taxa {b.taxaPct}%
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

                {/* Lançamentos individuais (apenas remoção, sem nova entrada) */}
                {lancamentos.length > 0 && (
                  <div className="mt-6">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Lançamentos do dia ({lancamentos.length})
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
                              {l.descricao && (
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
              </div>
            ) : (
              <EmptyState
                title="Nenhum fechamento lançado para esta data"
                description="Use o formulário acima para registrar o fechamento do dia."
              />
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
