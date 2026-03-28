import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Settings2 } from "lucide-react";
import { useState, useEffect } from "react";

interface ConfigPrecificacao {
  id: string;
  custos_fixos_pct: number;
  cmv_meta_pct: number;
  taxa_ifood_pct: number;
  taxa_debito_pct: number;
  taxa_credito_pct: number;
  taxa_pix_pct: number;
}

export default function PrecificacaoConfiguracoes() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ConfigPrecificacao | null>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ["configuracoes_precificacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_precificacao")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as ConfigPrecificacao;
    },
  });

  useEffect(() => {
    if (config && !form) setForm(config);
  }, [config, form]);

  const mutation = useMutation({
    mutationFn: async (c: ConfigPrecificacao) => {
      const { error } = await supabase
        .from("configuracoes_precificacao")
        .update({
          custos_fixos_pct: c.custos_fixos_pct,
          cmv_meta_pct: c.cmv_meta_pct,
          taxa_ifood_pct: c.taxa_ifood_pct,
          taxa_debito_pct: c.taxa_debito_pct,
          taxa_credito_pct: c.taxa_credito_pct,
          taxa_pix_pct: c.taxa_pix_pct,
        })
        .eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configuracoes_precificacao"] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: () => toast.error("Erro ao salvar configurações."),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!form) return null;

  const fields: [keyof ConfigPrecificacao, string, string][] = [
    ["custos_fixos_pct", "% Custos Fixos", "Percentual dos custos fixos sobre o faturamento"],
    ["cmv_meta_pct", "% CMV Meta", "Meta de custo da mercadoria vendida"],
    ["taxa_ifood_pct", "% Taxa iFood", "Comissão cobrada pelo iFood"],
    ["taxa_debito_pct", "% Taxa Débito", "Taxa da maquininha no débito"],
    ["taxa_credito_pct", "% Taxa Crédito", "Taxa da maquininha no crédito"],
    ["taxa_pix_pct", "% Taxa PIX", "Taxa para pagamentos via PIX"],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings2 className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações de Precificação</h1>
          <p className="text-sm text-muted-foreground">
            Parâmetros globais usados no cálculo de preços de Pizzas, Produtos e Bebidas.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parâmetros Globais</CardTitle>
          <CardDescription>
            Altere os valores abaixo para ajustar os cálculos de precificação em todo o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {fields.map(([key, label, desc]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-sm font-medium">{label}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form[key] as number}
                  onChange={(e) =>
                    setForm({ ...form, [key]: parseFloat(e.target.value) || 0 })
                  }
                  disabled={key === "taxa_pix_pct"}
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
