import { Building2, Check, ChevronDown, Shield, UserCog, Wallet } from "lucide-react";
import { useActiveUnidade } from "@/hooks/useActiveUnidade";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const ROLE_META: Record<string, { label: string; icon: any; color: string }> = {
  admin: { label: "Admin", icon: Shield, color: "text-primary" },
  gerente: { label: "Gerente", icon: UserCog, color: "text-info" },
  caixa: { label: "Caixa", icon: Wallet, color: "text-success" },
};

export function UnidadeSelector() {
  const { unidades, activeUnidade, setActiveUnidade, isLoading } = useActiveUnidade();

  if (isLoading || !activeUnidade) {
    return (
      <div className="h-9 px-3 flex items-center gap-2 rounded-md border border-border bg-muted/30 animate-pulse">
        <Building2 size={14} className="text-muted-foreground" />
        <span className="text-[12px] text-muted-foreground">Carregando…</span>
      </div>
    );
  }

  const RoleIcon = ROLE_META[activeUnidade.role]?.icon ?? Shield;
  const roleColor = ROLE_META[activeUnidade.role]?.color ?? "text-muted-foreground";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "h-9 px-3 flex items-center gap-2 rounded-md border border-border bg-background",
            "hover:bg-muted/50 transition-colors text-left max-w-[260px]"
          )}
        >
          <Building2 size={14} className="text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-foreground truncate leading-tight">
              {activeUnidade.nome}
            </p>
            <div className={cn("flex items-center gap-1 text-[10px]", roleColor)}>
              <RoleIcon size={9} />
              <span className="font-medium">{ROLE_META[activeUnidade.role]?.label}</span>
            </div>
          </div>
          <ChevronDown size={12} className="text-muted-foreground shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Suas unidades ({unidades.length})
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {unidades.map((u) => {
          const isActive = u.unidade_id === activeUnidade.unidade_id;
          const Icon = ROLE_META[u.role]?.icon ?? Shield;
          const color = ROLE_META[u.role]?.color ?? "text-muted-foreground";
          return (
            <DropdownMenuItem
              key={u.unidade_id}
              onClick={() => !isActive && setActiveUnidade(u.unidade_id)}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Building2 size={13} className={cn(isActive ? "text-primary" : "text-muted-foreground", "shrink-0")} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold truncate">{u.nome}</p>
                  <div className={cn("flex items-center gap-1 text-[10px]", color)}>
                    <Icon size={9} />
                    <span>{ROLE_META[u.role]?.label}</span>
                    {u.cidade && <span className="text-muted-foreground">· {u.cidade}</span>}
                  </div>
                </div>
                {isActive && <Check size={13} className="text-primary shrink-0" />}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
