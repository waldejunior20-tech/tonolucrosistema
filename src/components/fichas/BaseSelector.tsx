import { useState } from "react";
import { Plus, Check, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useBasesFicha,
  useAplicarBase,
  useDeletarBase,
  type TipoFicha,
} from "@/hooks/useBasesFicha";
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
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Props {
  tipoFicha: TipoFicha;
  /** Id da ficha já salva — se ausente, mostra aviso de "salve antes de aplicar". */
  fichaId: string | null;
  /** Id da base atualmente aplicada (vem de fichas.base_origem_id). */
  baseAplicadaId?: string | null;
  /** Callback após aplicar com sucesso. */
  onBaseAplicada?: (baseId: string, count: number) => void;
  /** Abre o modal de criar nova base. */
  onCriarNovaBase?: () => void;
}

export function BaseSelector({
  tipoFicha,
  fichaId,
  baseAplicadaId,
  onBaseAplicada,
  onCriarNovaBase,
}: Props) {
  const { data: bases = [], isLoading } = useBasesFicha(tipoFicha);
  const aplicar = useAplicarBase();
  const deletar = useDeletarBase();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleAplicar = (baseId: string) => {
    if (!fichaId) {
      toast.info("Salve a ficha primeiro para aplicar uma base.");
      return;
    }
    aplicar.mutate(
      { baseId, fichaId, tipoFicha },
      {
        onSuccess: (count) => {
          toast.success(`${count} ingrediente(s) aplicados da base.`);
          onBaseAplicada?.(baseId, count);
        },
        onError: (e: unknown) => {
          const msg = e instanceof Error ? e.message : "Erro ao aplicar base";
          toast.error(msg);
        },
      },
    );
  };

  const baseAtual = bases.find((b) => b.id === baseAplicadaId);

  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Bases salvas</h4>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aplique uma base e poupe tempo de cadastro
          </p>
        </div>
        {onCriarNovaBase && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCriarNovaBase}
            className="text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Salvar como base
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando bases…</p>
      ) : bases.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Nenhuma base cadastrada. Crie uma para reaproveitar ingredientes em outras fichas.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {bases.map((base) => {
            const ativa = baseAplicadaId === base.id;
            const ingsCount = Array.isArray(base.ingredientes) ? base.ingredientes.length : 0;
            return (
              <div key={base.id} className="inline-flex items-center group">
                <button
                  type="button"
                  onClick={() => handleAplicar(base.id)}
                  disabled={aplicar.isPending}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-l-full text-xs font-medium border transition",
                    ativa
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card border-border text-foreground hover:border-primary hover:text-primary",
                  )}
                  title={`${ingsCount} ingrediente(s)`}
                >
                  {ativa && <Check className="h-3 w-3" />}
                  {base.nome}
                  {base.is_padrao && (
                    <span className="ml-1 text-[10px] uppercase tracking-wide opacity-70">
                      padrão
                    </span>
                  )}
                  <span className="ml-1 opacity-60">· {ingsCount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(base.id)}
                  className={cn(
                    "px-2 py-1.5 rounded-r-full text-xs border border-l-0 transition",
                    ativa
                      ? "bg-foreground text-background border-foreground hover:bg-destructive hover:border-destructive"
                      : "bg-card border-border text-muted-foreground hover:bg-destructive hover:text-white hover:border-destructive",
                  )}
                  title="Excluir base"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {baseAtual && (
        <div className="flex items-center justify-between gap-2 rounded-md bg-success/10 border border-success/30 px-3 py-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success text-white text-[10px] font-bold">
              ✓
            </span>
            <span>
              Base <strong>{baseAtual.nome}</strong> aplicada
            </span>
          </div>
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir base?</AlertDialogTitle>
            <AlertDialogDescription>
              A base será removida. Fichas que já a aplicaram continuam intactas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) {
                  deletar.mutate(confirmDelete, {
                    onSuccess: () => toast.success("Base excluída."),
                    onError: (e: unknown) => {
                      const msg = e instanceof Error ? e.message : "Erro ao excluir";
                      toast.error(msg);
                    },
                  });
                  setConfirmDelete(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
