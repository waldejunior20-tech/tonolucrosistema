import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { appError } from "@/lib/error-codes";
import { requireActiveUnidadeId } from "@/hooks/useActiveUnidade";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/MoneyInput";

const CATEGORIAS = [
  "Insumos", "Aluguel", "Energia Elétrica", "Água", "Gás", "Internet / Telefone",
  "Salários", "Pró-labore", "Combustível", "Marketing", "Contador",
  "Software / Sistemas", "Manutenção", "Limpeza", "Embalagens",
];

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function LancarDespesaDialog({ open, onOpenChange }: Props) {
  const [date, setDate] = useState<Date>(new Date());
  const [calOpen, setCalOpen] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<string>("");
  const [valor, setValor] = useState(0);
  const queryClient = useQueryClient();

  const reset = () => {
    setDescricao(""); setCategoria(""); setValor(0); setDate(new Date());
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (valor <= 0) throw new Error("Informe o valor");
      if (!categoria) throw new Error("Escolha uma categoria");
      if (!descricao.trim()) throw new Error("Descreva a despesa");
      const unidade_id = requireActiveUnidadeId();
      const { error } = await supabase.from("lancamentos_financeiros").insert({
        tipo: "despesa",
        categoria,
        subcategoria: categoria,
        classificacao_origem: "manual",
        descricao: descricao.trim(),
        valor,
        data_lancamento: format(date, "yyyy-MM-dd"),
        pago: true,
        unidade_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Despesa registrada");
      reset();
      queryClient.invalidateQueries({ queryKey: ["caixa-diario"] });
      queryClient.invalidateQueries({ queryKey: ["caixa-historico"] });
      queryClient.invalidateQueries({ queryKey: ["caixa-periodo"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dre"] });
      onOpenChange(false);
    },
    onError: (e: any) => appError("ERR-FIN-001", e),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center justify-between gap-3">
            <span>Lançar despesa</span>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs font-medium">
                  <CalendarIcon size={13} />
                  {format(date, "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="end">
                <Calendar mode="single" selected={date} onSelect={(d) => { if (d) { setDate(d); setCalOpen(false); } }} locale={ptBR} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Conta de luz" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger><SelectValue placeholder="Escolher categoria" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Valor</Label>
            <MoneyInput value={valor} onChange={setValor} />
          </div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="w-full gap-2"
            variant="destructive"
          >
            {mutation.isPending ? "Salvando..." : <>Registrar despesa <ArrowRight size={14} /></>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
