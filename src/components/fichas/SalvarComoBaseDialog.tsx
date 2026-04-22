import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSalvarComoBase, type BaseIngredienteInput, type TipoFicha } from "@/hooks/useBasesFicha";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipoFicha: TipoFicha;
  ingredientes: BaseIngredienteInput[];
}

export function SalvarComoBaseDialog({ open, onOpenChange, tipoFicha, ingredientes }: Props) {
  const [nome, setNome] = useState("");
  const [isPadrao, setIsPadrao] = useState(false);
  const salvar = useSalvarComoBase();

  const handleSalvar = () => {
    if (!nome.trim()) {
      toast.error("Dê um nome para a base.");
      return;
    }
    if (ingredientes.length === 0) {
      toast.error("Adicione ingredientes antes de salvar como base.");
      return;
    }
    salvar.mutate(
      { nome: nome.trim(), tipoFicha, isPadrao, ingredientes },
      {
        onSuccess: () => {
          toast.success(`Base "${nome}" criada com ${ingredientes.length} ingrediente(s).`);
          setNome("");
          setIsPadrao(false);
          onOpenChange(false);
        },
        onError: (e: unknown) => {
          const msg = e instanceof Error ? e.message : "Erro ao salvar base";
          toast.error(msg);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salvar como base</DialogTitle>
          <DialogDescription>
            Reaproveite estes {ingredientes.length} ingrediente(s) em outras fichas com 1 clique.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="base-nome">Nome da base</Label>
            <Input
              id="base-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Base Salgada Padrão"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="base-padrao"
              checked={isPadrao}
              onCheckedChange={(c) => setIsPadrao(c === true)}
            />
            <Label htmlFor="base-padrao" className="text-sm cursor-pointer">
              Marcar como base padrão (aparece primeiro)
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSalvar} disabled={salvar.isPending}>
            {salvar.isPending ? "Salvando…" : "Salvar base"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
