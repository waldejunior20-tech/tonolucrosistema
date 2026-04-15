import { useState, useEffect, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PercentInput, SmartMoneyInput } from "@/components/SmartInputs";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { appError } from "@/lib/error-codes";
import { Cog, Save, Plus, Trash2, Building2, Pizza, Radio, CreditCard, Target, ClipboardList } from "lucide-react";
import { fmt } from "@/lib/pricing-helpers";
import { getOrCreateConfiguracoesNegocio, getOrCreateConfiguracoesPrecificacao } from "@/lib/config-helpers";
import { PageHeader } from "@/components/layout/PageHeader";

// ─── Types ───────────────────────────────────────────────────────────
interface CustoFixoItem {
  descricao: string;
  valor: number;
}

const CUSTOS_FIXOS_DEFAULT: CustoFixoItem[] = [
  { descricao: "Aluguel", valor: 0 },
  { descricao: "Energia", valor: 0 },
  { descricao: "Água", valor: 0 },
  { descricao: "Internet", valor: 0 },
  { descricao: "Salários", valor: 0 },
  { descricao: "Contador", valor: 0 },
  { descricao: "DAS", valor: 0 },
  { descricao: "Outros", valor: 0 },
];

const IFOOD_PLANOS: Record<string, { label: string; taxa: number }> = {
  entrega_parceira: { label: "Entrega Parceira", taxa: 27.69 },
  basico_propria: { label: "Básico Própria", taxa: 16.69 },
};

const TAB_ITEMS = [
  { value: "negocio", label: "Meu Negócio", icon: Building2 },
  { value: "pizza", label: "Tamanhos de Pizza", icon: Pizza },
  { value: "canais", label: "Canais de Venda", icon: Radio },
  { value: "pagamento", label: "Formas de Pagamento", icon: CreditCard },
  { value: "metas", label: "Metas", icon: Target },
  { value: "custos", label: "Custos Fixos Mensais", icon: ClipboardList },
];

// ─── Component ───────────────────────────────────────────────────────
export default function Configuracoes() {
  const queryClient = useQueryClient();

  // ─── State ─────────────────────────────────────────────────────────
  const [nomeEstabelecimento, setNomeEstabelecimento] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [tamanhosPizza, setTamanhosPizza] = useState<string[]>(["P", "M", "G"]);
  const [custosFixos, setCustosFixos] = useState<CustoFixoItem[]>(CUSTOS_FIXOS_DEFAULT);
  const [faturamentoMeta, setFaturamentoMeta] = useState(0);
  const [cmvMeta, setCmvMeta] = useState(32);
  const [lucroDesejado, setLucroDesejado] = useState(15);

  // Canais
  const [ifoodAtivo, setIfoodAtivo] = useState(false);
  const [ifoodPlano, setIfoodPlano] = useState("entrega_parceira");
  const [rappiAtivo, setRappiAtivo] = useState(false);
  const [taxaRappi, setTaxaRappi] = useState(12);
  const [aiqfomeAtivo, setAiqfomeAtivo] = useState(false);
  const [taxaAiqfome, setTaxaAiqfome] = useState(12);
  const [outroAtivo, setOutroAtivo] = useState(false);
  const [outroNome, setOutroNome] = useState("");
  const [taxaOutro, setTaxaOutro] = useState(12);

  // Pagamento
  const [taxaDebito, setTaxaDebito] = useState(1.35);
  const [taxaCredito, setTaxaCredito] = useState(3.15);

  // ─── Queries ───────────────────────────────────────────────────────
  const { data: negocio, isLoading: negocioLoading } = useQuery({
    queryKey: ["configuracoes_negocio"],
    queryFn: getOrCreateConfiguracoesNegocio,
    retry: false,
  });

  const { data: precificacao, isLoading: precificacaoLoading } = useQuery({
    queryKey: ["configuracoes_precificacao"],
    queryFn: getOrCreateConfiguracoesPrecificacao,
    retry: false,
  });

  // ─── Populate form ─────────────────────────────────────────────────
  useEffect(() => {
    if (negocio) {
      setNomeEstabelecimento(negocio.nome_estabelecimento || "");
      setCidade((negocio as any).cidade || "");
      setEstado((negocio as any).estado || "");
      const tam = (negocio as any).tamanhos_pizza;
      if (Array.isArray(tam) && tam.length > 0) setTamanhosPizza(tam);
      const cf = (negocio as any).custos_fixos_detalhados;
      if (Array.isArray(cf) && cf.length > 0) setCustosFixos(cf);
      else {
        setCustosFixos([
          { descricao: "Aluguel", valor: Number(negocio.aluguel) || 0 },
          { descricao: "Energia", valor: Number(negocio.energia) || 0 },
          { descricao: "Água", valor: Number((negocio as any).agua) || 0 },
          { descricao: "Internet", valor: Number(negocio.internet) || 0 },
          { descricao: "Salários", valor: Number(negocio.salarios) || 0 },
          { descricao: "Contador", valor: Number(negocio.contador) || 0 },
          { descricao: "DAS", valor: 0 },
          { descricao: "Outros", valor: Number(negocio.outros_fixos) || 0 },
        ]);
      }
      setFaturamentoMeta(Number(negocio.faturamento_medio) || 0);
      setLucroDesejado(Number((negocio as any).lucro_desejado_pct) || 15);
    }
  }, [negocio]);

  useEffect(() => {
    if (precificacao) {
      setCmvMeta(Number(precificacao.cmv_meta_pct) || 32);
      setIfoodAtivo(!!precificacao.app_ifood_ativo);
      setIfoodPlano((precificacao as any).ifood_plano || "entrega_parceira");
      setRappiAtivo(!!precificacao.app_rappi_ativo);
      setTaxaRappi(Number(precificacao.taxa_rappi_pct) || 12);
      setAiqfomeAtivo(!!precificacao.app_aiqfome_ativo);
      setTaxaAiqfome(Number(precificacao.taxa_aiqfome_pct) || 12);
      setOutroAtivo(!!(precificacao as any).app_outro_ativo);
      setOutroNome((precificacao as any).app_outro_nome || "");
      setTaxaOutro(Number((precificacao as any).taxa_outro_pct) || 12);
      setTaxaDebito(Number(precificacao.taxa_debito_pct) || 1.35);
      setTaxaCredito(Number(precificacao.taxa_credito_pct) || 3.15);
    }
  }, [precificacao]);

  // ─── Computed ──────────────────────────────────────────────────────
  const totalCustosFixos = useMemo(
    () => custosFixos.reduce((s, c) => s + (Number(c.valor) || 0), 0),
    [custosFixos]
  );
  const pctFaturamento = useMemo(
    () => (faturamentoMeta > 0 ? (totalCustosFixos / faturamentoMeta) * 100 : 0),
    [totalCustosFixos, faturamentoMeta]
  );

  // ─── Save ──────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const [negocioRow, precificacaoRow] = await Promise.all([
        negocio ? Promise.resolve(negocio) : getOrCreateConfiguracoesNegocio(),
        precificacao ? Promise.resolve(precificacao) : getOrCreateConfiguracoesPrecificacao(),
      ]);

      const taxaIfood = IFOOD_PLANOS[ifoodPlano]?.taxa ?? 27.69;

      const { error: e1 } = await supabase
        .from("configuracoes_negocio")
        .update({
          nome_estabelecimento: nomeEstabelecimento,
          cidade,
          estado,
          tamanhos_pizza: tamanhosPizza,
          custos_fixos_detalhados: custosFixos,
          faturamento_medio: faturamentoMeta,
          lucro_desejado_pct: lucroDesejado,
          aluguel: custosFixos.find(c => c.descricao === "Aluguel")?.valor ?? 0,
          energia: custosFixos.find(c => c.descricao === "Energia")?.valor ?? 0,
          agua: custosFixos.find(c => c.descricao === "Água")?.valor ?? 0,
          internet: custosFixos.find(c => c.descricao === "Internet")?.valor ?? 0,
          salarios: custosFixos.find(c => c.descricao === "Salários")?.valor ?? 0,
          contador: custosFixos.find(c => c.descricao === "Contador")?.valor ?? 0,
          outros_fixos: custosFixos.filter(c => !["Aluguel", "Energia", "Água", "Internet", "Salários", "Contador"].includes(c.descricao)).reduce((s, c) => s + (Number(c.valor) || 0), 0),
        } as any)
        .eq("id", negocioRow.id);
      if (e1) throw e1;

      const { error: e2 } = await supabase
        .from("configuracoes_precificacao")
        .update({
          cmv_meta_pct: cmvMeta,
          custos_fixos_pct: pctFaturamento,
          app_ifood_ativo: ifoodAtivo,
          taxa_ifood_pct: taxaIfood,
          ifood_plano: ifoodPlano,
          app_rappi_ativo: rappiAtivo,
          taxa_rappi_pct: taxaRappi,
          app_aiqfome_ativo: aiqfomeAtivo,
          taxa_aiqfome_pct: taxaAiqfome,
          app_outro_ativo: outroAtivo,
          app_outro_nome: outroNome,
          taxa_outro_pct: taxaOutro,
          taxa_debito_pct: taxaDebito,
          taxa_credito_pct: taxaCredito,
        } as any)
        .eq("id", precificacaoRow.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configuracoes_negocio"] });
      queryClient.invalidateQueries({ queryKey: ["configuracoes_precificacao"] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (error: Error) => appError("ERR-CFG-001", error),
  });

  // ─── Tamanhos helpers ──────────────────────────────────────────────
  const addTamanho = () => {
    if (tamanhosPizza.length >= 6) return;
    setTamanhosPizza([...tamanhosPizza, ""]);
  };
  const removeTamanho = (idx: number) => {
    if (tamanhosPizza.length <= 1) return;
    setTamanhosPizza(tamanhosPizza.filter((_, i) => i !== idx));
  };
  const updateTamanho = (idx: number, val: string) => {
    const copy = [...tamanhosPizza];
    copy[idx] = val;
    setTamanhosPizza(copy);
  };

  // ─── Custos fixos helpers ──────────────────────────────────────────
  const addCustoFixo = () => setCustosFixos([...custosFixos, { descricao: "", valor: 0 }]);
  const removeCustoFixo = (idx: number) => setCustosFixos(custosFixos.filter((_, i) => i !== idx));
  const updateCustoFixo = (idx: number, field: keyof CustoFixoItem, val: string | number) => {
    const copy = [...custosFixos];
    copy[idx] = { ...copy[idx], [field]: val };
    setCustosFixos(copy);
  };

  // ─── Save Button Component ────────────────────────────────────────
  const SaveButton = () => (
    <div className="flex justify-center pt-6">
      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2 px-8">
        <Save className="h-4 w-4" />
        Salvar Configurações
      </Button>
    </div>
  );

  if (negocioLoading || precificacaoLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter pb-12">
      <PageHeader title="Configurações" description="Gerencie os dados do seu negócio, canais de venda e metas." />

      <Tabs defaultValue="negocio" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1.5 rounded-lg">
          {TAB_ITEMS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex items-center gap-1.5 text-xs sm:text-sm px-3 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ─── Meu Negócio ─────────────────────────────────────────── */}
        <TabsContent value="negocio">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Nome do Estabelecimento</Label>
                  <Input value={nomeEstabelecimento} onChange={e => setNomeEstabelecimento(e.target.value)} className="h-10 mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Cidade</Label>
                    <Input value={cidade} onChange={e => setCidade(e.target.value)} className="h-10 mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Estado</Label>
                    <Input value={estado} onChange={e => setEstado(e.target.value)} placeholder="SP" maxLength={2} className="h-10 mt-1 uppercase" />
                  </div>
                </div>
                <SaveButton />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Tamanhos de Pizza ────────────────────────────────────── */}
        <TabsContent value="pizza">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardContent className="pt-6 space-y-3">
                {tamanhosPizza.map((tam, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-6">{idx + 1}.</span>
                    <Input
                      value={tam}
                      onChange={e => updateTamanho(idx, e.target.value)}
                      placeholder="Ex: GG"
                      className="h-9 flex-1"
                    />
                    {tamanhosPizza.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeTamanho(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {tamanhosPizza.length < 6 && (
                  <Button size="sm" onClick={addTamanho} className="btn-action-add gap-1">
                    <Plus className="h-3.5 w-3.5" /> Adicionar tamanho
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">Mínimo 1, máximo 6 tamanhos.</p>
                <SaveButton />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Canais de Venda ──────────────────────────────────────── */}
        <TabsContent value="canais">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardContent className="pt-6 space-y-4">
                {/* Balcão — always active */}
                <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-secondary/30">
                  <div>
                    <p className="text-sm font-medium">Balcão / Instagram / WhatsApp</p>
                    <p className="text-xs text-muted-foreground">Sempre ativo — Taxa 0%</p>
                  </div>
                  <span className="text-xs font-semibold text-success">Ativo</span>
                </div>

                {/* iFood */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">iFood</p>
                    <Switch checked={ifoodAtivo} onCheckedChange={setIfoodAtivo} />
                  </div>
                  {ifoodAtivo && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Plano iFood</Label>
                      <Select value={ifoodPlano} onValueChange={setIfoodPlano}>
                        <SelectTrigger className="h-9 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(IFOOD_PLANOS).map(([key, { label, taxa }]) => (
                            <SelectItem key={key} value={key}>
                              {label} — {taxa}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Rappi */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Rappi</p>
                    <Switch checked={rappiAtivo} onCheckedChange={setRappiAtivo} />
                  </div>
                  {rappiAtivo && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Taxa (%)</Label>
                      <PercentInput value={taxaRappi} onChange={setTaxaRappi} className="h-9 mt-1 w-32" />
                    </div>
                  )}
                </div>

                {/* Aiqfome */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Aiqfome</p>
                    <Switch checked={aiqfomeAtivo} onCheckedChange={setAiqfomeAtivo} />
                  </div>
                  {aiqfomeAtivo && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Taxa (%)</Label>
                      <PercentInput value={taxaAiqfome} onChange={setTaxaAiqfome} className="h-9 mt-1 w-32" />
                    </div>
                  )}
                </div>

                {/* Outro app */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Outro App</p>
                    <Switch checked={outroAtivo} onCheckedChange={setOutroAtivo} />
                  </div>
                  {outroAtivo && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Nome do App</Label>
                        <Input value={outroNome} onChange={e => setOutroNome(e.target.value)} placeholder="Ex: 99Food" className="h-9 mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Taxa (%)</Label>
                        <PercentInput value={taxaOutro} onChange={setTaxaOutro} className="h-9 mt-1" />
                      </div>
                    </div>
                  )}
                </div>

                <SaveButton />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Formas de Pagamento ──────────────────────────────────── */}
        <TabsContent value="pagamento">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Débito (%)</Label>
                  <PercentInput value={taxaDebito} onChange={setTaxaDebito} className="h-9 mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Crédito (%)</Label>
                  <PercentInput value={taxaCredito} onChange={setTaxaCredito} className="h-9 mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">PIX (%)</Label>
                  <PercentInput value={0} onChange={() => {}} disabled className="h-9 mt-1 opacity-50" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Dinheiro (%)</Label>
                  <PercentInput value={0} onChange={() => {}} disabled className="h-9 mt-1 opacity-50" />
                </div>
                <SaveButton />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Metas ────────────────────────────────────────────────── */}
        <TabsContent value="metas">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Meta de Custo (%)</Label>
                  <PercentInput value={cmvMeta} onChange={setCmvMeta} className="h-9 mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Lucro Desejado (%)</Label>
                  <PercentInput value={lucroDesejado} onChange={setLucroDesejado} className="h-9 mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Faturamento Meta Mensal (R$)</Label>
                  <SmartMoneyInput value={faturamentoMeta} onChange={setFaturamentoMeta} className="h-9 mt-1" />
                </div>
                <SaveButton />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Custos Fixos Mensais ─────────────────────────────────── */}
        <TabsContent value="custos">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="grid grid-cols-[1fr_140px_40px] gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider px-1">
                  <span>Descrição</span>
                  <span className="text-right">Valor (R$)</span>
                  <span />
                </div>

                {custosFixos.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_140px_40px] gap-2 items-center">
                    <Input
                      value={item.descricao}
                      onChange={e => updateCustoFixo(idx, "descricao", e.target.value)}
                      placeholder="Descrição"
                      className="h-9"
                    />
                    <SmartMoneyInput
                      value={Number(item.valor) || 0}
                      onChange={(v) => updateCustoFixo(idx, "valor", v)}
                      className="h-9"
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeCustoFixo(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button size="sm" onClick={addCustoFixo} className="btn-action-add gap-1">
                  <Plus className="h-3.5 w-3.5" /> Adicionar linha
                </Button>

                <div className="border-t border-border pt-4 mt-4 space-y-2">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Total Custos Fixos</span>
                    <span className="font-mono">{fmt(totalCustosFixos)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>% do Faturamento Meta</span>
                    <span className="font-mono">{pctFaturamento.toFixed(1)}%</span>
                  </div>
                </div>

                <SaveButton />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
