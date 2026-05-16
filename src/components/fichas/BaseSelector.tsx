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
  /** Id da ficha já salva — se ausente, aplica localmente via onAplicarLocal. */
  fichaId: string | null;
  /** Id da base atualmente aplicada (vem de fichas.base_origem_id). */
  baseAplicadaId?: string | null;
  /** Callback após aplicar com sucesso (modo ficha salva). */
  onBaseAplicada?: (baseId: string, count: number) => void;
  /** Aplicação local em ficha nova (sem persistir). Quando presente e fichaId for null, é usada no clique. */
  onAplicarLocal?: (baseId: string) => void;
  /** Abre o modal de criar nova base. */
  onCriarNovaBase?: () => void;
}

export function BaseSelector({
  tipoFicha,
  fichaId,
  baseAplicadaId,
  onBaseAplicada,
  onAplicarLocal,
  onCriarNovaBase,
}: Props) {
  const { data: bases = [], isLoading } = useBasesFicha(tipoFicha);
  const aplicar = useAplicarBase();
  const deletar = useDeletarBase();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleAplicar = (baseId: string) => {
    if (!fichaId) {
      if (onAplicarLocal) {
        onAplicarLocal(baseId);
        return;
      }
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

  // Empty state inline e discreto
  if (!isLoading && bases.length === 0) {
    return (
      <p className="text-xs text-muted-foreground ">
        <span className="opacity-60">Bases:</span>{" "}
        <span className="italic">nenhuma</span>
        {onCriarNovaBase && (
          <>
            {" · "}
            <button
              type="button"
              onClick={onCriarNovaBase}
              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              criar primeira base
            </button>
          </>
        )}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted-foreground ">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold uppercase tracking-wider">Bases salvas</span>
        </div>
        {onCriarNovaBase && (
          <button
            type="button"
            onClick={onCriarNovaBase}
            className="text-xs text-primary hover:bg-primary/10 font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-primary/30 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova Base
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando bases…</p>
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
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-l-full text-xs font-medium border transition ",
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
                  <span className="ml-1 opacity-60 ">· {ingsCount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(base.id)}
                  className={cn(
                    "px-2 py-1 rounded-r-full text-xs border border-l-0 transition",
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
