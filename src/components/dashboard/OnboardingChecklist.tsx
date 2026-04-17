import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Circle, ArrowRight, Sparkles, X, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { loadSampleData } from "@/lib/sample-data";

const DISMISS_KEY = "onboarding-checklist-dismissed";

export function OnboardingChecklist() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useOnboardingProgress();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === "1",
  );
  const [seeding, setSeeding] = useState(false);

  if (isLoading || !data || data.isComplete || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const handleLoadSample = async () => {
    setSeeding(true);
    try {
      const { inserted } = await loadSampleData();
      toast.success(`Dados de exemplo carregados! ${inserted} itens criados 🍕`);
      qc.invalidateQueries({ queryKey: ["onboarding-progress"] });
    } catch (e: any) {
      toast.error("Erro ao carregar exemplos: " + (e.message ?? "tente novamente"));
    } finally {
      setSeeding(false);
    }
  };

  const nextStep = data.steps.find((s) => !s.done);

  return (
    <div className="fade-up bg-card border border-border rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Comece por aqui
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.completedCount} de {data.steps.length} concluídos — leva poucos minutos
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1"
          aria-label="Dispensar"
        >
          <X size={16} />
        </button>
      </div>

      <Progress value={data.progress} className="mb-5 h-2" />

      <div className="space-y-2 mb-5">
        {data.steps.map((step) => {
          const isNext = step === nextStep;
          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                step.done
                  ? "bg-muted/30 border-border/40"
                  : isNext
                    ? "bg-primary/5 border-primary/30"
                    : "bg-card border-border/60"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  step.done
                    ? "bg-success text-success-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step.done ? <Check size={14} /> : <Circle size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold leading-tight ${
                    step.done
                      ? "text-muted-foreground line-through"
                      : "text-foreground"
                  }`}
                >
                  {step.label}
                </p>
                {!step.done && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                )}
              </div>
              {!step.done && isNext && (
                <Button
                  size="sm"
                  onClick={() => navigate(step.route)}
                  className="shrink-0"
                >
                  Fazer agora
                  <ArrowRight size={14} className="ml-1" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-border/60">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={seeding} className="flex-1">
              {seeding ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" />
                  Carregando…
                </>
              ) : (
                "Quero ver com dados de exemplo"
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Carregar dados de exemplo?</AlertDialogTitle>
              <AlertDialogDescription>
                Vamos inserir 5 insumos, 1 ficha de pizza completa e 1 produto de
                exemplo para você explorar o sistema. Você pode apagá-los depois
                a qualquer momento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleLoadSample}>
                Sim, carregar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-muted-foreground"
        >
          Já sei o que fazer, dispensar
        </Button>
      </div>
    </div>
  );
}
