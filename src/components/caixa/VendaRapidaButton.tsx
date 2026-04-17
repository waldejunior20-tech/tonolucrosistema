import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { appError } from "@/lib/error-codes";
import { requireActiveUnidadeId } from "@/hooks/useActiveUnidade";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput, formatMoney } from "@/components/MoneyInput";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  forma: "Dinheiro/PIX" | "Débito" | "Crédito" | "iFood" | "Outros Apps";
  icon: LucideIcon;
  colorClass: string; // tailwind text color e.g. "text-success"
  bgClass: string;    // tailwind bg color e.g. "bg-success/10"
  ringClass: string;  // ring color
  dataStr: string;    // yyyy-MM-dd
  taxaPct: number;
  disabled?: boolean;
};

export function VendaRapidaButton({
  forma, icon: Icon, colorClass, bgClass, ringClass, dataStr, taxaPct, disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(0);
  const [descricao, setDescricao] = useState("");
  const queryClient = useQueryClient();

  const liquido = valor * (1 - taxaPct / 100);

  const mutation = useMutation({
    mutationFn: async () => {
      if (valor <= 0) throw new Error("Informe o valor da venda");
      const unidade_id = requireActiveUnidadeId();
      const { error } = await supabase.from("lancamentos_financeiros").insert({
        tipo: "receita",
        categoria: `Vendas - ${forma}`,
        descricao: descricao || `Venda ${forma}`,
        valor,
        data_lancamento: dataStr,
        pago: true,
        unidade_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Venda de ${formatMoney(valor)} registrada!`);
      setValor(0);
      setDescricao("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["caixa-diario"] });
      queryClient.invalidateQueries({ queryKey: ["caixa-historico"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => appError("ERR-FIN-001", e),
  });

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "group relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all",
          "hover:scale-[1.03] hover:shadow-lg active:scale-[0.98]",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
          bgClass, ringClass,
        )}
      >
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-background shadow-sm", colorClass)}>
          <Icon size={20} />
        </div>
        <div className="text-center">
          <p className={cn("text-[13px] font-semibold leading-tight", colorClass)}>{forma}</p>
          {taxaPct > 0 && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Taxa {taxaPct}%</p>
          )}
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", bgClass, colorClass)}>
                <Icon size={16} />
              </div>
              Venda — {forma}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Valor da venda</Label>
              <MoneyInput value={valor} onChange={setValor} />
              {valor > 0 && taxaPct > 0 && (
                <p className="text-xs text-muted-foreground">
                  Taxa {taxaPct}% → Líquido: <span className="font-semibold text-success">{formatMoney(liquido)}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Descrição (opcional)</Label>
              <Input
                placeholder="Ex: Pizza grande + refri"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && valor > 0) mutation.mutate();
                }}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={valor <= 0 || mutation.isPending}
              className="btn-action-add"
            >
              {mutation.isPending ? "Salvando..." : "Registrar Venda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
