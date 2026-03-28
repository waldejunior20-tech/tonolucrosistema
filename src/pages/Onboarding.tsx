import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyInput } from "@/components/MoneyInput";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Store, DollarSign, CreditCard, ArrowRight, ArrowLeft, Check } from "lucide-react";

const STEPS = [
  { icon: Store, label: "Seu negócio" },
  { icon: DollarSign, label: "Custos fixos" },
  { icon: CreditCard, label: "Formas de pagamento" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [nome, setNome] = useState("");
  const [faturamento, setFaturamento] = useState(0);
  const [funcionarios, setFuncionarios] = useState(0);

  // Step 2
  const [aluguel, setAluguel] = useState(0);
  const [energia, setEnergia] = useState(0);
  const [salarios, setSalarios] = useState(0);
  const [internet, setInternet] = useState(0);
  const [contador, setContador] = useState(0);
  const [outrosFixos, setOutrosFixos] = useState(0);
  const totalFixos = aluguel + energia + salarios + internet + contador + outrosFixos;

  // Step 3
  const [pctPix, setPctPix] = useState(0);
  const [pctDebito, setPctDebito] = useState(0);
  const [pctCredito, setPctCredito] = useState(0);
  const [pctIfood, setPctIfood] = useState(0);
  const totalPct = pctPix + pctDebito + pctCredito + pctIfood;

  const handleFinish = async () => {
    if (Math.abs(totalPct - 100) > 1) {
      toast.error("Os percentuais de pagamento devem somar 100%");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("configuracoes_negocio" as any).insert({
        nome_estabelecimento: nome,
        faturamento_medio: faturamento,
        num_funcionarios: funcionarios,
        aluguel, energia, salarios, internet, contador,
        outros_fixos: outrosFixos,
        pct_dinheiro_pix: pctPix,
        pct_debito: pctDebito,
        pct_credito: pctCredito,
        pct_ifood: pctIfood,
        onboarding_completo: true,
      } as any);
      if (error) throw error;
      toast.success("Configuração salva com sucesso!");
      navigate("/");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const progressValue = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-lg shadow-xl border-0">
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Vamos configurar seu negócio!
            </h1>
            <p className="text-muted-foreground text-sm">Leva menos de 2 minutos</p>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < step;
              const active = i === step;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    done ? "bg-green-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={`text-xs ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
          <Progress value={progressValue} className="mb-8 h-2" />

          {/* Step 1 */}
          {step === 0 && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="space-y-2">
                <Label>Nome do estabelecimento</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Pizzaria do João"
                />
              </div>
              <div className="space-y-2">
                <Label>Faturamento médio mensal</Label>
                <MoneyInput value={faturamento} onChange={setFaturamento} />
              </div>
              <div className="space-y-2">
                <Label>Quantos funcionários?</Label>
                <Input
                  type="number"
                  min="0"
                  value={funcionarios || ""}
                  onChange={(e) => setFuncionarios(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {[
                { label: "Aluguel", value: aluguel, set: setAluguel },
                { label: "Energia elétrica", value: energia, set: setEnergia },
                { label: "Salários", value: salarios, set: setSalarios },
                { label: "Internet", value: internet, set: setInternet },
                { label: "Contador", value: contador, set: setContador },
                { label: "Outros fixos", value: outrosFixos, set: setOutrosFixos },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <Label className="w-36 text-sm shrink-0">{item.label}</Label>
                  <MoneyInput value={item.value} onChange={item.set} className="flex-1" />
                </div>
              ))}
              <div className="flex items-center gap-3 pt-3 border-t border-border">
                <span className="w-36 text-sm font-semibold text-foreground">Total</span>
                <span className="text-lg font-bold text-foreground">
                  {totalFixos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="mb-4">
                <p className="text-sm text-foreground font-medium mb-1">
                  Quanto % das suas vendas vem de cada forma de pagamento?
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  Isso nos ajuda a calcular sua taxa média mensal.
                </p>
                <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
                  Ex: 30% PIX + 30% Débito + 28% Crédito + 12% iFood = 100%
                </p>
              </div>
              {[
                { label: "Dinheiro / PIX", value: pctPix, set: setPctPix },
                { label: "Débito", value: pctDebito, set: setPctDebito },
                { label: "Crédito", value: pctCredito, set: setPctCredito },
                { label: "iFood", value: pctIfood, set: setPctIfood },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <Label className="w-36 text-sm shrink-0">{item.label}</Label>
                  <div className="flex items-center gap-1 flex-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      inputMode="decimal"
                      value={item.value || ""}
                      onChange={(e) => item.set(parseFloat(e.target.value) || 0)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-3 border-t border-border">
                <span className="w-36 text-sm font-semibold text-foreground">Total</span>
                <span className={`text-lg font-bold ${
                  Math.abs(totalPct - 100) <= 1 ? "text-green-600" : "text-destructive"
                }`}>
                  {totalPct.toFixed(0)}%
                </span>
              </div>
              {totalPct < 100 && totalPct > 0 && (
                <p className="text-sm text-amber-600">
                  Falta {(100 - totalPct).toFixed(0)}% — distribua entre as formas de pagamento
                </p>
              )}
              {totalPct > 100 && (
                <p className="text-sm text-destructive">
                  Passou {(totalPct - 100).toFixed(0)}% — reduza alguma forma de pagamento
                </p>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
            ) : <div />}

            {step < 2 ? (
              <Button onClick={() => setStep(step + 1)}>
                Próximo <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {saving ? "Salvando..." : "Começar a usar o sistema!"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
