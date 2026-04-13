import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput, formatMoney } from "@/components/MoneyInput";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Wallet, CreditCard, Smartphone, ShoppingBag, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VendaForm {
  data: Date;
  dinheiro_pix: number;
  debito: number;
  credito: number;
  ifood: number;
  outros_apps: number;
  observacao: string;
}

const initialForm: VendaForm = {
  data: new Date(),
  dinheiro_pix: 0,
  debito: 0,
  credito: 0,
  ifood: 0,
  outros_apps: 0,
  observacao: "",
};

export default function CaixaDiario() {
  const [form, setForm] = useState<VendaForm>(initialForm);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const queryClient = useQueryClient();

  // Load pricing config for tax rates
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

  // Load today's/selected date entries
  const dataStr = format(form.data, "yyyy-MM-dd");
  const { data: lancamentosDia = [] } = useQuery({
    queryKey: ["lancamentos-caixa-dia", dataStr],
    queryFn: async () => {
      const { data } = await supabase
        .from("lancamentos_financeiros")
        .select("*")
        .eq("data_lancamento", dataStr)
        .eq("tipo", "receita")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const totalDia = useMemo(
    () => lancamentosDia.reduce((s, l) => s + Number(l.valor), 0),
    [lancamentosDia]
  );

  const totalForm = form.dinheiro_pix + form.debito + form.credito + form.ifood + form.outros_apps;

  // Calculate net values after fees
  const taxaPix = config?.taxa_pix_pct ?? 0;
  const taxaDebito = config?.taxa_debito_pct ?? 1.35;
  const taxaCredito = config?.taxa_credito_pct ?? 3.15;
  const taxaIfood = config?.taxa_ifood_pct ?? 12;

  const liquidoDinheiro = form.dinheiro_pix * (1 - taxaPix / 100);
  const liquidoDebito = form.debito * (1 - taxaDebito / 100);
  const liquidoCredito = form.credito * (1 - taxaCredito / 100);
  const liquidoIfood = form.ifood * (1 - taxaIfood / 100);
  const liquidoOutros = form.outros_apps;
  const totalLiquido = liquidoDinheiro + liquidoDebito + liquidoCredito + liquidoIfood + liquidoOutros;
  const totalTaxas = totalForm - totalLiquido;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = [];
      if (form.dinheiro_pix > 0) entries.push({ tipo: "receita", categoria: "Vendas - Dinheiro/PIX", descricao: form.observacao || "Venda Dinheiro/PIX", valor: form.dinheiro_pix, data_lancamento: dataStr, pago: true });
      if (form.debito > 0) entries.push({ tipo: "receita", categoria: "Vendas - Débito", descricao: form.observacao || "Venda Débito", valor: form.debito, data_lancamento: dataStr, pago: true });
      if (form.credito > 0) entries.push({ tipo: "receita", categoria: "Vendas - Crédito", descricao: form.observacao || "Venda Crédito", valor: form.credito, data_lancamento: dataStr, pago: true });
      if (form.ifood > 0) entries.push({ tipo: "receita", categoria: "Vendas - iFood", descricao: form.observacao || "Venda iFood", valor: form.ifood, data_lancamento: dataStr, pago: true });
      if (form.outros_apps > 0) entries.push({ tipo: "receita", categoria: "Vendas - Outros Apps", descricao: form.observacao || "Venda Outros Apps", valor: form.outros_apps, data_lancamento: dataStr, pago: true });

      if (entries.length === 0) throw new Error("Preencha pelo menos um valor");

      const { error } = await supabase.from("lancamentos_financeiros").insert(entries);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vendas do dia lançadas com sucesso!");
      setForm(initialForm);
      queryClient.invalidateQueries({ queryKey: ["lancamentos-caixa-dia"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lancamentos_financeiros").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento removido");
      queryClient.invalidateQueries({ queryKey: ["lancamentos-caixa-dia"] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#FF8C00] to-[#F27121] shadow-md">
          <Wallet size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-[#1F2937]">Caixa Diário</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Registre as vendas do dia por forma de pagamento</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <Card className="lg:col-span-2 rounded-2xl border-border/60 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-lg font-semibold">Lançar Vendas</CardTitle>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 rounded-lg">
                    <CalendarIcon size={14} />
                    {format(form.data, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={form.data}
                    onSelect={(d) => { if (d) { setForm(f => ({ ...f, data: d })); setCalendarOpen(false); } }}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Payment method inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Wallet size={14} className="text-emerald-600" />
                  Dinheiro / PIX
                </Label>
                <MoneyInput value={form.dinheiro_pix} onChange={(v) => setForm(f => ({ ...f, dinheiro_pix: v }))} />
                {form.dinheiro_pix > 0 && taxaPix > 0 && (
                  <p className="text-xs text-muted-foreground">Taxa {taxaPix}% → Líquido: {formatMoney(liquidoDinheiro)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <CreditCard size={14} className="text-blue-600" />
                  Cartão Débito
                </Label>
                <MoneyInput value={form.debito} onChange={(v) => setForm(f => ({ ...f, debito: v }))} />
                {form.debito > 0 && (
                  <p className="text-xs text-muted-foreground">Taxa {taxaDebito}% → Líquido: {formatMoney(liquidoDebito)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <CreditCard size={14} className="text-purple-600" />
                  Cartão Crédito
                </Label>
                <MoneyInput value={form.credito} onChange={(v) => setForm(f => ({ ...f, credito: v }))} />
                {form.credito > 0 && (
                  <p className="text-xs text-muted-foreground">Taxa {taxaCredito}% → Líquido: {formatMoney(liquidoCredito)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <ShoppingBag size={14} className="text-red-500" />
                  iFood
                </Label>
                <MoneyInput value={form.ifood} onChange={(v) => setForm(f => ({ ...f, ifood: v }))} />
                {form.ifood > 0 && (
                  <p className="text-xs text-muted-foreground">Taxa {taxaIfood}% → Líquido: {formatMoney(liquidoIfood)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Smartphone size={14} className="text-orange-500" />
                  Outros Apps
                </Label>
                <MoneyInput value={form.outros_apps} onChange={(v) => setForm(f => ({ ...f, outros_apps: v }))} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Observação</Label>
                <Input
                  placeholder="Ex: Movimento de sábado"
                  value={form.observacao}
                  onChange={(e) => setForm(f => ({ ...f, observacao: e.target.value }))}
                  className="rounded-lg"
                />
              </div>
            </div>

            {/* Summary bar */}
            {totalForm > 0 && (
              <div className="flex flex-wrap items-center gap-5 p-5 rounded-xl bg-muted/50 border border-border/40">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Bruto</p>
                  <p className="text-xl font-extrabold text-foreground">{formatMoney(totalForm)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Taxas</p>
                  <p className="text-base font-bold text-destructive">- {formatMoney(totalTaxas)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Líquido</p>
                  <p className="text-xl font-extrabold text-[#10B981]">{formatMoney(totalLiquido)}</p>
                </div>
              </div>
            )}

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={totalForm === 0 || saveMutation.isPending}
              className="btn-action-add w-full sm:w-auto"
            >
              <Plus size={16} />
              {saveMutation.isPending ? "Salvando..." : "Lançar Vendas do Dia"}
            </Button>
          </CardContent>
        </Card>

        {/* Right: Day summary */}
        <Card className="rounded-2xl border-border/60 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Resumo — {format(form.data, "dd 'de' MMMM", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lancamentosDia.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda lançada neste dia</p>
            ) : (
              <>
                <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-[#FF8C00]/10 to-[#F27121]/10 border border-[#FF8C00]/20 text-center">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total do Dia</p>
                  <p className="text-2xl font-extrabold text-[#FF8C00]">{formatMoney(totalDia)}</p>
                </div>
                <Table>
                  <TableHeader style={{ background: 'linear-gradient(135deg, #1E293B, #334155)' }}>
                    <TableRow>
                      <TableHead className="text-xs text-white font-bold">Categoria</TableHead>
                      <TableHead className="text-xs text-right text-white font-bold">Valor</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lancamentosDia.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs py-2">{l.categoria.replace("Vendas - ", "")}</TableCell>
                        <TableCell className="text-xs text-right font-medium py-2">{formatMoney(l.valor)}</TableCell>
                        <TableCell className="py-2">
                          <button
                            onClick={() => deleteMutation.mutate(l.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
