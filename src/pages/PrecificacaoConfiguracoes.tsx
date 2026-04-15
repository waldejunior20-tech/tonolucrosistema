import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PercentInput } from "@/components/SmartInputs";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { appError } from "@/lib/error-codes";
import { Save } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useState, useEffect } from "react";
import { type ConfigPrecificacao } from "@/lib/pricing-helpers";
import { getOrCreateConfiguracoesPrecificacao } from "@/lib/config-helpers";

export default function PrecificacaoConfiguracoes() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ConfigPrecificacao | null>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ["configuracoes_precificacao"],
    queryFn: getOrCreateConfiguracoesPrecificacao,
    retry: false,
  });

  useEffect(() => {
    if (config && !form) setForm(config);
  }, [config, form]);

  const mutation = useMutation({
    mutationFn: async (c: ConfigPrecificacao) => {
      const configRow = c.id ? c : await getOrCreateConfiguracoesPrecificacao();
      const { error } = await supabase
        .from("configuracoes_precificacao")
        .update({
          custos_fixos_pct: c.custos_fixos_pct,
          cmv_meta_pct: c.cmv_meta_pct,
          taxa_ifood_pct: c.taxa_ifood_pct,
          taxa_debito_pct: c.taxa_debito_pct,
          taxa_credito_pct: c.taxa_credito_pct,
          taxa_pix_pct: c.taxa_pix_pct,
          app_ifood_ativo: c.app_ifood_ativo,
          app_rappi_ativo: c.app_rappi_ativo,
          app_aiqfome_ativo: c.app_aiqfome_ativo,
          taxa_rappi_pct: c.taxa_rappi_pct,
          taxa_aiqfome_pct: c.taxa_aiqfome_pct,
        })
        .eq("id", configRow.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configuracoes_precificacao"] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (error: Error) => appError("ERR-CFG-002", error),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!form) return null;

  const percentFields: [keyof ConfigPrecificacao, string, string][] = [
    ["custos_fixos_pct", "% Custos Fixos", "Percentual dos custos fixos sobre o faturamento"],
    ["cmv_meta_pct", "% CMV Meta", "Meta de custo da mercadoria vendida"],
    ["taxa_debito_pct", "% Taxa Débito", "Taxa da maquininha no débito"],
    ["taxa_credito_pct", "% Taxa Crédito", "Taxa da maquininha no crédito"],
    ["taxa_pix_pct", "% Taxa PIX", "Taxa para pagamentos via PIX"],
  ];

  const appFields: { activeKey: keyof ConfigPrecificacao; taxaKey: keyof ConfigPrecificacao; label: string }[] = [
    { activeKey: "app_ifood_ativo", taxaKey: "taxa_ifood_pct", label: "iFood" },
    { activeKey: "app_rappi_ativo", taxaKey: "taxa_rappi_pct", label: "Rappi" },
    { activeKey: "app_aiqfome_ativo", taxaKey: "taxa_aiqfome_pct", label: "Aiqfome" },
  ];

  return (
    <div className="space-y-6 page-enter">
      <PageHeader title="Configurações de Precificação" description="Parâmetros globais usados no cálculo de preços de Pizzas, Produtos e Bebidas." />

      <Card>
        <CardHeader>
          <CardTitle>Parâmetros Globais</CardTitle>
          <CardDescription>
            Altere os valores abaixo para ajustar os cálculos de precificação em todo o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {percentFields.map(([key, label, desc]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-sm font-medium">{label}</Label>
                <PercentInput
                  value={form[key] as number}
                  onChange={(v) => setForm({ ...form, [key]: v })}
                  disabled={key === "taxa_pix_pct"}
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Apps de Delivery</CardTitle>
          <CardDescription>
            Ative os apps que você usa. As telas de precificação mostrarão automaticamente o preço sugerido para cada app ativo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {appFields.map(({ activeKey, taxaKey, label }) => (
              <div key={activeKey} className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{label}</Label>
                  <Switch
                    checked={form[activeKey] as boolean}
                    onCheckedChange={(checked) => setForm({ ...form, [activeKey]: checked })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Taxa (%)</Label>
                  <PercentInput
                    value={form[taxaKey] as number}
                    onChange={(v) => setForm({ ...form, [taxaKey]: v })}
                    disabled={!(form[activeKey] as boolean)}
                    className="h-9"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
